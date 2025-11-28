import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

type SubscriptionLimits = {
  subscription_plan: string;
  max_storage_bytes: number | null; // null = illimité
  max_dossiers: number | null;
  max_clients: number | null;
  max_signatures_per_month: number | null;
  loading: boolean;
};

const PLAN_LIMITS: Record<string, Omit<SubscriptionLimits, 'loading'>> = {
  essentiel: {
    subscription_plan: 'essentiel',
    max_storage_bytes: 20 * 1024 * 1024 * 1024, // 20 Go
    max_dossiers: 100,
    max_clients: 30,
    max_signatures_per_month: 15,
  },
  professionnel: {
    subscription_plan: 'professionnel',
    max_storage_bytes: 100 * 1024 * 1024 * 1024, // 100 Go
    max_dossiers: 600,
    max_clients: 200,
    max_signatures_per_month: 80,
  },
  'cabinet-plus': {
    subscription_plan: 'cabinet-plus',
    max_storage_bytes: null, // illimité
    max_dossiers: null,
    max_clients: null,
    max_signatures_per_month: null,
  },
};

export function useSubscriptionLimits(role: 'avocat' | 'notaire'): SubscriptionLimits {
  const { user } = useAuth();
  const [limits, setLimits] = useState<SubscriptionLimits>({
    ...PLAN_LIMITS.essentiel,
    loading: true,
  });

  useEffect(() => {
    async function loadLimits() {
      if (!user) {
        setLimits({ ...PLAN_LIMITS.essentiel, loading: false });
        return;
      }

      try {
        // Récupérer le cabinet de l'utilisateur via RPC
        const { data: cabinetsData } = await supabase.rpc('get_user_cabinets');
        
        if (!cabinetsData || !Array.isArray(cabinetsData)) {
          setLimits({ ...PLAN_LIMITS.essentiel, loading: false });
          return;
        }

        const cabinets = cabinetsData.filter((c: any) => String(c.role) === role);
        const cabinet = cabinets[0];

        if (!cabinet) {
          setLimits({ ...PLAN_LIMITS.essentiel, loading: false });
          return;
        }

        // Récupérer les détails du cabinet
        const { data: cabinetDetails } = await supabase
          .from('cabinets')
          .select('subscription_plan')
          .eq('id', cabinet.id)
          .single();

        const plan = cabinetDetails?.subscription_plan || 'essentiel';
        const planLimits = PLAN_LIMITS[plan] || PLAN_LIMITS.essentiel;

        setLimits({ ...planLimits, loading: false });
      } catch (error) {
        console.error('Error loading subscription limits:', error);
        setLimits({ ...PLAN_LIMITS.essentiel, loading: false });
      }
    }

    loadLimits();
  }, [user, role]);

  return limits;
}
