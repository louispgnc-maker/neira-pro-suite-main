import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

interface StatusCount {
  termine: number;
  en_attente_signature: number;
  en_cours: number;
}

interface StatusChartProps {
  role: 'avocat' | 'notaire';
}

export function StatusChart({ role }: StatusChartProps) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<StatusCount>({
    termine: 0,
    en_attente_signature: 0,
    en_cours: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCounts() {
      if (!user) return;
      
      try {
        // Compter les contrats par statut
        const { data: contrats } = await supabase
          .from('contrats')
          .select('status')
          .eq('owner_id', user.id)
          .eq('role', role);

        if (contrats) {
          const newCounts = {
            termine: contrats.filter(c => c.status === 'Terminé').length,
            en_attente_signature: contrats.filter(c => c.status === 'En attente de signature').length,
            en_cours: contrats.filter(c => c.status === 'En cours').length,
          };
          setCounts(newCounts);
        }
      } catch (error) {
        console.error('Error loading status counts:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCounts();
  }, [user, role]);

  const total = counts.termine + counts.en_attente_signature + counts.en_cours;
  const maxCount = Math.max(counts.termine, counts.en_attente_signature, counts.en_cours, 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Statut des contrats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Chargement...</div>
        ) : (
          <>
            {/* Terminé - Vert */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span className="font-medium">Terminé</span>
                </div>
                <span className="text-gray-600">{counts.termine}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: total === 0 ? '0%' : `${(counts.termine / maxCount) * 100}%` }}
                />
              </div>
            </div>

            {/* En attente de signature - Jaune */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span className="font-medium">En attente de signature</span>
                </div>
                <span className="text-gray-600">{counts.en_attente_signature}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: total === 0 ? '0%' : `${(counts.en_attente_signature / maxCount) * 100}%` }}
                />
              </div>
            </div>

            {/* En cours - Rouge */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="font-medium">En cours</span>
                </div>
                <span className="text-gray-600">{counts.en_cours}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-red-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: total === 0 ? '0%' : `${(counts.en_cours / maxCount) * 100}%` }}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
