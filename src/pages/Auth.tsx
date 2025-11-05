import { useState, FormEvent, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { EmailVerificationStatus } from "@/components/auth/EmailVerificationStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, Zap, TrendingUp, Check } from "lucide-react";


interface FormElements extends HTMLFormElement {
  email: HTMLInputElement;
  password: HTMLInputElement;
  signupEmail: HTMLInputElement;
  signupPassword: HTMLInputElement;
  firstName: HTMLInputElement;
  lastName: HTMLInputElement;
}

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState<string | null>(null); // "avocat" | "notaire"
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  // Détecte le rôle depuis l'URL au chargement
  useEffect(() => {
    if (location.pathname.includes('/notaires')) {
      setRole('notaire');
    } else if (location.pathname.includes('/avocats')) {
      setRole('avocat');
    }
  }, [location.pathname]);

  // Utilitaire: évite un "chargement infini" si le réseau ou Supabase ne répond pas
  const withTimeout = async <T,>(promise: Promise<T>, ms = 7000): Promise<T> => {
    return await new Promise<T>((resolve, reject) => {
      const id = setTimeout(() => reject(new Error('TIMEOUT')), ms);
      promise
        .then((res) => { clearTimeout(id); resolve(res); })
        .catch((err) => { clearTimeout(id); reject(err); });
    });
  };

  const handleAuth = async (e: FormEvent<HTMLFormElement>, isSignUp: boolean) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target as FormElements;

    try {
      // Vérifier qu'un rôle est sélectionné
      if (!role) {
        toast.error("Veuillez sélectionner un espace (Avocat ou Notaire)");
        setLoading(false);
        return;
      }

      // Retour immédiat si hors ligne
      if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
        toast.error("Hors ligne", { description: "Vérifiez votre connexion internet." });
        return;
      }
      if (isSignUp) {
        // Inscription directe avec Supabase
        const email = form.signupEmail.value;
        const password = form.signupPassword.value;
        
        type SignUpResponse = Awaited<ReturnType<typeof supabase.auth.signUp>>;
        const resp: SignUpResponse = await withTimeout<SignUpResponse>(
          supabase.auth.signUp({ 
            email, 
            password,
            options: {
              data: {
                first_name: form.firstName.value,
                last_name: form.lastName.value,
                role: role, // Pass the selected role to user metadata
              }
            }
          }),
          7000
        );
        const { error } = resp as SignUpResponse;
        if (error) throw error;
        setVerificationEmail(email);
      } else {
        // Connexion avec Supabase
        const email = form.email.value;
        const password = form.password.value;
        
        type SignInResponse = Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
        const resp: SignInResponse = await withTimeout<SignInResponse>(
          supabase.auth.signInWithPassword({ email, password }),
          7000
        );
        const { data, error } = resp as SignInResponse;

        if (error) throw error;
        
        toast.success("Connexion réussie!");
        console.log('Utilisateur connecté:', data.user, 'Espace sélectionné:', role);
        
        // Redirect based on selected role (not profile role)
        if (role === 'notaire') {
          navigate("/notaires/dashboard");
        } else {
          navigate("/avocats/dashboard");
        }
      }
    } catch (error: any) {
      console.error('Erreur d\'authentification:', error);
      if (error?.message === 'TIMEOUT') {
        toast.error("Connexion trop longue", { description: "Vérifiez votre connexion internet ou réessayez dans un instant." });
      } else if (error?.message?.toLowerCase?.().includes('email not confirmed')) {
        toast.error("Email non confirmé", { description: "Veuillez confirmer votre email puis réessayez." });
      } else if (error?.message?.toLowerCase?.().includes('invalid login credentials')) {
        toast.error("Identifiants invalides", { description: "Email ou mot de passe incorrect." });
      } else {
        toast.error(error.message || "Une erreur est survenue");
      }
    } finally {
      setLoading(false);
    }
  };

  // Email verification screen
  if (verificationEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-accent/10 to-background p-4 py-12">
        <EmailVerificationStatus
          email={verificationEmail}
          onBackToLogin={() => setVerificationEmail(null)}
        />
      </div>
    );
  }

  // Main page with role selection OR auth forms
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-accent/10 to-background p-4 py-12">
      <div className="w-full max-w-2xl mx-auto mb-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-4 shadow-glow animate-scale-in">
            <span className="text-2xl font-bold text-white">N</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Neira
          </h1>
          <p className="text-muted-foreground">
            {role ? (role === "avocat" ? "Espace Avocats" : "Espace Notaires") : "Espace Professionnel Automatisé"}
          </p>
        </div>

        {/* Single card containing everything */}
        <Card className="bg-white dark:bg-card shadow-xl border-2">
          <CardContent className="pt-6 space-y-6">
            {/* Role selection cards in two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Avocat Card */}
              <div 
                onClick={() => setRole("avocat")}
                className={`cursor-pointer group transition-all duration-300 rounded-xl ${
                  role === "avocat" 
                    ? "ring-2 ring-blue-600 scale-105" 
                    : "hover:scale-105 hover:shadow-lg"
                }`}
              >
                <Card className={`${
                  role === "avocat" 
                    ? "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-600" 
                    : "bg-white hover:bg-blue-50/50"
                } transition-all duration-300`}>
                  <CardContent className="pt-8 pb-6 text-center space-y-3">
                    <div className="text-5xl mb-2">⚖️</div>
                    <h3 className="text-2xl font-bold text-blue-900">Espace Avocats</h3>
                    <p className="text-sm text-blue-700">
                      Accès sécurisé dédié aux avocats
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Notaire Card */}
              <div 
                onClick={() => setRole("notaire")}
                className={`cursor-pointer group transition-all duration-300 rounded-xl ${
                  role === "notaire" 
                    ? "ring-2 ring-amber-600 scale-105" 
                    : "hover:scale-105 hover:shadow-lg"
                }`}
              >
                <Card className={`${
                  role === "notaire" 
                    ? "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-600" 
                    : "bg-white hover:bg-amber-50/50"
                } transition-all duration-300`}>
                  <CardContent className="pt-8 pb-6 text-center space-y-3">
                    <div className="text-5xl mb-2">🏛️</div>
                    <h3 className="text-2xl font-bold text-amber-900">Espace Notaires</h3>
                    <p className="text-sm text-amber-700">
                      Accès sécurisé dédié aux notaires
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Show auth forms once role is selected */}
            {role && (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Connexion</TabsTrigger>
                  <TabsTrigger value="signup">Créer un compte</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4 mt-4">
                  <form onSubmit={(e) => handleAuth(e, false)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="nom@cabinet.fr"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Mot de passe</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Connexion..." : "Se connecter"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4 mt-4">
                  <form onSubmit={(e) => handleAuth(e, true)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Prénom</Label>
                        <Input
                          id="firstName"
                          placeholder="Jean"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Nom</Label>
                        <Input
                          id="lastName"
                          placeholder="Dupont"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signupEmail">Email</Label>
                      <Input
                        id="signupEmail"
                        type="email"
                        placeholder="nom@cabinet.fr"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signupPassword">Mot de passe</Label>
                      <Input
                        id="signupPassword"
                        type="password"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Création..." : "Créer mon compte"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Features Section - Below Auth */}
      <div className="w-full max-w-4xl mx-auto mt-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Automatisez votre activité professionnelle
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Une plateforme sécurisée qui simplifie votre quotidien, optimise votre temps et celui de vos clients
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="flex flex-col items-center text-center p-8 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-4 shadow-md">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-bold text-lg text-foreground mb-3">Sécurité des données</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Hébergement en Europe, chiffrement SSL, conformité RGPD
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-8 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center mb-4 shadow-md">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-bold text-lg text-foreground mb-3">Automatisation intelligente</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Réduisez les tâches répétitives et gagnez du temps
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-8 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center mb-4 shadow-md">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-bold text-lg text-foreground mb-3">Pensé pour les professionnels</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Gestion des documents, rendez-vous, contacts et statistiques
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 p-6 rounded-xl bg-gradient-to-r from-card via-primary/5 to-card border border-border shadow-md">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
            <span>Conforme RGPD</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
            <span>Données sauvegardées</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
            <span>Support dédié</span>
          </div>
        </div>
      </div>
    </div>
  );
}