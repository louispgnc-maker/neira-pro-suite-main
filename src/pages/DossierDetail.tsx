import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DocumentViewer } from "@/components/ui/document-viewer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, ExternalLink } from "lucide-react";
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
interface AssocContrat { id: string; name: string; category: string; content?: string | null; contenu_json?: any }
interface AssocDocument { id: string; name: string; file_url?: string | null; file_name?: string | null }

interface ClientDetails {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  nationalite: string | null;
  sexe: string | null;
  etat_civil: string | null;
  situation_familiale: any;
  situation_matrimoniale: string | null;
  type_identite: string | null;
  numero_identite: string | null;
  date_expiration_identite: string | null;
  profession: string | null;
  employeur: string | null;
  adresse_professionnelle: string | null;
  siret: string | null;
  situation_fiscale: string | null;
  revenus: string | null;
  comptes_bancaires: string[] | null;
  justificatifs_financiers: string | null;
  type_dossier: string | null;
  contrat_souhaite: string | null;
  historique_litiges: string | null;
  documents_objet: string[] | null;
  enfants: { nom: string; prenom?: string; sexe?: string; date_naissance: string | null }[] | null;
  source: string | null;
  kyc_status: string | null;
  consentement_rgpd: boolean | null;
  signature_mandat: boolean | null;
  created_at: string | null;
}

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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const [viewerDocName, setViewerDocName] = useState("");
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientDetails | null>(null);
  const [loadingClient, setLoadingClient] = useState(false);

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
    
    // Si c'est une URL complète HTTP, on peut l'utiliser directement
    if (/^https?:\/\//i.test(raw)) {
      setViewerUrl(raw);
      setViewerDocName(name || 'Document');
      setViewerOpen(true);
      return;
    }

    // Traiter comme un chemin de stockage
    let storagePath = raw.replace(/^\/+/, '');
    let bucket = 'documents';
    if (storagePath.startsWith('shared_documents/') || storagePath.startsWith('shared-documents/')) {
      // Normaliser vers le bucket canonique 'shared-documents'
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
      setViewerUrl(publicData.publicUrl);
      setViewerDocName(name || 'Document');
      setViewerOpen(true);
    } catch (e) {
      console.error('Erreur ouverture pièce jointe partagée:', e);
    }
  };

  const openClientModal = async (clientId: string) => {
    setLoadingClient(true);
    setClientModalOpen(true);
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      
      if (error) throw error;
      setSelectedClient(data as ClientDetails);
    } catch (e) {
      console.error('Erreur chargement client:', e);
      setSelectedClient(null);
    } finally {
      setLoadingClient(false);
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
                        onClick={() => openClientModal(c.id)}
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
                  <div className="space-y-4">
                    {contrats.map(k => {
                      const hasContent = k.content || k.contenu_json;
                      
                      return (
                        <div 
                          key={k.id} 
                          className="rounded-lg border border-border"
                        >
                          <div 
                            className="p-3 hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors border-b"
                            onClick={() => navigate(role === 'notaire' ? `/notaires/contrats/${k.id}` : `/avocats/contrats/${k.id}`)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{k.name}</div>
                                <div className="text-muted-foreground text-xs mt-1">{k.category}</div>
                              </div>
                              <Button 
                                size="sm"
                                className={role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}
                              >
                                Voir le contrat
                              </Button>
                            </div>
                          </div>
                          
                          {hasContent && k.content && (
                            <div className="p-4 bg-muted/30">
                              <div className="text-sm font-medium mb-3">Contrat rédigé :</div>
                              <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-gray-50 p-6 rounded-lg border">
                                {k.content}
                              </div>
                            </div>
                          )}
                          {hasContent && !k.content && k.contenu_json && (
                            <div className="p-4 bg-muted/30">
                              <div className="text-sm font-medium mb-2">Formulaire rempli</div>
                              <div className="text-xs text-muted-foreground">Cliquez sur "Voir le contrat" pour consulter les détails</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
      <DocumentViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        documentUrl={viewerUrl}
        documentName={viewerDocName}
        role={role}
      />
      
      {/* Client Modal */}
      <Dialog open={clientModalOpen} onOpenChange={setClientModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fiche client</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="mb-4 -mt-2">
              <Button
                size="sm"
                variant="outline"
                className={`gap-2 ${role === 'notaire' ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200'}`}
                onClick={() => {
                  setClientModalOpen(false);
                  navigate(role === 'notaire' ? `/notaires/clients/${selectedClient.id}` : `/avocats/clients/${selectedClient.id}`);
                }}
              >
                <ExternalLink className="h-4 w-4" />
                Voir la fiche complète
              </Button>
            </div>
          )}
          
          {loadingClient ? (
            <div className="flex items-center justify-center h-[200px]">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : !selectedClient ? (
            <div className="text-muted-foreground">Client introuvable</div>
          ) : (
            <div className="space-y-4">
              {/* Informations personnelles */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informations personnelles</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Nom</div>
                    <div className="font-medium">{selectedClient.nom || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Prénom</div>
                    <div className="font-medium">{selectedClient.prenom || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium">{selectedClient.email || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Téléphone</div>
                    <div className="font-medium">{selectedClient.telephone || '—'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-muted-foreground">Adresse</div>
                    <div className="font-medium">{selectedClient.adresse || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Date de naissance</div>
                    <div className="font-medium">{selectedClient.date_naissance ? new Date(selectedClient.date_naissance).toLocaleDateString() : '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Lieu de naissance</div>
                    <div className="font-medium">{selectedClient.lieu_naissance || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Nationalité</div>
                    <div className="font-medium">{selectedClient.nationalite || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Sexe</div>
                    <div className="font-medium">{selectedClient.sexe || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">État civil</div>
                    <div className="font-medium">{selectedClient.etat_civil || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Situation matrimoniale</div>
                    <div className="font-medium">{selectedClient.situation_matrimoniale || '—'}</div>
                  </div>
                  {selectedClient.situation_familiale && selectedClient.situation_familiale.length > 0 && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-muted-foreground">Situation familiale</div>
                      <div className="font-medium">{selectedClient.situation_familiale.join(', ')}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Situation familiale détaillée */}
              {selectedClient.situation_familiale && typeof selectedClient.situation_familiale === 'object' && !Array.isArray(selectedClient.situation_familiale) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Situation familiale détaillée</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedClient.situation_familiale.regime_matrimonial && (
                      <div>
                        <div className="text-sm text-muted-foreground">Régime matrimonial</div>
                        <div className="font-medium">{selectedClient.situation_familiale.regime_matrimonial}</div>
                      </div>
                    )}
                    {selectedClient.situation_familiale.nombre_enfants !== undefined && (
                      <div>
                        <div className="text-sm text-muted-foreground">Nombre d'enfants</div>
                        <div className="font-medium">{selectedClient.situation_familiale.nombre_enfants}</div>
                      </div>
                    )}
                    {selectedClient.situation_familiale.personne_a_charge !== undefined && (
                      <div>
                        <div className="text-sm text-muted-foreground">Personnes à charge</div>
                        <div className="font-medium">{selectedClient.situation_familiale.personne_a_charge}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Identification */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Identification</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Type de pièce d'identité</div>
                    <div className="font-medium">{selectedClient.type_identite || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Numéro</div>
                    <div className="font-medium">{selectedClient.numero_identite || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Date d'expiration</div>
                    <div className="font-medium">{selectedClient.date_expiration_identite ? new Date(selectedClient.date_expiration_identite).toLocaleDateString() : '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Statut KYC</div>
                    <div className="font-medium">
                      <Badge variant={selectedClient.kyc_status === 'complete' ? 'default' : 'secondary'}>
                        {selectedClient.kyc_status || 'Non défini'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Informations professionnelles */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informations professionnelles</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Profession</div>
                    <div className="font-medium">{selectedClient.profession || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Employeur</div>
                    <div className="font-medium">{selectedClient.employeur || '—'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-muted-foreground">Adresse professionnelle</div>
                    <div className="font-medium">{selectedClient.adresse_professionnelle || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">SIRET</div>
                    <div className="font-medium">{selectedClient.siret || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Situation fiscale</div>
                    <div className="font-medium">{selectedClient.situation_fiscale || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Revenus</div>
                    <div className="font-medium">{selectedClient.revenus || '—'}</div>
                  </div>
                  {selectedClient.comptes_bancaires && selectedClient.comptes_bancaires.length > 0 && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-muted-foreground mb-2">Comptes bancaires</div>
                      <div className="space-y-1">
                        {selectedClient.comptes_bancaires.map((compte, idx) => (
                          <div key={idx} className="p-2 bg-muted rounded text-sm font-mono">
                            {compte}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedClient.justificatifs_financiers && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-muted-foreground">Justificatifs financiers</div>
                      <div className="font-medium whitespace-pre-wrap">{selectedClient.justificatifs_financiers}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Informations juridiques */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informations juridiques</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Type de dossier</div>
                    <div className="font-medium">{selectedClient.type_dossier || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Contrat souhaité</div>
                    <div className="font-medium">{selectedClient.contrat_souhaite || '—'}</div>
                  </div>
                  {selectedClient.historique_litiges && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-muted-foreground">Historique des litiges</div>
                      <div className="font-medium whitespace-pre-wrap">{selectedClient.historique_litiges}</div>
                    </div>
                  )}
                  {selectedClient.documents_objet && selectedClient.documents_objet.length > 0 && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-muted-foreground mb-2">Documents objet du dossier</div>
                      <div className="space-y-1">
                        {selectedClient.documents_objet.map((doc, idx) => (
                          <div key={idx} className="p-2 bg-muted rounded text-sm">
                            {doc}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedClient.source && (
                    <div>
                      <div className="text-sm text-muted-foreground">Source</div>
                      <div className="font-medium">{selectedClient.source}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Consentements */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Consentements et informations complémentaires</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Source</div>
                    <div>
                      {selectedClient.source ? (
                        <Badge variant="outline">{selectedClient.source}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Consentement RGPD</div>
                    <div>
                      <Badge variant={selectedClient.consentement_rgpd ? 'default' : 'secondary'}>
                        {selectedClient.consentement_rgpd ? 'Oui' : 'Non'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Signature du mandat</div>
                    <div>
                      <Badge variant={selectedClient.signature_mandat ? 'default' : 'secondary'}>
                        {selectedClient.signature_mandat ? 'Oui' : 'Non'}
                      </Badge>
                    </div>
                  </div>
                  {selectedClient.created_at && (
                    <div>
                      <div className="text-sm text-muted-foreground">Date de création</div>
                      <div className="font-medium">
                        {new Date(selectedClient.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Enfants */}
              {selectedClient.enfants && selectedClient.enfants.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Enfants</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedClient.enfants.map((enfant, idx) => (
                        <div key={idx} className="p-3 bg-muted rounded-lg">
                          <div className="font-medium">
                            {enfant.prenom ? `${enfant.prenom} ${enfant.nom}` : enfant.nom}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {enfant.sexe && <span>{enfant.sexe} • </span>}
                            {enfant.date_naissance && <span>Né(e) le {new Date(enfant.date_naissance).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
