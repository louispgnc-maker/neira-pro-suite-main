import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Share2 } from 'lucide-react';

interface ShareToCollaborativeDialogProps {
  itemId: string;
  itemName: string;
  itemType: 'document' | 'dossier' | 'contrat';
  role: 'avocat' | 'notaire';
  onSuccess?: () => void;
}

export function ShareToCollaborativeDialog({ 
  itemId, 
  itemName, 
  itemType,
  role,
  onSuccess 
}: ShareToCollaborativeDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(itemName);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [cabinetId, setCabinetId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const colorClass = role === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';
  
  const outlineHoverClass = role === 'notaire' 
    ? 'hover:bg-orange-600 hover:text-white' 
    : 'hover:bg-blue-600 hover:text-white';

  // Charger le cabinet de l'utilisateur
  useEffect(() => {
    if (open) {
      loadCabinet();
    }
  }, [open]);

  const loadCabinet = async () => {
    try {
      const { data: cabinetsData, error } = await supabase.rpc('get_user_cabinets');
      if (error) throw error;
      const cabinets = Array.isArray(cabinetsData) ? cabinetsData as any[] : [];
      const filtered = cabinets.filter((c: any) => c.role === role);
      if (filtered && filtered.length > 0) {
        setCabinetId(filtered[0].id);
      } else {
        setCabinetId(null);
      }
    } catch (error) {
      console.error('Erreur chargement cabinet:', error);
    }
  };
  const handleShare = async () => {
    if (!cabinetId) {
      toast({ title: 'Erreur', description: 'Vous devez rejoindre un cabinet pour partager', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      let rpcFunction = '';
      let idParamName = '';
      switch (itemType) {
        case 'document':
          rpcFunction = 'share_document_to_cabinet';
          idParamName = 'document_id_param';
          break;
        case 'dossier':
          rpcFunction = 'share_dossier_to_cabinet';
          idParamName = 'dossier_id_param';
          break;
        case 'contrat':
          rpcFunction = 'share_contrat_to_cabinet';
          idParamName = 'contrat_id_param';
          break;
      }

      const { data: rpcData, error: rpcErr } = await supabase.rpc(rpcFunction, {
        cabinet_id_param: cabinetId,
        [idParamName]: itemId,
        title_param: title,
        description_param: description || null,
      });
      if (rpcErr) throw rpcErr;

      // extract shared id if present
      let sharedId: any = null;
      if (rpcData == null) sharedId = null;
      else if (Array.isArray(rpcData)) sharedId = rpcData[0];
      else sharedId = rpcData;

      // If not a document, we can finish here
      if (itemType !== 'document') {
        toast({ title: 'Partagé avec succès', description: `${itemType === 'dossier' ? 'Le dossier' : 'Le contrat'} a été partagé avec votre cabinet.` });
        setOpen(false);
        setTitle(itemName);
        setDescription('');
        if (onSuccess) onSuccess();
        return;
      }

      // For documents: copy synchronously to shared-documents (or fallback) and update cabinet_documents.file_url
      const { data: doc, error: docErr } = await supabase
        .from('documents')
        .select('storage_path')
        .eq('id', itemId)
        .single();
      if (docErr) throw docErr;
      const storagePathRaw = (doc?.storage_path || '').replace(/^\/+/, '');
      if (!storagePathRaw) throw new Error('storage_path not found');

      const { data: downloaded, error: downloadErr } = await supabase.storage.from('documents').download(storagePathRaw);
      if (downloadErr) throw downloadErr;

      const filename = storagePathRaw.split('/').pop() || itemName || 'file.pdf';
      const targetPath = `${cabinetId}/${itemId}-${filename}`;

      const bucketCandidates = ['shared-documents', 'shared_documents'];
      let uploadedBucket: string | null = null;
      const uploadErrors: Array<string> = [];
      for (const b of bucketCandidates) {
        try {
          const { error: uploadErr } = await supabase.storage.from(b).upload(targetPath, downloaded as any, { upsert: true });
          if (!uploadErr) { uploadedBucket = b; break; }
          const msg = uploadErr?.message || JSON.stringify(uploadErr);
          uploadErrors.push(`bucket=${b}: ${msg}`);
          console.warn(`Upload to bucket ${b} failed:`, msg);
        } catch (e: any) {
          const msg = e?.message || String(e);
          uploadErrors.push(`bucket=${b}: ${msg}`);
          console.warn(`Upload attempt to bucket ${b} threw:`, e);
        }
      }

      // If upload to shared bucket failed, try a safer fallback: generate a signed URL from the original 'documents' object
      let usedPublicUrl: string | null = null;
      if (!uploadedBucket) {
  console.warn('All shared-bucket uploads failed:', uploadErrors);
        // rollback created shared entry (to avoid half-shares)
        try {
          if (sharedId) await supabase.rpc('delete_cabinet_document', { p_id: sharedId });
          else await supabase.from('cabinet_documents').delete().match({ document_id: itemId, cabinet_id: cabinetId });
        } catch (_) { /* noop */ }

        // Try to provide a temporary signed URL so cabinet members can still open the file
        try {
          const signedRes = await supabase.storage.from('documents').createSignedUrl(storagePathRaw, 60 * 60 * 24 * 7); // 7 days
            if (signedRes?.data?.signedUrl) {
              usedPublicUrl = signedRes.data.signedUrl;
            // create a cabinet_documents entry so notification behavior remains consistent
            try {
              const insertPayload: any = {
                cabinet_id: cabinetId,
                document_id: itemId,
                title: title,
                description: description || null,
                file_url: usedPublicUrl,
              };
              // set shared_by to the current user so the insert satisfies NOT NULL and RLS checks
              if (user && user.id) insertPayload.shared_by = user.id;
              const { data: created, error: createdErr } = await supabase.from('cabinet_documents').insert(insertPayload).select().single();
              if (createdErr) {
                console.warn('Failed to insert fallback cabinet_documents row:', createdErr);
              }
            } catch (e) {
              console.warn('Failed to insert fallback cabinet_documents row (exception):', e);
            }
            // show a more detailed toast including upload errors to help debugging
            const uploadErrMsg = uploadErrors.length ? uploadErrors.join(' | ') : 'unknown error';
            toast({
              title: 'Partagé (fallback)',
              description: `Le document a été partagé mais la copie dans le bucket public a échoué — un lien temporaire a été créé pour permettre l’accès. Erreurs: ${uploadErrMsg}`,
            });
            setOpen(false);
            setTitle(itemName);
            setDescription('');
            if (onSuccess) onSuccess();
            return;
          }
        } catch (e) {
          console.warn('Signed URL fallback failed:', e);
        }

        throw new Error('Upload to shared bucket failed: ' + uploadErrors.join(' | '));
      }

      try {
        const pub = await supabase.storage.from(uploadedBucket).getPublicUrl(targetPath);
        const publicUrl = (pub && (pub as any).data && (pub as any).data.publicUrl) || (pub as any)?.publicUrl || null;
        if (publicUrl) {
          await supabase.from('cabinet_documents').update({ file_url: publicUrl }).eq('id', sharedId);
        }
      } catch (e) {
        console.warn('Failed to read public URL after upload:', e);
      }

      toast({ title: 'Partagé avec succès', description: `Le document a été partagé avec votre cabinet et copié dans ${uploadedBucket}.` });
      setOpen(false);
      setTitle(itemName);
      setDescription('');
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Erreur partage:', error);
      toast({ title: 'Erreur', description: error.message || 'Impossible de partager cet élément', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={role === 'notaire' ? 'hover:bg-orange-100 hover:text-orange-600' : 'hover:bg-blue-100 hover:text-blue-600'}
      >
        <Share2 className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          {!cabinetId ? (
            <>
              <DialogHeader>
                <DialogTitle>Pas de cabinet</DialogTitle>
                <DialogDescription>
                  Vous devez rejoindre un cabinet pour partager des éléments avec votre équipe.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Fermer
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Partager avec le cabinet</DialogTitle>
                <DialogDescription>
                  Partagez cet élément avec tous les membres de votre cabinet.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Titre du partage"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optionnel)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ajoutez une description..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                  className={outlineHoverClass}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleShare}
                  disabled={!title.trim() || loading}
                  className={colorClass}
                >
                  {loading ? 'Partage...' : 'Partager'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
