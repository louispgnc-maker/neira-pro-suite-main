import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";

interface Client {
  id: string;
  name: string;
  role: string;
  created_at: string | null;
  kyc_status: string;
  missing_info: string | null;
  // Personnelles
  nom: string | null;
  prenom: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  nationalite: string | null;
  sexe: string | null;
  // Identification
  type_identite: string | null;
  numero_identite: string | null;
  date_expiration_identite: string | null;
  id_doc_path: string | null;
  // Pro
  profession: string | null;
  employeur: string | null;
  adresse_professionnelle: string | null;
  siret: string | null;
  situation_fiscale: string | null;
  // Juridique
  type_dossier: string | null;
  contrat_souhaite: string | null;
  historique_litiges: string | null;
}

interface LinkedContrat { id: string; name: string; category: string; type: string }

export default function ClientDetail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const [client, setClient] = useState<Client | null>(null);
  const [contrats, setContrats] = useState<LinkedContrat[]>([]);
  const [loading, setLoading] = useState(true);

  const mainButtonColor = role === 'notaire'
    ? 'bg-amber-600 hover:bg-amber-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user || !id) return;
      setLoading(true);
      const { data: c, error } = await supabase
        .from('clients')
        .select(`id,name,role,created_at,kyc_status,missing_info,
          nom,prenom,date_naissance,lieu_naissance,adresse,telephone,email,nationalite,sexe,
          type_identite,numero_identite,date_expiration_identite,id_doc_path,
          profession,employeur,adresse_professionnelle,siret,situation_fiscale,
          type_dossier,contrat_souhaite,historique_litiges
        `)
        .eq('owner_id', user.id)
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.error('Erreur chargement client:', error);
        if (mounted) setClient(null);
      } else if (mounted) {
        setClient(c as Client);
      }

      // Load associated contrats
      const { data: links, error: linkErr } = await supabase
        .from('client_contrats')
        .select('contrat_id')
        .eq('owner_id', user.id)
        .eq('client_id', id);
      if (!linkErr && links && links.length > 0) {
        const ids = links.map((l: any) => l.contrat_id);
        const { data: ct, error: cErr } = await supabase
          .from('contrats')
          .select('id,name,category,type')
          .in('id', ids);
        if (!cErr && ct && mounted) setContrats(ct as LinkedContrat[]);
      } else if (mounted) {
        setContrats([]);
      }

      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [user, id]);

  const goBack = () => navigate(role === 'notaire' ? '/notaires/clients' : '/avocats/clients');
  const onEdit = () => navigate(role === 'notaire' ? `/notaires/clients/${id}/edit` : `/avocats/clients/${id}/edit`);

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Fiche client</h1>
            {client?.name && (
              <p className="text-muted-foreground mt-1">{client.name}</p>
            )}
          </div>
          <Button className={mainButtonColor} onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" /> Modifier
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[300px] border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">Chargement…</p>
          </div>
        ) : !client ? (
          <div className="text-muted-foreground">Client introuvable.</div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Informations personnelles</CardTitle>
                <CardDescription>Données d'identification du client</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Nom</div>
                  <div className="font-medium">{client.nom || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Prénom</div>
                  <div className="font-medium">{client.prenom || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Date de naissance</div>
                  <div className="font-medium">{client.date_naissance || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Lieu de naissance</div>
                  <div className="font-medium">{client.lieu_naissance || '-'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-muted-foreground">Adresse</div>
                  <div className="font-medium">{client.adresse || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Téléphone</div>
                  <div className="font-medium">{client.telephone || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-medium">{client.email || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Nationalité</div>
                  <div className="font-medium">{client.nationalite || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Sexe</div>
                  <div className="font-medium">{client.sexe || '-'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Identification officielle</CardTitle>
                <CardDescription>KYC / pièce d'identité</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Type</div>
                  <div className="font-medium">{client.type_identite || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Numéro</div>
                  <div className="font-medium">{client.numero_identite || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Expiration</div>
                  <div className="font-medium">{client.date_expiration_identite || '-'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Situation professionnelle / financière</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Profession</div>
                  <div className="font-medium">{client.profession || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Employeur</div>
                  <div className="font-medium">{client.employeur || '-'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-muted-foreground">Adresse professionnelle</div>
                  <div className="font-medium">{client.adresse_professionnelle || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">SIRET</div>
                  <div className="font-medium">{client.siret || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Situation fiscale</div>
                  <div className="font-medium">{client.situation_fiscale || '-'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Situation juridique / dossier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Type de dossier</div>
                  <div className="font-medium">{client.type_dossier || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Contrat souhaité</div>
                  <div className="font-medium">{client.contrat_souhaite || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Historique de litiges</div>
                  <div className="font-medium whitespace-pre-wrap">{client.historique_litiges || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Contrats associés</div>
                  {contrats.length === 0 ? (
                    <div className="text-sm">—</div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {contrats.map((c) => (
                        <Badge key={c.id} variant="secondary">{c.name}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
