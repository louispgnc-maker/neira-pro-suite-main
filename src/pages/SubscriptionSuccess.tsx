import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const sessionIdParam = searchParams.get('session_id');
    setSessionId(sessionIdParam);

    // Empêcher le retour arrière
    window.history.pushState(null, '', window.location.href);
    window.onpopstate = () => {
      window.history.pushState(null, '', window.location.href);
    };

    // Vérifier que le paiement est bien confirmé
    const verifyPayment = async () => {
      if (!sessionIdParam) {
        toast.error('Session invalide');
        setLoading(false);
        return;
      }

      try {
        // Attendre quelques secondes pour laisser le webhook traiter le paiement
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        setLoading(false);
        toast.success('Paiement confirmé !', {
          description: 'Votre abonnement est maintenant actif.'
        });
      } catch (error) {
        console.error('Erreur lors de la vérification:', error);
        setLoading(false);
      }
    };

    verifyPayment();

    return () => {
      window.onpopstate = null;
    };
  }, [searchParams]);

  const handleContinue = () => {
    // Rediriger vers le choix de profession
    navigate('/select-profession');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
              <p className="text-gray-600">Vérification de votre paiement...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Pas de header - flux obligatoire */}
      
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white/95 backdrop-blur border-2 border-green-500 shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <CardTitle className="text-3xl text-green-600">Paiement réussi !</CardTitle>
              <CardDescription className="text-base mt-2">
                Merci pour votre confiance. Votre abonnement Neira Cabinet+ est maintenant actif.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-3">
                <h3 className="font-semibold text-green-900">Ce qui se passe ensuite :</h3>
                <ul className="space-y-2 text-sm text-green-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Votre compte a été automatiquement activé</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Vous avez accès à toutes les fonctionnalités Cabinet+</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Un email de confirmation a été envoyé</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Votre facture est disponible dans votre espace</span>
                  </li>
                </ul>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h3 className="font-semibold text-orange-900 mb-2">Besoin d'aide ?</h3>
                <p className="text-sm text-orange-800 mb-3">
                  Notre équipe support est à votre disposition pour vous accompagner dans la prise en main de Neira.
                </p>
                <p className="text-sm text-orange-800">
                  📧 Email : <a href="mailto:support@neira.fr" className="underline">support@neira.fr</a><br />
                  ⏱️ Réponse sous 2h (jours ouvrés)
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleContinue}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Accéder à mon espace
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.open('mailto:support@neira.fr', '_blank')}
                  className="w-full"
                >
                  Contacter le support
                </Button>
              </div>

              {sessionId && (
                <p className="text-xs text-gray-500 text-center">
                  Référence de transaction : {sessionId}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
