import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { generateContractWithAI } from "@/lib/contractAIHelper";

interface Contrat {
  id: string;
  name: string;
  category?: string | null;
  type?: string | null;
  description?: string | null;
  content?: string | null;
  created_at?: string | null;
  contenu_json?: any;
}

export default function ContratDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const [contrat, setContrat] = useState<Contrat | null>(null);
  const [sharedBy, setSharedBy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  // Fonction pour régénérer le contrat avec l'IA
  const handleRegenerate = async () => {
    if (!user || !contrat) return;
    
    setRegenerating(true);
    toast.info("Régénération du contrat avec l'IA...");
    
    try {
      // Générer le nouveau contenu avec l'IA en utilisant les données du formulaire
      const generatedContract = await generateContractWithAI({
        contractType: contrat.type || contrat.name,
        formData: contrat.contenu_json || {}, // Récupérer les données du formulaire
        clientInfo: {},
        user
      });

      // Mettre à jour le contrat dans la base de données
      const { error } = await supabase
        .from('contrats')
        .update({ content: generatedContract })
        .eq('id', contrat.id);

      if (error) throw error;

      // Mettre à jour l'état local
      setContrat({ ...contrat, content: generatedContract });
      
      toast.success("✅ Contrat régénéré avec succès !");
      
    } catch (error) {
      console.error('Erreur régénération:', error);
      toast.error("Erreur lors de la régénération", {
        description: error instanceof Error ? error.message : "Veuillez réessayer"
      });
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user || !id) return;
      setLoading(true);

      // Try loading as owner first
      const { data: cData, error } = await supabase
        .from('contrats')
        .select('id,name,category,type,created_at,description,content,contenu_json')
        .eq('owner_id', user.id)
        .eq('role', role)
        .eq('id', id)
        .maybeSingle();

      if (!error && cData && mounted) {
        setContrat(cData as Contrat);
      } else {
        // Fallback: maybe this contract was shared to the cabinet. Try cabinet_contrats (visible to active members)
        try {
          const { data: shared, error: sErr } = await supabase
            .from('cabinet_contrats')
            .select('id, contrat_id, title, description, category, contrat_type, shared_by, shared_at')
            .or(`contrat_id.eq.${id},id.eq.${id}`)
            .maybeSingle();

          if (!sErr && shared && mounted) {
            setContrat({
              id: shared.id,
              name: shared.title,
              category: shared.category || null,
              type: shared.contrat_type || null,
              description: shared.description || null,
              created_at: shared.shared_at || null,
            });

            // Fetch sharer name if possible
            try {
              if (shared.shared_by) {
                const { data: p } = await supabase.from('profiles').select('full_name,nom').eq('id', shared.shared_by).maybeSingle();
                if (p) setSharedBy(p.full_name || p.nom || null);
              }
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          // ignore fallback errors
        }
      }

      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false };
  }, [user, id, role]);

  const goBack = () => {
    // If opened from the collaborative space, return to previous page
    const fromCollaboratif = Boolean(((location.state as unknown) as Record<string, unknown>)?.fromCollaboratif);
    if (fromCollaboratif) {
      navigate(-1);
      return;
    }
    navigate(role === 'notaire' ? '/notaires/contrats' : '/avocats/contrats');
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
            <h1 className="text-3xl font-bold">{role === 'notaire' ? 'Acte' : 'Contrat'}</h1>
            {contrat?.name && <p className="text-muted-foreground mt-1">{contrat.name}</p>}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[300px] border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">Chargement…</p>
          </div>
        ) : !contrat ? (
          <div className="text-muted-foreground">Contrat introuvable.</div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Informations du contrat</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Nom</div>
                  <div className="font-medium">{contrat.name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Catégorie</div>
                  <Badge variant="outline" className={role === 'notaire' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                    {contrat.category || '—'}
                  </Badge>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-muted-foreground">Type</div>
                  <div className="font-medium">{contrat.type || '—'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-muted-foreground">Description</div>
                  <div className="font-medium whitespace-pre-wrap">{contrat.description || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Créé le</div>
                  <div className="font-medium">{contrat.created_at ? new Date(contrat.created_at).toLocaleDateString() : '—'}</div>
                </div>
              </CardContent>
            </Card>

            {contrat.content && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>2. Contenu du contrat</CardTitle>
                  {(contrat.content.includes('[Erreur') || contrat.content.includes('ERREUR')) && (
                    <Button 
                      onClick={handleRegenerate} 
                      disabled={regenerating}
                      size="sm"
                      className={`gap-2 text-white ${
                        role === 'notaire' 
                          ? 'bg-orange-600 hover:bg-orange-700' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                      {regenerating ? 'Régénération...' : 'Régénérer avec l\'IA'}
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-gray-50 p-6 rounded-lg border">
                    {contrat.content}
                  </div>
                </CardContent>
              </Card>
            )}

            {sharedBy && (
              <Card>
                <CardHeader>
                  <CardTitle>Partagé</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">Partagé par <span className="font-medium">{sharedBy}</span></div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
