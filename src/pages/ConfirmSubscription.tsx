import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function ConfirmSubscription() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (!user) throw new Error('Non authentifié');

      // Récupérer le cabinet
      const { data: memberData } = await supabase
        .from('cabinet_members')
        .select('cabinet_id')
        .eq('user_id', user.id)
        .single();

      if (!memberData?.cabinet_id) {
        throw new Error('Cabinet non trouvé');
      }

      // Marquer l'essai comme confirmé
      const { error } = await supabase
        .from('cabinets')
        .update({ trial_confirmed: true })
        .eq('id', memberData.cabinet_id);

      if (error) throw error;

      toast.success('Abonnement confirmé !', {
        description: 'Vous pouvez maintenant continuer à utiliser Neira'
      });

      // Rediriger vers le tableau de bord
      navigate('/avocats/dashboard', { replace: true });
    } catch (error) {
      console.error('Erreur confirmation:', error);
      toast.error('Erreur', {
        description: error instanceof Error ? error.message : 'Impossible de confirmer'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      if (!user) throw new Error('Non authentifié');

      // Récupérer le cabinet
      const { data: memberData } = await supabase
        .from('cabinet_members')
        .select('cabinet_id')
        .eq('user_id', user.id)
        .single();

      if (!memberData?.cabinet_id) {
        throw new Error('Cabinet non trouvé');
      }

      // Appeler la fonction d'annulation
      const { error } = await supabase.functions.invoke('cancel-trial-subscription', {
        body: { cabinetId: memberData.cabinet_id }
      });

      if (error) throw error;

      toast.success('Abonnement annulé', {
        description: 'Votre compte a été supprimé'
      });

      // Déconnecter et rediriger
      await supabase.auth.signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Erreur annulation:', error);
      toast.error('Erreur', {
        description: error instanceof Error ? error.message : 'Impossible d\'annuler'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-accent/10 to-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-3xl">Votre essai gratuit de 7 jours est terminé</CardTitle>
          <CardDescription className="text-lg mt-2">
            Vous avez découvert Neira pendant 7 jours. Que souhaitez-vous faire maintenant ?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Continuer */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-600 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-xl text-blue-900">Continuer avec Neira</h3>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-blue-800">Conservez tous vos dossiers et documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-blue-800">Continuez à gagner du temps au quotidien</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-blue-800">Support client prioritaire</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-blue-800">Engagement 12 mois, paiement flexible</span>
                </li>
              </ul>
              <Button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-semibold shadow-lg"
              >
                Continuer avec Neira
              </Button>
            </div>

            {/* Option 2: Fermer le compte */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-xl text-gray-700">Fermer mon compte</h3>
              </div>
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  ⚠️ En fermant votre compte :
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Tous vos dossiers seront supprimés</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Tous vos documents seront perdus</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Votre compte sera définitivement supprimé</span>
                  </li>
                </ul>
              </div>
              <Button
                onClick={handleCancel}
                disabled={loading}
                variant="outline"
                className="w-full border-2 border-gray-300 text-gray-700 hover:bg-gray-100 h-12"
              >
                Fermer mon compte
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center pt-4 border-t">
            En continuant, votre moyen de paiement sera débité selon la périodicité choisie lors de votre inscription.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
