import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, FileText, Download, Eye, Trash2 } from "lucide-react";
import { Share2 } from 'lucide-react';
import ShareToCollaborativeButton from '@/components/cabinet/ShareToCollaborativeButton';

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
  etat_civil: string | null;
  situation_familiale: string[] | null;
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
  revenus: string | null;
  justificatifs_financiers: string | null;
  comptes_bancaires: string[] | null;
  // Juridique
  type_dossier: string | null;
  contrat_souhaite: string | null;
  historique_litiges: string | null;
  enfants: { nom: string; prenom?: string; sexe?: string; date_naissance: string | null }[] | null;
  documents_objet: string[] | null;
  situation_matrimoniale: string | null;
  // Additional fields from form
  consentement_rgpd: boolean | null;
  signature_mandat: boolean | null;
  source: string | null;
}

interface LinkedContrat { id: string; name: string; category: string; type: string }

interface ClientDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  notes: string | null;
}

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
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const mainButtonColor = role === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user || !id) return;
      setLoading(true);
      // Try loading with owner_id first
      const { data: c, error } = await supabase
        .from('clients')
        .select(`id,name,role,created_at,kyc_status,missing_info,source,
          nom,prenom,date_naissance,lieu_naissance,adresse,telephone,email,nationalite,sexe,etat_civil,situation_familiale,situation_matrimoniale,
          type_identite,numero_identite,date_expiration_identite,id_doc_path,
          profession,employeur,adresse_professionnelle,siret,situation_fiscale,revenus,justificatifs_financiers,comptes_bancaires,
          consentement_rgpd,signature_mandat,
          type_dossier,contrat_souhaite,historique_litiges,enfants,documents_objet
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        console.error('Erreur chargement client:', error);
        if (mounted) setClient(null);
      } else if (mounted && c) {
        setClient(c as Client);
      }

      // Load associated contrats
      const { data: links, error: linkErr } = await supabase
        .from('client_contrats')
        .select('contrat_id')
        .eq('owner_id', user.id)
        .eq('role', role)
        .eq('client_id', id);
      if (!linkErr && links && links.length > 0) {
        const ids = (links as unknown[]).map((l: unknown) => String((l as Record<string, unknown>).contrat_id ?? ''));
        const { data: ct, error: cErr } = await supabase
          .from('contrats')
          .select('id,name,category,type')
          .in('id', ids);
        if (!cErr && ct && mounted) setContrats(ct as LinkedContrat[]);
      } else if (mounted) {
        setContrats([]);
      }

      // Load client documents
      const { data: docs, error: docsErr } = await supabase
        .from('client_documents')
        .select('*')
        .eq('client_id', id)
        .order('uploaded_at', { ascending: false });
      
      if (!docsErr && docs && mounted) {
        setDocuments(docs as ClientDocument[]);
      } else if (mounted) {
        setDocuments([]);
      }


      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [user, id, location.state, role]);

  const handleDownloadDocument = async (doc: ClientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);
      
      if (error) throw error;
      
      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Erreur lors du téléchargement du document');
    }
  };

  const handleViewDocument = async (doc: ClientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 3600); // 1 hour
      
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      alert('Erreur lors de l\'ouverture du document');
    }
  };

  const handleDeleteDocument = async (doc: ClientDocument) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le document "${doc.file_name}" ?\n\nCette action est irréversible.`)) {
      return;
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path]);
      
      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', doc.id);
      
      if (dbError) throw dbError;

      // Update UI
      setDocuments(documents.filter(d => d.id !== doc.id));
      alert('Document supprimé avec succès');
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Erreur lors de la suppression du document');
    }
  };

  const getDocumentTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'piece_identite': 'Pièce d\'identité',
      'justificatif_domicile': 'Justificatif de domicile',
      'mandat': 'Mandat/Procuration',
      'autre': 'Autre document'
    };
    return labels[type] || type;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDeleteClient = async () => {
    if (!client) return;
    
    const confirmMessage = `⚠️ ATTENTION : Vous êtes sur le point de supprimer définitivement la fiche client de "${client.name}".\n\nCette action supprimera :\n- Toutes les informations du client\n- Tous les documents associés\n- Tous les liens avec les dossiers et contrats\n\nCette action est IRRÉVERSIBLE.\n\nÊtes-vous absolument certain de vouloir continuer ?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Delete all documents from storage first
      if (documents.length > 0) {
        const filePaths = documents.map(doc => doc.file_path);
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove(filePaths);
        
        if (storageError) {
          console.error('Error deleting documents from storage:', storageError);
          // Continue anyway as we want to delete the client
        }
      }

      // Delete client from database (cascade will handle related records)
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id);
      
      if (deleteError) throw deleteError;

      alert('Fiche client supprimée avec succès');
      // Navigate back to clients list
      navigate(role === 'notaire' ? '/notaires/clients' : '/avocats/clients');
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Erreur lors de la suppression de la fiche client');
    }
  };

  const goBack = () => {
    // Determine if we should return to the collaborative clients tab. Prefer location.state
    // but fall back to URL query params so the value survives a page refresh.
    const searchParams = new URLSearchParams(location.search || '');
  const fromCollaboratif = Boolean(((location.state as unknown) as Record<string, unknown>)?.fromCollaboratif) || (searchParams.get('fromCollaboratif') === '1');
    if (fromCollaboratif) {
      // Explicitly return to the collaborative clients tab instead of the personal clients list
      navigate(`/${role}s/espace-collaboratif?tab=clients`);
      return;
    }
    navigate(role === 'notaire' ? '/notaires/clients' : '/avocats/clients');
  };
  const onEdit = () => navigate(role === 'notaire' ? `/notaires/clients/${id}/edit` : `/avocats/clients/${id}/edit`);

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
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
            <h1 className="text-3xl font-bold">Fiche client</h1>
            {client?.name && (
              <p className="text-muted-foreground mt-1">{client.name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button className={mainButtonColor} onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" /> Modifier
            </Button>
            <ShareToCollaborativeButton clientId={id as string} clientName={client?.name || ''} role={role} disabled={sharing} onStart={() => setSharing(true)} onDone={() => setSharing(false)} />
            <Button 
              variant="outline" 
              onClick={handleDeleteClient}
              className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Supprimer le client
            </Button>
          </div>
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
                <div>
                  <div className="text-sm text-muted-foreground">État civil</div>
                  <div className="font-medium">{client.etat_civil || '-'}</div>
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
                <CardTitle>3. Situation familiale</CardTitle>
                <CardDescription>Mariage / PACS / Enfants</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {typeof client.situation_familiale === 'object' && client.situation_familiale !== null && Object.keys(client.situation_familiale).length > 0 ? (
                  <>
                    <div>
                      <div className="text-sm text-muted-foreground">Situation familiale</div>
                      <div className="font-medium">{(client.situation_familiale as any)?.situation_familiale || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Régime matrimonial</div>
                      <div className="font-medium">{(client.situation_familiale as any)?.regime_matrimonial || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Nombre d'enfants</div>
                      <div className="font-medium">{(client.situation_familiale as any)?.nombre_enfants || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Personne à charge</div>
                      <div className="font-medium">{(client.situation_familiale as any)?.personne_a_charge || '-'}</div>
                    </div>
                  </>
                ) : client.situation_matrimoniale ? (
                  <div>
                    <div className="text-sm text-muted-foreground">Situation matrimoniale</div>
                    <div className="font-medium">{client.situation_matrimoniale}</div>
                  </div>
                ) : null}
                <div>
                  <div className="text-sm text-muted-foreground">Enfants</div>
                  {client.enfants && Array.isArray(client.enfants) && client.enfants.length > 0 ? (
                    <div className="space-y-1">
                      {client.enfants.map((e, idx) => (
                        <div key={idx} className="text-sm">
                          {e.prenom && e.nom ? `${e.prenom} ${e.nom}` : e.nom || '-'}
                          {e.sexe && ` (${e.sexe})`}
                          {e.date_naissance && ` — ${e.date_naissance}`}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm">—</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Situation professionnelle / financière</CardTitle>
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
                <div>
                  <div className="text-sm text-muted-foreground">Revenus</div>
                  <div className="font-medium">{client.revenus || '-'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-muted-foreground">Comptes bancaires</div>
                  {client.comptes_bancaires && Array.isArray(client.comptes_bancaires) && client.comptes_bancaires.length > 0 ? (
                    <div className="space-y-1">
                      {client.comptes_bancaires.map((c, idx) => (
                        <div key={idx} className="text-sm">{c}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="font-medium">-</div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-muted-foreground">Justificatifs financiers</div>
                  <div className="font-medium whitespace-pre-wrap">{client.justificatifs_financiers || '-'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Situation juridique / dossier</CardTitle>
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
                  <div className="text-sm text-muted-foreground">Documents liés au dossier</div>
                  {client.documents_objet && client.documents_objet.length > 0 ? (
                    <div className="space-y-1">
                      {client.documents_objet.map((d, idx) => (
                        <div key={idx} className="text-sm">{d}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm">—</div>
                  )}
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

            {/* Consentements & Source */}
            <Card>
              <CardHeader>
                <CardTitle>6. Consentements et informations complémentaires</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Source du client</div>
                  <Badge variant={client.source === 'formulaire_web' ? 'default' : 'secondary'}>
                    {client.source === 'formulaire_web' ? '📋 Formulaire web' : client.source === 'manual' ? '✍️ Création manuelle' : client.source || 'Non spécifié'}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Consentement RGPD</div>
                  <Badge variant={client.consentement_rgpd ? 'default' : 'secondary'}>
                    {client.consentement_rgpd ? '✓ Accepté' : '✗ Non renseigné'}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Signature mandat</div>
                  <Badge variant={client.signature_mandat ? 'default' : 'secondary'}>
                    {client.signature_mandat ? '✓ Signée' : '✗ Non signée'}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Date de création</div>
                  <div className="font-medium">
                    {client.created_at ? new Date(client.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '-'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents uploadés */}
            {documents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents uploadés
                  </CardTitle>
                  <CardDescription>
                    Documents fournis par le client lors du formulaire
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {getDocumentTypeLabel(doc.document_type)}
                            </Badge>
                            <span className="font-medium">{doc.file_name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatFileSize(doc.file_size)} • {new Date(doc.uploaded_at).toLocaleDateString('fr-FR', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDocument(doc)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Voir
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadDocument(doc)}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-4 w-4" />
                            Télécharger
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteDocument(doc)}
                            className="flex items-center gap-1 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
