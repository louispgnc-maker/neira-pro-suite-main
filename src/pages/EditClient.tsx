import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Upload, ArrowLeft, Save } from "lucide-react";
import { AVOCAT_CONTRACT_CATEGORIES } from "@/components/dashboard/ContractSelectorAvocat";
import { FAMILY_OPTIONS } from "@/lib/familyOptions";

export default function EditClient() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const mainButtonColor = role === 'notaire'
    ? 'bg-amber-600 hover:bg-amber-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  const selectContentClass = role === 'notaire' ? 'bg-amber-50 border-amber-200' : '';
  const selectItemClass = role === 'notaire'
    ? 'cursor-pointer hover:bg-amber-600 hover:text-white focus:bg-amber-600 focus:text-white'
    : 'cursor-pointer hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white';

  const [loading, setLoading] = useState(false);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);

  // States same as create
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [lieuNaissance, setLieuNaissance] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [nationalite, setNationalite] = useState("");
  const [sexe, setSexe] = useState("");
  const [etatCivil, setEtatCivil] = useState("");

  const [typeIdentite, setTypeIdentite] = useState("");
  const [numeroIdentite, setNumeroIdentite] = useState("");
  const [dateExpiration, setDateExpiration] = useState("");

  const [profession, setProfession] = useState("");
  const [employeur, setEmployeur] = useState("");
  const [adressePro, setAdressePro] = useState("");
  const [siret, setSiret] = useState("");
  const [situationFiscale, setSituationFiscale] = useState("");
  const [revenus, setRevenus] = useState("");
  const [justificatifsFinanciers, setJustificatifsFinanciers] = useState("");
  const [comptesBancairesRaw, setComptesBancairesRaw] = useState("");

  // Notaire-specific family fields
  // Situation matrimoniale supprimée
  const [enfants, setEnfants] = useState<{ nom: string; date_naissance: string }[]>([]);
  const [situationFamiliale, setSituationFamiliale] = useState<string[]>([]);
  const [familySearch, setFamilySearch] = useState("");
  // const familleAmberItem = "cursor-pointer hover:bg-amber-600 hover:text-white focus:bg-amber-600 focus:text-white"; // plus utilisé
  
  // Options partagées pour la situation familiale

  const [typeDossier, setTypeDossier] = useState("");
  const [contratSouhaite, setContratSouhaite] = useState("");
  const [historiqueLitiges, setHistoriqueLitiges] = useState("");
  const [consentementRGPD, setConsentementRGPD] = useState(false);
  const [signatureMandat, setSignatureMandat] = useState(false);

  type ContratOption = { id: string; name: string; type: string; category: string };
  const [contrats, setContrats] = useState<ContratOption[]>([]);
  const [selectedContrats, setSelectedContrats] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user || !id) return;
      // Load client
      const { data: c, error } = await supabase
        .from('clients')
        .select('*')
        .eq('owner_id', user.id)
        .eq('role', role)
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.error('Erreur chargement client:', error);
        toast.error('Impossible de charger le client');
        return;
      }
      if (c && mounted) {
        setNom(c.nom || '');
        setPrenom(c.prenom || '');
        setDateNaissance(c.date_naissance || '');
        setLieuNaissance(c.lieu_naissance || '');
        setAdresse(c.adresse || '');
        setTelephone(c.telephone || '');
        setEmail(c.email || '');
        setNationalite(c.nationalite || '');
        setSexe(c.sexe || '');
  setEtatCivil(c.etat_civil || '');
        setTypeIdentite(c.type_identite || '');
        setNumeroIdentite(c.numero_identite || '');
        setDateExpiration(c.date_expiration_identite || '');
        setProfession(c.profession || '');
        setEmployeur(c.employeur || '');
        setAdressePro(c.adresse_professionnelle || '');
        setSiret(c.siret || '');
        setSituationFiscale(c.situation_fiscale || '');
  setRevenus(c.revenus || '');
  setJustificatifsFinanciers(c.justificatifs_financiers || '');
  setComptesBancairesRaw(Array.isArray(c.comptes_bancaires) ? (c.comptes_bancaires as string[]).join('\n') : '');
  // situation_matrimoniale supprimée
  setEnfants(Array.isArray(c.enfants) ? (c.enfants as any[]).map((e: any) => ({ nom: e.nom || '', date_naissance: e.date_naissance || '' })) : []);
  setSituationFamiliale(Array.isArray(c.situation_familiale) ? c.situation_familiale : []);
        setTypeDossier(c.type_dossier || '');
        setContratSouhaite(c.contrat_souhaite || '');
        setHistoriqueLitiges(c.historique_litiges || '');
        setConsentementRGPD(!!c.consentement_rgpd);
        setSignatureMandat(!!c.signature_mandat);
      }
      // Load contrats
      const { data, error: cErr } = await supabase
        .from('contrats')
        .select('id,name,type,category')
        .eq('owner_id', user.id)
        .eq('role', role)
        .order('created_at', { ascending: false });
      if (!cErr && mounted) setContrats((data || []) as ContratOption[]);

      // Load links
      const { data: links } = await supabase
        .from('client_contrats')
        .select('contrat_id')
        .eq('owner_id', user.id)
        .eq('client_id', id);
      if (links && mounted) setSelectedContrats(links.map((l: any) => l.contrat_id));
    }
    load();
    return () => { mounted = false; };
  }, [user, id, role]);

  const handleFileSelect = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error("Format non supporté", { description: "Image (JPG, PNG) ou PDF." });
      return;
    }
    setIdDocFile(file);
    toast.success("Fichier sélectionné", { description: file.name });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    setLoading(true);
    try {
      let idDocPath: string | null = null;
      if (idDocFile) {
        const fileName = `${user.id}/${Date.now()}-${idDocFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, idDocFile, { cacheControl: '3600', upsert: false });
        if (uploadError) throw new Error(uploadError.message);
        idDocPath = fileName;
      }

      // Update client
      const updates: any = {
        owner_id: user.id,
        role,
        name: `${prenom} ${nom}`,
        nom, prenom,
        date_naissance: dateNaissance || null,
        lieu_naissance: lieuNaissance || null,
        adresse: adresse || null,
        telephone: telephone || null,
        email,
        nationalite: nationalite || null,
        sexe: sexe || null,
        etat_civil: etatCivil || null,
        type_identite: typeIdentite || null,
        numero_identite: numeroIdentite || null,
        date_expiration_identite: dateExpiration || null,
        profession: profession || null,
        employeur: employeur || null,
        adresse_professionnelle: adressePro || null,
        siret: siret || null,
        situation_fiscale: situationFiscale || null,
        revenus: revenus || null,
        justificatifs_financiers: justificatifsFinanciers || null,
        comptes_bancaires: comptesBancairesRaw.trim() ? comptesBancairesRaw.split(/\n+/).map(l => l.trim()).filter(Boolean) : null,
        type_dossier: typeDossier || null,
        contrat_souhaite: contratSouhaite || null,
        historique_litiges: historiqueLitiges || null,
  // situation_matrimoniale supprimée
  enfants: enfants.filter(e => e.nom || e.date_naissance),
  situation_familiale: situationFamiliale.length ? situationFamiliale : null,
        consentement_rgpd: consentementRGPD,
        signature_mandat: signatureMandat,
      };
      // Recompute KYC status simply based on essential fields
      updates.kyc_status = (nom && prenom && email && consentementRGPD) ? 'Complet' : 'Partiel';
      if (idDocPath) updates.id_doc_path = idDocPath;

      const { error: upErr } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .eq('owner_id', user.id)
        .eq('role', role);
      if (upErr) throw upErr;

      // Reset and reinsert associations (simple approach)
      await supabase
        .from('client_contrats')
        .delete()
        .eq('owner_id', user.id)
        .eq('role', role)
        .eq('client_id', id);

      if (selectedContrats.length > 0) {
        const rows = selectedContrats.map((contratId) => ({
          owner_id: user.id,
          client_id: id,
          contrat_id: contratId,
          role,
        }));
        const { error: linkErr } = await supabase.from('client_contrats').insert(rows);
        if (linkErr) throw linkErr;
      }

      toast.success('Fiche client mise à jour');
      navigate(role === 'notaire' ? `/notaires/clients/${id}` : `/avocats/clients/${id}`);
    } catch (err: any) {
      console.error('Erreur mise à jour client:', err);
      toast.error('Erreur mise à jour', { description: err?.message || String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(role === 'notaire' ? `/notaires/clients/${id}` : `/avocats/clients/${id}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Modifier la fiche client</h1>
            <p className="text-muted-foreground mt-1">Mettez à jour les informations du client</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Informations personnelles</CardTitle>
              <CardDescription>Données d'identification du client</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom</Label>
                  <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateNaissance">Date de naissance</Label>
                  <Input id="dateNaissance" type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lieuNaissance">Lieu de naissance</Label>
                  <Input id="lieuNaissance" value={lieuNaissance} onChange={(e) => setLieuNaissance(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Textarea id="adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input id="telephone" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nationalite">Nationalité</Label>
                  <Input id="nationalite" value={nationalite} onChange={(e) => setNationalite(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sexe">Sexe</Label>
                  <Select value={sexe} onValueChange={setSexe}>
                    <SelectTrigger id="sexe">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent className={selectContentClass}>
                      <SelectItem className={selectItemClass} value="M">Masculin</SelectItem>
                      <SelectItem className={selectItemClass} value="F">Féminin</SelectItem>
                      <SelectItem className={selectItemClass} value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="etatCivil">État civil (Notaire)</Label>
                  <Select value={etatCivil} onValueChange={setEtatCivil}>
                    <SelectTrigger id="etatCivil"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent className={selectContentClass}>
                      <SelectItem className={selectItemClass} value="Célibataire">Célibataire</SelectItem>
                      <SelectItem className={selectItemClass} value="Marié">Marié</SelectItem>
                      <SelectItem className={selectItemClass} value="Pacsé">Pacsé</SelectItem>
                      <SelectItem className={selectItemClass} value="Divorcé">Divorcé</SelectItem>
                      <SelectItem className={selectItemClass} value="Veuf">Veuf</SelectItem>
                      <SelectItem className={selectItemClass} value="Séparé">Séparé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Identification officielle</CardTitle>
              <CardDescription>Pièce d'identité (KYC)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="typeIdentite">Type</Label>
                  <Select value={typeIdentite} onValueChange={setTypeIdentite}>
                    <SelectTrigger id="typeIdentite">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent className={selectContentClass}>
                      <SelectItem className={selectItemClass} value="CNI">Carte Nationale d'Identité</SelectItem>
                      <SelectItem className={selectItemClass} value="Passeport">Passeport</SelectItem>
                      <SelectItem className={selectItemClass} value="Titre de séjour">Titre de séjour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numeroIdentite">Numéro</Label>
                  <Input id="numeroIdentite" value={numeroIdentite} onChange={(e) => setNumeroIdentite(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateExpiration">Date d'expiration</Label>
                <Input id="dateExpiration" type="date" value={dateExpiration} onChange={(e) => setDateExpiration(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Scan / photo de la pièce</Label>
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                <Button type="button" variant="outline" onClick={handleFileSelect} className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  {idDocFile ? idDocFile.name : "Choisir un fichier"}
                </Button>
                <p className="text-xs text-muted-foreground">Formats: JPG, PNG, PDF</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Situation familiale (Notaire)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Champ Situation matrimoniale supprimé */}
              <div className="space-y-2">
                <Label>Options familiales (multi)</Label>
                <div className="border rounded-md p-2 bg-amber-50 border-amber-200">
                  <div className="flex items-center mb-2">
                    <input
                      type="text"
                      value={familySearch}
                      onChange={e => setFamilySearch(e.target.value)}
                      placeholder="Rechercher..."
                      className="flex-1 bg-white/70 outline-none text-sm px-2 py-1 rounded border border-amber-200 focus:border-amber-400"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {FAMILY_OPTIONS.filter(opt => opt.label.toLowerCase().includes(familySearch.toLowerCase())).map(opt => {
                      const checked = situationFamiliale.includes(opt.label);
                      return (
                        <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={e => {
                              const isChecked = e.target.checked;
                              setSituationFamiliale(prev => isChecked ? [...prev, opt.label] : prev.filter(v => v !== opt.label));
                            }}
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {situationFamiliale.length > 0 && (
                    <div className="mt-2 text-xs text-amber-800">{situationFamiliale.length} sélection(s)</div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Enfants (lecture seule)</Label>
                <Textarea rows={3} value={enfants.map(e => `${e.nom}${e.date_naissance ? ` — ${e.date_naissance}` : ''}`).join('\n')} disabled />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Situation professionnelle / financière</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profession">Profession</Label>
                  <Input id="profession" value={profession} onChange={(e) => setProfession(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeur">Employeur</Label>
                  <Input id="employeur" value={employeur} onChange={(e) => setEmployeur(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adressePro">Adresse professionnelle</Label>
                <Textarea id="adressePro" value={adressePro} onChange={(e) => setAdressePro(e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siret">SIRET</Label>
                  <Input id="siret" value={siret} onChange={(e) => setSiret(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="situationFiscale">Situation fiscale</Label>
                  <Input id="situationFiscale" value={situationFiscale} onChange={(e) => setSituationFiscale(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="revenus">Revenus (approx.)</Label>
                  <Input id="revenus" value={revenus} onChange={e => setRevenus(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comptesBancaires">Comptes bancaires (un par ligne)</Label>
                  <Textarea id="comptesBancaires" rows={2} value={comptesBancairesRaw} onChange={e => setComptesBancairesRaw(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="justificatifsFinanciers">Justificatifs financiers (résumé)</Label>
                <Textarea id="justificatifsFinanciers" rows={2} value={justificatifsFinanciers} onChange={e => setJustificatifsFinanciers(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Situation juridique / dossier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="typeDossier">Type de dossier</Label>
                <Select value={typeDossier} onValueChange={(val) => { setTypeDossier(val); setContratSouhaite(""); }}>
                  <SelectTrigger id="typeDossier">
                    <SelectValue placeholder="Sélectionner une catégorie..." />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    <SelectItem className={selectItemClass} value="Droit des affaires / Commercial">💼 Droit des affaires / Commercial</SelectItem>
                    <SelectItem className={selectItemClass} value="Droit du travail">👔 Droit du travail</SelectItem>
                    <SelectItem className={selectItemClass} value="Droit immobilier">🏠 Droit immobilier</SelectItem>
                    <SelectItem className={selectItemClass} value="Droit civil / Vie privée">👪 Droit civil / Vie privée</SelectItem>
                    <SelectItem className={selectItemClass} value="Propriété intellectuelle & Numérique">🧠 Propriété intellectuelle & Numérique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contratSouhaite">Contrat souhaité</Label>
                <Select value={contratSouhaite} onValueChange={setContratSouhaite} disabled={!typeDossier}>
                  <SelectTrigger id="contratSouhaite">
                    <SelectValue placeholder={typeDossier ? "Sélectionner un contrat..." : "Choisir d'abord une catégorie"} />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    {(AVOCAT_CONTRACT_CATEGORIES.find(c => (c.key === typeDossier || c.label.includes(typeDossier)))?.contracts || []).map((contract) => (
                      <SelectItem className={selectItemClass} key={contract} value={contract}>{contract}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Contrat(s) associé(s)</Label>
                <div className="border rounded-md p-2 max-h-56 overflow-y-auto">
                  {contrats.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-1">Aucun contrat enregistré.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {contrats
                        .filter(c => !typeDossier || c.category === typeDossier || AVOCAT_CONTRACT_CATEGORIES.find(cat => cat.key === typeDossier)?.contracts.includes(c.type))
                        .map((c) => {
                          const checked = selectedContrats.includes(c.id);
                          return (
                            <label key={c.id} className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4"
                                checked={checked}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  setSelectedContrats((prev) => isChecked ? [...prev, c.id] : prev.filter((id) => id !== c.id));
                                }}
                              />
                              <span className="text-sm">
                                <span className="font-medium">{c.name}</span>
                                <span className="text-muted-foreground"> — {c.category}</span>
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Sélectionnez les contrats liés à ce client.</p>
              </div>

            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(role === 'notaire' ? `/notaires/clients/${id}` : `/avocats/clients/${id}`)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" className={mainButtonColor} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
