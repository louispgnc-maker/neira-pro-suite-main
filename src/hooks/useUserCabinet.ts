import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface CabinetInfo {
  id: string;
  nom: string;
  role: string;
  status: string;
}

export function useUserCabinet(userId: string | undefined, role: 'avocat' | 'notaire', refreshTrigger: number = 0) {
  const [hasCabinet, setHasCabinet] = useState<boolean>(false);
  const [cabinet, setCabinet] = useState<CabinetInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkCabinet() {
      if (!userId) {
        setHasCabinet(false);
        setCabinet(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_user_cabinets');
        
        if (error) throw error;

        const cabinets = Array.isArray(data) ? (data as unknown[]) : [];
        
        // Filtrer par rôle (plus de filtre sur le statut)
        const activeCabinet = cabinets.find((c) => {
          const cabinetRole = String((c as Record<string, unknown>)['role']);
          return cabinetRole === role;
        });

        if (activeCabinet) {
          setHasCabinet(true);
          setCabinet({
            id: String((activeCabinet as Record<string, unknown>)['id']),
            nom: String((activeCabinet as Record<string, unknown>)['nom']),
            role: String((activeCabinet as Record<string, unknown>)['role']),
            status: String((activeCabinet as Record<string, unknown>)['status']),
          });
        } else {
          setHasCabinet(false);
          setCabinet(null);
        }
      } catch (error) {
        console.error('Erreur vérification cabinet:', error);
        setHasCabinet(false);
        setCabinet(null);
      } finally {
        setLoading(false);
      }
    }

    checkCabinet();
  }, [userId, role, refreshTrigger]);

  return { hasCabinet, cabinet, loading };
}
