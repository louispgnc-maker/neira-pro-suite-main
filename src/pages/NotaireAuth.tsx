import { useState, FormEvent, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { EmailVerificationStatus } from "@/components/auth/EmailVerificationStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Instagram, Linkedin } from "lucide-react";

interface FormElements extends HTMLFormElement {
  email: HTMLInputElement;
  password: HTMLInputElement;
  signupEmail: HTMLInputElement;
  signupPassword: HTMLInputElement;
  firstName: HTMLInputElement;
  lastName: HTMLInputElement;
}

export default function NotaireAuth() {
  const navigate = useNavigate();
  const role = 'notaire';
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayAnimate, setOverlayAnimate] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [whoOpen, setWhoOpen] = useState(false);
  const [connOpen, setConnOpen] = useState(false);
  const whoRef = useRef<HTMLDivElement | null>(null);
  const connRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!whoOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (whoRef.current && !whoRef.current.contains(t)) setWhoOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [whoOpen]);

  useEffect(() => {
    if (!connOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (connRef.current && !connRef.current.contains(t)) setConnOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [connOpen]);

  const withTimeout = async <T,>(promise: Promise<T>, ms = 7000): Promise<T> => {
    return await new Promise<T>((resolve, reject) => {
      const id = setTimeout(() => reject(new Error('TIMEOUT')), ms);
      promise
        .then((res) => { clearTimeout(id); resolve(res); })
        .catch((err) => { clearTimeout(id); reject(err); });
    });
  };

  useEffect(() => {
    if (!overlayVisible) { setProgress(0); return; }
    let mounted = true;
    setProgress(6);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (!mounted) return p;
        const next = Math.min(90, p + Math.floor(Math.random() * 4) + 1);
        return next;
      });
    }, 220);
    return () => { mounted = false; clearInterval(interval); };
  }, [overlayVisible]);

  const triggerTransitionAndNavigate = (target: string) => {
    if (isNavigating) return;
    setIsNavigating(true);
    setOverlayVisible(true);
    requestAnimationFrame(() => setOverlayAnimate(true));
    setTimeout(() => setProgress(100), 700);
    setTimeout(() => navigate(target), 850);
  };

  const handleAuth = async (e: FormEvent<HTMLFormElement>, isSignUp: boolean) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target as FormElements;
    try {
      if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
        toast.error("Hors ligne", { description: "Vérifiez votre connexion internet." });
        setLoading(false);
        return;
      }

      if (isSignUp) {
        const email = form.signupEmail.value;
        const password = form.signupPassword.value;
        const resp = await withTimeout(supabase.auth.signUp({ email, password, options: { data: { first_name: form.firstName.value, last_name: form.lastName.value, role } } }));
        // @ts-ignore
        if ((resp as any).error) throw (resp as any).error;
        setVerificationEmail(email);
      } else {
        const email = form.email.value;
        const password = form.password.value;
        const resp = await withTimeout(supabase.auth.signInWithPassword({ email, password }));
        // @ts-ignore
        if ((resp as any).error) throw (resp as any).error;
        toast.success("Connexion réussie!");
        triggerTransitionAndNavigate('/notaires/dashboard');
      }
    } catch (err: unknown) {
      console.error('Auth error', err);
      const msg = (typeof err === 'object' && err !== null && 'message' in err) ? String((err as any).message) : String(err);
      const lower = (msg || '').toLowerCase();
      if (msg === 'TIMEOUT') {
        toast.error("Connexion trop longue");
      } else if (lower.includes('invalid')) {
        toast.error("Identifiants invalides");
      } else {
        toast.error(msg || "Erreur");
      }
    } finally {
      setLoading(false);
    }
  };

  if (verificationEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white p-6 flex items-center justify-center">
        <div className="fixed top-4 left-4 z-50">
          <button onClick={() => navigate(-1)} aria-label="Retour" className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-600 text-white shadow-md">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
        <EmailVerificationStatus email={verificationEmail} onBackToLogin={() => setVerificationEmail(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white" style={{ paddingLeft: '1cm', paddingRight: '1cm', backgroundImage: 'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Design%20sans%20titre-4.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      {/* Fixed header */}
      <header className="fixed inset-x-0 top-0 z-50 bg-white/70 backdrop-blur border-b border-border">
        <div style={{ paddingLeft: '2.5cm', paddingRight: '2.5cm' }} className="w-full py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Design_sans_titre-3-removebg-preview.png" alt="Neira" className="w-10 h-10 rounded-md object-cover" />
            <div className="leading-tight">
              <div className="text-base font-bold text-foreground">Neira</div>
              <div className="text-xs text-muted-foreground">Espace Professionnel Automatisé</div>
            </div>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-16">
            <div ref={whoRef} className="relative">
              <button type="button" onClick={(e) => { e.stopPropagation(); setWhoOpen((s) => !s); }} className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors">
                Pour qui ?
              </button>
              {whoOpen ? (
                <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors" onClick={() => { setWhoOpen(false); navigate('/avocats/metier'); }}>Avocats</button>
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors" onClick={() => { setWhoOpen(false); navigate('/notaires/metier'); }}>Notaires</button>
                </div>
              ) : null}
            </div>

            <div ref={connRef} className="relative">
              <button type="button" onClick={(e) => { e.stopPropagation(); setConnOpen((s) => !s); }} className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors">
                Connexion
              </button>
              {connOpen ? (
                <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors" onClick={() => { setConnOpen(false); navigate('/avocats/auth'); }}>
                    Avocats
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors" onClick={() => { setConnOpen(false); navigate('/notaires/auth'); }}>
                    Notaires
                  </button>
                </div>
              ) : null}
            </div>

            <button type="button" onClick={() => navigate('/contact')} className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors">
              Contact
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a href="https://www.instagram.com/neira.doc/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-8 h-8 rounded-md flex items-center justify-center text-white hover:scale-105 transition-transform duration-150 shadow-sm" style={{ background: 'linear-gradient(135deg,#f58529 0%,#dd2a7b 50%,#8134af 100%)' }}>
              <Instagram className="w-4 h-4" />
            </a>
            <a href="https://www.linkedin.com/company/neira-doc" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-8 h-8 rounded-md flex items-center justify-center text-white hover:scale-105 transition-transform duration-150 shadow-sm" style={{ background: '#0A66C2' }}>
              <Linkedin className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      <div className="p-6 pt-28 flex items-center justify-center min-h-screen">
      {overlayVisible ? (
        <div className={`fixed inset-0 z-[1000] flex items-center justify-center`}>
          <div className={`absolute inset-0 bg-white`} style={{ transform: overlayAnimate ? 'scale(20)' : 'scale(0.04)', opacity: overlayAnimate ? 1 : 0, transition: 'transform 800ms ease-out, opacity 500ms ease-out' }} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-2/3 max-w-lg px-4 text-center">
              <div className="mb-4 text-base text-slate-700 font-medium">Préparation de votre tableau de bord…</div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                <div className="h-full transition-all duration-300 ease-out bg-orange-600" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connexion — Espace Notaires</CardTitle>
          <CardDescription>Connectez-vous à votre espace Notaire</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList>
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Créer un compte</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={(e) => handleAuth(e, false)} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input name="email" type="email" required />
                </div>
                <div>
                  <Label>Mot de passe</Label>
                  <Input name="password" type="password" required />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">Se connecter</Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={(e) => handleAuth(e, true)} className="space-y-4">
                <div>
                  <Label>Prénom</Label>
                  <Input name="firstName" required />
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input name="lastName" required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input name="signupEmail" type="email" required />
                </div>
                <div>
                  <Label>Mot de passe</Label>
                  <Input name="signupPassword" type="password" required />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">Créer un compte</Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
