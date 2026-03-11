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

export default function CreateClientEntrepriseNotaire() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = 'notaire' as const;
  const mainButtonColor = 'bg-orange-600 hover:bg-orange-700 text-white';

  const [loading, setLoading] = useState(false);

  // Informations entreprise
  const [raisonSociale, setRaisonSociale] = useState("");
  const [formeJuridique, setFormeJuridique] = useState("");
  const [siret, setSiret] = useState("");
  const [numeroTVA, setNumeroTVA] = useState("");
  const [capital, setCapital] = useState("");
  const [rcs, setRcs] = useState("");
  
  // Adresse du siège social
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");
  const [pays, setPays] = useState("France");
  
  // Contacts
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [siteWeb, setSiteWeb] = useState("");
  
  // Représentant légal
  const [nomRepresentant, setNomRepresentant] = useState("");
  const [prenomRepresentant, setPrenomRepresentant] = useState("");
  const [fonctionRepresentant, setFonctionRepresentant] = useState("");
  const [emailRepresentant, setEmailRepresentant] = useState("");
  const [telephoneRepresentant, setTelephoneRepresentant] = useState("");
  
  // Préférences de communication
  const [modeContact, setModeContact] = useState("email");
  const [plageHoraire, setPlageHoraire] = useState("");
  
  // Informations complémentaires
  const [notes, setNotes] = useState("");
  
  // Consentements
  const [consentementRGPD, setConsentementRGPD] = useState(false);
  const [acceptationConservation, setAcceptationConservation] = useState(false);
  const [autorisationContact, setAutorisationContact] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    if (!raisonSociale || !siret) {
      toast.error('Veuillez renseigner au minimum la raison sociale et le SIRET');
      return;
    }

    if (!consentementRGPD) {
      toast.error('Vous devez accepter le traitement des données RGPD');
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
      navigate('/notaires/clients');
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
            className="hover:bg-orange-100 hover:text-orange-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Créer une fiche client entreprise (Notaire)</h1>
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
                  <Label htmlFor="formeJuridique">Forme juridique</Label>
                  <Select value={formeJuridique} onValueChange={setFormeJuridique}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SARL">SARL</SelectItem>
                      <SelectItem value="SAS">SAS</SelectItem>
                      <SelectItem value="SASU">SASU</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="SNC">SNC</SelectItem>
                      <SelectItem value="EURL">EURL</SelectItem>
                      <SelectItem value="EIRL">EIRL</SelectItem>
                      <SelectItem value="SCI">SCI</SelectItem>
                      <SelectItem value="Association">Association</SelectItem>
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
                  <Label htmlFor="numeroTVA">Numéro de TVA intracommunautaire</Label>
                  <Input 
                    id="numeroTVA" 
                    value={numeroTVA} 
                    onChange={e => setNumeroTVA(e.target.value)} 
                    placeholder="FR12345678901"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="capital">Capital social</Label>
                  <Input 
                    id="capital" 
                    value={capital} 
                    onChange={e => setCapital(e.target.value)} 
                    placeholder="10000"
                    type="number"
                  />
                </div>
                <div>
                  <Label htmlFor="rcs">RCS</Label>
                  <Input 
                    id="rcs" 
                    value={rcs} 
                    onChange={e => setRcs(e.target.value)} 
                    placeholder="Paris B 123 456 789"
                  />
                </div>
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
                <Label htmlFor="adresse">Adresse</Label>
                <Input id="adresse" value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="123 rue Exemple" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="codePostal">Code postal</Label>
                  <Input id="codePostal" value={codePostal} onChange={e => setCodePostal(e.target.value)} placeholder="75001" />
                </div>
                <div>
                  <Label htmlFor="ville">Ville</Label>
                  <Input id="ville" value={ville} onChange={e => setVille(e.target.value)} placeholder="Paris" />
                </div>
                <div>
                  <Label htmlFor="pays">Pays</Label>
                  <Input id="pays" value={pays} onChange={e => setPays(e.target.value)} placeholder="France" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Contacts */}
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
              <CardDescription>Personne habilitée à engager l'entreprise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nomRepresentant">Nom</Label>
                  <Input id="nomRepresentant" value={nomRepresentant} onChange={e => setNomRepresentant(e.target.value)} placeholder="Dupont" />
                </div>
                <div>
                  <Label htmlFor="prenomRepresentant">Prénom</Label>
                  <Input id="prenomRepresentant" value={prenomRepresentant} onChange={e => setPrenomRepresentant(e.target.value)} placeholder="Jean" />
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
            </CardContent>
          </Card>

          {/* 5. Préférences de communication */}
          <Card>
            <CardHeader>
              <CardTitle>5. Préférences de communication</CardTitle>
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

          {/* 6. Informations complémentaires */}
          <Card>
            <CardHeader>
              <CardTitle>6. Informations complémentaires</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="notes">Notes internes</Label>
              <Textarea 
                id="notes" 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Informations supplémentaires, particularités du dossier, etc."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* 7. Consentements */}
          <Card>
            <CardHeader>
              <CardTitle>7. Consentements et validations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <Checkbox 
                  id="rgpd" 
                  checked={consentementRGPD} 
                  onCheckedChange={(checked) => setConsentementRGPD(!!checked)}
                />
                <Label htmlFor="rgpd" className="cursor-pointer leading-tight">
                  Le client consent au traitement de ses données conformément au RGPD *
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox 
                  id="conservation" 
                  checked={acceptationConservation} 
                  onCheckedChange={(checked) => setAcceptationConservation(!!checked)}
                />
                <Label htmlFor="conservation" className="cursor-pointer leading-tight">
                  Le client accepte la conservation de ses données pendant la durée légale
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox 
                  id="contact" 
                  checked={autorisationContact} 
                  onCheckedChange={(checked) => setAutorisationContact(!!checked)}
                />
                <Label htmlFor="contact" className="cursor-pointer leading-tight">
                  Le client autorise à être contacté pour le suivi de son dossier
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
