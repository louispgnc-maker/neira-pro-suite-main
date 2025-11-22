import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { copyDocumentToShared, shareClientToCabinet } from '@/lib/sharedCopy';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShareToCollaborativeDialogProps {
  itemId: string;
  itemName: string;
  itemType: 'document' | 'dossier' | 'contrat' | 'client';
  role: 'avocat' | 'notaire';
  onSuccess?: () => void;
  onClose?: () => void;
  // When true, the dialog will not render its built-in trigger button.
  hideTrigger?: boolean;
  initialOpen?: boolean;
}

export function ShareToCollaborativeDialog({ 
  hideTrigger = false, 
  itemId, 
  itemName, 
  itemType, 
  role, 
  onSuccess, 
  onClose,
  initialOpen = false 
}: ShareToCollaborativeDialogProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  // Use initialOpen prop directly when hideTrigger is true (controlled mode)
  const open = hideTrigger ? initialOpen : internalOpen;
  
  const setOpen = (value: boolean) => {
    if (hideTrigger) {
      // In controlled mode, don't update internal state
      // Let parent handle it via onClose
      if (!value && onClose) {
        onClose();
      }
    } else {
      setInternalOpen(value);
    }
  };

  const handleShare = async () => {
    if (!user) { toast.error('Connexion requise'); return; }
    setBusy(true);
    try {
      // Get user's cabinets and pick the first matching the role
      const { data: cabinetsData, error: cabinetsErr } = await supabase.rpc('get_user_cabinets');
      if (cabinetsErr || !Array.isArray(cabinetsData)) {
        toast.error('Impossible de récupérer vos cabinets');
        setBusy(false);
        return;
      }
  const arr = cabinetsData as unknown[];
  type MaybeCab = { role?: string; role_cabinet?: string; id?: string };
  const found = arr.find((c) => (((c as MaybeCab).role) || (c as MaybeCab).role_cabinet) === role) as MaybeCab | undefined;
  const cabinetId = found?.id || (arr[0] && (arr[0] as MaybeCab).id);
      if (!cabinetId) {
        toast.error('Aucun cabinet trouvé pour partager');
        setBusy(false);
        return;
      }

      if (itemType === 'client') {
        // Pour les clients, utiliser la fonction shareClientToCabinet
        const result = await shareClientToCabinet({
          clientId: itemId,
          cabinetId: cabinetId,
        });
        
        if (!result.success) {
          console.error('shareClientToCabinet failed', result.error);
          toast.error('Partage impossible');
          setBusy(false);
          return;
        }
        
        toast.success('Client partagé sur l\'espace de votre cabinet');
        setOpen(false);
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else if (itemType === 'dossier') {
        // Pour les dossiers, faire l'insertion directe
        // 1. Récupérer les infos du dossier
        const { data: dossier, error: dossierError } = await supabase
          .from('dossiers')
          .select('title, description, status')
          .eq('id', itemId)
          .single();
        
        if (dossierError || !dossier) {
          console.error('Dossier not found', dossierError);
          toast.error('Dossier introuvable');
          setBusy(false);
          return;
        }
        
        // 2. Insérer dans cabinet_dossiers
        const { error: insertError } = await supabase
          .from('cabinet_dossiers')
          .insert({
            cabinet_id: cabinetId,
            dossier_id: itemId,
            title: dossier.title,
            description: dossier.description,
            status: dossier.status,
            shared_by: user.id,
            shared_at: new Date().toISOString()
          });
        
        if (insertError && insertError.code !== '23505') {
          console.error('Insert failed', insertError);
          toast.error('Partage impossible');
          setBusy(false);
          return;
        }
        
        // 3. Partager automatiquement les documents liés
        const { data: linkedDocs } = await supabase
          .from('dossier_documents')
          .select('document_id, documents(id, name, storage_path)')
          .eq('dossier_id', itemId);
        
        if (linkedDocs && linkedDocs.length > 0) {
          for (const link of linkedDocs) {
            const doc = (link as any).documents;
            if (doc) {
              // Générer l'URL publique du document
              let fileUrl = doc.storage_path;
              if (doc.storage_path && !doc.storage_path.startsWith('http')) {
                const storagePath = doc.storage_path.replace(/^\/+/, '');
                const { data: publicData } = supabase.storage.from('documents').getPublicUrl(storagePath);
                if (publicData?.publicUrl) {
                  fileUrl = publicData.publicUrl;
                }
              }
              
              await supabase.from('cabinet_documents').insert({
                cabinet_id: cabinetId,
                document_id: doc.id,
                title: doc.name,
                file_name: doc.name,
                file_url: fileUrl,
                shared_by: user.id,
                shared_at: new Date().toISOString()
              }).then(res => {
                if (res.error && res.error.code !== '23505') {
                  console.error('Failed to share document', res.error);
                }
              });
            }
          }
        }
        
        // 4. Partager automatiquement les contrats liés
        const { data: linkedContrats } = await supabase
          .from('dossier_contrats')
          .select('contrat_id, contrats(id, name)')
          .eq('dossier_id', itemId);
        
        if (linkedContrats && linkedContrats.length > 0) {
          for (const link of linkedContrats) {
            const contrat = (link as any).contrats;
            if (contrat) {
              await supabase.from('cabinet_contrats').insert({
                cabinet_id: cabinetId,
                contrat_id: contrat.id,
                title: contrat.name,
                shared_by: user.id,
                shared_at: new Date().toISOString()
              }).then(res => {
                if (res.error && res.error.code !== '23505') {
                  console.error('Failed to share contrat', res.error);
                }
              });
            }
          }
        }
        
        // 5. Partager automatiquement les clients liés
        const { data: linkedClients } = await supabase
          .from('dossier_clients')
          .select('client_id, clients(id, nom, prenom, email, telephone)')
          .eq('dossier_id', itemId);
        
        if (linkedClients && linkedClients.length > 0) {
          for (const link of linkedClients) {
            const client = (link as any).clients;
            if (client) {
              await supabase.from('cabinet_clients').insert({
                cabinet_id: cabinetId,
                client_id: client.id,
                nom: client.nom,
                prenom: client.prenom,
                email: client.email,
                telephone: client.telephone,
                shared_by: user.id,
                shared_at: new Date().toISOString()
              }).then(res => {
                if (res.error && res.error.code !== '23505') {
                  console.error('Failed to share client', res.error);
                }
              });
            }
          }
        }
        
        const totalShared = (linkedDocs?.length || 0) + (linkedContrats?.length || 0) + (linkedClients?.length || 0);
        if (totalShared > 0) {
          toast.success(`Dossier partagé avec ${totalShared} élément(s) associé(s)`);
        } else {
          toast.success('Dossier partagé sur l\'espace de votre cabinet');
        }
        
        setOpen(false);
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else if (itemType === 'contrat') {
        // Pour les contrats, insertion directe dans cabinet_contrats
        const { data: contrat, error: contratError } = await supabase
          .from('contrats')
          .select('name, type, category')
          .eq('id', itemId)
          .single();
        
        if (contratError || !contrat) {
          console.error('Contrat not found', contratError);
          toast.error('Contrat introuvable');
          setBusy(false);
          return;
        }
        
        const { error: insertError } = await supabase
          .from('cabinet_contrats')
          .insert({
            cabinet_id: cabinetId,
            contrat_id: itemId,
            title: contrat.name,
            contrat_type: contrat.type,
            category: contrat.category,
            shared_by: user.id,
            shared_at: new Date().toISOString()
          });
        
        if (insertError && insertError.code !== '23505') {
          console.error('Insert failed', insertError);
          toast.error('Partage impossible');
          setBusy(false);
          return;
        }
        
        toast.success('Contrat partagé sur l\'espace de votre cabinet');
        setOpen(false);
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else {
        // Pour les documents, utiliser l'Edge Function
        const { uploadedBucket, publicUrl } = await copyDocumentToShared({ cabinetId, documentId: itemId });
        if (uploadedBucket && publicUrl) {
          toast.success('Document partagé sur l\'espace de votre cabinet');
          setOpen(false);
          if (onSuccess) onSuccess();
          if (onClose) onClose();
        } else {
          toast.error('Partage impossible');
          setBusy(false);
        }
      }
    } catch (e) {
      console.error('share failed', e);
      toast.error('Erreur lors du partage');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && onClose) {
      onClose();
    }
  };

  // Classe de couleur selon le rôle
  const buttonColorClass = role === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  if (hideTrigger) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partager sur l'espace collaboratif</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir partager "{itemName}" sur l'espace collaboratif de votre cabinet ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
              Annuler
            </Button>
            <Button onClick={handleShare} disabled={busy} className={buttonColorClass}>
              {busy ? 'Partage en cours...' : 'Partager'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleShare} 
      disabled={busy} 
      title={busy ? 'Partage en cours' : `Partager ${itemName}`}
      className={`gap-2 ${role === 'notaire' ? 'hover:bg-orange-100 hover:text-orange-600' : 'hover:bg-blue-100 hover:text-blue-600'}`}
    >
      <Share2 className="h-4 w-4" />
      <span className="hidden sm:inline">Partager</span>
    </Button>
  );
}
