import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowRight } from "lucide-react";

interface AccessDeniedProps {
  userRole: 'avocat' | 'notaire';
  attemptedRole: 'avocat' | 'notaire';
}

export default function AccessDenied({ userRole, attemptedRole }: AccessDeniedProps) {
  const navigate = useNavigate();

  const userRoleLabel = userRole === 'avocat' ? 'Avocat' : 'Notaire';
  const attemptedRoleLabel = attemptedRole === 'avocat' ? 'Avocat' : 'Notaire';
  const userColor = userRole === 'avocat' ? 'blue' : 'orange';
  const attemptedColor = attemptedRole === 'avocat' ? 'blue' : 'orange';

  const handleGoToMySpace = () => {
    const correctPath = userRole === 'avocat' ? '/avocats/dashboard' : '/notaires/dashboard';
    navigate(correctPath);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-red-50 via-red-100 to-white p-8 flex items-center justify-center`}>
      <Card className="max-w-2xl w-full border-2 border-red-300 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-16 h-16 text-red-600" />
          </div>
          <CardTitle className="text-3xl text-red-600 mb-4">
            Accès refusé
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <p className="text-lg text-center text-gray-800 mb-4">
              Vous n'avez pas accès à <strong className={`text-${attemptedColor}-600`}>l'espace {attemptedRoleLabel}</strong>
            </p>
            <p className="text-center text-gray-600">
              Votre compte est associé à un cabinet de type <strong className={`text-${userColor}-600`}>{userRoleLabel}</strong>
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-center text-sm text-gray-600">
              Vous pouvez accéder à votre espace dédié :
            </p>
            <Button 
              onClick={handleGoToMySpace}
              className={`w-full ${userColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'} text-white text-lg py-6`}
              size="lg"
            >
              Aller vers mon espace {userRoleLabel}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

          <div className="text-center pt-4">
            <p className="text-xs text-gray-500">
              Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
