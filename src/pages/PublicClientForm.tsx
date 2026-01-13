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
import { CheckCircle2, AlertCircle, Plus, X } from 'lucide-react';

interface ClientForm {
  id: string;
  client_email: string;
  client_name: string | null;
  status: string;
  form_type: string;
  expires_at: string;
  cabinet_id: string;
}

interface Enfant {
  nom: string;
  prenom: string;
  sexe: string;
  date_naissance: string;
}

export default function PublicClientForm() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ClientForm | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [enfantsList, setEnfantsList] = useState<Enfant[]>([]);
  
  // Upload files
  const [pieceIdentiteFiles, setPieceIdentiteFiles] = useState<FileList | null>(null);
  const [mandatFile, setMandatFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    // 1) Informations personnelles
    nom: '',
    prenom: '',
    nom_naissance: '',
    date_naissance: '',
    lieu_naissance: '',
    nationalite: '',
    sexe: '',
    etat_civil: '',
    adresse: '',
    numero_rue: '',
    code_postal: '',
    ville: '',
    pays: 'France',
    telephone: '',
    email: '',
    situation_familiale: '',
    
    // 2) Identité
    type_piece_identite: '',
    numero_piece: '',
    date_expiration_piece: '',
    
    // 3) Coordonnées professionnelles
    profession: '',
    employeur: '',
    statut_professionnel: '',
    
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
    
    // 7) Préférences de communication
    preference_communication: 'email',
    
    // 11) Consentements
    consentement_rgpd: false,
    acceptation_cgu: false,
    acceptation_conservation: false,
    autorisation_contact: false,
    
    // Autres
    notes: ''
  });

  useEffect(() => {
    loadForm();
  }, [token]);

  // Auto-save form data to localStorage
  useEffect(() => {
    if (token && !submitted && form) {
      const storageKey = `client-form-${token}`;
      localStorage.setItem(storageKey, JSON.stringify(formData));
    }
  }, [formData, token, submitted, form]);

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
      
      // Try to restore from localStorage first
      const storageKey = `client-form-${token}`;
      const savedData = localStorage.getItem(storageKey);
      
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setFormData(parsed);
          toast.success('Données précédentes restaurées', { duration: 2000 });
        } catch (e) {
          console.error('Error parsing saved form data:', e);
          // If restore fails, use pre-filled data from form
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
        }
      } else {
        // No saved data, use pre-filled data from form
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

      // Submit form avec les documents uploadés et la liste des enfants
      const { data, error } = await supabase.rpc('submit_client_form', {
        form_token: token,
        form_response: {
          ...formData,
          enfants_list: enfantsList.length > 0 ? enfantsList : null,
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
      
      // Clear saved form data from localStorage after successful submission
      if (token) {
        const storageKey = `client-form-${token}`;
        localStorage.removeItem(storageKey);
      }
      
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
            <p className="text-center text-gray-600">Chargement...</p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sexe">Sexe *</Label>
                  <Select value={formData.sexe} required
                    onValueChange={(value) => setFormData(prev => ({ ...prev, sexe: value }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculin</SelectItem>
                      <SelectItem value="F">Féminin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="etat_civil">État civil *</Label>
                  <Select value={formData.etat_civil} required
                    onValueChange={(value) => setFormData(prev => ({ ...prev, etat_civil: value }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monsieur">Monsieur</SelectItem>
                      <SelectItem value="Madame">Madame</SelectItem>
                      <SelectItem value="Mademoiselle">Mademoiselle</SelectItem>
                    </SelectContent>
                  </Select>
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
              </div>

              <p className="text-xs text-gray-600 mt-2">
                Cette information est facultative. Les informations détaillées (enfants, régime matrimonial) seront collectées dans le dossier si nécessaire.
              </p>
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
                <p className="text-xs text-gray-600">Formats acceptés : JPG, PNG, PDF (2 fichiers max : recto + verso)</p>
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

              <div className="space-y-2">
                <Label htmlFor="employeur">Employeur</Label>
                <Input id="employeur" value={formData.employeur}
                  onChange={(e) => setFormData(prev => ({ ...prev, employeur: e.target.value }))} />
              </div>
            </div>



            {/* 4) ADRESSE DE FACTURATION */}
            <div className="space-y-4 p-6 bg-white rounded-lg border">
              <h3 className="text-xl font-bold text-orange-600 mb-4">4. Adresse de facturation</h3>
              
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

            {/* 5) MANDAT / REPRÉSENTATION */}
            <div className="space-y-4 p-6 bg-white rounded-lg border">
              <h3 className="text-xl font-bold text-orange-600 mb-4">5. Mandat / Représentation</h3>
              
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
                    <p className="text-xs text-gray-600">Formats acceptés : JPG, PNG, PDF</p>
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



            {/* 6) PRÉFÉRENCES DE COMMUNICATION */}
            <div className="space-y-4 p-6 bg-white rounded-lg border">
              <h3 className="text-xl font-bold text-orange-600 mb-4">6. Préférences de communication</h3>
              
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

            {/* 7) NOTES COMPLÉMENTAIRES */}
            <div className="space-y-4 p-6 bg-white rounded-lg border">
              <h3 className="text-xl font-bold text-orange-600 mb-4">7. Informations complémentaires</h3>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes ou remarques</Label>
                <Textarea id="notes" rows={4}
                  placeholder="Ajoutez ici toute information complémentaire que vous jugez utile..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
              </div>
            </div>

            {/* 8) CONSENTEMENTS & RGPD */}
            <div className="space-y-4 p-6 bg-orange-50 rounded-lg border-2 border-orange-300">
              <h3 className="text-xl font-bold text-orange-700 mb-4">8. Consentements obligatoires *</h3>
              
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
