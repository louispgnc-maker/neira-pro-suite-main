import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Crown, Users } from "lucide-react";

export default function TestPayment() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'avocat' | 'notaire' | null>(null);

  const handlePayment = (role: 'avocat' | 'notaire') => {
    setSelectedRole(role);
    // Simuler un paiement
    sessionStorage.setItem('pendingPayment', JSON.stringify({
      plan: 'cabinet-plus',
      members: 20,
      role: role,
      timestamp: new Date().toISOString()
    }));
    toast.success("Paiement simulé avec succès !");
    navigate('/test-subscription/thanks');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white p-8">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-orange-600 mb-2">🧪 Mode Test - Paiement</h1>
          <p className="text-gray-600">Étape 1/4 : Simuler le paiement de l'abonnement Cabinet+ (20 membres)</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-2 border-orange-200 hover:border-orange-400 transition-all cursor-pointer" onClick={() => handlePayment('avocat')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <Users className="w-6 h-6" />
                Cabinet Avocat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Souscrire à Cabinet+ (20 membres) pour un cabinet d'avocat
              </p>
              <Button className="w-full bg-orange-500 hover:bg-orange-600">
                Payer 89€/mois × 20 = 1780€/mois
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 hover:border-purple-400 transition-all cursor-pointer" onClick={() => handlePayment('notaire')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600">
                <Crown className="w-6 h-6" />
                Cabinet Notaire
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Souscrire à Cabinet+ (20 membres) pour un cabinet de notaire
              </p>
              <Button className="w-full bg-purple-500 hover:bg-purple-600">
                Payer 89€/mois × 20 = 1780€/mois
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
