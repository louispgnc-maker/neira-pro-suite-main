import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Crown, Users, Database, FileText, PenTool, Building2 } from "lucide-react";

export default function TestCreateCabinet() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'avocat' | 'notaire' | null>(null);

  // Formulaire de création de cabinet
  const [cabinetNom, setCabinetNom] = useState('');
  const [raisonSociale, setRaisonSociale] = useState('');
  const [siret, setSiret] = useState('');
  const [numeroTVA, setNumeroTVA] = useState('');
  const [formeJuridique, setFormeJuridique] = useState('');
  const [capitalSocial, setCapitalSocial] = useState('');
  const [adresse, setAdresse] = useState('');
  const [codePostal, setCodePostal] = useState('');
  const [ville, setVille] = useState('');
  const [pays, setPays] = useState('France');
  const [telephone, setTelephone] = useState('');
  const [cabinetEmail, setCabinetEmail] = useState('');
  const [siteWeb, setSiteWeb] = useState('');
  const [barreau, setBarreau] = useState('');
  const [numeroInscription, setNumeroInscription] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/test-subscription/login');
      return;
    }

    const pendingPayment = sessionStorage.getItem('pendingPayment');
    if (pendingPayment) {
      const payment = JSON.parse(pendingPayment);
      setSelectedRole(payment.role);
    }
  }, [user, navigate]);

  const createTestCabinet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    if (!cabinetNom || !adresse || !cabinetEmail) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);

    try {
      // Vérifier si un cabinet existe déjà
      const { data: existingCabinet } = await supabase
        .from('cabinets')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (existingCabinet) {
        // Mettre à jour le cabinet existant
        const updateData: any = {
          nom: cabinetNom,
          raison_sociale: raisonSociale || null,
          siret: siret || null,
          numero_tva: numeroTVA || null,
          forme_juridique: formeJuridique || null,
          capital_social: capitalSocial || null,
          adresse: adresse,
          code_postal: codePostal || null,
          ville: ville || null,
          pays: pays,
          telephone: telephone || null,
          email: cabinetEmail,
          site_web: siteWeb || null,
          subscription_plan: 'cabinet-plus',
          max_members: 20,
          max_storage_go: null,
          max_dossiers: null,
          max_clients: null,
          max_signatures_per_month: null,
          billing_period: 'monthly',
          subscription_status: 'active',
          subscription_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Ajouter les champs spécifiques aux avocats
        if (selectedRole === 'avocat') {
          updateData.barreau = barreau || null;
          updateData.numero_inscription = numeroInscription || null;
        }

        const { error } = await supabase
          .from('cabinets')
          .update(updateData)
          .eq('id', existingCabinet.id);

        if (error) throw error;

        toast.success("Cabinet mis à jour !", {
          description: "Votre cabinet est maintenant sur le plan Cabinet+ avec 20 membres."
        });
      } else {
        // Créer un nouveau cabinet
        const insertData: any = {
          role: selectedRole || 'avocat',
          nom: cabinetNom,
          raison_sociale: raisonSociale || null,
          siret: siret || null,
          numero_tva: numeroTVA || null,
          forme_juridique: formeJuridique || null,
          capital_social: capitalSocial || null,
          adresse: adresse,
          code_postal: codePostal || null,
          ville: ville || null,
          pays: pays,
          telephone: telephone || null,
          email: cabinetEmail,
          site_web: siteWeb || null,
          owner_id: user.id,
          subscription_plan: 'cabinet-plus',
          max_members: 20,
          max_storage_go: null,
          max_dossiers: null,
          max_clients: null,
          max_signatures_per_month: null,
          billing_period: 'monthly',
          subscription_status: 'active',
          subscription_started_at: new Date().toISOString()
        };

        // Ajouter les champs spécifiques aux avocats
        if (selectedRole === 'avocat') {
          insertData.barreau = barreau || null;
          insertData.numero_inscription = numeroInscription || null;
        }

        const { error } = await supabase
          .from('cabinets')
          .insert(insertData);

        if (error) throw error;

        toast.success("Cabinet créé !", {
          description: "Votre cabinet de test est prêt avec le plan Cabinet+ (20 membres)."
        });
      }

      // Nettoyer le sessionStorage
      sessionStorage.removeItem('pendingPayment');

      // Rediriger vers le cabinet
      setTimeout(() => {
        const prefix = selectedRole === 'avocat' ? '/avocats' : '/notaires';
        navigate(`${prefix}/cabinet`);
      }, 1500);

    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error("Erreur lors de la création", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white p-8">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-12 h-12 text-orange-600" />
          </div>
          <h1 className="text-4xl font-bold text-orange-600 mb-2">Créer un cabinet {selectedRole === 'avocat' ? "d'avocat" : "de notaire"}</h1>
          <p className="text-gray-600">Renseignez les informations légales de votre cabinet.</p>
        </div>

        <Card className="border-2 border-orange-200 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Crown className="w-6 h-6" />
              Votre abonnement Cabinet+
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Users className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm font-semibold">20 membres</p>
                <p className="text-xs text-gray-600">Maximum</p>
              </div>
              <div className="text-center">
                <Database className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm font-semibold">Illimité</p>
                <p className="text-xs text-gray-600">Stockage</p>
              </div>
              <div className="text-center">
                <FileText className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm font-semibold">Illimité</p>
                <p className="text-xs text-gray-600">Dossiers</p>
              </div>
              <div className="text-center">
                <PenTool className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm font-semibold">Illimité</p>
                <p className="text-xs text-gray-600">Signatures</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="text-2xl text-blue-600">
              Informations du cabinet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createTestCabinet} className="space-y-6">
              {/* Informations générales */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Informations générales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cabinetNom">Nom du cabinet *</Label>
                    <Input
                      id="cabinetNom"
                      placeholder="Cabinet Dupont & Associés"
                      value={cabinetNom}
                      onChange={(e) => setCabinetNom(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="raisonSociale">Raison sociale</Label>
                    <Input
                      id="raisonSociale"
                      placeholder="SELARL Dupont & Associés"
                      value={raisonSociale}
                      onChange={(e) => setRaisonSociale(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Informations légales */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Informations légales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="siret">SIRET</Label>
                    <Input
                      id="siret"
                      placeholder="123 456 789 00012"
                      value={siret}
                      onChange={(e) => setSiret(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numeroTVA">Numéro TVA</Label>
                    <Input
                      id="numeroTVA"
                      placeholder="FR 12 345678901"
                      value={numeroTVA}
                      onChange={(e) => setNumeroTVA(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="formeJuridique">Forme juridique</Label>
                    <Select value={formeJuridique} onValueChange={setFormeJuridique}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="selarl">SELARL</SelectItem>
                        <SelectItem value="scp">SCP</SelectItem>
                        <SelectItem value="sel">SEL</SelectItem>
                        <SelectItem value="individuel">Exercice individuel</SelectItem>
                        <SelectItem value="association">Association</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capitalSocial">Capital social</Label>
                    <Input
                      id="capitalSocial"
                      placeholder="10000"
                      type="number"
                      value={capitalSocial}
                      onChange={(e) => setCapitalSocial(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Adresse</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="adresse">Adresse *</Label>
                    <Input
                      id="adresse"
                      placeholder="123 rue de la République"
                      value={adresse}
                      onChange={(e) => setAdresse(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="codePostal">Code postal</Label>
                      <Input
                        id="codePostal"
                        placeholder="75001"
                        value={codePostal}
                        onChange={(e) => setCodePostal(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ville">Ville</Label>
                      <Input
                        id="ville"
                        placeholder="Paris"
                        value={ville}
                        onChange={(e) => setVille(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pays">Pays</Label>
                      <Input
                        id="pays"
                        placeholder="France"
                        value={pays}
                        onChange={(e) => setPays(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input
                      id="telephone"
                      placeholder="01 23 45 67 89"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cabinetEmail">Email *</Label>
                    <Input
                      id="cabinetEmail"
                      type="email"
                      placeholder="contact@cabinet-dupont.fr"
                      value={cabinetEmail}
                      onChange={(e) => setCabinetEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="siteWeb">Site web</Label>
                    <Input
                      id="siteWeb"
                      placeholder="https://www.cabinet-dupont.fr"
                      value={siteWeb}
                      onChange={(e) => setSiteWeb(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Informations métier (avocat uniquement) */}
              {selectedRole === 'avocat' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Informations métier</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="barreau">Barreau</Label>
                      <Input
                        id="barreau"
                        placeholder="Barreau de Paris"
                        value={barreau}
                        onChange={(e) => setBarreau(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numeroInscription">Numéro d'inscription</Label>
                      <Input
                        id="numeroInscription"
                        placeholder="P0123456789"
                        value={numeroInscription}
                        onChange={(e) => setNumeroInscription(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <Button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
                size="lg"
              >
                {loading ? "Création..." : "Créer mon cabinet"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
