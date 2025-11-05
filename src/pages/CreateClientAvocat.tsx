import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { Upload, ArrowLeft } from "lucide-react";

export default function CreateClientAvocat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Détection du rôle
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const mainButtonColor = role === 'notaire'
    ? 'bg-amber-600 hover:bg-amber-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  // États du formulaire
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
  const [sexe, setSexe] = useState("");

  // 2. Identification officielle
  const [typeIdentite, setTypeIdentite] = useState("");
  const [numeroIdentite, setNumeroIdentite] = useState("");
  const [dateExpiration, setDateExpiration] = useState("");

  // 3. Situation professionnelle / financière
  const [profession, setProfession] = useState("");
  const [employeur, setEmployeur] = useState("");
  const [adressePro, setAdressePro] = useState("");
  const [siret, setSiret] = useState("");
  const [situationFiscale, setSituationFiscale] = useState("");

  // 4. Situation juridique / dossier
  const [typeDossier, setTypeDossier] = useState("");
  const [historiqueLitiges, setHistoriqueLitiges] = useState("");
  const [piecesJustificatives, setPiecesJustificatives] = useState("");

  // 5. Consentements
  const [consentementRGPD, setConsentementRGPD] = useState(false);
  const [signatureMandat, setSignatureMandat] = useState(false);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier que c'est une image ou un PDF
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error("Format non supporté", { description: "Veuillez uploader une image (JPG, PNG) ou un PDF." });
        return;
      }
      setIdDocFile(file);
      toast.success("Fichier sélectionné", { description: file.name });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Connexion requise");
      return;
    }

    // Validation basique
    if (!nom || !prenom || !email) {
      toast.error("Champs obligatoires manquants", { description: "Nom, prénom et email sont requis." });
      return;
    }

    if (!consentementRGPD) {
      toast.error("Consentement RGPD requis", { description: "Vous devez accepter le traitement des données." });
      return;
    }

    setLoading(true);

    try {
      let idDocPath: string | null = null;

      // Upload du document d'identité si présent
      if (idDocFile) {
        const fileName = `${user.id}/${Date.now()}-${idDocFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, idDocFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Erreur upload document: ${uploadError.message}`);
        }
        idDocPath = fileName;
      }

      // Insérer dans la table clients
      const { error: insertError } = await supabase.from('clients').insert({
        owner_id: user.id,
        role: role,
        // Infos personnelles
        nom: nom,
        prenom: prenom,
        date_naissance: dateNaissance || null,
        lieu_naissance: lieuNaissance || null,
        adresse: adresse || null,
        telephone: telephone || null,
        email: email,
        nationalite: nationalite || null,
        sexe: sexe || null,
        // Identification
        type_identite: typeIdentite || null,
        numero_identite: numeroIdentite || null,
        date_expiration_identite: dateExpiration || null,
        id_doc_path: idDocPath,
        // Professionnel
        profession: profession || null,
        employeur: employeur || null,
        adresse_professionnelle: adressePro || null,
        siret: siret || null,
        situation_fiscale: situationFiscale || null,
        // Juridique
        type_dossier: typeDossier || null,
        historique_litiges: historiqueLitiges || null,
        pieces_justificatives: piecesJustificatives || null,
        // Consentements
        consentement_rgpd: consentementRGPD,
        signature_mandat: signatureMandat,
        kyc_status: 'Complet',
      });

      if (insertError) throw insertError;

      toast.success("Fiche client créée avec succès !");
      
      // Redirection vers la page clients
      if (role === 'notaire') {
        navigate('/notaires/clients');
      } else {
        navigate('/avocats/clients');
      }
    } catch (err: any) {
      console.error('Erreur création client:', err);
      toast.error("Erreur lors de la création", { description: err?.message || String(err) });
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
            onClick={() => navigate(role === 'notaire' ? '/notaires/clients' : '/avocats/clients')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Créer une fiche client</h1>
            <p className="text-muted-foreground mt-1">
              Remplissez les informations de votre client
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle>1. Informations personnelles</CardTitle>
              <CardDescription>Données d'identification du client</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
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
                <Label htmlFor="adresse">Adresse postale complète</Label>
                <Textarea id="adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} rows={2} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telephone">Numéro de téléphone</Label>
                  <Input id="telephone" type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse e-mail *</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
                    <SelectContent>
                      <SelectItem value="M">Masculin</SelectItem>
                      <SelectItem value="F">Féminin</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
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
              <CardDescription>Pièce d'identité du client (KYC)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="typeIdentite">Type de pièce d'identité</Label>
                  <Select value={typeIdentite} onValueChange={setTypeIdentite}>
                    <SelectTrigger id="typeIdentite">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNI">Carte Nationale d'Identité</SelectItem>
                      <SelectItem value="Passeport">Passeport</SelectItem>
                      <SelectItem value="Titre de séjour">Titre de séjour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numeroIdentite">Numéro de la pièce</Label>
                  <Input id="numeroIdentite" value={numeroIdentite} onChange={(e) => setNumeroIdentite(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateExpiration">Date d'expiration</Label>
                <Input id="dateExpiration" type="date" value={dateExpiration} onChange={(e) => setDateExpiration(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Scan ou photo de la pièce d'identité</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button type="button" variant="outline" onClick={handleFileSelect} className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  {idDocFile ? idDocFile.name : "Choisir un fichier"}
                </Button>
                <p className="text-xs text-muted-foreground">Formats acceptés: JPG, PNG, PDF</p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Situation professionnelle / financière */}
          <Card>
            <CardHeader>
              <CardTitle>3. Situation professionnelle / financière</CardTitle>
              <CardDescription>Informations sur l'activité du client</CardDescription>
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
                  <Label htmlFor="siret">Numéro SIRET (si entreprise)</Label>
                  <Input id="siret" value={siret} onChange={(e) => setSiret(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="situationFiscale">Revenus / Statut fiscal</Label>
                  <Input id="situationFiscale" value={situationFiscale} onChange={(e) => setSituationFiscale(e.target.value)} placeholder="Ex: Salarié, TNS..." />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Situation juridique / dossier */}
          <Card>
            <CardHeader>
              <CardTitle>4. Situation juridique / dossier</CardTitle>
              <CardDescription>Contexte du dossier à gérer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="typeDossier">Type de dossier</Label>
                <Input id="typeDossier" value={typeDossier} onChange={(e) => setTypeDossier(e.target.value)} placeholder="Ex: Contrat, succession, immobilier..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="historiqueLitiges">Historique de litiges ou affaires en cours</Label>
                <Textarea id="historiqueLitiges" value={historiqueLitiges} onChange={(e) => setHistoriqueLitiges(e.target.value)} rows={3} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="piecesJustificatives">Pièces justificatives pertinentes</Label>
                <Textarea 
                  id="piecesJustificatives" 
                  value={piecesJustificatives} 
                  onChange={(e) => setPiecesJustificatives(e.target.value)} 
                  rows={2}
                  placeholder="Liste des documents fournis: contrats, courriers, etc."
                />
              </div>
            </CardContent>
          </Card>

          {/* 5. Consentements et mentions légales */}
          <Card>
            <CardHeader>
              <CardTitle>5. Consentements et mentions légales</CardTitle>
              <CardDescription>Validation RGPD et signature du mandat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="rgpd" 
                  checked={consentementRGPD} 
                  onCheckedChange={(checked) => setConsentementRGPD(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="rgpd" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    J'accepte le traitement de mes données personnelles (RGPD) *
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Les données collectées seront utilisées uniquement dans le cadre de la gestion du dossier juridique.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="mandat" 
                  checked={signatureMandat} 
                  onCheckedChange={(checked) => setSignatureMandat(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="mandat" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Signature électronique du mandat ou contrat avec l'avocat
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    En cochant cette case, le client confirme avoir lu et accepté les conditions du mandat.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Boutons d'action */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(role === 'notaire' ? '/notaires/clients' : '/avocats/clients')}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" className={mainButtonColor} disabled={loading}>
              {loading ? "Création en cours..." : "Créer la fiche client"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
