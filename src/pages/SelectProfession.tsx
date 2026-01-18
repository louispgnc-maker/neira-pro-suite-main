import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Landmark } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';

export default function SelectProfession() {
  const navigate = useNavigate();

  const handleSelect = (profession: 'avocat' | 'notaire') => {
    // Stocker le choix de profession
    localStorage.setItem('selectedProfession', profession);
    
    // Rediriger vers la création de cabinet
    navigate(`/onboarding/create-cabinet?profession=${profession}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-100 via-purple-100 to-blue-100">
      <PublicHeader />
      
      <div className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="max-w-4xl w-full">
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
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-lg">
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
    </div>
  );
}
