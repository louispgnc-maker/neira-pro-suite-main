import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

/**
 * Hook pour gérer la création automatique du cabinet après inscription
 * avec les limites de l'abonnement choisi
 */
export const useAutoCreateCabinet = (user: any, role: 'avocat' | 'notaire') => {
  const navigate = useNavigate();

  useEffect(() => {
    const createCabinetFromSubscription = async () => {
      if (!user) return;

      // Vérifier s'il y a un abonnement en attente
      const pendingSubscription = sessionStorage.getItem('pendingSubscription');
      if (!pendingSubscription) return;

      try {
        const subscription = JSON.parse(pendingSubscription);
        const { plan, billingPeriod, members } = subscription;

        // Vérifier si l'utilisateur a déjà un cabinet
        const { data: existingCabinet } = await supabase
          .from('cabinets')
          .select('id')
          .eq('owner_id', user.id)
          .eq('role', role)
          .single();

        if (existingCabinet) {
          // Le cabinet existe déjà, ne rien faire
          sessionStorage.removeItem('pendingSubscription');
          return;
        }

        // Définir les limites selon le plan
        const subscriptionLimits = {
          essentiel: {
            max_members: 1,
            max_storage_go: 20,
            max_dossiers: 100,
            max_clients: 30,
            max_signatures_per_month: 15
          },
          professionnel: {
            max_members: members || 2,
            max_storage_go: 100,
            max_dossiers: 600,
            max_clients: 200,
            max_signatures_per_month: 80
          },
          'cabinet-plus': {
            max_members: members || 1,
            max_storage_go: null, // illimité
            max_dossiers: null, // illimité
            max_clients: null, // illimité
            max_signatures_per_month: null // illimité
          }
        };

        const limits = subscriptionLimits[plan as keyof typeof subscriptionLimits];

        // Créer le cabinet
        const { error } = await supabase
          .from('cabinets')
          .insert({
            role: role,
            nom: `Cabinet ${user.email?.split('@')[0] || 'Sans nom'}`,
            adresse: 'À compléter',
            email: user.email,
            owner_id: user.id,
            subscription_plan: plan,
            ...limits,
            billing_period: billingPeriod,
            subscription_status: 'active',
            subscription_started_at: new Date().toISOString()
          });

        if (error) throw error;

        // Nettoyer le sessionStorage
        sessionStorage.removeItem('pendingSubscription');

        // Afficher le message de succès
        toast.success('Cabinet créé avec succès !', {
          description: `Votre cabinet est prêt avec le plan ${plan}.`
        });

        // Rediriger vers le cabinet
        setTimeout(() => {
          const prefix = role === 'avocat' ? '/avocats' : '/notaires';
          navigate(`${prefix}/cabinet`);
        }, 2000);

      } catch (error: any) {
        console.error('Erreur lors de la création du cabinet:', error);
        toast.error('Erreur lors de la création du cabinet', {
          description: error.message || 'Une erreur est survenue.'
        });
      }
    };

    createCabinetFromSubscription();
  }, [user, role, navigate]);
};
