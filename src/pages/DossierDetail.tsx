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
        // Minimal owner-first load to avoid complex RPC fallbacks during build-time checks.
        const { data: d, error } = await supabase
          .from('dossiers')
          .select('id,title,status,description,created_at')
          .eq('owner_id', user.id)
          .eq('role', role)
          .eq('id', id)
          .maybeSingle();
        if (!error && d && mounted) setDossier(d as Dossier);
      } catch (e) {
        // ignore errors for now
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
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60);
      if (error || !data?.signedUrl) {
        // try public URL fallback
          try {
          const pub = await supabase.storage.from(bucket).getPublicUrl(storagePath as string);
          const publicUrl = pub?.data?.publicUrl ?? (((pub as unknown) as Record<string, unknown>)?.publicUrl as string | undefined);
          if (publicUrl) {
            window.open(publicUrl, '_blank');
            return;
          }
        } catch (e) {
          // ignore
        }
        console.error('createSignedUrl failed for', bucket, storagePath, error);
        return;
      }
      window.open(data.signedUrl, '_blank');
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
                      <Badge key={c.id} variant="secondary">{c.name}</Badge>
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
                  <div className="space-y-1">
                    {contrats.map(k => (
                      <div key={k.id} className="text-sm">
                        <span className="font-medium">{k.name}</span>
                        <span className="text-muted-foreground"> — {k.category}</span>
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
                  <div className="space-y-1">
                    {documents.map(d => (
                      <div key={d.id} className="text-sm flex items-center justify-between">
                        <div>{d.name}</div>
                        {d.file_url ? (
                          <button className="text-sm text-blue-600 hover:underline" onClick={() => openSharedDocument(d.file_url, d.file_name || d.name)}>Ouvrir</button>
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
