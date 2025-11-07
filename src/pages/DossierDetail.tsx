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
interface AssocDocument { id: string; name: string }

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
      if (!user || !id) return;
      setLoading(true);
      const { data: d, error } = await supabase
        .from('dossiers')
        .select('id,title,status,description,created_at')
        .eq('owner_id', user.id)
        .eq('role', role)
        .eq('id', id)
        .maybeSingle();
      if (!error && d && mounted) setDossier(d as Dossier);

      // Associations
      const [dc, dco, dd] = await Promise.all([
        supabase.from('dossier_clients').select('client_id').eq('dossier_id', id).eq('owner_id', user.id).eq('role', role),
        supabase.from('dossier_contrats').select('contrat_id').eq('dossier_id', id).eq('owner_id', user.id).eq('role', role),
        supabase.from('dossier_documents').select('document_id').eq('dossier_id', id).eq('owner_id', user.id).eq('role', role),
      ]);

      // Load names
      if (dc.data && dc.data.length > 0) {
        const ids = dc.data.map(r => r.client_id);
        const { data: cData } = await supabase.from('clients').select('id,name').in('id', ids);
        if (cData && mounted) setClients(cData as AssocClient[]);
      }
      if (dco.data && dco.data.length > 0) {
        const ids = dco.data.map(r => r.contrat_id);
        const { data: kData } = await supabase.from('contrats').select('id,name,category').in('id', ids);
        if (kData && mounted) setContrats(kData as AssocContrat[]);
      }
      if (dd.data && dd.data.length > 0) {
        const ids = dd.data.map(r => r.document_id);
        const { data: docData } = await supabase.from('documents').select('id,name').in('id', ids);
        if (docData && mounted) setDocuments(docData as AssocDocument[]);
      }

      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false }; 
  }, [user, id, role]);

  const goBack = () => {
    // If opened from the collaborative space, return to previous page
    const fromCollaboratif = (location.state as any)?.fromCollaboratif;
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
                      <div key={d.id} className="text-sm">{d.name}</div>
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
