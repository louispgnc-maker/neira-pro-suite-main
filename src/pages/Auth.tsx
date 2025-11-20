import { useState, FormEvent, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { EmailVerificationStatus } from "@/components/auth/EmailVerificationStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, Zap, TrendingUp, Check, Users, Instagram, Linkedin, Star, Hourglass, ChevronLeft, ChevronRight, Eye } 
from "lucide-react";                                                                                                   

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

  

  // social scroller ref for the horizontal social-proof carousel
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  // ref for the bottom detail panel to detect outside clicks
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Which social-proof is selected (null = none)
  const [selectedProofIndex, setSelectedProofIndex] = useState<number | null>(null);
  // dropdown state for 'Pour qui ?' menu inside the features container
  const [whoOpen, setWhoOpen] = useState(false);
  const whoRef = useRef<HTMLDivElement | null>(null);

  // dropdown state for 'Connexion' menu in header (identical behavior)
  const [connOpen, setConnOpen] = useState(false);
  const connRef = useRef<HTMLDivElement | null>(null);

  // close who menu on outside click
  useEffect(() => {
    if (!whoOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (whoRef.current && !whoRef.current.contains(t)) setWhoOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [whoOpen]);

  // close connexion menu on outside click
  useEffect(() => {
    if (!connOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (connRef.current && !connRef.current.contains(t)) setConnOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [connOpen]);

  // Auto-play controls
  // Disabled by default per user request: no automatic scrolling
  const [isPaused, setIsPaused] = useState(true);
  // Continuous auto-scroll speed (pixels per second). Very small = très lent.
  // Set speed to 200 px/s and reset to 0 when the end is reached.
  // The user asked: "avance de 200 pixels / seconde" with a jump back to start.
  const AUTO_SCROLL_PX_PER_SEC = 200; // 200 px/s
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);


  // Social items and helpers for seamless infinite carousel
  const socialItems = [
    {
      title: 'Automatisation juridique avancée',
      subtitle: '',
      text: "Créez et générez tous types de contrats en quelques clics grâce à notre rédaction assistée. Associez une fiche client au modèle désiré, personnalisez les clauses et les termes, puis envoyez automatiquement le document au client pour signature électronique sécurisée — tout est tracé et archivé.",
      icon: (<span className="text-2xl">⚡️</span>),
    },
    {
      title: 'Collaboration fluide',
      subtitle: '',
      text: "Espace partagé sécurisé pour vos équipes et vos clients : commentez les documents, attribuez des tâches, suivez l'avancement des dossiers et centralisez les échanges sans multiplications d'e‑mails. Les permissions sont granulaires pour garder le contrôle des accès.",
      icon: (<span className="text-2xl">🤝</span>),
    },
    {
      title: 'Pilotage du cabinet',
      subtitle: '',
      text: "Tableau de bord personnalisé avec indicateurs clés (CA, dossiers ouverts, délais moyens, taux de signature) et rapports exportables : obtenez une vision 360° de votre activité et prenez des décisions basées sur des données concrètes.",
      icon: (<span className="text-2xl">📊</span>),
    },
    {
      title: 'Sécurité & conformité RGPD',
      subtitle: '',
      text: "Chiffrement des données en transit et au repos, journalisation et traçabilité des accès, et hébergement conforme en Europe. Politiques de rétention et contrôles d'accès assurent la conformité RGPD et la protection de vos clients.",
      icon: (<span className="text-2xl">🔒</span>),
    },
    {
      title: 'Gestion documentaire intelligente',
      subtitle: '',
      text: "Organisation intelligente des documents avec métadonnées, recherche full‑text rapide (OCR), versions automatiques et nomenclatures paramétrables pour retrouver n'importe quel fichier en quelques secondes.",
      icon: (<span className="text-2xl">🗂️</span>),
    },
    {
      title: "Suivi automatisé des échéances",
      subtitle: '',
      text: "Alertes et rappels automatisés (e‑mail / SMS / notifications) synchronisés avec votre agenda, scénarios de relance personnalisables et escalades automatisées pour garantir le respect des délais.",
      icon: (<span className="text-2xl">⏰</span>),
    },
  ];
  const originalItemsCount = socialItems.length;
  const GAP = 24; // gap-6 -> 1.5rem = 24px

  const renderedCards = () => {
    // Calculate a width so that 6 cards fit side-by-side accounting for gaps (5 gaps).
    const cardWidthCalc = `calc((100% - ${GAP * 5}px) / 6)`;
    return socialItems.map((it, idx) => {
      const selected = selectedProofIndex === idx;
      return (
        <button
          key={`${it.title}-${idx}`}
          data-card
          onClick={() => setSelectedProofIndex(idx)}
          aria-pressed={selected}
          className={`relative bg-muted p-4 rounded-lg border border-border shadow-sm text-left transition-all duration-150 hover:shadow-md w-full ${selected ? 'ring-2 ring-primary' : ''}`}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm mt-1">
              {it.icon}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">{it.title}</div>
            </div>
          </div>
          {/* small click hint icon bottom-right */}
          <span className="absolute bottom-2 right-2 rounded-full bg-primary/10 text-primary p-2 flex items-center justify-center" aria-hidden>
            <Eye className="w-3 h-3" />
          </span>
        </button>
      );
    });
  };

  // Removed initial centering and any forced scroll movement — the social cards are now static.

  const getCardWidth = () => {
    const el = scrollerRef.current;
    if (!el) return (el?.clientWidth ?? 320) * 0.8;
    const first = el.querySelector('[data-card]') as HTMLElement | null;
    if (!first) return (el.clientWidth ?? 320) * 0.8;
    return first.offsetWidth + GAP;
  };

  const scrollByItems = (count: number) => {
    const w = getCardWidth();
    scrollByAmount(w * count);
  };

  // Continuous auto-scroll using requestAnimationFrame.
  // The user requested a steady advance that, once at the end, jumps back to 0.
  useEffect(() => {
    const step = (time: number) => {
      const el = scrollerRef.current;
      if (!el) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      if (isPaused) {
        lastTimeRef.current = null;
        return;
      }
      if (lastTimeRef.current == null) lastTimeRef.current = time;
      const dt = (time - (lastTimeRef.current ?? time)) / 1000; // seconds
      lastTimeRef.current = time;
      const delta = AUTO_SCROLL_PX_PER_SEC * dt;
      // advance
      el.scrollLeft = el.scrollLeft + delta;

      // If we've reached (or passed) the end, jump back to 0 (start).
      // This implements the requested behaviour: "advance slowly and once at the end return to 0".
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) {
        el.scrollLeft = 0;
        // Reset timing reference so dt doesn't accumulate when we resume
        lastTimeRef.current = time;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    if (!isPaused) {
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused]);

  const scrollByAmount = (amount: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const curr = el.scrollLeft;
    const max = el.scrollWidth - el.clientWidth;
    // Desired next position
    let next = curr + amount;

    // If beyond end, loop to the start
    if (next > max) {
      next = 0;
    }

    // If before start, loop to the end
    if (next < 0) {
      next = max;
    }

    // Smooth scroll to the computed position. Repeated clicks will cycle forever.
    el.scrollTo({ left: next, behavior: 'smooth' });
  };

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
  <div
    onClick={(e) => {
      // Deselect a selected proof when clicking the page background (outside the scroller and the detail panel).
      const target = e.target as Node;
      // If click was inside the scroller (cards), do nothing
      if (scrollerRef.current && scrollerRef.current.contains(target)) return;
      // If click was inside the bottom detail panel, do nothing
      if (panelRef.current && panelRef.current.contains(target)) return;

      // Otherwise clear selection / role state
      setRole(null);
      setAuthAtTop(false);
      setSelectedProofIndex(null);
    }}
    style={{ paddingLeft: '1cm', paddingRight: '1cm' }}
    className="relative min-h-screen bg-gradient-to-br from-primary/20 via-accent/10 to-background p-0 pt-28 pb-12"
  >
      {/* Fixed header */}
      <header className={`fixed inset-x-0 top-0 z-[60] bg-white/70 backdrop-blur border-b ${role && authAtTop ? 'border-transparent' : 'border-border'}`}>
            <div style={{ paddingLeft: '2.5cm', paddingRight: '2.5cm' }} className="w-full py-3 flex items-center justify-between gap-4 relative">
              {/* Logo on the far left */}
              <div className="flex items-center gap-3">
                <img src="https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Design_sans_titre-3-removebg-preview.png" alt="Neira" className="w-10 h-10 rounded-md object-cover" />
                <div className="leading-tight">
                  <div className="text-base font-bold text-foreground">Neira</div>
                  <div className="text-xs text-muted-foreground">Espace Professionnel Automatisé</div>
                </div>
              </div>

              {/* Centered controls: Pour qui ? + Connexion */}
              <div className="flex-1 flex justify-center items-center">
                <div className="flex items-center gap-4">
                  <div ref={whoRef} className="relative">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setWhoOpen((s) => !s); }}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-muted text-foreground hover:bg-muted/90 text-sm font-medium border border-border"
                    >
                      Pour qui ?
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {whoOpen ? (
                      <div className="absolute right-0 mt-2 w-44 bg-white border border-border rounded-md shadow-md z-40">
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-primary/5"
                          onClick={() => { setWhoOpen(false); setRole('avocat'); navigate('/avocats/metier'); }}
                        >
                          Avocats
                        </button>
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-primary/5"
                          onClick={() => { setWhoOpen(false); setRole('notaire'); navigate('/notaires/metier'); }}
                        >
                          Notaires
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div ref={connRef} className="relative">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setConnOpen((s) => !s); }}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-muted text-foreground hover:bg-muted/90 text-sm font-medium border border-border"
                    >
                      Connexion
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {connOpen ? (
                      <div className="absolute right-0 mt-2 w-52 bg-white border border-border rounded-md shadow-md z-40">
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-primary/5 flex items-center gap-3"
                          onClick={() => { setConnOpen(false); navigate('/avocats/auth'); }}
                        >
                          <span className="text-2xl">⚖️</span>
                          <span>Espace Avocats</span>
                        </button>
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-primary/5 flex items-center gap-3"
                          onClick={() => { setConnOpen(false); navigate('/notaires/auth'); }}
                        >
                          <span className="text-2xl">🏛️</span>
                          <span>Espace Notaires</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Social icons on the far right */}
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
  <div className="w-full mt-16">
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

          {/* title will be placed inside the big container per user request */}

          {/* Social proof horizontal scroller centered and wider than before */}
          <div className="w-full relative px-4 md:px-0">
            {/* Large container that holds the 6 small cards */}
            <div className="w-full bg-white rounded-xl p-6 shadow-md border border-border">
              <h3 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4">Fonctionnalités principales</h3>
              <div
                ref={scrollerRef}
                className="grid grid-cols-3 gap-6 py-4"
                aria-label="Témoignages et indicateurs"
              >
                {renderedCards()}
              </div>
            </div>
          </div>
        </div>

        {/* Central auth card removed - header popover is used for login/signup */}

        <div className="mb-8">
          <div ref={panelRef} className="w-full bg-white rounded-xl p-6 shadow-md border border-border min-h-[120px]">
            {selectedProofIndex === null ? (
              <>
                <h3 className="text-xl font-bold text-foreground">Espace collaboratif</h3>
                <p className="text-sm text-muted-foreground mt-2">Espace partagé pour vos équipes et clients — échangez, commentez et suivez les dossiers en toute simplicité.</p>
              </>
            ) : (
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl">
                  {socialItems[selectedProofIndex].icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{socialItems[selectedProofIndex].title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{socialItems[selectedProofIndex].text}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compliance/benefit badges removed per request */}
      </div>
    </div>
  );
}