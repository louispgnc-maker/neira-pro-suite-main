import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

/**
 * Hook pour vérifier si l'utilisateur est en période d'essai expirée
 * Redirige vers la page de confirmation si l'essai est terminé et non confirmé
 */
export function useTrialGuard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [trialStatus, setTrialStatus] = useState<{
    isExpired: boolean;
    needsConfirmation: boolean;
    daysRemaining: number;
  } | null>(null);

  useEffect(() => {
    const checkTrialStatus = async () => {
      if (!user) {
        setIsChecking(false);
        return;
      }

      try {
        // Récupérer le cabinet de l'utilisateur
        const { data: memberData } = await supabase
          .from('cabinet_members')
          .select('cabinet_id')
          .eq('user_id', user.id)
          .single();

        if (!memberData?.cabinet_id) {
          setIsChecking(false);
          return;
        }

        const { data: cabinetData } = await supabase
          .from('cabinets')
          .select('subscription_status, subscription_started_at, trial_confirmed')
          .eq('id', memberData.cabinet_id)
          .single();

        if (!cabinetData) {
          setIsChecking(false);
          return;
        }

        // Si l'abonnement n'est pas en essai, pas de vérification
        if (cabinetData.subscription_status !== 'trialing' && cabinetData.subscription_status !== 'trial') {
          setIsChecking(false);
          return;
        }

        // Calculer les jours depuis le début de l'essai
        const startDate = new Date(cabinetData.subscription_started_at);
        const now = new Date();
        const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = 7 - daysSinceStart;

        const isExpired = daysSinceStart >= 7;
        const needsConfirmation = isExpired && !cabinetData.trial_confirmed;

        setTrialStatus({
          isExpired,
          needsConfirmation,
          daysRemaining: Math.max(0, daysRemaining)
        });

        // Si l'essai est expiré et non confirmé, rediriger vers la page de confirmation
        if (needsConfirmation && !location.pathname.includes('/confirm-subscription')) {
          navigate('/confirm-subscription', { replace: true });
        }

        setIsChecking(false);
      } catch (error) {
        console.error('Erreur vérification essai:', error);
        setIsChecking(false);
      }
    };

    checkTrialStatus();
  }, [user, navigate, location.pathname]);

  return { isChecking, trialStatus };
}
