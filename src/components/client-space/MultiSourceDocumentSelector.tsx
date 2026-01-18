import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { FileText, Folder, Building2, User, Loader2, Eye } from 'lucide-react';

interface Document {
  id: string;
  nom: string;
  type: string;
  taille: number;
  chemin: string;
  source: 'personal' | 'client_shared' | 'cabinet_shared';
  created_at: string;
}

interface MultiSourceDocumentSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selectedDocuments: Document[]) => void;
  cabinetId: string;
  userId: string;
  clientId?: string;
}

export default function MultiSourceDocumentSelector({
  open,
  onClose,
  onSelect,
  cabinetId,
  userId,
  clientId
}: MultiSourceDocumentSelectorProps) {
  const [personalDocs, setPersonalDocs] = useState<Document[]>([]);
  const [clientDocs, setClientDocs] = useState<Document[]>([]);
  const [cabinetDocs, setCabinetDocs] = useState<Document[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (open) {
      loadDocuments();
    }
  }, [open, cabinetId, userId, clientId]);

  const getPublicUrl = (storagePath: string, bucket: string = 'documents'): string => {
    try {
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(storagePath);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Erreur génération URL publique:', error);
      return '';
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);

      // Load personal documents
      const { data: personalData, error: personalError } = await supabase
        .from('documents')
        .select('id, name, storage_path, updated_at')
        .eq('owner_id', userId)
        .order('updated_at', { ascending: false });

      if (personalError) throw personalError;

      // Générer les URLs publiques pour les documents personnels
      const personalDocsWithUrls = (personalData || []).map((doc) => {
        const publicUrl = doc.storage_path ? getPublicUrl(doc.storage_path) : '';
        return {
          id: doc.id,
          nom: doc.name,
          type: 'application/pdf',
          taille: 0,
          chemin: publicUrl,
          source: 'personal' as const,
          created_at: doc.updated_at
        };
      });

      // Load client shared documents (if clientId provided)
      let clientData = [];
      if (clientId) {
        const { data, error } = await supabase
          .from('client_shared_documents')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        clientData = data || [];
      }

      // Générer les URLs publiques pour les documents client
      const clientDocsWithUrls = (clientData || []).map((doc) => {
        let publicUrl = '';
        if (doc.file_url) {
          // Si c'est déjà une URL complète, l'utiliser directement
          if (doc.file_url.startsWith('http')) {
            publicUrl = doc.file_url;
          } else {
            // Sinon, générer l'URL publique depuis le bucket shared-documents
            publicUrl = getPublicUrl(doc.file_url, 'shared-documents');
          }
        }
        return {
          id: doc.id,
          nom: doc.title || doc.file_name,
          type: doc.file_type || 'application/pdf',
          taille: doc.file_size || 0,
          chemin: publicUrl,
          source: 'client_shared' as const,
          created_at: doc.created_at
        };
      });

      // Load cabinet shared documents
      const { data: cabinetData, error: cabinetError } = await supabase
        .from('cabinet_documents')
        .select('id, title, file_name, file_type, file_size, file_url, created_at')
        .eq('cabinet_id', cabinetId)
        .order('created_at', { ascending: false });

      if (cabinetError) throw cabinetError;

      // Les documents cabinet ont déjà des URLs complètes
      const cabinetDocsWithUrls = (cabinetData || []).map((doc) => {
        return {
          id: doc.id,
          nom: doc.title || doc.file_name,
          type: doc.file_type || 'application/pdf',
          taille: doc.file_size || 0,
          chemin: doc.file_url || '',
          source: 'cabinet_shared' as const,
          created_at: doc.created_at
        };
      });

      setPersonalDocs(personalDocsWithUrls);
      setClientDocs(clientDocsWithUrls);
      setCabinetDocs(cabinetDocsWithUrls);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDocument = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const handlePreviewDocument = (doc: Document, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  const handleConfirm = () => {
    const allDocs = [...personalDocs, ...clientDocs, ...cabinetDocs];
    const selected = allDocs.filter(doc => selectedDocs.has(doc.id));
    onSelect(selected);
    setSelectedDocs(new Set());
    onClose();
  };

  const handleCancel = () => {
    setSelectedDocs(new Set());
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getSourceBadge = (source: string) => {
    const config = {
      personal: { label: 'Personnel', color: 'bg-blue-100 text-blue-800', icon: User },
      client_shared: { label: 'Client', color: 'bg-green-100 text-green-800', icon: Folder },
      cabinet_shared: { label: 'Cabinet', color: 'bg-purple-100 text-purple-800', icon: Building2 }
    };
    const { label, color, icon: Icon } = config[source as keyof typeof config] || config.personal;
    return (
      <Badge variant="outline" className={`${color} gap-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const renderDocumentList = (documents: Document[]) => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      );
    }

    if (documents.length === 0) {
      return (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucun document</p>
        </div>
      );
    }

    return (
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Checkbox
              checked={selectedDocs.has(doc.id)}
              onCheckedChange={() => handleToggleDocument(doc.id)}
            />
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div 
              className="flex-1 min-w-0 cursor-pointer" 
              onClick={() => handleToggleDocument(doc.id)}
            >
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{doc.nom}</p>
                {getSourceBadge(doc.source)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{doc.type}</span>
                <span>•</span>
                <span>{formatFileSize(doc.taille)}</span>
                <span>•</span>
                <span>{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
              onClick={(e) => handlePreviewDocument(doc, e)}
            >
              <Eye className="w-5 h-5" />
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !previewOpen && handleCancel()}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Sélectionner des documents</DialogTitle>
            <DialogDescription>
              Choisissez des documents depuis différentes sources pour les ajouter au dossier
            </DialogDescription>
          </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal" className="gap-2">
              <User className="w-4 h-4" />
              Personnel ({personalDocs.length})
            </TabsTrigger>
            {clientId && (
              <TabsTrigger value="client" className="gap-2">
                <Folder className="w-4 h-4" />
                Client ({clientDocs.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="cabinet" className="gap-2">
              <Building2 className="w-4 h-4" />
              Cabinet ({cabinetDocs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-4">
            {renderDocumentList(personalDocs)}
          </TabsContent>

          {clientId && (
            <TabsContent value="client" className="mt-4">
              {renderDocumentList(clientDocs)}
            </TabsContent>
          )}

          <TabsContent value="cabinet" className="mt-4">
            {renderDocumentList(cabinetDocs)}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {selectedDocs.size} document(s) sélectionné(s)
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
              >
                Annuler
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={selectedDocs.size === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Ajouter ({selectedDocs.size})
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {previewDoc?.nom}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center gap-2 mt-2">
              {previewDoc && getSourceBadge(previewDoc.source)}
              <span>{previewDoc?.type}</span>
              <span>•</span>
              <span>{previewDoc && formatFileSize(previewDoc.taille)}</span>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-[500px] border rounded-lg overflow-hidden bg-gray-50">
          {previewDoc?.chemin ? (
            previewDoc.type.includes('pdf') ? (
              <iframe
                src={previewDoc.chemin}
                className="w-full h-[500px]"
                title="Prévisualisation PDF"
              />
            ) : previewDoc.type.includes('image') ? (
              <img
                src={previewDoc.chemin}
                alt={previewDoc.nom}
                className="w-full h-auto max-h-[500px] object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4" />
                  <p>Prévisualisation non disponible pour ce type de fichier</p>
                  <p className="text-sm mt-2">Type: {previewDoc.type}</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-[500px] text-muted-foreground">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4" />
                <p>Fichier non disponible</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setPreviewOpen(false)}
            className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
          >
            Fermer
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              if (previewDoc?.chemin) {
                window.open(previewDoc.chemin, '_blank');
              }
            }}
          >
            Ouvrir dans un nouvel onglet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
