import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { CheckCircle, UserPlus } from "lucide-react";

export default function TestThanks() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'avocat' | 'notaire' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [accountCreated, setAccountCreated] = useState(false);

  useEffect(() => {
    const pendingPayment = sessionStorage.getItem('pendingPayment');
    if (pendingPayment) {
      const payment = JSON.parse(pendingPayment);
      setSelectedRole(payment.role);
    } else {
      // Pas de paiement en cours, rediriger
      navigate('/test-subscription/payment');
    }
  }, [navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    
    if (!nom || !prenom) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nom,
            prenom,
            role: selectedRole
          },
          emailRedirectTo: `${window.location.origin}/confirm-email`
        }
      });

      if (error) throw error;

      if (data.user) {
        toast.success("Compte créé avec succès !", {
          description: "Un email de confirmation a été envoyé à votre adresse"
        });
        setAccountCreated(true);
      }
    } catch (error: any) {
      console.error('Erreur inscription:', error);
      toast.error("Erreur lors de l'inscription", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100 to-white p-8">
      <div className="container mx-auto max-w-4xl">
        <Card className="border-2 border-green-200 mb-6">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <CardTitle className="text-3xl text-green-600 mb-2">
              Merci pour votre paiement !
            </CardTitle>
            <p className="text-gray-600">
              Votre paiement de <strong>1780€/mois</strong> pour l'abonnement Cabinet+ (20 membres) a été validé.
            </p>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ Récapitulatif de votre commande</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Plan : <strong>Cabinet+</strong></li>
                <li>• Nombre de membres : <strong>20 maximum</strong></li>
                <li>• Type de cabinet : <strong>{selectedRole === 'avocat' ? 'Avocat' : 'Notaire'}</strong></li>
                <li>• Stockage, dossiers, clients, signatures : <strong>Illimités</strong></li>
                <li>• Prix : <strong>1780€/mois</strong></li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="w-10 h-10 text-blue-600" />
            </div>
            <CardTitle className="text-2xl text-blue-600 mb-2">
              Créez votre compte responsable
            </CardTitle>
            <p className="text-gray-600">
              Étape 2/4 : Remplissez les informations ci-dessous
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input
                    id="prenom"
                    type="text"
                    placeholder="Jean"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    type="text"
                    placeholder="Dupont"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jean.dupont@cabinet.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button 
                type="submit"
                disabled={loading || accountCreated}
                className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
                size="lg"
              >
                {loading ? "Création..." : "Créer mon compte"}
              </Button>
              
              {accountCreated && (
                <div className="space-y-4 mt-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 text-center">
                      📧 Un email de confirmation a été envoyé à <strong>{email}</strong>
                    </p>
                    <p className="text-xs text-yellow-700 text-center mt-2">
                      Veuillez cliquer sur le lien dans l'email pour activer votre compte
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate('/test-subscription/login')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    J'ai confirmé mon email, me connecter
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
