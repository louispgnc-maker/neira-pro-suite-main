import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { copyDocumentToShared } from '@/lib/sharedCopy';

interface ShareToCollaborativeDialogProps {
  itemId: string;
  itemName: string;
  itemType: 'document' | 'dossier' | 'contrat' | 'client';
  role: 'avocat' | 'notaire';
  onSuccess?: () => void;
  // When true, the dialog will not render its built-in trigger button.
  hideTrigger?: boolean;
}

export function ShareToCollaborativeDialog({ hideTrigger = false, itemId, itemName, itemType, role, onSuccess }: ShareToCollaborativeDialogProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  if (hideTrigger) return null;

  const handleShare = async () => {
    if (!user) { toast.error('Connexion requise'); return; }
    setBusy(true);
    try {
      // Get user's cabinets and pick the first matching the role
      const { data: cabinetsData, error: cabinetsErr } = await supabase.rpc('get_user_cabinets');
      if (cabinetsErr || !Array.isArray(cabinetsData)) {
        toast.error('Impossible de récupérer vos cabinets');
        return;
      }
  const arr = cabinetsData as unknown[];
  type MaybeCab = { role?: string; role_cabinet?: string; id?: string };
  const found = arr.find((c) => (((c as MaybeCab).role) || (c as MaybeCab).role_cabinet) === role) as MaybeCab | undefined;
  const cabinetId = found?.id || (arr[0] && (arr[0] as MaybeCab).id);
      if (!cabinetId) {
        toast.error('Aucun cabinet trouvé pour partager');
        return;
      }

      if (itemType === 'client') {
        // Pour les clients, utiliser la fonction RPC
        const { data, error } = await supabase.rpc('share_client_to_cabinet', {
          p_client_id: itemId,
          p_cabinet_id: cabinetId,
          p_shared_by: user.id
        });
        
        if (error || !data) {
          console.error('share_client_to_cabinet failed', error);
          toast.error('Partage impossible');
          return;
        }
        
        toast.success('Client partagé sur l\'espace de votre cabinet');
        if (onSuccess) onSuccess();
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
          return;
        }
        
        toast.success('Dossier partagé sur l\'espace de votre cabinet');
        if (onSuccess) onSuccess();
      } else {
        // Pour les documents, utiliser l'Edge Function
        const { uploadedBucket, publicUrl } = await copyDocumentToShared({ cabinetId, documentId: itemId });
        if (uploadedBucket && publicUrl) {
          toast.success('Document partagé sur l\'espace de votre cabinet');
          if (onSuccess) onSuccess();
        } else {
          toast.error('Partage impossible');
        }
      }
    } catch (e) {
      console.error('share failed', e);
      toast.error('Erreur lors du partage');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleShare} disabled={busy} title={busy ? 'Partage en cours' : `Partager ${itemName}`}>
      <Share2 className="h-4 w-4" />
    </Button>
  );
}
