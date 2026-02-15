import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentViewer } from "@/components/ui/document-viewer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, ExternalLink, Edit, Clock, CheckCircle2, FileText, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import MultiSourceDocumentSelector from "@/components/client-space/MultiSourceDocumentSelector";

interface Dossier {
  id: string;
  title: string;
  status: string;
  description?: string | null;
  created_at: string | null;
  cabinet_id?: string;
  client_id?: string;
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

  // États pour le dialogue de modification
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSelectedClients, setEditSelectedClients] = useState<string[]>([]);
  const [editSelectedContrats, setEditSelectedContrats] = useState<string[]>([]);
  const [editSelectedDocuments, setEditSelectedDocuments] = useState<any[]>([]);
  const [editDocumentSelectorOpen, setEditDocumentSelectorOpen] = useState(false);
  
  // Listes complètes pour les sélecteurs
  const [allClients, setAllClients] = useState<AssocClient[]>([]);
  const [allContrats, setAllContrats] = useState<AssocContrat[]>([]);
  const [allDocuments, setAllDocuments] = useState<AssocDocument[]>([]);

  const mainColor = role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white';
  const selectContentClass = role === 'notaire' ? 'bg-card text-card-foreground border-orange-200' : 'bg-card text-card-foreground border-blue-200';
  const selectItemClass = role === 'notaire' ? 'focus:bg-orange-600 focus:text-white cursor-pointer' : 'focus:bg-blue-600 focus:text-white cursor-pointer';

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user || !id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let dossierData: any = null;
        
        // D'abord essayer de charger depuis client_dossiers_new (nouveaux dossiers)
        const { data: clientDossier } = await supabase
          .from('client_dossiers_new')
          .select('id, titre, status, description, created_at, cabinet_id, client_id')
          .eq('id', id)
          .maybeSingle();
        
        if (clientDossier) {
          dossierData = {
            id: clientDossier.id,
            title: clientDossier.titre,
            status: clientDossier.status,
            description: clientDossier.description,
            created_at: clientDossier.created_at,
            cabinet_id: clientDossier.cabinet_id,
            client_id: clientDossier.client_id
          };
        } else {
          // Sinon essayer l'ancienne table dossiers
          const { data: oldDossier } = await supabase
            .from('dossiers')
            .select('id, title, status, description, created_at')
            .eq('owner_id', user.id)
            .eq('role', role)
            .eq('id', id)
            .maybeSingle();
          
          if (oldDossier) {
            dossierData = oldDossier;
          } else {
            // Dernier essai: cabinet_dossiers (dossiers partagés)
            const { data: sharedDossier } = await supabase
              .from('cabinet_dossiers')
              .select('dossier_id, title, description, status, dossiers(created_at)')
              .eq('dossier_id', id)
              .maybeSingle();
            
            if (sharedDossier) {
              dossierData = {
                id: sharedDossier.dossier_id,
                title: sharedDossier.title,
                status: sharedDossier.status,
                description: sharedDossier.description,
                created_at: (sharedDossier as any).dossiers?.created_at || null
              };
            }
          }
        }
        
        if (dossierData && mounted) {
          setDossier(dossierData as Dossier);
        }
        
        // Charger les documents liés depuis client_dossier_documents
        const { data: docLinks } = await supabase
          .from('client_dossier_documents')
          .select('document_id, document_nom, source')
          .eq('dossier_id', id);
        
        if (docLinks && mounted) {
          // Charger les détails de chaque document selon sa source
          const docListPromises = docLinks.map(async (link: any) => {
            let fileUrl = '';
            
            if (link.source === 'personal') {
              // Document personnel du cabinet
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
              // Document partagé du client
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
              // Document du cabinet
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
          // Filtrer les documents qui ont un nom et une URL valides
          const validDocuments = docList.filter(doc => 
            doc.name && 
            doc.name.trim() !== '' && 
            doc.name !== 'Document' && 
            doc.file_url && 
            doc.file_url.trim() !== ''
          );
          setDocuments(validDocuments);
        } else {
          // Fallback: essayer l'ancienne table dossier_documents
          const { data: oldDocLinks } = await supabase
            .from('dossier_documents')
            .select('document_id, documents(id, name, storage_path)')
            .eq('dossier_id', id);
          
          if (oldDocLinks && mounted) {
            const docList = oldDocLinks.map((link: any) => {
              const doc = link.documents;
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
            // Filtrer les documents qui ont un nom et une URL valides
            const validDocuments = docList.filter(doc => 
              doc.name && 
              doc.name.trim() !== '' && 
              doc.name !== 'Document' && 
              doc.file_url && 
              doc.file_url.trim() !== ''
            );
            setDocuments(validDocuments);
          }
        }

        // Pour les clients et contrats, garder l'ancien code si nécessaire
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

        // Charger toutes les listes pour le dialogue de modification
        const { data: allClientsData } = await supabase
          .from('clients')
          .select('id, nom, prenom')
          .eq('owner_id', user.id)
          .eq('role', role);
        
        if (allClientsData && mounted) {
          const clientsList = allClientsData.map((c: any) => ({
            id: c.id,
            name: c.prenom ? `${c.prenom} ${c.nom}` : c.nom
          }));
          setAllClients(clientsList);
        }

        const { data: allContratsData } = await supabase
          .from('contrats')
          .select('id, name, category')
          .eq('owner_id', user.id)
          .eq('role', role);
        
        if (allContratsData && mounted) {
          setAllContrats(allContratsData as AssocContrat[]);
        }

        // Charger les contrats disponibles pour la sélection
        const { data: allContratsData, error: contratsError } = await supabase
          .from('contrats')
          .select('id, name, category')
          .eq('owner_id', user.id)
          .eq('role', role);
        
        if (contratsError) {
          console.error('Error loading contrats:', contratsError);
        } else if (allContratsData && mounted) {
          setAllContrats(allContratsData as AssocContrat[]);
        }

        // Charger les documents disponibles pour la sélection
        const { data: allDocumentsData, error: docsError } = await supabase
          .from('documents')
          .select('id, name')
          .eq('owner_id', user.id);
        
        if (docsError) {
          console.error('Error loading documents:', docsError);
        } else if (allDocumentsData && mounted) {
          setAllDocuments(allDocumentsData as AssocDocument[]);
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
    if (!fileUrl || !fileUrl.trim()) {
      console.warn('Tentative d\'ouverture d\'un document sans URL');
      toast.error('Document non disponible');
      return;
    }
    const raw = (fileUrl || '').trim();
    
    // Si c'est une URL complète HTTP, on peut l'utiliser directement
    if (/^https?:\/\//i.test(raw)) {
      setViewerUrl(raw);
      setViewerDocName(name && name.trim() ? name : 'Document sans nom');
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
        toast.error('Impossible de charger le document');
        return;
      }
      setViewerUrl(publicData.publicUrl);
      setViewerDocName(name && name.trim() ? name : 'Document sans nom');
      setViewerOpen(true);
    } catch (e) {
      console.error('Erreur ouverture pièce jointe partagée:', e);
      toast.error('Erreur lors de l\'ouverture du document');
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

  const openEditDialog = async () => {
    if (!dossier) return;
    setEditTitle(dossier.title);
    setEditStatus(dossier.status);
    setEditDescription(dossier.description || "");
    setEditSelectedClients(clients.map(c => c.id));
    setEditSelectedContrats(contrats.map(c => c.id));
    
    // Charger les documents actuels avec leurs sources
    const { data: docLinks } = await supabase
      .from('client_dossier_documents')
      .select('document_id, document_nom, source')
      .eq('dossier_id', dossier.id);
    
    if (docLinks && docLinks.length > 0) {
      // Convertir en format compatible avec MultiSourceDocumentSelector
      const currentDocs = docLinks.map((link: any) => ({
        id: link.document_id,
        nom: link.document_nom,
        type: 'application/pdf',
        taille: 0,
        chemin: '',
        source: link.source,
        created_at: ''
      }));
      setEditSelectedDocuments(currentDocs);
    } else {
      setEditSelectedDocuments([]);
    }
    
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditTitle("");
    setEditStatus("");
    setEditDescription("");
    setEditSelectedClients([]);
    setEditSelectedContrats([]);
    setEditSelectedDocuments([]);
  };

  const saveDossier = async () => {
    if (!user || !dossier) return;
    if (!editTitle || !editTitle.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }

    try {
      // Essayer de mettre à jour dans client_dossiers_new d'abord
      const { error: updateErrorNew } = await supabase
        .from('client_dossiers_new')
        .update({
          titre: editTitle.trim(),
          status: editStatus,
          description: editDescription || null
        })
        .eq('id', dossier.id);

      // Si pas trouvé, essayer l'ancienne table dossiers
      if (updateErrorNew) {
        const { error: updateErrorOld } = await supabase
          .from('dossiers')
          .update({
            title: editTitle,
            status: editStatus,
            description: editDescription
          })
          .eq('id', dossier.id);
        
        if (updateErrorOld) throw updateErrorOld;
      }

      // Mettre à jour les associations contrats
      await supabase.from('client_dossier_contrats').delete().eq('dossier_id', dossier.id);
      if (editSelectedContrats.length > 0 && editSelectedContrats[0]) {
        const { error: insertContratError } = await supabase
          .from('client_dossier_contrats')
          .insert({
            dossier_id: dossier.id,
            contrat_id: editSelectedContrats[0]
          });
        
        if (insertContratError) {
          console.error('Erreur insertion contrat:', insertContratError);
        }
      }

      // Mettre à jour les associations documents pour client_dossiers_new
      await supabase.from('client_dossier_documents').delete().eq('dossier_id', dossier.id);
      if (editSelectedDocuments.length > 0) {
        const docLinks = editSelectedDocuments.map(doc => ({
          dossier_id: dossier.id,
          document_id: doc.id,
          document_nom: doc.nom,
          document_type: doc.type || 'application/pdf',
          document_taille: doc.taille || 0,
          source: doc.source
        }));
        
        if (docLinks.length > 0) {
          const { error: insertError } = await supabase
            .from('client_dossier_documents')
            .insert(docLinks);
          
          if (insertError) {
            console.error('Erreur insertion documents:', insertError);
          }
        }
      }

      toast.success("Dossier modifié avec succès");
      setEditMode(false);
      
      // Recharger les données
      window.location.reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Erreur lors de la modification", { description: message });
    }
  };

  const goBack = () => {
    navigate(-1);
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
            {dossier?.title && <p className="text-gray-600 mt-1">{dossier.title}</p>}
          </div>
          {dossier && (
            <Button onClick={openEditDialog} className={mainColor}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[300px] border border-dashed border-border rounded-lg">
            <p className="text-gray-600">Chargement…</p>
          </div>
        ) : !dossier ? (
          <div className="text-gray-600">Dossier introuvable.</div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Informations du dossier</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Titre</div>
                  <div className="font-medium">{dossier.title}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Statut</div>
                  <Badge variant="outline" className={role === 'notaire' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                    {dossier.status}
                  </Badge>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-gray-600">Description</div>
                  <div className="font-medium whitespace-pre-wrap">{dossier.description || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Créé le</div>
                  <div className="font-medium">{dossier.created_at ? new Date(dossier.created_at).toLocaleDateString() : '—'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Contrats associés</CardTitle>
              </CardHeader>
              <CardContent>
                {contrats.length === 0 ? (
                  <div className="text-sm text-gray-600">Aucun contrat</div>
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
                                <div className="text-gray-600 text-xs mt-1">{k.category}</div>
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
                              <div className="text-xs text-gray-600">Cliquez sur "Voir le contrat" pour consulter les détails</div>
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
                <CardTitle>3. Documents associés</CardTitle>
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
                            onClick={() => openSharedDocument(d.file_url, d.file_name || d.name)}
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
              <p className="text-gray-600">Chargement...</p>
            </div>
          ) : !selectedClient ? (
            <div className="text-gray-600">Client introuvable</div>
          ) : (
            <div className="space-y-4">
              {/* Informations personnelles */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informations personnelles</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Nom</div>
                    <div className="font-medium">{selectedClient.nom || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Prénom</div>
                    <div className="font-medium">{selectedClient.prenom || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Email</div>
                    <div className="font-medium">{selectedClient.email || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Téléphone</div>
                    <div className="font-medium">{selectedClient.telephone || '—'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-600">Adresse</div>
                    <div className="font-medium">{selectedClient.adresse || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Date de naissance</div>
                    <div className="font-medium">{selectedClient.date_naissance ? new Date(selectedClient.date_naissance).toLocaleDateString() : '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Lieu de naissance</div>
                    <div className="font-medium">{selectedClient.lieu_naissance || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Nationalité</div>
                    <div className="font-medium">{selectedClient.nationalite || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Sexe</div>
                    <div className="font-medium">{selectedClient.sexe || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">État civil</div>
                    <div className="font-medium">{selectedClient.etat_civil || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Situation matrimoniale</div>
                    <div className="font-medium">{selectedClient.situation_matrimoniale || '—'}</div>
                  </div>
                  {selectedClient.situation_familiale && selectedClient.situation_familiale.length > 0 && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-gray-600">Situation familiale</div>
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
                        <div className="text-sm text-gray-600">Régime matrimonial</div>
                        <div className="font-medium">{selectedClient.situation_familiale.regime_matrimonial}</div>
                      </div>
                    )}
                    {selectedClient.situation_familiale.nombre_enfants !== undefined && (
                      <div>
                        <div className="text-sm text-gray-600">Nombre d'enfants</div>
                        <div className="font-medium">{selectedClient.situation_familiale.nombre_enfants}</div>
                      </div>
                    )}
                    {selectedClient.situation_familiale.personne_a_charge !== undefined && (
                      <div>
                        <div className="text-sm text-gray-600">Personnes à charge</div>
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
                    <div className="text-sm text-gray-600">Type de pièce d'identité</div>
                    <div className="font-medium">{selectedClient.type_identite || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Numéro</div>
                    <div className="font-medium">{selectedClient.numero_identite || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Date d'expiration</div>
                    <div className="font-medium">{selectedClient.date_expiration_identite ? new Date(selectedClient.date_expiration_identite).toLocaleDateString() : '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Statut KYC</div>
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
                    <div className="text-sm text-gray-600">Profession</div>
                    <div className="font-medium">{selectedClient.profession || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Employeur</div>
                    <div className="font-medium">{selectedClient.employeur || '—'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-600">Adresse professionnelle</div>
                    <div className="font-medium">{selectedClient.adresse_professionnelle || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">SIRET</div>
                    <div className="font-medium">{selectedClient.siret || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Situation fiscale</div>
                    <div className="font-medium">{selectedClient.situation_fiscale || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Revenus</div>
                    <div className="font-medium">{selectedClient.revenus || '—'}</div>
                  </div>
                  {selectedClient.comptes_bancaires && selectedClient.comptes_bancaires.length > 0 && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-gray-600 mb-2">Comptes bancaires</div>
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
                      <div className="text-sm text-gray-600">Justificatifs financiers</div>
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
                    <div className="text-sm text-gray-600">Type de dossier</div>
                    <div className="font-medium">{selectedClient.type_dossier || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Contrat souhaité</div>
                    <div className="font-medium">{selectedClient.contrat_souhaite || '—'}</div>
                  </div>
                  {selectedClient.historique_litiges && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-gray-600">Historique des litiges</div>
                      <div className="font-medium whitespace-pre-wrap">{selectedClient.historique_litiges}</div>
                    </div>
                  )}
                  {selectedClient.documents_objet && selectedClient.documents_objet.length > 0 && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-gray-600 mb-2">Documents objet du dossier</div>
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
                      <div className="text-sm text-gray-600">Source</div>
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
                    <div className="text-sm text-gray-600">Source</div>
                    <div>
                      {selectedClient.source ? (
                        <Badge variant="outline">{selectedClient.source}</Badge>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Consentement RGPD</div>
                    <div>
                      <Badge variant={selectedClient.consentement_rgpd ? 'default' : 'secondary'}>
                        {selectedClient.consentement_rgpd ? 'Oui' : 'Non'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Signature du mandat</div>
                    <div>
                      <Badge variant={selectedClient.signature_mandat ? 'default' : 'secondary'}>
                        {selectedClient.signature_mandat ? 'Oui' : 'Non'}
                      </Badge>
                    </div>
                  </div>
                  {selectedClient.created_at && (
                    <div>
                      <div className="text-sm text-gray-600">Date de création</div>
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
                          <div className="text-sm text-gray-600 mt-1">
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

      {/* Edit Dialog */}
      <Dialog open={editMode} onOpenChange={(v) => { 
        if (!v) cancelEdit(); 
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le dossier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-titre">Titre</Label>
              <Input 
                id="edit-titre"
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)} 
                placeholder="Ex: Litige commercial - DUPONT" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea 
                id="edit-description"
                rows={3} 
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description du dossier..." 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Statut</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_cours">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>En cours</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="en_attente">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      <span>En attente</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="termine">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span>Terminé</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contrats */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Contrat associé</Label>
              </div>
              <Select 
                value={editSelectedContrats.length > 0 ? editSelectedContrats[0] : ""} 
                onValueChange={(value) => setEditSelectedContrats(value ? [value] : [])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un contrat" />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem value="" className={selectItemClass}>
                    <span className="text-gray-500">Aucun contrat</span>
                  </SelectItem>
                  {allContrats.map(contrat => (
                    <SelectItem key={contrat.id} value={contrat.id} className={selectItemClass}>
                      {contrat.name} {contrat.category && `(${contrat.category})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editSelectedContrats.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Contrat sélectionné : {allContrats.find(c => c.id === editSelectedContrats[0])?.name}
                </div>
              )}
            </div>

            {/* Documents */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Documents ({editSelectedDocuments.length})</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDocumentSelectorOpen(true)}
                  className="gap-2 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border-blue-200"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter des documents
                </Button>
              </div>
              {editSelectedDocuments.length > 0 && (
                <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                  {editSelectedDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="truncate">{doc.nom}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditSelectedDocuments(prev => prev.filter(d => d.id !== doc.id))}
                        className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={cancelEdit}
              className={role === 'notaire' ? "hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300" : "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"}
            >
              Annuler
            </Button>
            <Button 
              className={mainColor} 
              onClick={saveDossier}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MultiSourceDocumentSelector */}
      {dossier?.cabinet_id && (
        <MultiSourceDocumentSelector
          open={editDocumentSelectorOpen}
          onClose={() => setEditDocumentSelectorOpen(false)}
          onSelect={(selectedDocs) => {
            setEditSelectedDocuments(selectedDocs);
            setEditDocumentSelectorOpen(false);
          }}
          cabinetId={dossier.cabinet_id}
          userId={user?.id || ''}
          clientId={dossier.client_id}
        />
      )}
    </AppLayout>
  );
}
