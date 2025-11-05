import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface EmailVerificationStatusProps {
  email: string;
  onBackToLogin: () => void;
}

export function EmailVerificationStatus({ email, onBackToLogin }: EmailVerificationStatusProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  // Auto-check toutes les 5s pour activer le bouton retour
  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!isMounted) return;
        setIsVerified(Boolean(user?.email_confirmed_at));
      } catch (e) {
        // no-op
      }
    };
    check();
    const id = setInterval(check, 5000);
    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, []);

  const resendVerificationEmail = async () => {
    if (cooldown > 0) return;
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });
      if (error) throw error;
      
      toast.success("Email de vérification renvoyé!", {
        description: "Vérifiez votre boîte de réception et vos spams."
      });

      // Démarre un cooldown pour éviter le spam et les rate limits
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Erreur lors du renvoi:', error);
      toast.error("Erreur lors du renvoi de l'email");
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Vérifiez votre email
        </CardTitle>
        <CardDescription>
          Un email de confirmation a été envoyé à {email}. En attente de vérification…
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <Button
            onClick={resendVerificationEmail}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Renvoyer l'email (${cooldown}s)` : "Renvoyer l'email de vérification"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              try { onBackToLogin(); } catch {}
              navigate('/');
            }}
            disabled={!isVerified}
            title={!isVerified ? "Activez ce bouton après avoir cliqué sur le lien de confirmation" : undefined}
          >
            Revenir à la connexion
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}