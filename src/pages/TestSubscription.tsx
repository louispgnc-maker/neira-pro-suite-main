import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Crown, Users, Database, FileText, PenTool } from "lucide-react";

export default function TestSubscription() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const createTestCabinet = async (role: 'avocat' | 'notaire') => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    setLoading(true);

    try {
      // Vérifier si un cabinet existe déjà
      const { data: existingCabinet } = await supabase
        .from('cabinets')
        .select('id')
        .eq('owner_id', user.id)
        .eq('role', role)
        .single();

      if (existingCabinet) {
        // Mettre à jour le cabinet existant
        const { error } = await supabase
          .from('cabinets')
          .update({
            subscription_plan: 'cabinet-plus',
            max_members: 20,
            max_storage_go: null, // illimité
            max_dossiers: null, // illimité
            max_clients: null, // illimité
            max_signatures_per_month: null, // illimité
            billing_period: 'monthly',
            subscription_status: 'active',
            subscription_started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCabinet.id);

        if (error) throw error;

        toast.success("Cabinet mis à jour !", {
          description: "Votre cabinet est maintenant sur le plan Cabinet+ avec 20 membres."
        });
      } else {
        // Créer un nouveau cabinet
        const { error } = await supabase
          .from('cabinets')
          .insert({
            role: role,
            nom: `Cabinet Test ${user.email?.split('@')[0] || 'Demo'}`,
            adresse: 'Adresse de test',
            email: user.email,
            owner_id: user.id,
            subscription_plan: 'cabinet-plus',
            max_members: 20,
            max_storage_go: null, // illimité
            max_dossiers: null, // illimité
            max_clients: null, // illimité
            max_signatures_per_month: null, // illimité
            billing_period: 'monthly',
            subscription_status: 'active',
            subscription_started_at: new Date().toISOString()
          });

        if (error) throw error;

        toast.success("Cabinet créé !", {
          description: "Votre cabinet de test est prêt avec le plan Cabinet+ (20 membres)."
        });
      }

      // Rediriger vers le cabinet
      setTimeout(() => {
        const prefix = role === 'avocat' ? '/avocats' : '/notaires';
        navigate(`${prefix}/cabinet`);
      }, 1500);

    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error("Erreur lors de la création", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white p-8">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-orange-600 mb-2">🧪 Mode Test</h1>
          <p className="text-gray-600">Créer un cabinet avec abonnement Cabinet+ (20 membres)</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-2 border-orange-200 hover:border-orange-400 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <Users className="w-6 h-6" />
                Avocat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Créer un cabinet d'avocat avec l'abonnement Cabinet+ pour 20 membres
              </p>
              <Button 
                onClick={() => createTestCabinet('avocat')}
                disabled={loading || !user}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                Créer Cabinet Avocat
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 hover:border-purple-400 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600">
                <Crown className="w-6 h-6" />
                Notaire
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Créer un cabinet de notaire avec l'abonnement Cabinet+ pour 20 membres
              </p>
              <Button 
                onClick={() => createTestCabinet('notaire')}
                disabled={loading || !user}
                className="w-full bg-purple-500 hover:bg-purple-600"
              >
                Créer Cabinet Notaire
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-orange-50 border-orange-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="w-5 h-5 text-orange-600" />
              Plan Cabinet+ inclus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Users className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm font-semibold">20 membres</p>
                <p className="text-xs text-gray-600">Maximum</p>
              </div>
              <div className="text-center">
                <Database className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm font-semibold">Illimité</p>
                <p className="text-xs text-gray-600">Stockage</p>
              </div>
              <div className="text-center">
                <FileText className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm font-semibold">Illimité</p>
                <p className="text-xs text-gray-600">Dossiers</p>
              </div>
              <div className="text-center">
                <PenTool className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm font-semibold">Illimité</p>
                <p className="text-xs text-gray-600">Signatures</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!user && (
          <div className="mt-6 text-center">
            <p className="text-red-600">⚠️ Vous devez être connecté pour créer un cabinet de test</p>
            <Button 
              onClick={() => navigate('/auth')}
              className="mt-4 bg-orange-500 hover:bg-orange-600"
            >
              Se connecter
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
