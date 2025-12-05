import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function ConfirmEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [prenom, setPrenom] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier si on a des tokens dans l'URL (hash fragment)
    const hash = window.location.hash;
    
    if (hash && hash.includes('access_token')) {
      // Vérifier si c'est une réinitialisation de mot de passe
      if (hash.includes('type=recovery') || hash.includes('type=password_recovery')) {
        // C'est une réinitialisation de mot de passe, rediriger vers /reset-password
        navigate('/reset-password' + hash);
        return;
      }
      
      // L'utilisateur vient de confirmer son email via le lien
      // Attendre un peu que Supabase traite les tokens
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    } else if (user) {
      // Utilisateur déjà connecté
      setLoading(false);
    } else {
      // Pas de tokens et pas d'utilisateur, rediriger
      setTimeout(() => {
        navigate('/test-subscription');
      }, 2000);
    }
  }, [navigate, user]);

  useEffect(() => {
    // Récupérer le prénom depuis les métadonnées de l'utilisateur
    if (user?.user_metadata?.prenom) {
      setPrenom(user.user_metadata.prenom);
    }
  }, [user]);

  const handleReturnToLogin = () => {
    // Rediriger vers la page test-subscription qui affiche le formulaire de connexion
    navigate('/test-subscription');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100 to-white p-8 flex items-center justify-center">
        <Card className="max-w-lg w-full border-2 border-green-200">
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Vérification de votre compte...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100 to-white p-8 flex items-center justify-center">
      <Card className="max-w-lg w-full border-2 border-green-200">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <CardTitle className="text-3xl text-green-600 mb-2">
            {prenom ? `Merci ${prenom} !` : "Merci !"}
          </CardTitle>
          <p className="text-xl text-gray-700 font-medium">
            Votre compte a été créé avec succès
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-800 mb-2">
              ✅ Votre adresse email a été vérifiée
            </p>
            <p className="text-sm text-green-700">
              Vous pouvez maintenant vous connecter à votre compte et créer votre cabinet.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleReturnToLogin}
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
              size="lg"
            >
              Retourner à la connexion
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <p className="text-center text-sm text-gray-500">
              Vous pouvez aussi fermer cette page et revenir à l'onglet de connexion
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
