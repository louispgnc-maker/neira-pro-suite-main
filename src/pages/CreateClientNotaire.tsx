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
import { NOTAIRE_CONTRACT_CATEGORIES } from "@/components/dashboard/ContractSelectorNotaire";
import { FAMILY_OPTIONS } from "@/lib/familyOptions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface ChildEntry { nom: string; date_naissance: string; }
interface ContratOption { id: string; name: string; type: string; category: string; }

export default function CreateClientNotaire() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const role: 'notaire' = 'notaire';
  const mainButtonColor = 'bg-orange-600 hover:bg-orange-700 text-white';
  const itemHover = 'cursor-pointer hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white';

  const [loading, setLoading] = useState(false);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);

  // 1. Informations personnelles
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [lieuNaissance, setLieuNaissance] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [nationalite, setNationalite] = useState("");
  const [etatCivil, setEtatCivil] = useState("");

  // 2. Identification officielle
  const [typeIdentite, setTypeIdentite] = useState("");
  const [numeroIdentite, setNumeroIdentite] = useState("");
  const [dateExpiration, setDateExpiration] = useState("");

  // 3. Situation familiale
  // Situation matrimoniale supprimée sur demande
  const [selectedFamily, setSelectedFamily] = useState<string[]>([]);
  const [familySearch, setFamilySearch] = useState("");
  const [enfants, setEnfants] = useState<ChildEntry[]>([]);

  // 4. Situation professionnelle et financière
  const [profession, setProfession] = useState("");
  const [employeur, setEmployeur] = useState("");
  const [adressePro, setAdressePro] = useState("");
  const [revenus, setRevenus] = useState("");
  const [situationFiscale, setSituationFiscale] = useState("");
  const [justificatifsFinanciers, setJustificatifsFinanciers] = useState("");
  const [comptesBancairesRaw, setComptesBancairesRaw] = useState(""); // multiline -> split lines

  // 5. Documents liés à l'objet du dossier / Situation juridique
  const [typeDossier, setTypeDossier] = useState("");
  const [contratSouhaite, setContratSouhaite] = useState("");
  const [documentsObjetRaw, setDocumentsObjetRaw] = useState(""); // multiline -> JSON array

  // Multi-contrat association
  const [contrats, setContrats] = useState<ContratOption[]>([]);
  const [selectedContrats, setSelectedContrats] = useState<string[]>([]);

  // 6. Consentements
  const [consentementRGPD, setConsentementRGPD] = useState(false);
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

  const handleAddChild = () => setEnfants(prev => [...prev, { nom: '', date_naissance: '' }]);
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
    if (!consentementRGPD) {
      toast.error('Consentement RGPD requis');
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

      const { data: inserted, error: insertErr } = await supabase.from('clients').insert({
        owner_id: user.id,
        role,
        name: `${prenom} ${nom}`,
        nom,
        prenom,
        date_naissance: dateNaissance || null,
        lieu_naissance: lieuNaissance || null,
        adresse: adresse || null,
        telephone: telephone || null,
        email,
        nationalite: nationalite || null,
        etat_civil: etatCivil || null,
        type_identite: typeIdentite || null,
        numero_identite: numeroIdentite || null,
        date_expiration_identite: dateExpiration || null,
        id_doc_path: idDocPath,
  // situation_matrimoniale: (supprimé)
  situation_familiale: selectedFamily.length ? selectedFamily : null,
        enfants: enfantsClean.length ? enfantsClean : null,
        profession: profession || null,
        employeur: employeur || null,
        adresse_professionnelle: adressePro || null,
        revenus: revenus || null,
        situation_fiscale: situationFiscale || null,
        justificatifs_financiers: justificatifsFinanciers || null,
        comptes_bancaires: comptesBancaires.length ? comptesBancaires : null,
        type_dossier: typeDossier || null,
        contrat_souhaite: contratSouhaite || null,
        documents_objet: documentsObjet.length ? documentsObjet : null,
        consentement_rgpd: consentementRGPD,
        signature_mandat: signatureMandat,
        kyc_status: (nom && prenom && email && consentementRGPD) ? 'Complet' : 'Partiel'
      }).select('id').single();

      if (insertErr) throw insertErr;

      if (inserted?.id && selectedContrats.length > 0) {
        const rows = selectedContrats.map(cid => ({ owner_id: user.id, client_id: inserted.id, contrat_id: cid, role }));
        const { error: linkErr } = await supabase.from('client_contrats').insert(rows);
        if (linkErr) toast.error('Erreur association contrats', { description: linkErr.message });
      }

      toast.success('Fiche client notaire créée');
      navigate('/notaires/clients');
    } catch (err: any) {
      console.error(err);
      toast.error('Erreur création client', { description: err?.message || String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/notaires/clients')}>
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
                <Label htmlFor="adresse">Adresse postale complète</Label>
                <Textarea id="adresse" rows={2} value={adresse} onChange={e => setAdresse(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input id="telephone" type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nationalite">Nationalité</Label>
                  <Input id="nationalite" value={nationalite} onChange={e => setNationalite(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="etatCivil">État civil</Label>
                  <Select value={etatCivil} onValueChange={setEtatCivil}>
                    <SelectTrigger id="etatCivil"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent className="bg-orange-50 border-orange-200">
                      <SelectItem className={itemHover} value="Célibataire">Célibataire</SelectItem>
                      <SelectItem className={itemHover} value="Marié">Marié</SelectItem>
                      <SelectItem className={itemHover} value="Pacsé">Pacsé</SelectItem>
                      <SelectItem className={itemHover} value="Divorcé">Divorcé</SelectItem>
                      <SelectItem className={itemHover} value="Veuf">Veuf</SelectItem>
                      <SelectItem className={itemHover} value="Séparé">Séparé</SelectItem>
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
              <div className="space-y-2">
                <Label htmlFor="dateExpiration">Date d'expiration</Label>
                <Input id="dateExpiration" type="date" value={dateExpiration} onChange={e => setDateExpiration(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Scan ou photo</Label>
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                <Button type="button" variant="outline" onClick={handleFileSelect} className="w-full">
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
              {/* Champ Situation matrimoniale supprimé */}
              <div className="space-y-2">
                <Label>Options (multi-sélection)</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="secondary" className="justify-between w-full bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200">
                      {selectedFamily.length > 0 ? `${selectedFamily.length} sélection(s)` : 'Sélectionner des options'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-[340px] bg-orange-50 border-orange-200" align="start">
                    <div className="px-2 py-2 border-b border-orange-200 sticky top-0 bg-orange-50 z-10 flex items-center gap-2">
                      <input
                        type="text"
                        value={familySearch}
                        onChange={(e) => setFamilySearch(e.target.value)}
                        placeholder="Rechercher..."
                        className="w-full bg-white/70 outline-none text-sm px-2 py-1 rounded border border-orange-200 focus:border-orange-400"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {FAMILY_OPTIONS.filter(opt => opt.label.toLowerCase().includes(familySearch.toLowerCase())).map(opt => {
                        const checked = selectedFamily.includes(opt.label);
                        return (
                          <DropdownMenuItem
                            key={opt.key}
                            className="cursor-pointer hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white"
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
                <div className="flex items-center justify-between">
                  <Label>Enfants</Label>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddChild}>
                    <Plus className="h-4 w-4 mr-1" /> Ajouter
                  </Button>
                </div>
                {enfants.length === 0 && <p className="text-sm text-muted-foreground">Aucun enfant ajouté.</p>}
                <div className="space-y-3">
                  {enfants.map((child, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-6 space-y-1">
                        <Label className="text-xs">Nom</Label>
                        <Input value={child.nom} onChange={e => handleChildChange(idx,'nom',e.target.value)} />
                      </div>
                      <div className="col-span-4 space-y-1">
                        <Label className="text-xs">Date de naissance</Label>
                        <Input type="date" value={child.date_naissance} onChange={e => handleChildChange(idx,'date_naissance',e.target.value)} />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveChild(idx)}>
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
                  <Label htmlFor="employeur">Employeur</Label>
                  <Input id="employeur" value={employeur} onChange={e => setEmployeur(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adressePro">Adresse professionnelle</Label>
                <Textarea id="adressePro" rows={2} value={adressePro} onChange={e => setAdressePro(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="revenus">Revenus (approx.)</Label>
                  <Input id="revenus" value={revenus} onChange={e => setRevenus(e.target.value)} placeholder="Ex: 45K€/an" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="situationFiscale">Situation fiscale</Label>
                  <Input id="situationFiscale" value={situationFiscale} onChange={e => setSituationFiscale(e.target.value)} />
                </div>
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

          {/* 5. Documents liés & Contrats */}
          <Card>
            <CardHeader>
              <CardTitle>5. Dossier & documents liés</CardTitle>
              <CardDescription>Type d'acte et pièces justificatives</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="typeDossier">Type d'acte / dossier</Label>
                <Select value={typeDossier} onValueChange={(val) => { setTypeDossier(val); setContratSouhaite(''); }}>
                  <SelectTrigger id="typeDossier"><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                  <SelectContent className="bg-orange-50 border-orange-200">
                    {NOTAIRE_CONTRACT_CATEGORIES.map(cat => (
                      <SelectItem className={itemHover} key={cat.key} value={cat.key}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contratSouhaite">Acte/Contrat précis</Label>
                <Select value={contratSouhaite} onValueChange={setContratSouhaite} disabled={!typeDossier}>
                  <SelectTrigger id="contratSouhaite"><SelectValue placeholder={typeDossier ? 'Sélectionner...' : 'Choisir une catégorie d\'abord'} /></SelectTrigger>
                  <SelectContent className="bg-orange-50 border-orange-200">
                    {(NOTAIRE_CONTRACT_CATEGORIES.find(c => c.key === typeDossier)?.contracts || []).map(c => (
                      <SelectItem className={itemHover} key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentsObjetRaw">Documents liés (un par ligne)</Label>
                <Textarea id="documentsObjetRaw" rows={3} value={documentsObjetRaw} onChange={e => setDocumentsObjetRaw(e.target.value)} placeholder="Ex: Compromis de vente\nTitre de propriété\nDiagnostics immobiliers" />
              </div>
              <div className="space-y-2">
                <Label>Acte(s)/Contrat(s) déjà enregistrés et associés</Label>
                <div className="border rounded-md p-2 max-h-56 overflow-y-auto">
                  {contrats.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-1">Aucun acte enregistré.</p>
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
                <p className="text-xs text-muted-foreground">Sélectionner les actes existants liés à ce dossier.</p>
              </div>
            </CardContent>
          </Card>

          {/* 6. Consentements */}
          <Card>
            <CardHeader>
              <CardTitle>6. Consentements et mentions légales</CardTitle>
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
                <Checkbox id="mandat" checked={signatureMandat} onCheckedChange={c => setSignatureMandat(c as boolean)} />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="mandat" className="text-sm font-medium">Signature électronique du mandat / engagement</Label>
                  <p className="text-xs text-muted-foreground">Confirmation de la relation client avec le notaire.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/notaires/clients')} disabled={loading}>Annuler</Button>
            <Button type="submit" className={mainButtonColor} disabled={loading}>{loading ? 'Création...' : 'Créer la fiche client'}</Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
