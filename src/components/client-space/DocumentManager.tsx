import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { sanitizeFileName } from '@/lib/storageHelpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { toast } from 'sonner';
import {
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  MoreVertical,
  FolderInput,
  Copy,
  Building2,
  Loader2,
} from 'lucide-react';

interface DocumentFile {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
  description?: string | null;
}

interface DocumentManagerProps {
  clientId: string;
  cabinetId: string;
  documents: DocumentFile[];
  isProView: boolean; // true = professionnel, false = client
  onRefresh: () => void;
}

export function DocumentManager({
  clientId,
  cabinetId,
  documents,
  isProView,
  onRefresh,
}: DocumentManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentFile | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerDocName, setViewerDocName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!clientId || !cabinetId) {
      toast.error('Erreur: Informations client manquantes');
      return;
    }

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Non authentifié');

      for (const file of Array.from(files)) {
        const sanitizedFileName = sanitizeFileName(file.name);
        // Upload vers l'espace client partagé (bucket public shared-documents)
        const filePath = `${cabinetId}/${clientId}/${sanitizedFileName}`;

        console.log('Uploading to client space:', filePath);

        // Upload to storage (shared-documents bucket public)
        const { error: uploadError } = await supabase.storage
          .from('shared-documents')
          .upload(filePath, file, {
            upsert: true,
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('shared-documents')
          .getPublicUrl(filePath);

        const fullUrl = publicUrlData.publicUrl;

        // Create record in client_shared_documents
        const { error: dbError } = await supabase
          .from('client_shared_documents')
          .insert({
            client_id: clientId,
            title: file.name,
            file_name: sanitizedFileName,
            file_url: fullUrl,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: userData.user.id,
          });

        if (dbError) {
          console.error('Database insert error:', dbError);
          throw dbError;
        }
      }

      toast.success('Document partagé avec le client');
      onRefresh();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Erreur lors du téléversement');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (doc: DocumentFile) => {
    try {
      // Si c'est déjà une URL complète, l'utiliser directement
      let fileUrl = doc.file_url;
      
      if (!doc.file_url.startsWith('http')) {
        // Sinon, générer une URL publique (bucket shared-documents)
        const { data: publicUrlData } = supabase.storage
          .from('shared-documents')
          .getPublicUrl(doc.file_url);

        if (!publicUrlData?.publicUrl) throw new Error('Could not generate download URL');
        fileUrl = publicUrlData.publicUrl;
      }

      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Téléchargement réussi');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleView = async (doc: DocumentFile) => {
    try {
      // Si c'est déjà une URL complète, l'utiliser directement
      let viewUrl = doc.file_url;
      
      if (!doc.file_url.startsWith('http')) {
        // Sinon, générer une URL publique (bucket shared-documents)
        const { data: publicUrlData } = supabase.storage
          .from('shared-documents')
          .getPublicUrl(doc.file_url);

        if (!publicUrlData?.publicUrl) throw new Error('Could not generate URL');
        viewUrl = publicUrlData.publicUrl;
      }

      setViewerUrl(viewUrl);
      setViewerDocName(doc.file_name);
      setViewerOpen(true);
    } catch (err) {
      console.error('View error:', err);
      toast.error('Erreur lors de l\'ouverture');
    }
  };

  const handleDelete = async (doc: DocumentFile) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_url]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('client_shared_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      toast.success('Document supprimé');
      onRefresh();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleTransferToCabinet = async () => {
    if (!selectedDoc) return;

    setTransferring(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Not authenticated');
      console.log('1. User authenticated:', userData.user.id);

      // Get user's profile to find cabinet
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('cabinet_id')
        .eq('id', userData.user.id)
        .single();

      console.log('2. Profile data:', profile);
      if (profileError) console.error('Profile error:', profileError);

      if (!profile?.cabinet_id) {
        toast.error('Vous devez être membre d\'un cabinet');
        return;
      }

      // Download the file from current location
      console.log('3. Downloading file from:', selectedDoc.file_url);
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(selectedDoc.file_url);

      if (downloadError) {
        console.error('Download error:', downloadError);
        throw downloadError;
      }
      console.log('4. File downloaded, size:', fileData.size);

      // Upload to cabinet location
      const newPath = `cabinet/${profile.cabinet_id}/${selectedDoc.file_name}`;
      console.log('5. Uploading to:', newPath);
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(newPath, fileData, {
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      console.log('6. File uploaded successfully');

      // Create record in cabinet_documents
      const insertData = {
        cabinet_id: profile.cabinet_id,
        title: selectedDoc.title || selectedDoc.file_name,
        file_name: selectedDoc.file_name,
        file_url: newPath,
        file_size: selectedDoc.file_size,
        file_type: selectedDoc.file_type,
        shared_by: userData.user.id,
      };
      console.log('7. Inserting into cabinet_documents:', insertData);
      
      const { error: dbError } = await supabase
        .from('cabinet_documents')
        .insert(insertData);

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }
      console.log('8. Database record created successfully');

      toast.success('Document copié vers l\'espace cabinet');
      setTransferDialogOpen(false);
      setSelectedDoc(null);
    } catch (err: any) {
      console.error('Transfer error:', err);
      toast.error(`Erreur lors du transfert: ${err.message}`);
    } finally {
      setTransferring(false);
    }
  };

  const handleTransferToPersonal = async () => {
    if (!selectedDoc) return;

    setTransferring(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Not authenticated');

      // Download the file from current location
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(selectedDoc.file_url);

      if (downloadError) throw downloadError;

      // Upload to personal location
      const newPath = `personal/${userData.user.id}/${selectedDoc.file_name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(newPath, fileData, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Create record in documents table
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          owner_id: userData.user.id,
          name: selectedDoc.file_name,
          storage_path: newPath,
          status: 'Finalisé',
        });

      if (dbError) throw dbError;

      toast.success('Document copié vers votre espace personnel');
      setTransferDialogOpen(false);
      setSelectedDoc(null);
    } catch (err: any) {
      console.error('Transfer error:', err);
      toast.error('Erreur lors du transfert');
    } finally {
      setTransferring(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <>
      <Card>
          <CardContent className="pt-6">
            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleUpload}
                className="hidden"
                id="doc-upload"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? 'Téléversement...' : isProView ? 'Partager un document' : 'Ajouter un document'}
              </Button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun document partagé</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isProView
                    ? 'Partagez des documents avec ce client'
                    : 'Aucun document disponible pour le moment'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{doc.file_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatFileSize(doc.file_size)} •{' '}
                          {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(doc)}
                        title="Aperçu"
                        className="hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        title="Télécharger"
                        className="hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {isProView && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="hover:bg-blue-50 hover:text-blue-700">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedDoc(doc);
                                setTransferDialogOpen(true);
                              }}
                              className="hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copier vers...
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(doc)}
                              className="text-destructive hover:bg-red-50 hover:text-red-700 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copier le document</DialogTitle>
            <DialogDescription>
              Où souhaitez-vous copier "{selectedDoc?.file_name}" ?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button
              onClick={handleTransferToPersonal}
              disabled={transferring}
              className="justify-start gap-2 h-auto p-4 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
              variant="outline"
            >
              <FolderInput className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Mon espace personnel</div>
                <div className="text-sm text-muted-foreground">
                  Copier dans mes documents personnels
                </div>
              </div>
            </Button>
            <Button
              onClick={handleTransferToCabinet}
              disabled={transferring}
              className="justify-start gap-2 h-auto p-4 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
              variant="outline"
            >
              <Building2 className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Espace cabinet</div>
                <div className="text-sm text-muted-foreground">
                  Copier dans les documents partagés du cabinet
                </div>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTransferDialogOpen(false);
                setSelectedDoc(null);
              }}
              disabled={transferring}
            >
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Viewer */}
      <DocumentViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        documentUrl={viewerUrl}
        documentName={viewerDocName}
      />
    </>
  );
}
