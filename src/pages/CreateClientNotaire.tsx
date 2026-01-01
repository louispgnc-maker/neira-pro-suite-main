import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Upload, ArrowLeft } from "lucide-react";

interface ChildEntry { nom: string; prenom: string; sexe: string; date_naissance: string; }

export default function CreateClientNotaire() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const role = 'notaire' as const;
  const mainButtonColor = 'bg-orange-600 hover:bg-orange-700 text-white';
  const itemHover = 'cursor-pointer hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white';

  const [loading, setLoading] = useState(false);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);

  // 1. Informations personnelles
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nomNaissance, setNomNaissance] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [lieuNaissance, setLieuNaissance] = useState("");
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");
  const [pays, setPays] = useState("France");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [nationalite, setNationalite] = useState("");
  const [sexe, setSexe] = useState("");

  // 2. Identification officielle
  const [typeIdentite, setTypeIdentite] = useState("");
  const [numeroIdentite, setNumeroIdentite] = useState("");
  const [dateExpiration, setDateExpiration] = useState("");
  const [paysDelivrance, setPaysDelivrance] = useState("France");
  const [kycStatus, setKycStatus] = useState<'Valide' | 'Expiré' | 'Incomplet' | ''>('');

  // 3. Situation familiale
  const [etatCivil, setEtatCivil] = useState("");
  
  // Gardé pour compatibilité base de données (non affiché dans le formulaire)
  const [enfants] = useState<ChildEntry[]>([]);

  // 4. Situation professionnelle
  const [profession, setProfession] = useState("");
  const [statutPro, setStatutPro] = useState("");
  const [employeur, setEmployeur] = useState("");

  // 5. Facturation
  const [adresseFacturationIdentique, setAdresseFacturationIdentique] = useState(true);
  const [adresseFacturation, setAdresseFacturation] = useState("");
  const [numeroTVA, setNumeroTVA] = useState("");
  const [siret, setSiret] = useState("");

  // 6. Mandat/Représentation
  const [agitNomPropre, setAgitNomPropre] = useState(true);
  const [representant, setRepresentant] = useState("");

  // 7. Préférences de communication
  const [modeContact, setModeContact] = useState("email");
  const [whatsapp, setWhatsapp] = useState("");
  const [plageHoraire, setPlageHoraire] = useState("");

  // 8. Informations complémentaires
  const [notes, setNotes] = useState("");

  // 9. Consentements
  // 9. Consentements
  const [consentementRGPD, setConsentementRGPD] = useState(false);
  const [acceptationCGU, setAcceptationCGU] = useState(false);
  const [acceptationConservation, setAcceptationConservation] = useState(false);
  const [autorisationContact, setAutorisationContact] = useState(false);
  const [signatureMandat, setSignatureMandat] = useState(false);

  // Calcul automatique du statut KYC
  useEffect(() => {
    if (!typeIdentite || !numeroIdentite) {
      setKycStatus('Incomplet');
      return;
    }
    
    if (dateExpiration) {
      const expDate = new Date(dateExpiration);
      const today = new Date();
      if (expDate < today) {
        setKycStatus('Expiré');
        return;
      }
    }
    
    setKycStatus('Valide');
  }, [typeIdentite, numeroIdentite, dateExpiration]);

  // Fonctions utilitaires pour compatibilité (non utilisées dans formulaire simplifié)
  const handleAddChild = () => setEnfants(prev => [...prev, { nom: '', prenom: '', sexe: '', date_naissance: '' }]);
  const handleChildChange = (index: number, field: keyof ChildEntry, value: string) => {
    setEnfants(prev => prev.map((c,i) => i === index ? { ...c, [field]: value } : c));
  };
  const handleRemoveChild = (index: number) => setEnfants(prev => prev.filter((_,i) => i !== index));

  const handleFileSelect = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = ['image/jpeg','image/png','image/jpg','application/pdf'];
    if (!valid.includes(file.type)) {
      toast.error('Format non supporté', { description: 'JPG, PNG ou PDF uniquement.' });
      return;
    }
    setIdDocFile(file);
    toast.success('Fichier sélectionné', { description: file.name });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Connexion requise'); return; }
    if (!nom || !prenom || !email) {
      toast.error('Champs obligatoires manquants', { description: 'Nom, prénom et email requis.' });
      return;
    }
    if (!consentementRGPD || !acceptationCGU || !acceptationConservation || !autorisationContact) {
      toast.error('Tous les consentements marqués * sont requis');
      return;
    }
    setLoading(true);
    try {
      let idDocPath: string | null = null;
      if (idDocFile) {
        const fileName = `${user.id}/${Date.now()}-${idDocFile.name}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, idDocFile, { cacheControl: '3600', upsert: false });
        if (uploadError) throw new Error(uploadError.message);
        idDocPath = fileName;
      }

      // Situation familiale simplifiée
      const situationFamilialeData = etatCivil ? { situation_familiale: etatCivil } : null;

      const { data: inserted, error: insertErr } = await supabase.from('clients').insert({
        owner_id: user.id,
        role,
        name: `${prenom} ${nom}`,
        nom,
        prenom,
        date_naissance: dateNaissance || null,
        lieu_naissance: lieuNaissance || null,
        adresse: adresse || null,
        code_postal: codePostal || null,
        ville: ville || null,
        pays: pays || 'France',
        telephone: telephone || null,
        email,
        nationalite: nationalite || null,
        sexe: sexe || null,
        etat_civil: etatCivil || null,
        type_identite: typeIdentite || null,
        numero_identite: numeroIdentite || null,
        date_expiration_identite: dateExpiration || null,
        pays_delivrance_identite: paysDelivrance || 'France',
        id_doc_path: idDocPath,
        kyc_status: kycStatus || 'Incomplet',
        situation_familiale: situationFamilialeData,
        enfants: null,
        profession: profession || null,
        statut_professionnel: statutPro || null,
        employeur: employeur || null,
        adresse_professionnelle: null,
        telephone_professionnel: null,
        email_professionnel: null,
        revenus: null,
        situation_fiscale: null,
        patrimoine_immobilier: null,
        credits_en_cours: null,
        justificatifs_financiers: null,
        comptes_bancaires: null,
        adresse_facturation_identique: adresseFacturationIdentique,
        adresse_facturation: adresseFacturationIdentique ? null : (adresseFacturation || null),
        numero_tva: numeroTVA || null,
        siret: siret || null,
        agit_nom_propre: agitNomPropre,
        nom_representant: agitNomPropre ? null : (representant || null),
        type_dossier: null,
        objet_dossier: null,
        description_besoin: null,
        historique_litiges: null,
        urgence: null,
        date_limite: null,
        contrat_souhaite: null,
        documents_objet: null,
        preference_communication: modeContact || 'email',
        whatsapp: whatsapp || null,
        plage_horaire: plageHoraire || null,
        notes: notes || null,
        consentement_rgpd: consentementRGPD,
        acceptation_conservation: acceptationConservation,
        autorisation_contact: autorisationContact,
        signature_mandat: signatureMandat,
        source: 'manuel'
      }).select('id').single();

      if (insertErr) throw insertErr;

      toast.success('Fiche client créée avec succès');
      navigate('/notaires/clients');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(err);
      toast.error('Erreur création client', { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/notaires/clients')}
            className="hover:bg-orange-100 hover:text-orange-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Créer une fiche client (Notaire)</h1>
            <p className="text-muted-foreground mt-1">Renseignez les informations nécessaires à l'acte.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle>1. Informations personnelles</CardTitle>
              <CardDescription>Données d'identité du client</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input id="nom" value={nom} onChange={e => setNom(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input id="prenom" value={prenom} onChange={e => setPrenom(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nomNaissance">Nom de naissance (optionnel)</Label>
                <Input id="nomNaissance" value={nomNaissance} onChange={e => setNomNaissance(e.target.value)} placeholder="Si différent du nom actuel" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateNaissance">Date de naissance *</Label>
                  <Input id="dateNaissance" type="date" value={dateNaissance} onChange={e => setDateNaissance(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lieuNaissance">Lieu de naissance *</Label>
                  <Input id="lieuNaissance" value={lieuNaissance} onChange={e => setLieuNaissance(e.target.value)} placeholder="Ville, Pays" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse complète (n°, rue) *</Label>
                <Textarea id="adresse" rows={2} value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Numéro et nom de rue" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codePostal">Code postal *</Label>
                  <Input id="codePostal" value={codePostal} onChange={e => setCodePostal(e.target.value)} placeholder="75001" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville *</Label>
                  <Input id="ville" value={ville} onChange={e => setVille(e.target.value)} placeholder="Paris" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pays">Pays *</Label>
                  <Input id="pays" value={pays} onChange={e => setPays(e.target.value)} placeholder="France" required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone portable *</Label>
                  <Input id="telephone" type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+33 6 12 34 56 78" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse e-mail *</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.fr" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationalite">Nationalité *</Label>
                <Input id="nationalite" value={nationalite} onChange={e => setNationalite(e.target.value)} placeholder="Française" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sexe">Sexe (facultatif - donnée sensible RGPD)</Label>
                <Select value={sexe} onValueChange={setSexe}>
                  <SelectTrigger id="sexe"><SelectValue placeholder="Non renseigné" /></SelectTrigger>
                  <SelectContent className="bg-orange-50 border-orange-200">
                    <SelectItem className={itemHover} value="Homme">Homme</SelectItem>
                    <SelectItem className={itemHover} value="Femme">Femme</SelectItem>
                    <SelectItem className={itemHover} value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Cette information est facultative conformément au RGPD</p>
              </div>
            </CardContent>
          </Card>

          {/* 2. Identification officielle */}
          <Card>
            <CardHeader>
              <CardTitle>2. Identification officielle (KYC)</CardTitle>
              <CardDescription>Pièce d'identité et vérification LCB-FT</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="typeIdentite">Type de pièce d'identité</Label>
                  <Select value={typeIdentite} onValueChange={setTypeIdentite}>
                    <SelectTrigger id="typeIdentite"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent className="bg-orange-50 border-orange-200">
                      <SelectItem className={itemHover} value="CNI">Carte Nationale d'Identité</SelectItem>
                      <SelectItem className={itemHover} value="Passeport">Passeport</SelectItem>
                      <SelectItem className={itemHover} value="Titre de séjour">Titre de séjour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numeroIdentite">Numéro de la pièce</Label>
                  <Input id="numeroIdentite" value={numeroIdentite} onChange={e => setNumeroIdentite(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateExpiration">Date d'expiration</Label>
                  <Input id="dateExpiration" type="date" value={dateExpiration} onChange={e => setDateExpiration(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paysDelivrance">Pays de délivrance</Label>
                  <Input id="paysDelivrance" value={paysDelivrance} onChange={e => setPaysDelivrance(e.target.value)} placeholder="France" />
                </div>
              </div>
              
              {kycStatus && (
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Statut KYC:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      kycStatus === 'Valide' ? 'bg-green-100 text-green-800' :
                      kycStatus === 'Expiré' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {kycStatus}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {kycStatus === 'Valide' && 'Document valide et conforme'}
                    {kycStatus === 'Expiré' && 'Document expiré - mise à jour requise'}
                    {kycStatus === 'Incomplet' && 'Veuillez renseigner le type et le numéro'}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Scan ou photo du document</Label>
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                <Button type="button" variant="outline" onClick={handleFileSelect} className="w-full bg-orange-50 hover:bg-orange-100 text-orange-900 border-orange-200">
                  <Upload className="mr-2 h-4 w-4" />
                  {idDocFile ? idDocFile.name : 'Choisir un fichier'}
                </Button>
                <p className="text-xs text-muted-foreground">Formats: JPG, PNG, PDF</p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Situation familiale */}
          <Card>
            <CardHeader>
              <CardTitle>3. Situation familiale (optionnel)</CardTitle>
              <CardDescription>Informations basiques sur la situation familiale</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="etatCivil">Situation familiale</Label>
                <Select value={etatCivil} onValueChange={setEtatCivil}>
                  <SelectTrigger id="etatCivil"><SelectValue placeholder="Non renseigné" /></SelectTrigger>
                  <SelectContent className="bg-orange-50 border-orange-200">
                    <SelectItem className={itemHover} value="Célibataire">Célibataire</SelectItem>
                    <SelectItem className={itemHover} value="Marié(e)">Marié(e)</SelectItem>
                    <SelectItem className={itemHover} value="Pacsé(e)">Pacsé(e)</SelectItem>
                    <SelectItem className={itemHover} value="Divorcé(e)">Divorcé(e)</SelectItem>
                    <SelectItem className={itemHover} value="Veuf(ve)">Veuf(ve)</SelectItem>
                    <SelectItem className={itemHover} value="Concubinage">Concubinage</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Cette information est facultative et ne sera utilisée que si nécessaire pour le dossier juridique</p>
              </div>
            </CardContent>
          </Card>

          {/* 4. Situation professionnelle */}
          <Card>
            <CardHeader>
              <CardTitle>4. Situation professionnelle (optionnel)</CardTitle>
              <CardDescription>Informations professionnelles de base</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profession">Profession</Label>
                  <Input id="profession" value={profession} onChange={e => setProfession(e.target.value)} placeholder="Ex: Ingénieur, Médecin..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statutPro">Statut professionnel</Label>
                  <Select value={statutPro} onValueChange={setStatutPro}>
                    <SelectTrigger id="statutPro"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent className="bg-orange-50 border-orange-200">
                      <SelectItem className={itemHover} value="salarie">Salarié(e)</SelectItem>
                      <SelectItem className={itemHover} value="independant">Indépendant(e)</SelectItem>
                      <SelectItem className={itemHover} value="retraite">Retraité(e)</SelectItem>
                      <SelectItem className={itemHover} value="sans_emploi">Sans emploi</SelectItem>
                      <SelectItem className={itemHover} value="etudiant">Étudiant(e)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeur">Employeur (optionnel)</Label>
                <Input id="employeur" value={employeur} onChange={e => setEmployeur(e.target.value)} placeholder="Nom de l'entreprise ou organisation" />
                <p className="text-xs text-muted-foreground">Les informations financières détaillées seront demandées dans le dossier si nécessaire</p>
              </div>
            </CardContent>
          </Card>

          {/* 4.5 Adresse de facturation */}
          <Card>
            <CardHeader>
              <CardTitle>4.5 Adresse de facturation</CardTitle>
              <CardDescription>Informations de facturation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="facturationIdentique" 
                  checked={adresseFacturationIdentique} 
                  onCheckedChange={(c) => setAdresseFacturationIdentique(c as boolean)} 
                />
                <Label htmlFor="facturationIdentique" className="text-sm font-medium cursor-pointer">
                  L'adresse de facturation est identique à l'adresse principale
                </Label>
              </div>
              
              {!adresseFacturationIdentique && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="adresseFacturation">Adresse de facturation</Label>
                    <Input 
                      id="adresseFacturation" 
                      value={adresseFacturation} 
                      onChange={e => setAdresseFacturation(e.target.value)} 
                      placeholder="Numéro et nom de rue"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numeroTVA">Numéro de TVA (si applicable)</Label>
                  <Input id="numeroTVA" value={numeroTVA} onChange={e => setNumeroTVA(e.target.value)} placeholder="FR..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siret">SIRET (si entreprise)</Label>
                  <Input id="siret" value={siret} onChange={e => setSiret(e.target.value)} placeholder="123 456 789 00012" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4.6 Mandat et représentation */}
          <Card>
            <CardHeader>
              <CardTitle>4.6 Mandat et représentation</CardTitle>
              <CardDescription>Agissez-vous pour votre propre compte ?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Je représente :</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="representant" 
                      value="moi" 
                      checked={agitNomPropre} 
                      onChange={() => setAgitNomPropre(true)} 
                      className="h-4 w-4" 
                    />
                    <span className="text-sm">Moi-même (mon propre compte)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="representant" 
                      value="autre" 
                      checked={!agitNomPropre} 
                      onChange={() => setAgitNomPropre(false)} 
                      className="h-4 w-4" 
                    />
                    <span className="text-sm">Une autre personne / entité</span>
                  </label>
                </div>
              </div>
              
              {!agitNomPropre && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="representant">Nom de la personne/entité représentée</Label>
                  <Input 
                    id="representant" 
                    value={representant} 
                    onChange={e => setRepresentant(e.target.value)} 
                    placeholder="Nom complet ou raison sociale"
                  />
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                    <p className="text-sm text-blue-900">
                      💡 <strong>Conseil :</strong> Si cette personne ou entité n'a pas encore de fiche client, 
                      vous pourrez créer une fiche dédiée après l'enregistrement de ce client. 
                      Cela permet de gérer les représentations familiales, sociétés, ou mandats spécifiques.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Préférences de communication */}
          <Card>
            <CardHeader>
              <CardTitle>5. Préférences de communication</CardTitle>
              <CardDescription>Comment souhaitez-vous être contacté ?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modeContact">Mode de contact privilégié *</Label>
                <Select value={modeContact} onValueChange={setModeContact}>
                  <SelectTrigger id="modeContact"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent className="bg-orange-50 border-orange-200">
                    <SelectItem className={itemHover} value="email">Email</SelectItem>
                    <SelectItem className={itemHover} value="telephone">Téléphone</SelectItem>
                    <SelectItem className={itemHover} value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem className={itemHover} value="sms">SMS</SelectItem>
                    <SelectItem className={itemHover} value="courrier">Courrier postal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="whatsapp">Numéro WhatsApp (optionnel)</Label>
                <Input 
                  id="whatsapp" 
                  type="tel"
                  value={whatsapp} 
                  onChange={e => setWhatsapp(e.target.value)} 
                  placeholder="+33 6 12 34 56 78"
                />
                <p className="text-xs text-muted-foreground">Si vous souhaitez être contacté par WhatsApp</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="plageHoraire">Plage horaire préférée (optionnel)</Label>
                <Select value={plageHoraire} onValueChange={setPlageHoraire}>
                  <SelectTrigger id="plageHoraire"><SelectValue placeholder="Aucune préférence" /></SelectTrigger>
                  <SelectContent className="bg-orange-50 border-orange-200">
                    <SelectItem className={itemHover} value="matin">Matin (9h-12h)</SelectItem>
                    <SelectItem className={itemHover} value="apres-midi">Après-midi (14h-18h)</SelectItem>
                    <SelectItem className={itemHover} value="soir">Soir (18h-20h)</SelectItem>
                    <SelectItem className={itemHover} value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 6. Notes et informations complémentaires */}
          <Card>
            <CardHeader>
              <CardTitle>6. Notes et informations complémentaires</CardTitle>
              <CardDescription>Informations générales sur le client</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes libres</Label>
                <Textarea 
                  id="notes" 
                  rows={4} 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Toute information complémentaire utile concernant ce client..."
                />
                <p className="text-xs text-muted-foreground">Les notes liées à une affaire spécifique doivent être ajoutées dans le dossier correspondant</p>
              </div>
            </CardContent>
          </Card>

          {/* 7. Consentements et mentions légales */}
          <Card>
            <CardHeader>
              <CardTitle>7. Consentements et mentions légales</CardTitle>
              <CardDescription>Acceptations obligatoires</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox id="rgpd" checked={consentementRGPD} onCheckedChange={c => setConsentementRGPD(c as boolean)} />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="rgpd" className="text-sm font-medium">J'accepte le traitement des données (RGPD) *</Label>
                  <p className="text-xs text-muted-foreground">Utilisation strictement liée à la préparation et la rédaction de l'acte.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox id="cgu" checked={acceptationCGU} onCheckedChange={c => setAcceptationCGU(c as boolean)} />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="cgu" className="text-sm font-medium">J'accepte les Conditions Générales d'Utilisation *</Label>
                  <p className="text-xs text-muted-foreground">Consultables sur le site du cabinet.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox id="conservation" checked={acceptationConservation} onCheckedChange={c => setAcceptationConservation(c as boolean)} />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="conservation" className="text-sm font-medium">J'accepte la conservation de mes données pendant la durée légale *</Label>
                  <p className="text-xs text-muted-foreground">Conservation pendant la durée du dossier + délais légaux.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox id="contact" checked={autorisationContact} onCheckedChange={c => setAutorisationContact(c as boolean)} />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="contact" className="text-sm font-medium">J'autorise le cabinet à me recontacter pour ce dossier *</Label>
                  <p className="text-xs text-muted-foreground">Par email, téléphone ou courrier selon votre préférence.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox id="mandat" checked={signatureMandat} onCheckedChange={c => setSignatureMandat(c as boolean)} />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="mandat" className="text-sm font-medium">Signature électronique du mandat / engagement</Label>
                  <p className="text-xs text-muted-foreground">Confirmation de la relation client avec le notaire.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => navigate('/notaires/clients')} disabled={loading}>Annuler</Button>
            <Button type="submit" className={mainButtonColor} disabled={loading}>{loading ? 'Création...' : 'Créer la fiche client'}</Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
