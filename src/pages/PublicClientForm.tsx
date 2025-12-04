import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ClientForm {
  id: string;
  client_email: string;
  client_name: string | null;
  status: string;
  form_type: string;
  expires_at: string;
  cabinet_id: string;
}

export default function PublicClientForm() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ClientForm | null>(null);
  const [submitted, setSubmitted] = useState(false);
  
  // Upload files
  const [pieceIdentiteFiles, setPieceIdentiteFiles] = useState<FileList | null>(null);
  const [justificatifDomicileFile, setJustificatifDomicileFile] = useState<File | null>(null);
  const [mandatFile, setMandatFile] = useState<File | null>(null);
  const [autresDocuments, setAutresDocuments] = useState<FileList | null>(null);

  const [formData, setFormData] = useState({
    // 1) Informations personnelles
    nom: '',
    prenom: '',
    nom_naissance: '',
    date_naissance: '',
    lieu_naissance: '',
    nationalite: '',
    adresse: '',
    numero_rue: '',
    code_postal: '',
    ville: '',
    pays: 'France',
    telephone: '',
    email: '',
    situation_familiale: '',
    enfants: 'non',
    enfants_details: '',
    
    // 2) Identité
    type_piece_identite: '',
    numero_piece: '',
    date_expiration_piece: '',
    
    // 3) Coordonnées professionnelles
    profession: '',
    employeur: '',
    adresse_professionnelle: '',
    telephone_professionnel: '',
    email_professionnel: '',
    statut_professionnel: '',
    
    // 4) Situation financière
    revenu_annuel: '',
    patrimoine_immobilier: 'non',
    patrimoine_immobilier_details: '',
    comptes_bancaires: '',
    credits_en_cours: '',
    situation_fiscale: '',
    
    // 5) Adresse de facturation
    facturation_identique: true,
    adresse_facturation: '',
    code_postal_facturation: '',
    ville_facturation: '',
    pays_facturation: 'France',
    numero_tva: '',
    siret: '',
    
    // 6) Mandat / Représentation
    agit_nom_propre: true,
    nom_personne_representee: '',
    prenom_personne_representee: '',
    lien_representation: '',
    
    // 7) Objet du dossier
    type_dossier: '',
    objet_dossier: '',
    description_besoin: '',
    urgence: 'normal',
    date_limite: '',
    type_acte_notaire: '',
    infos_complementaires_acte: '',
    
    // 9) Préférences de communication
    preference_communication: 'email',
    
    // 11) Consentements
    consentement_rgpd: false,
    acceptation_cgu: false,
    acceptation_conservation: false,
    autorisation_contact: false,
    
    // Autres
    regime_matrimonial: '',
    nombre_enfants: '0',
    notes: ''
  });

  useEffect(() => {
    loadForm();
  }, [token]);

  const loadForm = async () => {
    try {
      const { data, error } = await supabase
        .from('client_forms')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (error) {
        console.error('Error loading form:', error);
        throw error;
      }

      if (!data) {
        toast.error('Formulaire introuvable');
        setLoading(false);
        return;
      }

      if (data.status === 'completed') {
        setSubmitted(true);
        setLoading(false);
        return;
      }

      if (data.status === 'expired' || new Date(data.expires_at) < new Date()) {
        toast.error('Ce formulaire a expiré');
        setLoading(false);
        return;
      }

      setForm(data);
      
      // Pré-remplir l'email si disponible
      if (data.client_email) {
        setFormData(prev => ({ ...prev, email: data.client_email }));
      }
      if (data.client_name) {
        const [prenom, ...nomParts] = data.client_name.split(' ');
        setFormData(prev => ({ 
          ...prev, 
          prenom: prenom || '',
          nom: nomParts.join(' ') || ''
        }));
      }
    } catch (error) {
      console.error('Error loading form:', error);
      toast.error('Erreur lors du chargement du formulaire');
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, folder: string, documentType: string): Promise<{ path: string; size: number } | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `client-forms/${folder}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error(`Error uploading ${documentType}:`, error);
        throw error;
      }

      return { path: data.path, size: file.size };
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form || !token) return;
    
    // Validation des consentements
    if (!formData.consentement_rgpd || !formData.acceptation_cgu || 
        !formData.acceptation_conservation || !formData.autorisation_contact) {
      toast.error('Vous devez accepter tous les consentements obligatoires');
      return;
    }
    
    setSubmitting(true);
    try {
      toast.info('Upload des documents en cours...');
      
      // Upload tous les fichiers
      const uploadedDocuments: Array<{
        type: string;
        fileName: string;
        filePath: string;
        fileSize: number;
        mimeType: string;
      }> = [];

      // Upload pièces d'identité
      if (pieceIdentiteFiles && pieceIdentiteFiles.length > 0) {
        for (let i = 0; i < pieceIdentiteFiles.length; i++) {
          const file = pieceIdentiteFiles[i];
          const result = await uploadFile(file, 'identite', 'piece_identite');
          if (result) {
            uploadedDocuments.push({
              type: 'piece_identite',
              fileName: file.name,
              filePath: result.path,
              fileSize: result.size,
              mimeType: file.type
            });
          }
        }
      }

      // Upload justificatif de domicile
      if (justificatifDomicileFile) {
        const result = await uploadFile(justificatifDomicileFile, 'justificatifs', 'justificatif_domicile');
        if (result) {
          uploadedDocuments.push({
            type: 'justificatif_domicile',
            fileName: justificatifDomicileFile.name,
            filePath: result.path,
            fileSize: result.size,
            mimeType: justificatifDomicileFile.type
          });
        }
      }

      // Upload mandat si nécessaire
      if (!formData.agit_nom_propre && mandatFile) {
        const result = await uploadFile(mandatFile, 'mandats', 'mandat');
        if (result) {
          uploadedDocuments.push({
            type: 'mandat',
            fileName: mandatFile.name,
            filePath: result.path,
            fileSize: result.size,
            mimeType: mandatFile.type
          });
        }
      }

      // Upload autres documents
      if (autresDocuments && autresDocuments.length > 0) {
        for (let i = 0; i < autresDocuments.length; i++) {
          const file = autresDocuments[i];
          const result = await uploadFile(file, 'autres', 'autre');
          if (result) {
            uploadedDocuments.push({
              type: 'autre',
              fileName: file.name,
              filePath: result.path,
              fileSize: result.size,
              mimeType: file.type
            });
          }
        }
      }

      toast.info('Création de la fiche client...');

      // Submit form avec les documents uploadés
      const { data, error } = await supabase.rpc('submit_client_form', {
        form_token: token,
        form_response: {
          ...formData,
          uploaded_documents: uploadedDocuments
        }
      });

      if (error) throw error;

      // Créer les enregistrements de documents si on a un client_id
      if (data && data.length > 0 && data[0].client_id && uploadedDocuments.length > 0) {
        const clientId = data[0].client_id;
        const formId = form.id;

        for (const doc of uploadedDocuments) {
          await supabase.from('client_documents').insert({
            client_id: clientId,
            form_id: formId,
            document_type: doc.type,
            file_name: doc.fileName,
            file_path: doc.filePath,
            file_size: doc.fileSize,
            mime_type: doc.mimeType
          });
        }
      }

      setSubmitted(true);
      toast.success('Formulaire soumis avec succès !');
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error(error.message || 'Erreur lors de la soumission du formulaire');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-blue-50">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            <p className="text-center text-muted-foreground">Chargement...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-blue-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Formulaire soumis avec succès !</CardTitle>
            <CardDescription>
              Merci d'avoir complété vos informations. Votre fiche client a été créée et notre équipe en sera notifiée.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-blue-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-orange-600" />
            </div>
            <CardTitle className="text-2xl">Formulaire introuvable</CardTitle>
            <CardDescription>
              Ce lien n'est pas valide ou a expiré.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 p-4 py-8">
      <Card className="w-full max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">Formulaire d'informations client</CardTitle>
          <CardDescription>
            Merci de remplir ce formulaire avec vos informations. Toutes les données sont sécurisées et confidentielles. Les champs marqués d'un * sont obligatoires.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* 1) INFORMATIONS PERSONNELLES */}
            <div className="space-y-4 p-6 bg-white rounded-lg border">
              <h3 className="text-xl font-bold text-orange-600 mb-4">1. Informations personnelles</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input id="nom" required value={formData.nom} 
                    onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input id="prenom" required value={formData.prenom}
                    onChange={(e) => setFormData(prev => ({ ...prev, prenom: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom_naissance">Nom de naissance</Label>
                  <Input id="nom_naissance" value={formData.nom_naissance}
                    onChange={(e) => setFormData(prev => ({ ...prev, nom_naissance: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_naissance">Date de naissance *</Label>
                  <Input id="date_naissance" type="date" required value={formData.date_naissance}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_naissance: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lieu_naissance">Lieu de naissance *</Label>
                  <Input id="lieu_naissance" required value={formData.lieu_naissance}
                    onChange={(e) => setFormData(prev => ({ ...prev, lieu_naissance: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationalite">Nationalité *</Label>
                  <Input id="nationalite" required value={formData.nationalite}
                    onChange={(e) => setFormData(prev => ({ ...prev, nationalite: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse complète (n°, rue) *</Label>
                <Input id="adresse" required value={formData.adresse}
                  onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code_postal">Code postal *</Label>
                  <Input id="code_postal" required value={formData.code_postal}
                    onChange={(e) => setFormData(prev => ({ ...prev, code_postal: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville *</Label>
                  <Input id="ville" required value={formData.ville}
                    onChange={(e) => setFormData(prev => ({ ...prev, ville: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pays">Pays *</Label>
                  <Input id="pays" required value={formData.pays}
                    onChange={(e) => setFormData(prev => ({ ...prev, pays: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone portable *</Label>
                  <Input id="telephone" type="tel" required value={formData.telephone}
                    onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse e-mail *</Label>
                  <Input id="email" type="email" required value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="situation_familiale">Situation familiale *</Label>
                  <Select value={formData.situation_familiale} required
                    onValueChange={(value) => setFormData(prev => ({ ...prev, situation_familiale: value }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="celibataire">Célibataire</SelectItem>
                      <SelectItem value="marie">Marié(e)</SelectItem>
                      <SelectItem value="pacse">Pacsé(e)</SelectItem>
                      <SelectItem value="divorce">Divorcé(e)</SelectItem>
                      <SelectItem value="veuf">Veuf/Veuve</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regime_matrimonial">Régime matrimonial</Label>
                  <Select value={formData.regime_matrimonial}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, regime_matrimonial: value }))}>
                    <SelectTrigger><SelectValue placeholder="Si marié(e)..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="communaute_legale">Communauté légale</SelectItem>
                      <SelectItem value="communaute_universelle">Communauté universelle</SelectItem>
                      <SelectItem value="separation_biens">Séparation de biens</SelectItem>
                      <SelectItem value="participation_acquets">Participation aux acquêts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="enfants">Avez-vous des enfants ? *</Label>
                  <Select value={formData.enfants} required
                    onValueChange={(value) => setFormData(prev => ({ ...prev, enfants: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">Oui</SelectItem>
                      <SelectItem value="non">Non</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.enfants === 'oui' && (
                  <div className="space-y-2">
                    <Label htmlFor="enfants_details">Nombre et dates de naissance</Label>
                    <Textarea id="enfants_details" placeholder="Ex: 2 enfants - Jean (15/03/2010), Marie (22/08/2015)" 
                      value={formData.enfants_details}
                      onChange={(e) => setFormData(prev => ({ ...prev, enfants_details: e.target.value }))} />
                  </div>
                )}
              </div>
            </div>

            {/* 2) IDENTITÉ / VÉRIFICATION */}
            <div className="space-y-4 p-6 bg-white rounded-lg border">
              <h3 className="text-xl font-bold text-orange-600 mb-4">2. Identité / Vérification</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type_piece_identite">Type de pièce d'identité *</Label>
                  <Select value={formData.type_piece_identite} required
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type_piece_identite: value }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cni">Carte Nationale d'Identité</SelectItem>
                      <SelectItem value="passeport">Passeport</SelectItem>
                      <SelectItem value="titre_sejour">Titre de séjour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero_piece">Numéro de la pièce *</Label>
                  <Input id="numero_piece" required value={formData.numero_piece}
                    onChange={(e) => setFormData(prev => ({ ...prev, numero_piece: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_expiration_piece">Date d'expiration *</Label>
                  <Input id="date_expiration_piece" type="date" required value={formData.date_expiration_piece}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_expiration_piece: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="piece_identite_upload">Pièce d'identité (recto/verso) *</Label>
                <Input 
                  id="piece_identite_upload" 
                  type="file" 
                  accept="image/*,.pdf"
                  multiple
                  required
                  onChange={(e) => setPieceIdentiteFiles(e.target.files)}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">Formats acceptés : JPG, PNG, PDF (2 fichiers max : recto + verso)</p>
                {pieceIdentiteFiles && pieceIdentiteFiles.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {Array.from(pieceIdentiteFiles).map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const dt = new DataTransfer();
                            Array.from(pieceIdentiteFiles)
                              .filter((_, i) => i !== index)
                              .forEach(f => dt.items.add(f));
                            setPieceIdentiteFiles(dt.files.length > 0 ? dt.files : null);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3) COORDONNÉES PROFESSIONNELLES */}
            <div className="space-y-4 p-6 bg-white rounded-lg border">
              <h3 className="text-xl font-bold text-orange-600 mb-4">3. Coordonnées professionnelles</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profession">Profession *</Label>
                  <Input id="profession" required value={formData.profession}
                    onChange={(e) => setFormData(prev => ({ ...prev, profession: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statut_professionnel">Statut *</Label>
                  <Select value={formData.statut_professionnel} required
                    onValueChange={(value) => setFormData(prev => ({ ...prev, statut_professionnel: value }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salarie">Salarié</SelectItem>
                      <SelectItem value="independant">Indépendant</SelectItem>
                      <SelectItem value="fonctionnaire">Fonctionnaire</SelectItem>
                      <SelectItem value="dirigeant">Dirigeant</SelectItem>
                      <SelectItem value="retraite">Retraité</SelectItem>
                      <SelectItem value="etudiant">Étudiant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeur">Employeur</Label>
                  <Input id="employeur" value={formData.employeur}
                    onChange={(e) => setFormData(prev => ({ ...prev, employeur: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone_professionnel">Téléphone professionnel</Label>
                  <Input id="telephone_professionnel" type="tel" value={formData.telephone_professionnel}
                    onChange={(e) => setFormData(prev => ({ ...prev, telephone_professionnel: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adresse_professionnelle">Adresse professionnelle</Label>
                <Input id="adresse_professionnelle" value={formData.adresse_professionnelle}
                  onChange={(e) => setFormData(prev => ({ ...prev, adresse_professionnelle: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_professionnel">E-mail professionnel</Label>
                <Input id="email_professionnel" type="email" value={formData.email_professionnel}
                  onChange={(e) => setFormData(prev => ({ ...prev, email_professionnel: e.target.value }))} />
              </div>
            </div>

            {/* 4) SITUATION FINANCIÈRE */}
            <div className="space-y-4 p-6 bg-white rounded-lg border">
              <h3 className="text-xl font-bold text-orange-600 mb-4">4. Situation financière</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="revenu_annuel">Revenu annuel estimé *</Label>
                  <Select value={formData.revenu_annuel} required
                    onValueChange={(value) => setFormData(prev => ({ ...prev, revenu_annuel: value }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="moins_20k">Moins de 20 000€</SelectItem>
                      <SelectItem value="20k_40k">20 000€ - 40 000€</SelectItem>
                      <SelectItem value="40k_60k">40 000€ - 60 000€</SelectItem>
                      <SelectItem value="60k_100k">60 000€ - 100 000€</SelectItem>
                      <SelectItem value="100k_plus">Plus de 100 000€</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="situation_fiscale">Résidence fiscale *</Label>
                  <Select value={formData.situation_fiscale} required
                    onValueChange={(value) => setFormData(prev => ({ ...prev, situation_fiscale: value }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="france">Résident fiscal France</SelectItem>
                      <SelectItem value="etranger">Autre pays</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="patrimoine_immobilier">Avez-vous un patrimoine immobilier ? *</Label>
                <Select value={formData.patrimoine_immobilier} required
                  onValueChange={(value) => setFormData(prev => ({ ...prev, patrimoine_immobilier: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oui">Oui</SelectItem>
                    <SelectItem value="non">Non</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.patrimoine_immobilier === 'oui' && (
                <div className="space-y-2">
                  <Label htmlFor="patrimoine_immobilier_details">Détails du patrimoine immobilier</Label>
                  <Textarea id="patrimoine_immobilier_details" placeholder="Ex: Résidence principale à Paris, appartement locatif à Lyon..."
                    value={formData.patrimoine_immobilier_details}
                    onChange={(e) => setFormData(prev => ({ ...prev, patrimoine_immobilier_details: e.target.value }))} />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="comptes_bancaires">Comptes bancaires (Banque + pays)</Label>
                <Textarea id="comptes_bancaires" placeholder="Ex: BNP Paribas (France), Credit Suisse (Suisse)..."
                  value={formData.comptes_bancaires}
                  onChange={(e) => setFormData(prev => ({ ...prev, comptes_bancaires: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="credits_en_cours">Crédits en cours</Label>
                <Textarea id="credits_en_cours" placeholder="Ex: Crédit immobilier 200k€, crédit auto 15k€..."
                  value={formData.credits_en_cours}
                  onChange={(e) => setFormData(prev => ({ ...prev, credits_en_cours: e.target.value }))} />
              </div>
            </div>

            {/* 5) ADRESSE DE FACTURATION */}
            <div className="space-y-4 p-6 bg-white rounded-lg border">
              <h3 className="text-xl font-bold text-orange-600 mb-4">5. Adresse de facturation</h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox id="facturation_identique" 
                  checked={formData.facturation_identique}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, facturation_identique: !!checked }))} />
                <Label htmlFor="facturation_identique">Identique à l'adresse principale</Label>
              </div>

              {!formData.facturation_identique && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="adresse_facturation">Adresse de facturation *</Label>
                    <Input id="adresse_facturation" required value={formData.adresse_facturation}
                      onChange={(e) => setFormData(prev => ({ ...prev, adresse_facturation: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code_postal_facturation">Code postal *</Label>
                      <Input id="code_postal_facturation" required value={formData.code_postal_facturation}
                        onChange={(e) => setFormData(prev => ({ ...prev, code_postal_facturation: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ville_facturation">Ville *</Label>
                      <Input id="ville_facturation" required value={formData.ville_facturation}
                        onChange={(e) => setFormData(prev => ({ ...prev, ville_facturation: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pays_facturation">Pays *</Label>
                      <Input id="pays_facturation" required value={formData.pays_facturation}
                        onChange={(e) => setFormData(prev => ({ ...prev, pays_facturation: e.target.value }))} />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_tva">N° TVA (si entreprise)</Label>
                  <Input id="numero_tva" value={formData.numero_tva}
                    onChange={(e) => setFormData(prev => ({ ...prev, numero_tva: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siret">SIRET (si entreprise)</Label>
                  <Input id="siret" value={formData.siret}
                    onChange={(e) => setFormData(prev => ({ ...prev, siret: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* 6) MANDAT / REPRÉSENTATION */}
            <div className="space-y-4 p-6 bg-white rounded-lg border">
              <h3 className="text-xl font-bold text-orange-600 mb-4">6. Mandat / Représentation</h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox id="agit_nom_propre" 
                  checked={formData.agit_nom_propre}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agit_nom_propre: !!checked }))} />
                <Label htmlFor="agit_nom_propre">J'agis en mon nom propre</Label>
              </div>

              {!formData.agit_nom_propre && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom_personne_representee">Nom de la personne représentée *</Label>
                      <Input id="nom_personne_representee" required value={formData.nom_personne_representee}
                        onChange={(e) => setFormData(prev => ({ ...prev, nom_personne_representee: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prenom_personne_representee">Prénom de la personne représentée *</Label>
                      <Input id="prenom_personne_representee" required value={formData.prenom_personne_representee}
                        onChange={(e) => setFormData(prev => ({ ...prev, prenom_personne_representee: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lien_representation">Lien avec la personne représentée *</Label>
                    <Input id="lien_representation" required placeholder="Ex: Tuteur légal, mandataire judiciaire..."
                      value={formData.lien_representation}
                      onChange={(e) => setFormData(prev => ({ ...prev, lien_representation: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mandat_upload">Justificatif de représentation (mandat, jugement, procuration) *</Label>
                    <Input 
                      id="mandat_upload" 
                      type="file" 
                      accept="image/*,.pdf"
                      required
                      onChange={(e) => setMandatFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">Formats acceptés : JPG, PNG, PDF</p>
                    {mandatFile && (
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{mandatFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setMandatFile(null)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          ✕
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* 7) OBJET DU DOSSIER */}
            <div className="space-y-4 p-6 bg-white rounded-lg border">
              <h3 className="text-xl font-bold text-orange-600 mb-4">7. Objet du dossier / Besoin</h3>
              
              <div className="space-y-2">
                <Label htmlFor="type_dossier">Type de dossier *</Label>
                <Select value={formData.type_dossier} required
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type_dossier: value }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="divorce">Divorce</SelectItem>
                    <SelectItem value="contrat">Contrat</SelectItem>
                    <SelectItem value="vente_immobiliere">Vente immobilière</SelectItem>
                    <SelectItem value="achat_immobilier">Achat immobilier</SelectItem>
                    <SelectItem value="succession">Succession</SelectItem>
                    <SelectItem value="donation">Donation</SelectItem>
                    <SelectItem value="litige">Litige</SelectItem>
                    <SelectItem value="creation_societe">Création de société</SelectItem>
                    <SelectItem value="mariage">Mariage</SelectItem>
                    <SelectItem value="pacs">PACS</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objet_dossier">Objet précis du dossier *</Label>
                <Input id="objet_dossier" required placeholder="Ex: Divorce amiable, Vente appartement Paris 11e..."
                  value={formData.objet_dossier}
                  onChange={(e) => setFormData(prev => ({ ...prev, objet_dossier: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description_besoin">Description de votre besoin *</Label>
                <Textarea id="description_besoin" required rows={5}
                  placeholder="Décrivez en détail votre situation et vos besoins..."
                  value={formData.description_besoin}
                  onChange={(e) => setFormData(prev => ({ ...prev, description_besoin: e.target.value }))} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="urgence">Niveau d'urgence *</Label>
                  <Select value={formData.urgence} required
                    onValueChange={(value) => setFormData(prev => ({ ...prev, urgence: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="faible">Faible</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_limite">Date limite (si applicable)</Label>
                  <Input id="date_limite" type="date" value={formData.date_limite}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_limite: e.target.value }))} />
                </div>
              </div>

              {/* Pour les notaires */}
              {(formData.type_dossier === 'vente_immobiliere' || formData.type_dossier === 'achat_immobilier' || 
                formData.type_dossier === 'succession' || formData.type_dossier === 'donation' ||
                formData.type_dossier === 'mariage' || formData.type_dossier === 'pacs') && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="type_acte_notaire">Type d'acte notarié</Label>
                    <Select value={formData.type_acte_notaire}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, type_acte_notaire: value }))}>
                      <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vente">Vente</SelectItem>
                        <SelectItem value="achat">Achat</SelectItem>
                        <SelectItem value="succession">Succession</SelectItem>
                        <SelectItem value="donation">Donation</SelectItem>
                        <SelectItem value="mariage">Contrat de mariage</SelectItem>
                        <SelectItem value="pacs">Convention de PACS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="infos_complementaires_acte">Informations complémentaires sur l'acte</Label>
                    <Textarea id="infos_complementaires_acte" rows={3}
                      placeholder="Ex: Adresse du bien, noms des vendeurs, montant de la transaction..."
                      value={formData.infos_complementaires_acte}
                      onChange={(e) => setFormData(prev => ({ ...prev, infos_complementaires_acte: e.target.value }))} />
                  </div>
                </>
              )}
            </div>

            {/* 8) DOCUMENTS À FOURNIR */}
            <div className="space-y-4 p-6 bg-white rounded-lg border">
              <h3 className="text-xl font-bold text-orange-600 mb-4">8. Documents à fournir</h3>
              
              <div className="space-y-2">
                <Label htmlFor="justificatif_domicile">Justificatif de domicile (- 3 mois) *</Label>
                <Input 
                  id="justificatif_domicile" 
                  type="file" 
                  accept="image/*,.pdf"
                  required
                  onChange={(e) => setJustificatifDomicileFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">Facture électricité, eau, gaz, internet, avis d'imposition...</p>
                {justificatifDomicileFile && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{justificatifDomicileFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setJustificatifDomicileFile(null)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      ✕
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="autres_documents">Autres documents (RIB, livret de famille, etc.)</Label>
                <Input 
                  id="autres_documents" 
                  type="file" 
                  accept="image/*,.pdf"
                  multiple
                  onChange={(e) => setAutresDocuments(e.target.files)}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">Vous pouvez uploader plusieurs fichiers (RIB, livret de famille, contrats...)</p>
                {autresDocuments && autresDocuments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {Array.from(autresDocuments).map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const dt = new DataTransfer();
                            Array.from(autresDocuments)
                              .filter((_, i) => i !== index)
                              .forEach(f => dt.items.add(f));
                            setAutresDocuments(dt.files.length > 0 ? dt.files : null);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm text-blue-800">
                  💡 <strong>Conseil :</strong> Préparez tous vos documents au format numérique avant de commencer. Formats acceptés : JPG, PNG, PDF.
                </p>
              </div>
            </div>

            {/* 9) PRÉFÉRENCES DE COMMUNICATION */}
            <div className="space-y-4 p-6 bg-white rounded-lg border">
              <h3 className="text-xl font-bold text-orange-600 mb-4">9. Préférences de communication</h3>
              
              <div className="space-y-2">
                <Label htmlFor="preference_communication">Comment souhaitez-vous être contacté ? *</Label>
                <Select value={formData.preference_communication} required
                  onValueChange={(value) => setFormData(prev => ({ ...prev, preference_communication: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="telephone">Téléphone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 10) NOTES COMPLÉMENTAIRES */}
            <div className="space-y-4 p-6 bg-white rounded-lg border">
              <h3 className="text-xl font-bold text-orange-600 mb-4">10. Informations complémentaires</h3>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes ou remarques</Label>
                <Textarea id="notes" rows={4}
                  placeholder="Ajoutez ici toute information complémentaire que vous jugez utile..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
              </div>
            </div>

            {/* 11) CONSENTEMENTS & RGPD */}
            <div className="space-y-4 p-6 bg-orange-50 rounded-lg border-2 border-orange-300">
              <h3 className="text-xl font-bold text-orange-700 mb-4">11. Consentements obligatoires *</h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox id="consentement_rgpd" 
                    checked={formData.consentement_rgpd}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, consentement_rgpd: !!checked }))} />
                  <Label htmlFor="consentement_rgpd" className="text-sm leading-relaxed cursor-pointer">
                    J'autorise le traitement de mes données personnelles conformément au RGPD et à la réglementation en vigueur. *
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox id="acceptation_cgu" 
                    checked={formData.acceptation_cgu}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, acceptation_cgu: !!checked }))} />
                  <Label htmlFor="acceptation_cgu" className="text-sm leading-relaxed cursor-pointer">
                    J'accepte les Conditions Générales d'Utilisation et la Politique de confidentialité de Neira. *
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox id="acceptation_conservation" 
                    checked={formData.acceptation_conservation}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, acceptation_conservation: !!checked }))} />
                  <Label htmlFor="acceptation_conservation" className="text-sm leading-relaxed cursor-pointer">
                    J'accepte la conservation de mes documents et données pour la durée nécessaire au traitement de mon dossier. *
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox id="autorisation_contact" 
                    checked={formData.autorisation_contact}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autorisation_contact: !!checked }))} />
                  <Label htmlFor="autorisation_contact" className="text-sm leading-relaxed cursor-pointer">
                    J'autorise le cabinet à me contacter concernant mes dossiers et les services proposés. *
                  </Label>
                </div>
              </div>

              <div className="mt-4 p-3 bg-white rounded border border-orange-200">
                <p className="text-xs text-gray-600">
                  Vos données sont stockées de manière sécurisée et ne seront jamais vendues à des tiers. 
                  Vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles. 
                  Pour exercer ces droits, contactez-nous à l'adresse indiquée sur le site.
                </p>
              </div>
            </div>

            {/* BOUTON DE SOUMISSION */}
            <div className="flex justify-center pt-6">
              <Button 
                type="submit" 
                size="lg"
                className="bg-orange-600 hover:bg-orange-700 text-white px-12 py-6 text-lg"
                disabled={submitting || !formData.consentement_rgpd || !formData.acceptation_cgu || 
                         !formData.acceptation_conservation || !formData.autorisation_contact}
              >
                {submitting ? (
                  <>Envoi en cours...</>
                ) : (
                  <>✓ Soumettre le formulaire</>
                )}
              </Button>
            </div>

            {(!formData.consentement_rgpd || !formData.acceptation_cgu || 
              !formData.acceptation_conservation || !formData.autorisation_contact) && (
              <p className="text-center text-sm text-red-600">
                Vous devez accepter tous les consentements obligatoires pour soumettre le formulaire.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
