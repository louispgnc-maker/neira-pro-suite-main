import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface CabinetData {
  cabinet_id: string;
  role: 'avocat' | 'notaire';
  subscription_plan?: string;
  subscription_started_at?: string;
}

// Cache simple pour éviter les requêtes redondantes
let cabinetCache: { [userId: string]: { data: CabinetData | null; timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook pour récupérer et mettre en cache les données du cabinet
 * Optimise les performances en évitant les requêtes redondantes
 */
export function useCabinetData(userId: string | undefined, role?: 'avocat' | 'notaire') {
  const [cabinetData, setCabinetData] = useState<CabinetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setCabinetData(null);
      setLoading(false);
      return;
    }

    const fetchCabinetData = async () => {
      try {
        // Vérifier le cache
        const cached = cabinetCache[userId];
        const now = Date.now();
        
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          setCabinetData(cached.data);
          setLoading(false);
          return;
        }

        setLoading(true);

        // Récupérer les données du cabinet
        const { data: memberData, error: memberError } = await supabase
          .from('cabinet_members')
          .select('cabinet_id')
          .eq('user_id', userId)
          .single();

        if (memberError) throw memberError;

        if (!memberData?.cabinet_id) {
          throw new Error('Cabinet non trouvé');
        }

        // Récupérer les détails du cabinet si nécessaire
        const { data: cabinetDetails } = await supabase
          .from('cabinets')
          .select('subscription_plan, subscription_started_at')
          .eq('id', memberData.cabinet_id)
          .single();

        const result: CabinetData = {
          cabinet_id: memberData.cabinet_id,
          role: role || 'avocat',
          subscription_plan: cabinetDetails?.subscription_plan,
          subscription_started_at: cabinetDetails?.subscription_started_at
        };

        // Mettre en cache
        cabinetCache[userId] = {
          data: result,
          timestamp: now
        };

        setCabinetData(result);
        setError(null);
      } catch (err) {
        console.error('Error fetching cabinet data:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setCabinetData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCabinetData();
  }, [userId, role]);

  return { cabinetData, loading, error };
}

/**
 * Fonction pour invalider le cache (utile après une mise à jour)
 */
export function invalidateCabinetCache(userId?: string) {
  if (userId) {
    delete cabinetCache[userId];
  } else {
    cabinetCache = {};
  }
}
