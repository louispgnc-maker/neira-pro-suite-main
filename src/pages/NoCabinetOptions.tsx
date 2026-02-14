import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CreditCard, ArrowRight } from 'lucide-react';

export default function NoCabinetOptions() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 py-12">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenue !</h1>
          <p className="text-gray-600">Vous n'êtes actuellement rattaché à aucun cabinet</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Option 1: Rejoindre un cabinet */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/join-cabinet')}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Rejoindre un cabinet</CardTitle>
              <CardDescription>
                Vous avez reçu un code d'accès de votre cabinet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Pas d'abonnement requis
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Accès immédiat aux outils du cabinet
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Collaborez avec votre équipe
                </li>
              </ul>
              <Button className="w-full" onClick={() => navigate('/join-cabinet')}>
                Entrer mon code d'accès
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Option 2: Créer un cabinet */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-200" onClick={() => navigate('/test-subscription')}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Créer mon cabinet</CardTitle>
              <CardDescription>
                Souscrire à un abonnement pour votre cabinet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span>
                  Gestion complète de votre cabinet
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span>
                  Invitez des collaborateurs
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span>
                  Essai gratuit 14 jours
                </li>
              </ul>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" onClick={() => navigate('/test-subscription')}>
                Voir nos offres
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Vous rencontrez un problème ?{' '}
            <a href="mailto:contact@neira.fr" className="text-blue-600 hover:underline">
              Contactez-nous
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
