import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { FileText, Plus, Trash2, Eye, Download, Loader2, X } from 'lucide-react';
import MultiSourceDocumentSelector from './MultiSourceDocumentSelector';

interface DossierDocument {
  id: string;
  dossier_id: string;
  document_id: string;
  document_nom: string;
  document_type: string;
  document_taille: number;
  source: string;
  added_at: string;
}

interface DossierDocumentsManagerProps {
  dossierId: string;
  open: boolean;
  onClose: () => void;
  cabinetId: string;
  userId: string;
  clientId: string;
  isProView: boolean;
}

export default function DossierDocumentsManager({
  dossierId,
  open,
  onClose,
  cabinetId,
  userId,
  clientId,
  isProView
}: DossierDocumentsManagerProps) {
  const [documents, setDocuments] = useState<DossierDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);

  useEffect(() => {
    if (open) {
      loadDocuments();
    }
  }, [open, dossierId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_dossier_documents')
        .select('*')
        .eq('dossier_id', dossierId)
        .order('added_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erreur chargement documents dossier:', error);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocuments = async (selectedDocuments: any[]) => {
    try {
      const documentsToAdd = selectedDocuments.map(doc => ({
        dossier_id: dossierId,
        document_id: doc.id,
        document_nom: doc.nom,
        document_type: doc.type,
        document_taille: doc.taille,
        source: doc.source
      }));

      const { error } = await supabase
        .from('client_dossier_documents')
        .insert(documentsToAdd);

      if (error) throw error;

      toast.success(`${selectedDocuments.length} document(s) ajouté(s)`);
      loadDocuments();
    } catch (error) {
      console.error('Erreur ajout documents:', error);
      toast.error('Erreur lors de l\'ajout des documents');
    }
  };

  const handleRemoveDocument = async (documentId: string) => {
    if (!confirm('Retirer ce document du dossier ?')) return;

    try {
      const { error } = await supabase
        .from('client_dossier_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast.success('Document retiré du dossier');
      loadDocuments();
    } catch (error) {
      console.error('Erreur suppression document:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getSourceBadge = (source: string) => {
    const config = {
      personal: { label: 'Personnel', color: 'bg-blue-100 text-blue-800' },
      client_shared: { label: 'Client', color: 'bg-green-100 text-green-800' },
      cabinet_shared: { label: 'Cabinet', color: 'bg-purple-100 text-purple-800' }
    };
    const { label, color } = config[source as keyof typeof config] || { label: source, color: 'bg-gray-100 text-gray-800' };
    return (
      <Badge variant="outline" className={color}>
        {label}
      </Badge>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Documents du dossier</DialogTitle>
                <DialogDescription>
                  {isProView ? 'Gérez les documents de ce dossier' : 'Consultez les documents du dossier'}
                </DialogDescription>
              </div>
              {isProView && (
                <Button
                  onClick={() => setSelectorOpen(true)}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="py-4">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun document</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isProView
                    ? 'Ajoutez des documents depuis vos différents espaces'
                    : 'Aucun document n\'a été ajouté à ce dossier'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{doc.document_nom}</p>
                        {getSourceBadge(doc.source)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{doc.document_type}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.document_taille)}</span>
                        <span>•</span>
                        <span>Ajouté le {new Date(doc.added_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    {isProView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="hover:bg-red-50 hover:text-red-700 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MultiSourceDocumentSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleAddDocuments}
        cabinetId={cabinetId}
        userId={userId}
        clientId={clientId}
      />
    </>
  );
}
