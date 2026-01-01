import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

interface Dossier {
  id: string;
  title: string;
  status: string;
  description?: string | null;
  created_at: string | null;
}

interface AssocClient { id: string; name: string }
interface AssocContrat { id: string; name: string; category: string }
interface AssocDocument { id: string; name: string; file_url?: string | null; file_name?: string | null }

export default function DossierDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [clients, setClients] = useState<AssocClient[]>([]);
  const [contrats, setContrats] = useState<AssocContrat[]>([]);
  const [documents, setDocuments] = useState<AssocDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const mainColor = role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white';

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user || !id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Essayer de charger le dossier en tant que propriétaire
        let { data: d, error } = await supabase
          .from('dossiers')
          .select('id,title,status,description,created_at')
          .eq('owner_id', user.id)
          .eq('role', role)
          .eq('id', id)
          .maybeSingle();
        
        // Si pas trouvé, essayer de charger depuis cabinet_dossiers (dossier partagé)
        if (!d) {
          const { data: sharedDossier } = await supabase
            .from('cabinet_dossiers')
            .select('dossier_id, title, description, status, dossiers(created_at)')
            .eq('dossier_id', id)
            .maybeSingle();
          
          if (sharedDossier) {
            d = {
              id: sharedDossier.dossier_id,
              title: sharedDossier.title,
              status: sharedDossier.status,
              description: sharedDossier.description,
              created_at: (sharedDossier as any).dossiers?.created_at || null
            };
          }
        }
        
        if (!error && d && mounted) setDossier(d as Dossier);
        
        // Charger les clients liés
        const { data: clientLinks } = await supabase
          .from('dossier_clients')
          .select('client_id, clients(id, nom, prenom)')
          .eq('dossier_id', id);
        
        if (clientLinks && mounted) {
          const clientList = clientLinks.map((link: any) => {
            const c = link.clients;
            return {
              id: c.id,
              name: c.prenom ? `${c.prenom} ${c.nom}` : c.nom
            };
          });
          setClients(clientList);
        }
        
        // Charger les contrats liés
        const { data: contratLinks } = await supabase
          .from('dossier_contrats')
          .select('contrat_id, contrats(id, name, category)')
          .eq('dossier_id', id);
        
        if (contratLinks && mounted) {
          const contratList = contratLinks.map((link: any) => ({
            id: link.contrats.id,
            name: link.contrats.name,
            category: link.contrats.category
          }));
          setContrats(contratList);
        }
        
        // Charger les documents liés
        const { data: docLinks } = await supabase
          .from('dossier_documents')
          .select('document_id, documents(id, name, storage_path)')
          .eq('dossier_id', id);
        
        if (docLinks && mounted) {
          const docList = docLinks.map((link: any) => {
            const doc = link.documents;
            // Générer l'URL publique
            let fileUrl = doc.storage_path;
            if (doc.storage_path && !doc.storage_path.startsWith('http')) {
              const storagePath = doc.storage_path.replace(/^\/+/, '');
              const { data: publicData } = supabase.storage.from('documents').getPublicUrl(storagePath);
              if (publicData?.publicUrl) {
                fileUrl = publicData.publicUrl;
              }
            }
            return {
              id: doc.id,
              name: doc.name,
              file_url: fileUrl,
              file_name: doc.name
            };
          });
          setDocuments(docList);
        }
      } catch (e) {
        console.error('Error loading dossier:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user, id, role]);

  const openSharedDocument = async (fileUrl: string | null | undefined, name?: string) => {
    if (!fileUrl) {
      return;
    }
    const raw = (fileUrl || '').trim();
    if (/^https?:\/\//i.test(raw)) {
      window.open(raw, '_blank');
      return;
    }

    // treat as storage path
    let storagePath = raw.replace(/^\/+/, '');
    let bucket = 'documents';
    if (storagePath.startsWith('shared_documents/') || storagePath.startsWith('shared-documents/')) {
      // normalize to canonical 'shared-documents' bucket
      bucket = 'shared-documents';
      storagePath = storagePath.replace(/^shared[-_]documents\//, '');
    }

    try {
      // Utiliser getPublicUrl pour éviter l'expiration des URLs
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      if (!publicData?.publicUrl) {
        console.error('getPublicUrl failed for', bucket, storagePath);
        return;
      }
      window.open(publicData.publicUrl, '_blank');
    } catch (e) {
      console.error('Erreur ouverture pièce jointe partagée:', e);
    }
  };


  const goBack = () => {
    // If opened from the collaborative space, return to previous page
    const fromCollaboratif = Boolean(((location.state as unknown) as Record<string, unknown>)?.fromCollaboratif);
    if (fromCollaboratif) {
      navigate(-1);
      return;
    }
    navigate(role === 'notaire' ? '/notaires/dossiers' : '/avocats/dossiers');
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className={role === 'notaire' ? 'hover:bg-orange-100 hover:text-orange-600' : 'hover:bg-blue-100 hover:text-blue-600'}
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Dossier</h1>
            {dossier?.title && <p className="text-muted-foreground mt-1">{dossier.title}</p>}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[300px] border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">Chargement…</p>
          </div>
        ) : !dossier ? (
          <div className="text-muted-foreground">Dossier introuvable.</div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Informations du dossier</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Titre</div>
                  <div className="font-medium">{dossier.title}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Statut</div>
                  <Badge variant="outline" className={role === 'notaire' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                    {dossier.status}
                  </Badge>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-muted-foreground">Description</div>
                  <div className="font-medium whitespace-pre-wrap">{dossier.description || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Créé le</div>
                  <div className="font-medium">{dossier.created_at ? new Date(dossier.created_at).toLocaleDateString() : '—'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Clients associés</CardTitle>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Aucun client</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {clients.map(c => (
                      <Badge 
                        key={c.id} 
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => navigate(role === 'notaire' ? `/notaires/clients/${c.id}` : `/avocats/clients/${c.id}`)}
                      >
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Contrats associés</CardTitle>
              </CardHeader>
              <CardContent>
                {contrats.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Aucun contrat</div>
                ) : (
                  <div className="space-y-2">
                    {contrats.map(k => (
                      <div 
                        key={k.id} 
                        className="text-sm p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
                        onClick={() => navigate(role === 'notaire' ? `/notaires/contrats/${k.id}` : `/avocats/contrats/${k.id}`)}
                      >
                        <div className="font-medium">{k.name}</div>
                        <div className="text-muted-foreground text-xs mt-1">{k.category}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Documents associés</CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Aucun document</div>
                ) : (
                  <div className="space-y-2">
                    {documents.map(d => (
                      <div 
                        key={d.id} 
                        className="text-sm p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-between"
                      >
                        <div className="font-medium">{d.name}</div>
                        {d.file_url ? (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className={role === 'notaire' ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'}
                            onClick={() => openSharedDocument(d.file_url, d.file_name || d.name)}
                          >
                            Ouvrir
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
