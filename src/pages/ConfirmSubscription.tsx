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
          <div className="mx-auto mb-4 w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
          <CardTitle className="text-3xl">Votre essai gratuit est terminé</CardTitle>
          <CardDescription className="text-lg mt-2">
            Vous avez profité de 7 jours d'essai gratuit. Pour continuer à utiliser Neira, confirmez votre abonnement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">Ce que vous obtenez en continuant :</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-blue-800">Accès illimité à tous vos dossiers et documents</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-blue-800">Stockage sécurisé de vos données</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-blue-800">Support client prioritaire</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-blue-800">Engagement de 12 mois avec paiement mensuel ou annuel</span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white h-14 text-lg"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Confirmer mon abonnement
            </Button>
            <Button
              onClick={handleCancel}
              disabled={loading}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 h-14 text-lg"
            >
              <XCircle className="w-5 h-5 mr-2" />
              Annuler et supprimer mon compte
            </Button>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            En confirmant, votre moyen de paiement sera débité selon la périodicité choisie (mensuel ou annuel).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
