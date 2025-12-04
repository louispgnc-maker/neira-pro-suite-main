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
import { Upload, ArrowLeft, Plus, X } from "lucide-react";
import { AVOCAT_CONTRACT_CATEGORIES } from "@/components/dashboard/ContractSelectorAvocat";
import { FAMILY_OPTIONS } from "@/lib/familyOptions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface ChildEntry { nom: string; prenom: string; sexe: string; date_naissance: string; }
interface ContratOption { id: string; name: string; type: string; category: string; }

export default function CreateClientAvocat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const role = 'avocat' as const;
  const mainButtonColor = 'bg-blue-600 hover:bg-blue-700 text-white';
  const itemHover = 'cursor-pointer hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white';

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
  const [etatCivil, setEtatCivil] = useState("");
  const [regimeMatrimonial, setRegimeMatrimonial] = useState("");
  const [aEnfants, setAEnfants] = useState("non");

  // 2. Identification officielle
  const [typeIdentite, setTypeIdentite] = useState("");
  const [numeroIdentite, setNumeroIdentite] = useState("");
  const [dateExpiration, setDateExpiration] = useState("");

  // 3. Situation familiale
  const [selectedFamily, setSelectedFamily] = useState<string[]>([]);
  const [familySearch, setFamilySearch] = useState("");
  const [enfants, setEnfants] = useState<ChildEntry[]>([]);
  const [situationFamilialeStatus, setSituationFamilialeStatus] = useState("");
  const [nombreEnfants, setNombreEnfants] = useState("0");
  const [personneACharge, setPersonneACharge] = useState("");

  // 4. Situation professionnelle et financière
  const [profession, setProfession] = useState("");
  const [statutPro, setStatutPro] = useState("");
  const [employeur, setEmployeur] = useState("");
  const [telephonePro, setTelephonePro] = useState("");
  const [adressePro, setAdressePro] = useState("");
  const [emailPro, setEmailPro] = useState("");
  const [revenus, setRevenus] = useState("");
  const [situationFiscale, setSituationFiscale] = useState("");
  const [patrimoineImmobilier, setPatrimoineImmobilier] = useState("non");
  const [justificatifsFinanciers, setJustificatifsFinanciers] = useState("");
  const [comptesBancairesRaw, setComptesBancairesRaw] = useState("");
  const [creditsEnCours, setCreditsEnCours] = useState("");

  // 5. Facturation
  const [adresseFacturationIdentique, setAdresseFacturationIdentique] = useState(true);
  const [adresseFacturation, setAdresseFacturation] = useState("");
  const [numeroTVA, setNumeroTVA] = useState("");
  const [siret, setSiret] = useState("");

  // 6. Mandat/Représentation
  const [agitNomPropre, setAgitNomPropre] = useState(true);
  const [representant, setRepresentant] = useState("");

  // 7. Documents liés à l'objet du dossier / Situation juridique
  const [typeDossier, setTypeDossier] = useState("");
  const [objetPrecis, setObjetPrecis] = useState("");
  const [descriptionBesoin, setDescriptionBesoin] = useState("");
  const [historiqueLitiges, setHistoriqueLitiges] = useState("");
  const [niveauUrgence, setNiveauUrgence] = useState("normal");
  const [dateLimite, setDateLimite] = useState("");
  const [contratSouhaite, setContratSouhaite] = useState("");
  const [documentsObjetRaw, setDocumentsObjetRaw] = useState("");
  const [justificatifDomicile, setJustificatifDomicile] = useState<File | null>(null);
  const [autresDocuments, setAutresDocuments] = useState<File[]>([]);

  // 9. Préférences de communication
  const [modeContact, setModeContact] = useState("email");

  // 10. Informations complémentaires
  const [notes, setNotes] = useState("");

  // Multi-contrat association
  const [contrats, setContrats] = useState<ContratOption[]>([]);
  const [selectedContrats, setSelectedContrats] = useState<string[]>([]);

  // 11. Consentements
  const [consentementRGPD, setConsentementRGPD] = useState(false);
  const [acceptationCGU, setAcceptationCGU] = useState(false);
  const [acceptationConservation, setAcceptationConservation] = useState(false);
  const [autorisationContact, setAutorisationContact] = useState(false);
  const [signatureMandat, setSignatureMandat] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadContrats() {
      if (!user) return;
      const { data, error } = await supabase
        .from('contrats')
        .select('id,name,type,category')
        .eq('owner_id', user.id)
        .eq('role', role)
        .order('created_at', { ascending: false });
      if (!mounted) return;
      if (error) {
        console.error('Erreur chargement contrats:', error);
        setContrats([]);
      } else {
        setContrats((data || []) as ContratOption[]);
      }
    }
    loadContrats();
    return () => { mounted = false; };
  }, [user, role]);

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

      const comptesBancaires = comptesBancairesRaw.trim() ? comptesBancairesRaw.split(/\n+/).map(l => l.trim()).filter(Boolean) : [];
      const documentsObjet = documentsObjetRaw.trim() ? documentsObjetRaw.split(/\n+/).map(l => l.trim()).filter(Boolean) : [];
      const enfantsClean = enfants.filter(c => c.nom || c.date_naissance);

      const situationFamilialeData = {
        situation_familiale: etatCivil || null,
        regime_matrimonial: regimeMatrimonial || null,
        nombre_enfants: nombreEnfants || '0',
        personne_a_charge: personneACharge || null,
        autres_details: selectedFamily.length > 0 ? selectedFamily : null
      };

      const { data: inserted, error: insertErr } = await supabase.from('clients').insert({
        owner_id: user.id,
        role,
        name: `${prenom} ${nom}`,
        nom,
        prenom,
        nom_naissance: nomNaissance || null,
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
        id_doc_path: idDocPath,
        situation_familiale: situationFamilialeData,
        enfants: enfantsClean.length ? enfantsClean : null,
        profession: profession || null,
        statut_professionnel: statutPro || null,
        employeur: employeur || null,
        adresse_professionnelle: adressePro || null,
        telephone_professionnel: telephonePro || null,
        email_professionnel: emailPro || null,
        revenus: revenus || null,
        situation_fiscale: situationFiscale || null,
        patrimoine_immobilier: patrimoineImmobilier || null,
        credits_en_cours: creditsEnCours || null,
        justificatifs_financiers: justificatifsFinanciers || null,
        comptes_bancaires: comptesBancaires.length ? comptesBancaires : null,
        adresse_facturation_identique: adresseFacturationIdentique,
        adresse_facturation: adresseFacturationIdentique ? null : (adresseFacturation || null),
        numero_tva: numeroTVA || null,
        siret: siret || null,
        agit_nom_propre: agitNomPropre,
        nom_representant: agitNomPropre ? null : (representant || null),
        type_dossier: typeDossier || null,
        objet_dossier: objetPrecis || null,
        description_besoin: descriptionBesoin || null,
        historique_litiges: historiqueLitiges || null,
        urgence: niveauUrgence || 'normal',
        date_limite: dateLimite || null,
        contrat_souhaite: contratSouhaite || null,
        documents_objet: documentsObjet.length ? documentsObjet : null,
        preference_communication: modeContact || 'email',
        notes: notes || null,
        consentement_rgpd: consentementRGPD,
        acceptation_cgu: acceptationCGU,
        acceptation_conservation: acceptationConservation,
        autorisation_contact: autorisationContact,
        signature_mandat: signatureMandat,
        kyc_status: (nom && prenom && email && consentementRGPD) ? 'Complet' : 'Partiel',
        source: 'manuel'
      }).select('id').single();

      if (insertErr) throw insertErr;

      if (inserted?.id && selectedContrats.length > 0) {
        const rows = selectedContrats.map(cid => ({ owner_id: user.id, client_id: inserted.id, contrat_id: cid, role }));
        const { error: linkErr } = await supabase.from('client_contrats').insert(rows);
        if (linkErr) toast.error('Erreur association contrats', { description: linkErr.message });
      }

      toast.success('Fiche client avocat créée');
      navigate('/avocats/clients');
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
            onClick={() => navigate('/avocats/clients')}
            className="hover:bg-blue-100 hover:text-blue-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Créer une fiche client (Avocat)</h1>
            <p className="text-muted-foreground mt-1">Renseignez les informations nécessaires au dossier.</p>
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
                <Label htmlFor="nomNaissance">Nom de naissance</Label>
                <Input id="nomNaissance" value={nomNaissance} onChange={e => setNomNaissance(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateNaissance">Date de naissance</Label>
                  <Input id="dateNaissance" type="date" value={dateNaissance} onChange={e => setDateNaissance(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lieuNaissance">Lieu de naissance</Label>
                  <Input id="lieuNaissance" value={lieuNaissance} onChange={e => setLieuNaissance(e.target.value)} />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nationalite">Nationalité *</Label>
                  <Input id="nationalite" value={nationalite} onChange={e => setNationalite(e.target.value)} placeholder="Française" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sexe">Sexe</Label>
                  <Select value={sexe} onValueChange={setSexe}>
                    <SelectTrigger id="sexe"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent className="bg-blue-50 border-blue-200">
                      <SelectItem className={itemHover} value="Homme">Homme</SelectItem>
                      <SelectItem className={itemHover} value="Femme">Femme</SelectItem>
                      <SelectItem className={itemHover} value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Identification officielle */}
          <Card>
            <CardHeader>
              <CardTitle>2. Identification officielle</CardTitle>
              <CardDescription>Pièce d'identité (KYC)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="typeIdentite">Type de pièce d'identité</Label>
                  <Select value={typeIdentite} onValueChange={setTypeIdentite}>
                    <SelectTrigger id="typeIdentite"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent className="bg-blue-50 border-blue-200">
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
              <div className="space-y-2">
                <Label htmlFor="dateExpiration">Date d'expiration</Label>
                <Input id="dateExpiration" type="date" value={dateExpiration} onChange={e => setDateExpiration(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Scan ou photo</Label>
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                <Button type="button" variant="outline" onClick={handleFileSelect} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200">
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
              <CardTitle>3. Situation familiale</CardTitle>
              <CardDescription>Mariage / PACS / Enfants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="etatCivil">Situation familiale *</Label>
                  <Select value={etatCivil} onValueChange={setEtatCivil}>
                    <SelectTrigger id="etatCivil"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent className="bg-blue-50 border-blue-200">
                      <SelectItem className={itemHover} value="Célibataire">Célibataire</SelectItem>
                      <SelectItem className={itemHover} value="Marié(e)">Marié(e)</SelectItem>
                      <SelectItem className={itemHover} value="Pacsé(e)">Pacsé(e)</SelectItem>
                      <SelectItem className={itemHover} value="Divorcé(e)">Divorcé(e)</SelectItem>
                      <SelectItem className={itemHover} value="Veuf(ve)">Veuf(ve)</SelectItem>
                      <SelectItem className={itemHover} value="Concubinage">Concubinage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(etatCivil === "Marié(e)" || etatCivil === "Pacsé(e)") && (
                  <div className="space-y-2">
                    <Label htmlFor="regimeMatrimonial">Régime matrimonial</Label>
                    <Select value={regimeMatrimonial} onValueChange={setRegimeMatrimonial}>
                      <SelectTrigger id="regimeMatrimonial"><SelectValue placeholder="Si marié(e)..." /></SelectTrigger>
                      <SelectContent className="bg-blue-50 border-blue-200">
                        <SelectItem className={itemHover} value="Communauté réduite aux acquêts">Communauté réduite aux acquêts</SelectItem>
                        <SelectItem className={itemHover} value="Séparation de biens">Séparation de biens</SelectItem>
                        <SelectItem className={itemHover} value="Communauté universelle">Communauté universelle</SelectItem>
                        <SelectItem className={itemHover} value="Participation aux acquêts">Participation aux acquêts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Options (multi-sélection)</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="secondary" className="justify-between w-full bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200">
                      {selectedFamily.length > 0 ? `${selectedFamily.length} sélection(s)` : 'Sélectionner des options'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-[340px] bg-blue-50 border-blue-200" align="start">
                    <div className="px-2 py-2 border-b border-blue-200 sticky top-0 bg-blue-50 z-10 flex items-center gap-2">
                      <input
                        type="text"
                        value={familySearch}
                        onChange={(e) => setFamilySearch(e.target.value)}
                        placeholder="Rechercher..."
                        className="w-full bg-white/70 outline-none text-sm px-2 py-1 rounded border border-blue-200 focus:border-blue-400"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {FAMILY_OPTIONS.filter(opt => opt.label.toLowerCase().includes(familySearch.toLowerCase())).map(opt => {
                        const checked = selectedFamily.includes(opt.label);
                        return (
                          <DropdownMenuItem
                            key={opt.key}
                            className="cursor-pointer hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white"
                            onSelect={(e) => {
                              e.preventDefault();
                              setSelectedFamily(prev => checked ? prev.filter(l => l !== opt.label) : [...prev, opt.label]);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <input type="checkbox" className="h-4 w-4" checked={checked} readOnly />
                              <span className="text-sm">{opt.label}</span>
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                <p className="text-xs text-muted-foreground">Barre de recherche incluse. Cochez plusieurs options si nécessaire.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombreEnfants">Nombre d'enfants</Label>
                <Input
                  id="nombreEnfants"
                  type="number"
                  min="0"
                  value={nombreEnfants}
                  onChange={(e) => setNombreEnfants(e.target.value)}
                  className="border-blue-200 focus:border-blue-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personneACharge">Personne à charge</Label>
                <Textarea
                  id="personneACharge"
                  value={personneACharge}
                  onChange={(e) => setPersonneACharge(e.target.value)}
                  placeholder="Décrivez les personnes à charge..."
                  className="border-blue-200 focus:border-blue-400"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Enfants</Label>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddChild} className="bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200">
                    <Plus className="h-4 w-4 mr-1" /> Ajouter
                  </Button>
                </div>
                {enfants.length === 0 && <p className="text-sm text-muted-foreground">Aucun enfant ajouté.</p>}
                <div className="space-y-3">
                  {enfants.map((child, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-3 space-y-1">
                        <Label className="text-xs">Nom</Label>
                        <Input value={child.nom} onChange={e => handleChildChange(idx,'nom',e.target.value)} className="border-blue-200" />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <Label className="text-xs">Prénom</Label>
                        <Input value={child.prenom} onChange={e => handleChildChange(idx,'prenom',e.target.value)} className="border-blue-200" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Sexe</Label>
                        <Select value={child.sexe} onValueChange={v => handleChildChange(idx,'sexe',v)}>
                          <SelectTrigger className="border-blue-200">
                            <SelectValue placeholder="Sexe" />
                          </SelectTrigger>
                          <SelectContent className="bg-blue-50 border-blue-200">
                            <SelectItem value="M" className="hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white">M</SelectItem>
                            <SelectItem value="F" className="hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white">F</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3 space-y-1">
                        <Label className="text-xs">Date de naissance</Label>
                        <Input type="date" value={child.date_naissance} onChange={e => handleChildChange(idx,'date_naissance',e.target.value)} className="border-blue-200" />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleRemoveChild(idx)}
                          className="hover:bg-blue-100 hover:text-blue-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Situation professionnelle et financière */}
          <Card>
            <CardHeader>
              <CardTitle>4. Situation professionnelle & financière</CardTitle>
              <CardDescription>Emploi, revenus et justificatifs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profession">Profession</Label>
                  <Input id="profession" value={profession} onChange={e => setProfession(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statutPro">Statut professionnel</Label>
                  <Select value={statutPro} onValueChange={setStatutPro}>
                    <SelectTrigger id="statutPro"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent className="bg-blue-50 border-blue-200">
                      <SelectItem className={itemHover} value="salarie">Salarié(e)</SelectItem>
                      <SelectItem className={itemHover} value="independant">Indépendant(e)</SelectItem>
                      <SelectItem className={itemHover} value="retraite">Retraité(e)</SelectItem>
                      <SelectItem className={itemHover} value="sans_emploi">Sans emploi</SelectItem>
                      <SelectItem className={itemHover} value="etudiant">Étudiant(e)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeur">Employeur</Label>
                  <Input id="employeur" value={employeur} onChange={e => setEmployeur(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephonePro">Téléphone professionnel</Label>
                  <Input id="telephonePro" type="tel" value={telephonePro} onChange={e => setTelephonePro(e.target.value)} placeholder="+33 6 12 34 56 78" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emailPro">Email professionnel</Label>
                  <Input id="emailPro" type="email" value={emailPro} onChange={e => setEmailPro(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adressePro">Adresse professionnelle</Label>
                  <Input id="adressePro" value={adressePro} onChange={e => setAdressePro(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="revenus">Revenus annuels</Label>
                  <Select value={revenus} onValueChange={setRevenus}>
                    <SelectTrigger id="revenus"><SelectValue placeholder="Sélectionner une tranche" /></SelectTrigger>
                    <SelectContent className="bg-blue-50 border-blue-200">
                      <SelectItem className={itemHover} value="moins_20k">Moins de 20 000 €</SelectItem>
                      <SelectItem className={itemHover} value="20k_40k">20 000 € - 40 000 €</SelectItem>
                      <SelectItem className={itemHover} value="40k_60k">40 000 € - 60 000 €</SelectItem>
                      <SelectItem className={itemHover} value="60k_100k">60 000 € - 100 000 €</SelectItem>
                      <SelectItem className={itemHover} value="plus_100k">Plus de 100 000 €</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="situationFiscale">Situation fiscale</Label>
                  <Select value={situationFiscale} onValueChange={setSituationFiscale}>
                    <SelectTrigger id="situationFiscale"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent className="bg-blue-50 border-blue-200">
                      <SelectItem className={itemHover} value="imposition_commune">Imposition commune</SelectItem>
                      <SelectItem className={itemHover} value="imposition_separee">Imposition séparée</SelectItem>
                      <SelectItem className={itemHover} value="non_imposable">Non imposable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Patrimoine immobilier</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="patrimoine" value="oui" checked={patrimoineImmobilier === "oui"} onChange={(e) => setPatrimoineImmobilier(e.target.value)} className="h-4 w-4" />
                    <span className="text-sm">Oui</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="patrimoine" value="non" checked={patrimoineImmobilier === "non"} onChange={(e) => setPatrimoineImmobilier(e.target.value)} className="h-4 w-4" />
                    <span className="text-sm">Non</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditsEnCours">Crédits en cours</Label>
                <Textarea id="creditsEnCours" rows={2} value={creditsEnCours} onChange={e => setCreditsEnCours(e.target.value)} placeholder="Ex: Crédit immobilier, crédit consommation..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="justificatifsFinanciers">Justificatifs financiers (résumé)</Label>
                <Textarea id="justificatifsFinanciers" rows={2} value={justificatifsFinanciers} onChange={e => setJustificatifsFinanciers(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comptesBancaires">Comptes bancaires / IBAN (un par ligne)</Label>
                <Textarea id="comptesBancaires" rows={2} value={comptesBancairesRaw} onChange={e => setComptesBancairesRaw(e.target.value)} />
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
                    <span className="text-sm">Une autre personne</span>
                  </label>
                </div>
              </div>
              
              {!agitNomPropre && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="representant">Nom de la personne représentée</Label>
                  <Input 
                    id="representant" 
                    value={representant} 
                    onChange={e => setRepresentant(e.target.value)} 
                    placeholder="Nom et prénom"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Dossier & documents liés */}
          <Card>
            <CardHeader>
              <CardTitle>5. Dossier & documents liés</CardTitle>
              <CardDescription>Type de dossier, objet précis et pièces justificatives</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="typeDossier">Type de dossier</Label>
                <Select value={typeDossier} onValueChange={(val) => { setTypeDossier(val); setContratSouhaite(''); }}>
                  <SelectTrigger id="typeDossier"><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                  <SelectContent className="bg-blue-50 border-blue-200">
                    {AVOCAT_CONTRACT_CATEGORIES.map(cat => (
                      <SelectItem className={itemHover} key={cat.key} value={cat.key}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contratSouhaite">Contrat/Dossier précis</Label>
                <Select value={contratSouhaite} onValueChange={setContratSouhaite} disabled={!typeDossier}>
                  <SelectTrigger id="contratSouhaite"><SelectValue placeholder={typeDossier ? 'Sélectionner...' : 'Choisir une catégorie d\'abord'} /></SelectTrigger>
                  <SelectContent className="bg-blue-50 border-blue-200">
                    {(AVOCAT_CONTRACT_CATEGORIES.find(c => c.key === typeDossier)?.contracts || []).map(c => (
                      <SelectItem className={itemHover} key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="objetPrecis">Objet précis du dossier</Label>
                <Input 
                  id="objetPrecis" 
                  value={objetPrecis} 
                  onChange={e => setObjetPrecis(e.target.value)} 
                  placeholder="Ex: Contentieux commercial, Défense pénale..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="descriptionBesoin">Description détaillée du besoin</Label>
                <Textarea 
                  id="descriptionBesoin" 
                  rows={4} 
                  value={descriptionBesoin} 
                  onChange={e => setDescriptionBesoin(e.target.value)} 
                  placeholder="Décrivez votre situation et vos besoins..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="historiqueLitiges">Historique de litiges ou contentieux antérieurs</Label>
                <Textarea 
                  id="historiqueLitiges" 
                  rows={3} 
                  value={historiqueLitiges} 
                  onChange={e => setHistoriqueLitiges(e.target.value)} 
                  placeholder="Indiquez si le client a déjà été impliqué dans des litiges, contentieux ou procédures juridiques similaires..."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Niveau d'urgence</Label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="urgence" value="normal" checked={niveauUrgence === "normal"} onChange={(e) => setNiveauUrgence(e.target.value)} className="h-4 w-4" />
                      <span className="text-sm">Normal</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="urgence" value="urgent" checked={niveauUrgence === "urgent"} onChange={(e) => setNiveauUrgence(e.target.value)} className="h-4 w-4" />
                      <span className="text-sm">Urgent</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="urgence" value="tres_urgent" checked={niveauUrgence === "tres_urgent"} onChange={(e) => setNiveauUrgence(e.target.value)} className="h-4 w-4" />
                      <span className="text-sm">Très urgent</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateLimite">Date limite souhaitée</Label>
                  <Input 
                    id="dateLimite" 
                    type="date" 
                    value={dateLimite} 
                    onChange={e => setDateLimite(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="documentsObjetRaw">Documents liés (description)</Label>
                <Textarea id="documentsObjetRaw" rows={3} value={documentsObjetRaw} onChange={e => setDocumentsObjetRaw(e.target.value)} placeholder="Ex: Assignation en justice\nContrats commerciaux\nCorrespondances" />
                <p className="text-xs text-muted-foreground">Décrivez les documents nécessaires ou déjà en votre possession.</p>
              </div>

              <div className="space-y-2">
                <Label>Ajouter des fichiers</Label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  id="autresDocsInputAvocat"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setAutresDocuments(prev => [...prev, ...files]);
                    toast.success(`${files.length} fichier(s) ajouté(s)`);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('autresDocsInputAvocat')?.click()}
                  className="w-full bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choisir des fichiers
                </Button>
                {autresDocuments.length > 0 && (
                  <div className="border rounded-md p-2 space-y-1">
                    {autresDocuments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="truncate">{file.name}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setAutresDocuments(prev => prev.filter((_, i) => i !== idx))}
                          className="hover:bg-blue-100 hover:text-blue-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">PDF, Word, Images acceptés. Plusieurs fichiers possibles.</p>
              </div>

              <div className="space-y-2">
                <Label>Contrat(s) déjà enregistrés et associés</Label>
                <div className="border rounded-md p-2 max-h-56 overflow-y-auto">
                  {contrats.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-1">Aucun contrat enregistré.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {contrats.filter(c => !typeDossier || c.category === typeDossier).map(c => {
                        const checked = selectedContrats.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4"
                              checked={checked}
                              onChange={e => {
                                const isChecked = e.target.checked;
                                setSelectedContrats(prev => isChecked ? [...prev, c.id] : prev.filter(id => id !== c.id));
                              }}
                            />
                            <span className="text-sm"><span className="font-medium">{c.name}</span> <span className="text-muted-foreground">— {c.category}</span></span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Sélectionner les contrats existants liés à ce dossier.</p>
              </div>
            </CardContent>
          </Card>

          {/* 5.5 Préférences de communication */}
          <Card>
            <CardHeader>
              <CardTitle>5.5 Préférences de communication</CardTitle>
              <CardDescription>Comment souhaitez-vous être contacté ?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modeContact">Mode de contact privilégié</Label>
                <Select value={modeContact} onValueChange={setModeContact}>
                  <SelectTrigger id="modeContact"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent className="bg-blue-50 border-blue-200">
                    <SelectItem className={itemHover} value="email">Email</SelectItem>
                    <SelectItem className={itemHover} value="telephone">Téléphone</SelectItem>
                    <SelectItem className={itemHover} value="sms">SMS</SelectItem>
                    <SelectItem className={itemHover} value="courrier">Courrier postal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 5.6 Notes et informations complémentaires */}
          <Card>
            <CardHeader>
              <CardTitle>5.6 Notes et informations complémentaires</CardTitle>
              <CardDescription>Informations additionnelles utiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes ou précisions</Label>
                <Textarea 
                  id="notes" 
                  rows={4} 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Toute information complémentaire utile pour le dossier..."
                />
              </div>
            </CardContent>
          </Card>

          {/* 6. Consentements */}
          <Card>
            <CardHeader>
              <CardTitle>6. Consentements et mentions légales</CardTitle>
              <CardDescription>Acceptations obligatoires</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox id="rgpd" checked={consentementRGPD} onCheckedChange={c => setConsentementRGPD(c as boolean)} />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="rgpd" className="text-sm font-medium">J'accepte le traitement des données (RGPD) *</Label>
                  <p className="text-xs text-muted-foreground">Utilisation strictement liée à la gestion du dossier juridique.</p>
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
                  <p className="text-xs text-muted-foreground">Confirmation de la relation client avec l'avocat.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate('/avocats/clients')} disabled={loading}>Annuler</Button>
            <Button type="submit" className={mainButtonColor} disabled={loading}>{loading ? 'Création...' : 'Créer la fiche client'}</Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
