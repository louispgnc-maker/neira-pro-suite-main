import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Crown, Users, Database, FileText, PenTool, CheckCircle, UserPlus, Building2, LogIn } from "lucide-react";

type Step = 'payment' | 'thanks' | 'signup' | 'login' | 'create-cabinet';

export default function TestSubscription() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('payment');
  const [selectedRole, setSelectedRole] = useState<'avocat' | 'notaire' | null>(null);
  
  // Formulaires
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [accountCreated, setAccountCreated] = useState(false);

  // Vérifier l'état de l'utilisateur au chargement
  useEffect(() => {
    const checkUserState = async () => {
      if (user) {
        // Vérifier si l'utilisateur a déjà un cabinet
        const { data: existingCabinet } = await supabase
          .from('cabinets')
          .select('id, role')
          .eq('owner_id', user.id)
          .single();

        if (existingCabinet) {
          // Cabinet existe, rediriger
          const prefix = existingCabinet.role === 'avocat' ? '/avocats' : '/notaires';
          toast.info("Vous avez déjà un cabinet", {
            description: "Redirection vers votre cabinet..."
          });
          setTimeout(() => navigate(`${prefix}/cabinet`), 1500);
        } else {
          // Utilisateur connecté mais pas de cabinet
          setStep('create-cabinet');
        }
      } else {
        // Pas d'utilisateur, vérifier si on a un paiement en attente
        const pendingPayment = sessionStorage.getItem('pendingPayment');
        if (pendingPayment) {
          setStep('thanks');
          const payment = JSON.parse(pendingPayment);
          setSelectedRole(payment.role);
        }
      }
    };
    checkUserState();
  }, [user, navigate]);

  const handlePayment = (role: 'avocat' | 'notaire') => {
    setSelectedRole(role);
    // Simuler un paiement
    sessionStorage.setItem('pendingPayment', JSON.stringify({
      plan: 'cabinet-plus',
      members: 20,
      role: role,
      timestamp: new Date().toISOString()
    }));
    setStep('thanks');
    toast.success("Paiement simulé avec succès !");
  };

  const handleGoToSignup = () => {
    setStep('signup');
  };

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      toast.success("Connexion réussie !");
      // L'useEffect va détecter l'utilisateur et passer à l'étape create-cabinet
    } catch (error: any) {
      console.error('Erreur connexion:', error);
      toast.error("Erreur lors de la connexion", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const createTestCabinet = async (role: 'avocat' | 'notaire') => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    setLoading(true);

    try {
      // Vérifier si un cabinet existe déjà
      const { data: existingCabinet } = await supabase
        .from('cabinets')
        .select('id')
        .eq('owner_id', user.id)
        .eq('role', role)
        .single();

      if (existingCabinet) {
        // Mettre à jour le cabinet existant
        const { error } = await supabase
          .from('cabinets')
          .update({
            subscription_plan: 'cabinet-plus',
            max_members: 20,
            max_storage_go: null, // illimité
            max_dossiers: null, // illimité
            max_clients: null, // illimité
            max_signatures_per_month: null, // illimité
            billing_period: 'monthly',
            subscription_status: 'active',
            subscription_started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCabinet.id);

        if (error) throw error;

        toast.success("Cabinet mis à jour !", {
          description: "Votre cabinet est maintenant sur le plan Cabinet+ avec 20 membres."
        });
      } else {
        // Créer un nouveau cabinet
        const { error } = await supabase
          .from('cabinets')
          .insert({
            role: role,
            nom: `Cabinet ${user.email?.split('@')[0] || 'Demo'}`,
            adresse: 'Adresse de test',
            email: user.email,
            owner_id: user.id,
            subscription_plan: 'cabinet-plus',
            max_members: 20,
            max_storage_go: null, // illimité
            max_dossiers: null, // illimité
            max_clients: null, // illimité
            max_signatures_per_month: null, // illimité
            billing_period: 'monthly',
            subscription_status: 'active',
            subscription_started_at: new Date().toISOString()
          });

        if (error) throw error;

        toast.success("Cabinet créé !", {
          description: "Votre cabinet de test est prêt avec le plan Cabinet+ (20 membres)."
        });
      }

      // Nettoyer le sessionStorage
      sessionStorage.removeItem('pendingPayment');

      // Rediriger vers le cabinet
      setTimeout(() => {
        const prefix = role === 'avocat' ? '/avocats' : '/notaires';
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

  // Étape 1: Paiement
  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white p-8">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-orange-600 mb-2">🧪 Mode Test - Paiement</h1>
            <p className="text-gray-600">Étape 1/3 : Simuler le paiement de l'abonnement Cabinet+ (20 membres)</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 border-orange-200 hover:border-orange-400 transition-all cursor-pointer" onClick={() => handlePayment('avocat')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <Users className="w-6 h-6" />
                  Cabinet Avocat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Souscrire à Cabinet+ (20 membres) pour un cabinet d'avocat
                </p>
                <Button className="w-full bg-orange-500 hover:bg-orange-600">
                  Payer 89€/mois × 20 = 1780€/mois
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 hover:border-purple-400 transition-all cursor-pointer" onClick={() => handlePayment('notaire')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <Crown className="w-6 h-6" />
                  Cabinet Notaire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Souscrire à Cabinet+ (20 membres) pour un cabinet de notaire
                </p>
                <Button className="w-full bg-purple-500 hover:bg-purple-600">
                  Payer 89€/mois × 20 = 1780€/mois
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Étape 2: Remerciement + Création de compte
  if (step === 'thanks') {
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
                      onClick={() => setStep('login')}
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

  // Étape 3: Connexion
  if (step === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-indigo-100 to-white p-8 flex items-center justify-center">
        <Card className="max-w-md w-full border-2 border-indigo-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <LogIn className="w-10 h-10 text-indigo-600" />
            </div>
            <CardTitle className="text-2xl text-indigo-600 mb-2">
              Connexion
            </CardTitle>
            <p className="text-gray-600">
              Étape 3/4 : Connectez-vous avec votre nouveau compte
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="jean.dupont@cabinet.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Mot de passe</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button 
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-lg py-6"
                size="lg"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Étape 4: Création du cabinet (utilisateur connecté)
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white p-8">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-12 h-12 text-orange-600" />
          </div>
          <h1 className="text-4xl font-bold text-orange-600 mb-2">Bienvenue {user?.email} !</h1>
          <p className="text-gray-600">Étape 4/4 : Créez votre cabinet avec l'abonnement Cabinet+ (20 membres)</p>
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
              Créer votre cabinet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 mb-4">
              Type de cabinet : <strong>{selectedRole === 'avocat' ? 'Avocat' : 'Notaire'}</strong>
            </p>
            <Button 
              onClick={() => createTestCabinet(selectedRole || 'avocat')}
              disabled={loading || !selectedRole}
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
              size="lg"
            >
              {loading ? "Création..." : `Créer mon Cabinet ${selectedRole === 'avocat' ? 'Avocat' : 'Notaire'}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
