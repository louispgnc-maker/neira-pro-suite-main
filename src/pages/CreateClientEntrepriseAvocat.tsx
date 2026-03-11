import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function CreateClientEntrepriseAvocat() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = 'avocat' as const;
  const mainButtonColor = 'bg-blue-600 hover:bg-blue-700 text-white';

  const [loading, setLoading] = useState(false);

  // 1. Informations entreprise
  const [raisonSociale, setRaisonSociale] = useState("");
  const [formeJuridique, setFormeJuridique] = useState("");
  const [siret, setSiret] = useState("");
  const [numeroSiren, setNumeroSiren] = useState("");
  const [numeroTVA, setNumeroTVA] = useState("");
  const [codeNAF, setCodeNAF] = useState("");
  const [dateCreation, setDateCreation] = useState("");
  const [capital, setCapital] = useState("");
  const [rcs, setRcs] = useState("");
  const [villeRCS, setVilleRCS] = useState("");
  const [greffeImmatriculation, setGreffeImmatriculation] = useState("");
  const [secteurActivite, setSecteurActivite] = useState("");
  const [descriptionActivite, setDescriptionActivite] = useState("");
  const [nombreSalaries, setNombreSalaries] = useState("");
  const [chiffreAffaires, setChiffreAffaires] = useState("");
  
  // 2. Siège social
  const [adresse, setAdresse] = useState("");
  const [complementAdresse, setComplementAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");
  const [pays, setPays] = useState("France");
  
  // 3. Contacts
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [siteWeb, setSiteWeb] = useState("");
  
  // 4. Représentant légal
  const [nomRepresentant, setNomRepresentant] = useState("");
  const [prenomRepresentant, setPrenomRepresentant] = useState("");
  const [dateNaissanceRepresentant, setDateNaissanceRepresentant] = useState("");
  const [lieuNaissanceRepresentant, setLieuNaissanceRepresentant] = useState("");
  const [nationaliteRepresentant, setNationaliteRepresentant] = useState("");
  const [fonctionRepresentant, setFonctionRepresentant] = useState("");
  const [emailRepresentant, setEmailRepresentant] = useState("");
  const [telephoneRepresentant, setTelephoneRepresentant] = useState("");
  const [adresseRepresentant, setAdresseRepresentant] = useState("");
  
  // 5. Contact principal
  const [nomContact, setNomContact] = useState("");
  const [prenomContact, setPrenomContact] = useState("");
  const [fonctionContact, setFonctionContact] = useState("");
  const [emailContact, setEmailContact] = useState("");
  const [telephoneContact, setTelephoneContact] = useState("");
  
  // 6. Bénéficiaires effectifs (on stockera en JSON)
  const [beneficiaires, setBeneficiaires] = useState<Array<{
    nom: string;
    prenom: string;
    dateNaissance: string;
    nationalite: string;
    pourcentage: string;
  }>>([]);
  
  // 7. Informations bancaires
  const [nomBanque, setNomBanque] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [titulaireCompte, setTitulaireCompte] = useState("");
  
  // 8. Documents associés (à implémenter plus tard avec upload)
  // Pour l'instant on laisse vide
  
  // 9. Informations relation client
  const [statutClient, setStatutClient] = useState("prospect");
  const [dateEntreeRelation, setDateEntreeRelation] = useState("");
  const [origineClient, setOrigineClient] = useState("");
  const [responsableDossier, setResponsableDossier] = useState("");
  const [notes, setNotes] = useState("");
  
  // 10. Préférences de communication
  const [modeContact, setModeContact] = useState("email");
  const [plageHoraire, setPlageHoraire] = useState("");
  
  // 11. Consentements
  const [consentementRGPD, setConsentementRGPD] = useState(false);
  const [acceptationConservation, setAcceptationConservation] = useState(false);
  const [autorisationContact, setAutorisationContact] = useState(false);
  const [connaissancePolitique, setConnaissancePolitique] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    if (!raisonSociale || !siret || !formeJuridique) {
      toast.error('Veuillez renseigner au minimum la raison sociale, le SIRET et la forme juridique');
      return;
    }

    if (!adresse || !codePostal || !ville || !pays) {
      toast.error('Veuillez renseigner l\'adresse complète du siège social');
      return;
    }

    if (!nomRepresentant || !prenomRepresentant) {
      toast.error('Veuillez renseigner le représentant légal');
      return;
    }

    if (!consentementRGPD || !acceptationConservation || !autorisationContact || !connaissancePolitique) {
      toast.error('Vous devez accepter tous les consentements RGPD obligatoires');
      return;
    }

    setLoading(true);
    try {
      // Le nom du client sera la raison sociale
      const clientName = raisonSociale;

      const { data: inserted, error: insertErr } = await supabase.from("clients").insert({
        owner_id: user.id,
        name: clientName,
        role: role,
        // On met la raison sociale comme nom de famille
        nom: raisonSociale,
        prenom: null, // Pas de prénom pour une entreprise
        adresse: adresse || null,
        code_postal: codePostal || null,
        ville: ville || null,
        pays: pays || 'France',
        telephone: telephone || null,
        email: email || null,
        siret: siret,
        numero_tva: numeroTVA || null,
        // Informations du représentant légal
        agit_nom_propre: false,
        nom_representant: nomRepresentant && prenomRepresentant 
          ? `${prenomRepresentant} ${nomRepresentant} (${fonctionRepresentant || 'Représentant légal'})`
          : null,
        preference_communication: modeContact || 'email',
        plage_horaire: plageHoraire || null,
        notes: notes || null,
        consentement_rgpd: consentementRGPD,
        acceptation_conservation: acceptationConservation,
        autorisation_contact: autorisationContact,
        source: 'manuel',
        kyc_status: 'Complet' // On considère qu'avec SIRET c'est complet
      }).select('id').single();

      if (insertErr) throw insertErr;

      // Générer automatiquement le code d'accès pour l'espace client
      if (inserted?.id) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let accessCode = '';
        for (let i = 0; i < 6; i++) {
          accessCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 720); // Expire dans 30 jours

        const { error: inviteError } = await supabase
          .from('client_invitations')
          .insert({
            client_id: inserted.id,
            email: email || emailRepresentant || '',
            token: token,
            access_code: accessCode,
            expires_at: expiresAt.toISOString(),
            status: 'pending',
          });

        if (inviteError) {
          console.error('Error creating access code:', inviteError);
        } else {
          console.log('✅ Code d\'accès créé:', accessCode, 'pour client:', inserted.id);
        }
      }

      toast.success('Fiche entreprise créée avec succès');
      navigate('/avocats/clients');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(err);
      toast.error('Erreur création entreprise', { description: message });
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
            onClick={() => navigate(-1)}
            className="hover:bg-blue-100 hover:text-blue-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Créer une fiche client entreprise (Avocat)</h1>
            <p className="text-gray-600 mt-1">Renseignez les informations de l'entreprise cliente.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Informations de l'entreprise */}
          <Card>
            <CardHeader>
              <CardTitle>1. Informations de l'entreprise</CardTitle>
              <CardDescription>Données d'identification de l'entreprise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="raisonSociale">Raison sociale *</Label>
                  <Input 
                    id="raisonSociale" 
                    value={raisonSociale} 
                    onChange={e => setRaisonSociale(e.target.value)} 
                    placeholder="Nom de l'entreprise"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="formeJuridique">Forme juridique *</Label>
                  <Select value={formeJuridique} onValueChange={setFormeJuridique}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAS">SAS</SelectItem>
                      <SelectItem value="SASU">SASU</SelectItem>
                      <SelectItem value="SARL">SARL</SelectItem>
                      <SelectItem value="EURL">EURL</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="SCI">SCI</SelectItem>
                      <SelectItem value="Auto-entrepreneur">Auto-entrepreneur</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siret">SIRET *</Label>
                  <Input 
                    id="siret" 
                    value={siret} 
                    onChange={e => setSiret(e.target.value)} 
                    placeholder="123 456 789 00012"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="numeroSiren">Numéro SIREN</Label>
                  <Input 
                    id="numeroSiren" 
                    value={numeroSiren} 
                    onChange={e => setNumeroSiren(e.target.value)} 
                    placeholder="123 456 789"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numeroTVA">Numéro de TVA intracommunautaire</Label>
                  <Input 
                    id="numeroTVA" 
                    value={numeroTVA} 
                    onChange={e => setNumeroTVA(e.target.value)} 
                    placeholder="FR12345678901"
                  />
                </div>
                <div>
                  <Label htmlFor="codeNAF">Code NAF / APE</Label>
                  <Input 
                    id="codeNAF" 
                    value={codeNAF} 
                    onChange={e => setCodeNAF(e.target.value)} 
                    placeholder="6201Z"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateCreation">Date de création de l'entreprise</Label>
                  <Input 
                    id="dateCreation" 
                    type="date"
                    value={dateCreation} 
                    onChange={e => setDateCreation(e.target.value)} 
                  />
                </div>
                <div>
                  <Label htmlFor="capital">Capital social</Label>
                  <Input 
                    id="capital" 
                    value={capital} 
                    onChange={e => setCapital(e.target.value)} 
                    placeholder="10000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="rcs">RCS (Registre du Commerce et des Sociétés)</Label>
                  <Input 
                    id="rcs" 
                    value={rcs} 
                    onChange={e => setRcs(e.target.value)} 
                    placeholder="B 123 456 789"
                  />
                </div>
                <div>
                  <Label htmlFor="villeRCS">Ville d'immatriculation du RCS</Label>
                  <Input 
                    id="villeRCS" 
                    value={villeRCS} 
                    onChange={e => setVilleRCS(e.target.value)} 
                    placeholder="Paris"
                  />
                </div>
                <div>
                  <Label htmlFor="greffeImmatriculation">Greffe d'immatriculation</Label>
                  <Input 
                    id="greffeImmatriculation" 
                    value={greffeImmatriculation} 
                    onChange={e => setGreffeImmatriculation(e.target.value)} 
                    placeholder="Paris"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="secteurActivite">Secteur d'activité</Label>
                  <Input 
                    id="secteurActivite" 
                    value={secteurActivite} 
                    onChange={e => setSecteurActivite(e.target.value)} 
                    placeholder="Informatique, Commerce, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="nombreSalaries">Nombre de salariés</Label>
                  <Input 
                    id="nombreSalaries" 
                    type="number"
                    value={nombreSalaries} 
                    onChange={e => setNombreSalaries(e.target.value)} 
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="descriptionActivite">Description de l'activité</Label>
                <Textarea 
                  id="descriptionActivite" 
                  value={descriptionActivite} 
                  onChange={e => setDescriptionActivite(e.target.value)} 
                  placeholder="Décrivez brièvement l'activité de l'entreprise"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="chiffreAffaires">Chiffre d'affaires annuel (optionnel)</Label>
                <Input 
                  id="chiffreAffaires" 
                  value={chiffreAffaires} 
                  onChange={e => setChiffreAffaires(e.target.value)} 
                  placeholder="500000"
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. Siège social */}
          <Card>
            <CardHeader>
              <CardTitle>2. Siège social</CardTitle>
              <CardDescription>Adresse officielle de l'entreprise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="adresse">Adresse *</Label>
                <Input id="adresse" value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="123 rue Exemple" required />
              </div>
              <div>
                <Label htmlFor="complementAdresse">Complément d'adresse</Label>
                <Input id="complementAdresse" value={complementAdresse} onChange={e => setComplementAdresse(e.target.value)} placeholder="Bâtiment A, 3ème étage" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="codePostal">Code postal *</Label>
                  <Input id="codePostal" value={codePostal} onChange={e => setCodePostal(e.target.value)} placeholder="75001" required />
                </div>
                <div>
                  <Label htmlFor="ville">Ville *</Label>
                  <Input id="ville" value={ville} onChange={e => setVille(e.target.value)} placeholder="Paris" required />
                </div>
                <div>
                  <Label htmlFor="pays">Pays *</Label>
                  <Input id="pays" value={pays} onChange={e => setPays(e.target.value)} placeholder="France" required />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Coordonnées de contact */}
          <Card>
            <CardHeader>
              <CardTitle>3. Coordonnées de contact</CardTitle>
              <CardDescription>Moyens de communication avec l'entreprise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input id="telephone" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+33 1 23 45 67 89" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@entreprise.com" />
                </div>
              </div>
              <div>
                <Label htmlFor="siteWeb">Site web</Label>
                <Input id="siteWeb" value={siteWeb} onChange={e => setSiteWeb(e.target.value)} placeholder="https://www.entreprise.com" />
              </div>
            </CardContent>
          </Card>

          {/* 4. Représentant légal */}
          <Card>
            <CardHeader>
              <CardTitle>4. Représentant légal</CardTitle>
              <CardDescription>Personne habilitée à engager juridiquement l'entreprise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nomRepresentant">Nom *</Label>
                  <Input id="nomRepresentant" value={nomRepresentant} onChange={e => setNomRepresentant(e.target.value)} placeholder="Dupont" required />
                </div>
                <div>
                  <Label htmlFor="prenomRepresentant">Prénom *</Label>
                  <Input id="prenomRepresentant" value={prenomRepresentant} onChange={e => setPrenomRepresentant(e.target.value)} placeholder="Jean" required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dateNaissanceRepresentant">Date de naissance</Label>
                  <Input 
                    id="dateNaissanceRepresentant" 
                    type="date"
                    value={dateNaissanceRepresentant} 
                    onChange={e => setDateNaissanceRepresentant(e.target.value)} 
                  />
                </div>
                <div>
                  <Label htmlFor="lieuNaissanceRepresentant">Lieu de naissance</Label>
                  <Input id="lieuNaissanceRepresentant" value={lieuNaissanceRepresentant} onChange={e => setLieuNaissanceRepresentant(e.target.value)} placeholder="Paris" />
                </div>
                <div>
                  <Label htmlFor="nationaliteRepresentant">Nationalité</Label>
                  <Input id="nationaliteRepresentant" value={nationaliteRepresentant} onChange={e => setNationaliteRepresentant(e.target.value)} placeholder="Française" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="fonctionRepresentant">Fonction</Label>
                  <Input id="fonctionRepresentant" value={fonctionRepresentant} onChange={e => setFonctionRepresentant(e.target.value)} placeholder="Gérant, PDG, etc." />
                </div>
                <div>
                  <Label htmlFor="emailRepresentant">Email</Label>
                  <Input id="emailRepresentant" type="email" value={emailRepresentant} onChange={e => setEmailRepresentant(e.target.value)} placeholder="jean.dupont@entreprise.com" />
                </div>
                <div>
                  <Label htmlFor="telephoneRepresentant">Téléphone</Label>
                  <Input id="telephoneRepresentant" value={telephoneRepresentant} onChange={e => setTelephoneRepresentant(e.target.value)} placeholder="+33 6 12 34 56 78" />
                </div>
              </div>
              <div>
                <Label htmlFor="adresseRepresentant">Adresse personnelle (optionnel)</Label>
                <Input id="adresseRepresentant" value={adresseRepresentant} onChange={e => setAdresseRepresentant(e.target.value)} placeholder="123 rue Exemple, 75001 Paris" />
              </div>
            </CardContent>
          </Card>

          {/* 5. Contact principal */}
          <Card>
            <CardHeader>
              <CardTitle>5. Contact principal (si différent du représentant légal)</CardTitle>
              <CardDescription>Personne de contact pour le suivi du dossier</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nomContact">Nom</Label>
                  <Input id="nomContact" value={nomContact} onChange={e => setNomContact(e.target.value)} placeholder="Martin" />
                </div>
                <div>
                  <Label htmlFor="prenomContact">Prénom</Label>
                  <Input id="prenomContact" value={prenomContact} onChange={e => setPrenomContact(e.target.value)} placeholder="Sophie" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="fonctionContact">Fonction</Label>
                  <Input id="fonctionContact" value={fonctionContact} onChange={e => setFonctionContact(e.target.value)} placeholder="Responsable administratif" />
                </div>
                <div>
                  <Label htmlFor="emailContact">Email</Label>
                  <Input id="emailContact" type="email" value={emailContact} onChange={e => setEmailContact(e.target.value)} placeholder="sophie.martin@entreprise.com" />
                </div>
                <div>
                  <Label htmlFor="telephoneContact">Téléphone</Label>
                  <Input id="telephoneContact" value={telephoneContact} onChange={e => setTelephoneContact(e.target.value)} placeholder="+33 6 12 34 56 78" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6. Bénéficiaires effectifs - Note: Simplifier pour v1, peut être étendu plus tard */}
          <Card>
            <CardHeader>
              <CardTitle>6. Bénéficiaires effectifs</CardTitle>
              <CardDescription>Personnes physiques détenant directement ou indirectement l'entreprise (à développer ultérieurement)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Cette section sera développée dans une version ultérieure pour permettre l'ajout de plusieurs bénéficiaires.</p>
            </CardContent>
          </Card>

          {/* 7. Informations bancaires */}
          <Card>
            <CardHeader>
              <CardTitle>7. Informations bancaires (optionnel)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nomBanque">Nom de la banque</Label>
                  <Input id="nomBanque" value={nomBanque} onChange={e => setNomBanque(e.target.value)} placeholder="BNP Paribas" />
                </div>
                <div>
                  <Label htmlFor="titulaireCompte">Titulaire du compte</Label>
                  <Input id="titulaireCompte" value={titulaireCompte} onChange={e => setTitulaireCompte(e.target.value)} placeholder="Nom de l'entreprise" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="iban">IBAN</Label>
                  <Input id="iban" value={iban} onChange={e => setIban(e.target.value)} placeholder="FR76 1234 5678 9012 3456 7890 123" />
                </div>
                <div>
                  <Label htmlFor="bic">BIC / SWIFT</Label>
                  <Input id="bic" value={bic} onChange={e => setBic(e.target.value)} placeholder="BNPAFRPP" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 8. Documents associés */}
          <Card>
            <CardHeader>
              <CardTitle>8. Documents associés</CardTitle>
              <CardDescription>Extrait KBIS, statuts, pièces d'identité, etc. (à développer ultérieurement avec système d'upload)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Le système de gestion documentaire sera intégré dans une version ultérieure.</p>
            </CardContent>
          </Card>

          {/* 9. Informations relation client */}
          <Card>
            <CardHeader>
              <CardTitle>9. Informations relation client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="statutClient">Statut</Label>
                  <Select value={statutClient} onValueChange={setStatutClient}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="ancien_client">Ancien client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dateEntreeRelation">Date d'entrée en relation</Label>
                  <Input 
                    id="dateEntreeRelation" 
                    type="date"
                    value={dateEntreeRelation} 
                    onChange={e => setDateEntreeRelation(e.target.value)} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="origineClient">Origine du client</Label>
                  <Select value={origineClient} onValueChange={setOrigineClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recommandation">Recommandation</SelectItem>
                      <SelectItem value="site_web">Site web</SelectItem>
                      <SelectItem value="reseaux_sociaux">Réseaux sociaux</SelectItem>
                      <SelectItem value="partenaire">Partenaire</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="responsableDossier">Responsable du dossier</Label>
                  <Input id="responsableDossier" value={responsableDossier} onChange={e => setResponsableDossier(e.target.value)} placeholder="Nom du responsable" />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes internes</Label>
                <Textarea 
                  id="notes" 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Informations supplémentaires, particularités du dossier, etc."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* 10. Préférences de communication */}
          <Card>
            <CardHeader>
              <CardTitle>10. Préférences de communication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="modeContact">Mode de contact préféré</Label>
                  <Select value={modeContact} onValueChange={setModeContact}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="telephone">Téléphone</SelectItem>
                      <SelectItem value="courrier">Courrier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="plageHoraire">Plage horaire préférée</Label>
                  <Input id="plageHoraire" value={plageHoraire} onChange={e => setPlageHoraire(e.target.value)} placeholder="9h-12h / 14h-18h" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 11. Consentements et validations (RGPD) */}
          <Card>
            <CardHeader>
              <CardTitle>11. Consentements et validations (RGPD)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <Checkbox 
                  id="rgpd" 
                  checked={consentementRGPD} 
                  onCheckedChange={(checked) => setConsentementRGPD(!!checked)}
                />
                <Label htmlFor="rgpd" className="cursor-pointer leading-tight">
                  Le client consent au traitement de ses données personnelles conformément au RGPD *
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox 
                  id="conservation" 
                  checked={acceptationConservation} 
                  onCheckedChange={(checked) => setAcceptationConservation(!!checked)}
                />
                <Label htmlFor="conservation" className="cursor-pointer leading-tight">
                  Le client accepte la conservation de ses données pendant la durée légale *
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox 
                  id="contact" 
                  checked={autorisationContact} 
                  onCheckedChange={(checked) => setAutorisationContact(!!checked)}
                />
                <Label htmlFor="contact" className="cursor-pointer leading-tight">
                  Le client autorise à être contacté pour le suivi de son dossier *
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox 
                  id="politique" 
                  checked={connaissancePolitique} 
                  onCheckedChange={(checked) => setConnaissancePolitique(!!checked)}
                />
                <Label htmlFor="politique" className="cursor-pointer leading-tight">
                  Le client reconnaît avoir pris connaissance de la politique de confidentialité *
                </Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Annuler
            </Button>
            <Button type="submit" className={mainButtonColor} disabled={loading}>
              {loading ? 'Création...' : 'Créer la fiche entreprise'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
