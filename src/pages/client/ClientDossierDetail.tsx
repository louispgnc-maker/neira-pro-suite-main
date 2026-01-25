import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import ClientLayout from '@/components/client/ClientLayout';

interface Dossier {
  id: string;
  titre: string;
  status: string;
  description?: string | null;
  created_at: string | null;
}

interface AssocContrat {
  id: string;
  name: string;
  category: string;
  content?: string | null;
  contenu_json?: any;
}

interface AssocDocument {
  id: string;
  name: string;
  file_url?: string | null;
  file_name?: string | null;
}

export default function ClientDossierDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [contrats, setContrats] = useState<AssocContrat[]>([]);
  const [documents, setDocuments] = useState<AssocDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const [viewerDocName, setViewerDocName] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user || !id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Charger le dossier
        const { data: dossierData } = await supabase
          .from('client_dossiers_new')
          .select('id, titre, status, description, created_at')
          .eq('id', id)
          .maybeSingle();

        if (dossierData && mounted) {
          setDossier({
            id: dossierData.id,
            titre: dossierData.titre,
            status: dossierData.status,
            description: dossierData.description,
            created_at: dossierData.created_at
          });
        }

        // Charger les documents liés
        const { data: docLinks } = await supabase
          .from('client_dossier_documents')
          .select('document_id, document_nom, source')
          .eq('dossier_id', id);

        if (docLinks && mounted) {
          const docListPromises = docLinks.map(async (link: any) => {
            let fileUrl = '';

            if (link.source === 'personal') {
              const { data: docData } = await supabase
                .from('documents')
                .select('storage_path')
                .eq('id', link.document_id)
                .single();

              if (docData?.storage_path) {
                const { data: urlData } = supabase.storage
                  .from('documents')
                  .getPublicUrl(docData.storage_path);
                fileUrl = urlData.publicUrl;
              }
            } else if (link.source === 'client_shared') {
              const { data: docData } = await supabase
                .from('client_shared_documents')
                .select('file_url')
                .eq('id', link.document_id)
                .single();

              if (docData?.file_url) {
                if (docData.file_url.startsWith('http')) {
                  fileUrl = docData.file_url;
                } else {
                  const { data: urlData } = supabase.storage
                    .from('shared-documents')
                    .getPublicUrl(docData.file_url);
                  fileUrl = urlData.publicUrl;
                }
              }
            } else if (link.source === 'cabinet_shared') {
              const { data: docData } = await supabase
                .from('cabinet_documents')
                .select('file_url')
                .eq('id', link.document_id)
                .single();

              if (docData?.file_url) {
                if (docData.file_url.startsWith('http')) {
                  fileUrl = docData.file_url;
                } else {
                  const { data: urlData } = supabase.storage
                    .from('documents')
                    .getPublicUrl(docData.file_url);
                  fileUrl = urlData.publicUrl;
                }
              }
            }

            return {
              id: link.document_id,
              name: link.document_nom,
              file_url: fileUrl,
              file_name: link.document_nom
            };
          });

          const docList = await Promise.all(docListPromises);
          setDocuments(docList);
        }

        // Charger les contrats liés
        const { data: contratLinks } = await supabase
          .from('dossier_contrats')
          .select('contrat_id, contrats(id, name, category, content, contenu_json)')
          .eq('dossier_id', id);

        if (contratLinks && mounted) {
          const contratList = contratLinks.map((link: any) => ({
            id: link.contrats.id,
            name: link.contrats.name,
            category: link.contrats.category,
            content: link.contrats.content,
            contenu_json: link.contrats.contenu_json
          }));
          setContrats(contratList);
        }
      } catch (e) {
        console.error('Error loading dossier:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user, id]);

  const openDocument = (fileUrl: string | null | undefined, name?: string) => {
    if (!fileUrl) return;

    const raw = (fileUrl || '').trim();
    if (/^https?:\/\//i.test(raw)) {
      setViewerUrl(raw);
      setViewerDocName(name || 'Document');
      setViewerOpen(true);
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ClientLayout>
    );
  }

  if (!dossier) {
    return (
      <ClientLayout>
        <div className="p-6">
          <p className="text-gray-600">Dossier introuvable.</p>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/client-space/dossiers')}
            className="hover:bg-blue-100 hover:text-blue-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{dossier.titre}</h1>
            {dossier.description && <p className="text-gray-600 mt-1">{dossier.description}</p>}
          </div>
        </div>

        {/* Informations du dossier */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du dossier</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Statut</div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {dossier.status}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-gray-600">Créé le</div>
              <div className="font-medium">{dossier.created_at ? new Date(dossier.created_at).toLocaleDateString('fr-FR') : '—'}</div>
            </div>
          </CardContent>
        </Card>

        {/* Contrats */}
        {contrats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Contrats associés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contrats.map((contrat) => (
                  <div key={contrat.id} className="rounded-lg border border-border p-4">
                    <div className="font-medium">{contrat.name}</div>
                    <div className="text-gray-600 text-xs mt-1">{contrat.category}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Documents associés</CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-sm text-gray-600">Aucun document</div>
            ) : (
              <div className="space-y-2">
                {documents.map(d => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <div className="font-medium text-sm">{d.name}</div>
                      <div className="text-xs text-muted-foreground">{new Date().toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="hover:bg-blue-50 group"
                        onClick={() => openDocument(d.file_url, d.file_name || d.name)}
                      >
                        <svg className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DocumentViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        documentUrl={viewerUrl}
        documentName={viewerDocName}
        role="client"
      />
    </ClientLayout>
  );
}
