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
import { Shield, Zap, TrendingUp, Check, Users } from "lucide-react";


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

        // Redirect with a quick zoom-to-white transition
        const target = role === 'notaire' ? "/notaires/dashboard" : "/avocats/dashboard";
        triggerTransitionAndNavigate(target);
      }
    } catch (error: unknown) {
      console.error('Erreur d\'authentification:', error);
      const msg = (typeof error === 'object' && error !== null && 'message' in error) ? String((error as { message?: unknown }).message) : String(error);
      const lower = (msg || '').toLowerCase();
      if (msg === 'TIMEOUT') {
        toast.error("Connexion trop longue", { description: "Vérifiez votre connexion internet ou réessayez dans un instant." });
      } else if (lower.includes('email not confirmed')) {
        toast.error("Email non confirmé", { description: "Veuillez confirmer votre email puis réessayez." });
      } else if (lower.includes('invalid login credentials')) {
        toast.error("Identifiants invalides", { description: "Email ou mot de passe incorrect." });
      } else {
        toast.error(msg || "Une erreur est survenue");
      }
    } finally {
      setLoading(false);
    }
  };

  // Transition overlay state
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayAnimate, setOverlayAnimate] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  // transform-origin for the overlay (defaults to center)
  const [overlayOrigin, setOverlayOrigin] = useState<string>('50% 50%');
  // small progress indicator (0-100)
  const [progress, setProgress] = useState<number>(0);

  // progress auto-increment while overlay is visible
  useEffect(() => {
    if (!overlayVisible) {
      setProgress(0);
      return;
    }
    let mounted = true;
    // start small
    setProgress(6);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (!mounted) return p;
        // increase more slowly so the bar is visible
        const next = Math.min(90, p + Math.floor(Math.random() * 4) + 1);
        return next;
      });
    }, 220);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [overlayVisible]);

  const triggerTransitionAndNavigate = (target: string) => {
    if (isNavigating) return;
    setIsNavigating(true);
    setOverlayVisible(true);
    // next frame to allow the element to mount and then animate
    requestAnimationFrame(() => {
      // animate: grow the overlay from small to massive (screen zoom)
      setOverlayAnimate(true);
    });
    // push progress to 100% shortly before navigation
    setTimeout(() => setProgress(100), 700);
    // navigate after the animation (duration 850ms)
    setTimeout(() => {
      navigate(target);
    }, 850);
  };

  const handleRoleSelect = (e: React.MouseEvent<HTMLDivElement>, roleName: string) => {
    e.stopPropagation();
    setRole(roleName);
    try {
      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      setOverlayOrigin(`${cx}px ${cy}px`);
    } catch (err) {
      // fallback to center
      setOverlayOrigin('50% 50%');
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
    <div onClick={() => setRole(null)} className="relative min-h-screen bg-gradient-to-br from-primary/20 via-accent/10 to-background p-4 py-12">
      {/* Top-left logo + small phrase */}
      <div className="absolute top-6 left-6 flex items-start gap-3">
        <img src="/neira-logo.svg" alt="Neira" className="w-12 h-12 rounded-lg object-cover" />
        <div className="text-left">
          <h1 className="text-xl font-bold text-foreground">Neira</h1>
          <p className="text-sm text-muted-foreground">{role ? (role === "avocat" ? "Espace Avocats" : "Espace Notaires") : "Espace Professionnel Automatisé"}</p>
        </div>
      </div>

      {/* auth card will be inserted under the role buttons further down */}

      {/* Transition overlay (zoom to white) */}
      {overlayVisible ? (
        <div className={`fixed inset-0 z-[1000] flex items-center justify-center ${overlayAnimate ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          <div
            className={`absolute inset-0 bg-white`}
            style={{
              transformOrigin: overlayOrigin,
              transform: overlayAnimate ? 'scale(20)' : 'scale(0.04)',
              opacity: overlayAnimate ? 1 : 0,
              transition: 'transform 800ms ease-out, opacity 500ms ease-out',
            }}
          />
          {/* centered progress area with status text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-2/3 max-w-lg px-4 text-center">
              <div className="mb-4 text-sm text-foreground/80">Préparation de votre tableau de bord…</div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

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

  {/* Role selection buttons placed under the hero */}
  <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:divide-x md:divide-border">
            <div
              onClick={(e) => handleRoleSelect(e, "avocat")}
              className={`cursor-pointer group transition-all duration-300 rounded-xl ${
                role === "avocat"
                  ? "ring-2 ring-blue-600 scale-105"
                  : "hover:scale-105 hover:shadow-lg"
              }`}
              role="button"
              tabIndex={0}
            >
              <Card className={`${
                role === "avocat"
                  ? "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-600"
                  : "bg-white hover:bg-blue-50/50"
              } transition-all duration-300`}>
                <CardContent className="pt-6 pb-4 text-center space-y-2">
                        <div className="text-4xl">⚖️</div>
                        <h3 className="text-lg font-bold text-blue-900">Espace Avocats</h3>
                </CardContent>
              </Card>
            </div>
            

            <div
              onClick={(e) => handleRoleSelect(e, "notaire")}
              className={`cursor-pointer group transition-all duration-300 rounded-xl ${
                role === "notaire"
                  ? "ring-2 ring-orange-600 scale-105"
                  : "hover:scale-105 hover:shadow-lg"
              }`}
              role="button"
              tabIndex={0}
            >
              <Card className={`${
                role === "notaire"
                  ? "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-600"
                  : "bg-white hover:bg-orange-50/50"
              } transition-all duration-300`}>
                <CardContent className="pt-6 pb-4 text-center space-y-2">
                  <div className="text-4xl">🏛️</div>
                  <h3 className="text-lg font-bold text-orange-900">Espace Notaires</h3>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Auth card (white bar) shown only when a role is selected */}
        {role ? (
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl mx-auto mb-8">
            <Card className="bg-white dark:bg-card shadow-xl border-2">
              <CardContent className="pt-6 space-y-6">
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
                          <Input id="firstName" placeholder="Jean" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Nom</Label>
                          <Input id="lastName" placeholder="Dupont" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signupEmail">Email</Label>
                        <Input id="signupEmail" type="email" placeholder="nom@cabinet.fr" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signupPassword">Mot de passe</Label>
                        <Input id="signupPassword" type="password" required />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Création..." : "Créer mon compte"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="grid md:grid-cols-3 gap-6 mb-8 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="flex flex-col items-center text-center p-4 md:p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-transparent hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-2 shadow-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-sm text-foreground mb-1">Sécurité des données</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hébergement en Europe, chiffrement SSL, conformité RGPD
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-4 md:p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center mb-2 shadow-sm">
              <Users className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-sm text-foreground mb-1">Espace collaboratif</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Partagez des documents, collaborez en temps réel avec vos collègues et vos clients.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-4 md:p-6 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center mb-2 shadow-sm">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-sm text-foreground mb-1">Pensé pour les professionnels</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
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