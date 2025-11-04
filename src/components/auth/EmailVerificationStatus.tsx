import { useState, useEffect } from 'react';
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
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });
      if (error) throw error;
      
      toast.success("Email de vérification renvoyé!", {
        description: "Vérifiez votre boîte de réception et vos spams."
      });
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
          >
            Renvoyer l'email de vérification
          </Button>
          <Button
            variant="outline"
            onClick={onBackToLogin}
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