import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Landmark } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function SelectProfession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleSelect = async (profession: 'avocat' | 'notaire') => {
    // Stocker le choix de profession
    localStorage.setItem('selectedProfession', profession);
    
    if (isAuthenticated) {
      // Utilisateur déjà connecté : mettre à jour son profil et aller vers onboarding
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Mettre à jour le rôle dans le profil
        await supabase
          .from('profiles')
          .update({ role: profession })
          .eq('id', session.user.id);
      }
      
      // Rediriger vers la création de cabinet
      navigate(`/onboarding/create-cabinet?role=${profession}`);
    } else {
      // Utilisateur non connecté : créer un compte d'abord
      navigate(`/create-account?role=${profession}&session_id=${sessionId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-4xl w-full relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Bienvenue sur Neira !
          </h1>
          <p className="text-xl text-gray-600">
            Pour finaliser votre inscription, sélectionnez votre profession
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Avocat */}
          <Card 
            className="cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-blue-500"
            onClick={() => handleSelect('avocat')}
          >
            <CardHeader className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                <Scale className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl">Avocat</CardTitle>
              <CardDescription>
                Cabinet d'avocats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Je suis avocat
              </Button>
            </CardContent>
          </Card>

          {/* Notaire */}
          <Card 
            className="cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-orange-500"
            onClick={() => handleSelect('notaire')}
          >
            <CardHeader className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center shadow-lg">
                <Landmark className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl">Notaire</CardTitle>
              <CardDescription>
                Étude notariale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                Je suis notaire
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
