import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface EmailVerificationStatusProps {
  email: string;
  onBackToLogin: () => void;
}

export function EmailVerificationStatus({ email, onBackToLogin }: EmailVerificationStatusProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkVerificationStatus = async () => {
    setIsChecking(true);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      if (user?.email_confirmed_at) {
        setIsVerified(true);
        toast.success("Email vérifié avec succès!");
        setTimeout(onBackToLogin, 2000); // Retour à la page de connexion après 2 secondes
      } else {
        toast.error("L'email n'est pas encore vérifié.");
      }
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      toast.error("Erreur lors de la vérification de l'email");
    } finally {
      setIsChecking(false);
    }
  };

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
          Un email de confirmation a été envoyé à {email}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center p-6 bg-muted/50 rounded-lg">
          {isVerified ? (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span>Email vérifié avec succès!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <span>En attente de vérification...</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          <Button
            onClick={checkVerificationStatus}
            disabled={isChecking || isVerified}
          >
            {isChecking ? "Vérification..." : "J'ai vérifié mon email"}
          </Button>
          
          <Button
            variant="outline"
            onClick={resendVerificationEmail}
            disabled={isVerified}
          >
            Renvoyer l'email de vérification
          </Button>
          
          <Button
            variant="ghost"
            onClick={onBackToLogin}
          >
            Retour à la connexion
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground text-center">
          Si vous ne trouvez pas l'email, vérifiez vos spams ou cliquez sur "Renvoyer l'email"
        </p>
      </CardContent>
    </Card>
  );
}