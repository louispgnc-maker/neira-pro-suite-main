import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { EmailVerificationStatus } from "@/components/auth/EmailVerificationStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";

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
      <PublicHeader />

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
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
