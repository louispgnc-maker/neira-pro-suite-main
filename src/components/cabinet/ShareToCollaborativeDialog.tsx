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
      const { data: cabinets, error } = await supabase
        .rpc('get_user_cabinets')
        .eq('role', role);

      if (error) throw error;

      if (cabinets && cabinets.length > 0) {
        setCabinetId(cabinets[0].id);
      } else {
        setCabinetId(null);
      }
    } catch (error) {
      console.error('Erreur chargement cabinet:', error);
    }
  };

  const handleShare = async () => {
    if (!cabinetId) {
      toast({
        title: 'Erreur',
        description: 'Vous devez rejoindre un cabinet pour partager',
        variant: 'destructive',
      });
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

      const { error } = await supabase.rpc(rpcFunction, {
        cabinet_id_param: cabinetId,
        [idParamName]: itemId,
        title_param: title,
        description_param: description || null,
      });

      if (error) throw error;

      toast({
        title: 'Partagé avec succès',
        description: `${itemType === 'document' ? 'Le document' : itemType === 'dossier' ? 'Le dossier' : 'Le contrat'} a été partagé avec votre cabinet.`,
      });

      setOpen(false);
      setTitle(itemName);
      setDescription('');
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Erreur partage:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de partager cet élément',
        variant: 'destructive',
      });
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
        className="text-muted-foreground hover:text-foreground"
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
