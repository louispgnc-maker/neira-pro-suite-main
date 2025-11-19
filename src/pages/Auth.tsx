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
import { Shield, Zap, TrendingUp, Check, Users, Instagram, Linkedin, Star, Hourglass } from "lucide-react";


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
  // Show the auth card as a compact popover under the fixed header
  const [authAtTop, setAuthAtTop] = useState<boolean>(false);
  // (auth panel is rendered as an absolute child of the header button container)

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

  const handleRoleSelect = (e: React.MouseEvent<HTMLElement>, roleName: string, topPopover = false) => {
    e.stopPropagation();
    setRole(roleName);
    // do not open the auth panel here — we removed inline auth from this page
    setAuthAtTop(false);
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
    <div onClick={() => { setRole(null); setAuthAtTop(false); }} className="relative min-h-screen bg-gradient-to-br from-primary/20 via-accent/10 to-background p-4 pt-28 pb-12">
      {/* Fixed header */}
      <header className={`fixed inset-x-0 top-0 z-[60] bg-white/70 backdrop-blur border-b ${role && authAtTop ? 'border-transparent' : 'border-border'}`}>
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              {/* Logo on the far left */}
              <div className="flex items-center gap-3">
                <img src="https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Design_sans_titre-3-removebg-preview.png" alt="Neira" className="w-10 h-10 rounded-md object-cover" />
                <div className="leading-tight">
                  <div className="text-base font-bold text-foreground">Neira</div>
                  <div className="text-xs text-muted-foreground">Espace Professionnel Automatisé</div>
                </div>
              </div>

              {/* Role buttons and social icons aligned to the right */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className={`relative transition-all duration-200 ${role === 'avocat' && authAtTop ? 'inline-block scale-105 ring-2 ring-blue-600 rounded-lg' : 'inline-block'}`}>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={role === 'avocat' && authAtTop}
                      onClick={(e) => { e.stopPropagation(); setRole('avocat'); navigate('/avocats/auth'); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setRole('avocat'); navigate('/avocats/auth'); } }}
                      className={`inline-flex items-center gap-2 px-3 py-2 text-left transition-colors duration-150 ${
                        role === 'avocat' && authAtTop ? 'rounded-t-lg bg-gradient-to-br from-blue-50 to-blue-100 border-b-0 border border-blue-200' : 'rounded-lg bg-blue-50 hover:bg-blue-100 hover:scale-105 border border-blue-100'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow text-lg">
                        <span className={`${role === 'avocat' ? 'text-blue-600' : 'text-primary'}`}>⚖️</span>
                      </div>
                      <span className={`text-sm font-medium ${role === 'avocat' ? 'text-blue-900' : 'text-foreground'}`}>Espace Avocats</span>
                    </div>
                  </div>

                  <div className={`relative transition-all duration-200 ${role === 'notaire' && authAtTop ? 'inline-block scale-105 ring-2 ring-orange-600 rounded-lg' : 'inline-block'}`}>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={role === 'notaire' && authAtTop}
                      onClick={(e) => { e.stopPropagation(); setRole('notaire'); navigate('/notaires/auth'); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setRole('notaire'); navigate('/notaires/auth'); } }}
                      className={`inline-flex items-center gap-2 px-3 py-2 text-left transition-colors duration-150 ${
                        role === 'notaire' && authAtTop ? 'rounded-t-lg bg-gradient-to-br from-orange-50 to-orange-100 border-b-0 border border-orange-200' : 'rounded-lg bg-orange-50 hover:bg-orange-100 hover:scale-105 border border-orange-100'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow text-lg">
                        <span className={`${role === 'notaire' ? 'text-orange-600' : 'text-accent'}`}>🏛️</span>
                      </div>
                      <span className={`text-sm font-medium ${role === 'notaire' ? 'text-orange-900' : 'text-foreground'}`}>Espace Notaires</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="https://www.instagram.com/neira.doc/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="w-8 h-8 rounded-md flex items-center justify-center text-white hover:scale-105 transition-transform duration-150 shadow-sm"
                    style={{ background: 'linear-gradient(135deg,#f58529 0%,#dd2a7b 50%,#8134af 100%)' }}
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                  <a
                    href="https://www.linkedin.com/company/neira-doc"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="w-8 h-8 rounded-md flex items-center justify-center text-white hover:scale-105 transition-transform duration-150 shadow-sm"
                    style={{ background: '#0A66C2' }}
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </header>

      {/* When a header role is selected we show a compact auth card as a fixed popover anchored to the clicked button —
          This prevents the header area from resizing or creating a second visible page. */}

      {/* auth panels are rendered as absolute children of each header button container */}

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
              <div className="mb-4 text-base text-slate-700 dark:text-slate-200 font-medium">Préparation de votre tableau de bord…</div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full transition-all duration-300 ease-out ${role === 'notaire' ? 'bg-orange-600' : 'bg-blue-600'}`}
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
            Optimisez votre activité professionnelle
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            La plateforme tout-en-un qui simplifie et fluidifie le quotidien des experts du juridique.
          </p>
        </div>

        {/* Center role buttons removed per request: header buttons now control selection */}

        {/* CTA button above the four feature cards */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="flex justify-center w-full">
            <Button onClick={() => navigate('/contact')} className="px-6 py-2">Découvrir notre solution</Button>
          </div>

          {/* Social proof horizontal scroller */}
          <div className="w-full">
            <div className="flex gap-4 overflow-x-auto py-2 px-2 -mx-2 snap-x snap-mandatory">
              <div className="snap-start min-w-[260px] md:min-w-[300px] bg-card p-4 rounded-lg border border-border shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <Star className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Note moyenne 4.8/5</div>
                    <div className="text-xs text-muted-foreground">Basée sur les retours de nos clients</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Réduction du temps administratif de 25–40% selon nos retours clients.</p>
              </div>

              <div className="snap-start min-w-[260px] md:min-w-[300px] bg-card p-4 rounded-lg border border-border shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <Users className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">+120 Cabinets</div>
                    <div className="text-xs text-muted-foreground">Ont adopté Neira</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Gestion centralisée des dossiers et partage sécurisé pour les équipes.</p>
              </div>

              <div className="snap-start min-w-[260px] md:min-w-[300px] bg-card p-4 rounded-lg border border-border shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <Check className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Conforme RGPD</div>
                    <div className="text-xs text-muted-foreground">Sécurité et confidentialité</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Archivage sécurisé et traçabilité des actions pour vos dossiers.</p>
              </div>

              <div className="snap-start min-w-[260px] md:min-w-[300px] bg-card p-4 rounded-lg border border-border shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">+30% Productivité</div>
                    <div className="text-xs text-muted-foreground">Gain moyen observé</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Automatisations et modèles prêts à l'emploi.</p>
              </div>
              
              <div className="snap-start min-w-[260px] md:min-w-[300px] bg-card p-4 rounded-lg border border-border shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <Hourglass className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Gain de temps 25–40%</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Réduction du travail administratif grâce aux automatisations et modèles de Neira.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Central auth card removed - header popover is used for login/signup */}

        <div className="grid md:grid-cols-4 gap-6 mb-8 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="flex flex-col items-center text-center p-6 md:p-6 rounded-xl h-56 md:h-64 justify-between bg-gradient-to-br from-primary/10 to-primary/5 border border-transparent hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-2 shadow-md">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-sm text-foreground mb-1">🔄 Automatiser vos tâches répétitives</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Automatisez les tâches répétitives pour gagner du temps chaque semaine.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 md:p-6 rounded-xl h-56 md:h-64 justify-between bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-2 shadow-md">
              <Check className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-bold text-sm text-foreground mb-1">📁 Gérez vos documents en toute sérénité</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Stockage sécurisé, accès simplifié et partage maîtrisé avec vos équipes et vos clients.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 md:p-6 rounded-xl h-56 md:h-64 justify-between bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-2 shadow-md">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-bold text-sm text-foreground mb-1">👥 Collaborer avec vos clients et vos équipes</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Espace partagé et échanges sécurisés pour collaborer efficacement.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 md:p-6 rounded-xl h-56 md:h-64 justify-between bg-gradient-to-br from-success/10 to-success/5 border border-success/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-2 shadow-md">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <h3 className="font-bold text-sm text-foreground mb-1">📊 Piloter votre activité</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Agenda, indicateurs et suivi des dossiers pour piloter votre cabinet.
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

        {/* "Pour qui ?" section - Avocats / Notaires */}
        <div className="mt-10 bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold">Pour qui ?</h3>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">Découvrez comment Neira s'adapte aux besoins des cabinets.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-lg font-semibold">Avocats</h4>
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Gestion des dossiers et contrats</li>
                <li>Automatisation des actes et modèles</li>
                <li>Suivi des échéances & agendas</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <h4 className="text-lg font-semibold">Notaires</h4>
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Modèles d'actes et formalités</li>
                <li>Signature sécurisée et archivage</li>
                <li>Gestion clients & partage contrôlé</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground max-w-xl">Découvrez tous nos outils pour gagner du temps et sécuriser vos procédures.</p>
            <div>
              <Button onClick={() => navigate('/contact')} className="ml-auto">Découvrir notre solution</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}