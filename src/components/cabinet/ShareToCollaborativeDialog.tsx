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
        // Pour les dossiers, utiliser la fonction RPC
        const { data, error } = await supabase.rpc('share_dossier_to_cabinet', {
          p_dossier_id: itemId,
          p_cabinet_id: cabinetId,
          p_user_id: user.id
        });
        
        if (error || !data || (data as any).error) {
          console.error('share_dossier_to_cabinet failed', error || data);
          toast.error('Partage impossible');
          setBusy(false);
          return;
        }
        
        toast.success('Dossier partagé sur l\'espace de votre cabinet');
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
    <Button variant="ghost" size="sm" onClick={handleShare} disabled={busy} title={busy ? 'Partage en cours' : `Partager ${itemName}`}>
      <Share2 className="h-4 w-4" />
    </Button>
  );
}
