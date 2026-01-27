import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface StatusCounts {
  conforme: number;
  en_cours: number;
  bloque: number;
}

export function GlobalStatusBar({ role = 'avocat' }: { role?: 'avocat' | 'notaire' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<StatusCounts>({ conforme: 0, en_cours: 0, bloque: 0 });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isActive = true;

    const loadCounts = async () => {
      if (!user) {
        setCounts({ conforme: 0, en_cours: 0, bloque: 0 });
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('dossiers')
          .select('status')
          .eq('owner_id', user.id)
          .eq('role', role);

        if (!isActive) return;
        if (!error && data) {
          const conforme = data.filter(d => d.status === 'Terminé' || d.status === 'Conforme').length;
          const en_cours = data.filter(d => d.status === 'En cours').length;
          const bloque = data.filter(d => d.status === 'Bloqué' || d.status === 'En attente').length;
          setCounts({ conforme, en_cours, bloque });
        }
      } catch (e: unknown) {
        console.error('Erreur chargement statuts:', e);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadCounts();

    let channel: { subscribe?: () => unknown; unsubscribe?: () => unknown } | null = null;
    try {
      if (user) {
        channel = supabase.channel(`dossiers-status-${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'dossiers', filter: `owner_id=eq.${user.id}` }, () => {
            loadCounts();
          });
        channel.subscribe();
      }
    } catch (e) {
      console.error('Realtime channel error:', e as unknown);
    }

    return () => {
      isActive = false;
      try { if (channel?.unsubscribe) { channel.unsubscribe(); } } catch (e: unknown) { /* ignore */ }
    };
  }, [user, role]);

  const total = counts.conforme + counts.en_cours + counts.bloque;
  const conformePct = total === 0 ? 0 : (counts.conforme / total) * 100;
  const enCoursPct = total === 0 ? 0 : (counts.en_cours / total) * 100;
  const bloquePct = total === 0 ? 0 : (counts.bloque / total) * 100;

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">État global des dossiers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-sm text-gray-500">Chargement...</div>
        ) : (
          <>
            {/* Barre unique segmentée */}
            <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden flex">
              {total === 0 ? (
                <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                  <span className="text-xs text-gray-600">Aucun dossier</span>
                </div>
              ) : (
                <>
                  {counts.conforme > 0 && (
                    <div
                      className="h-full bg-green-500 hover:bg-green-600 cursor-pointer transition-colors flex items-center justify-center"
                      style={{ width: `${conformePct}%` }}
                      onClick={() => navigate(role === 'notaire' ? '/notaires/dossiers?status=Conforme' : '/avocats/dossiers?status=Terminé')}
                      title={`${counts.conforme} conforme${counts.conforme > 1 ? 's' : ''}`}
                    >
                      {conformePct > 15 && (
                        <span className="text-xs font-medium text-white">{counts.conforme}</span>
                      )}
                    </div>
                  )}
                  {counts.en_cours > 0 && (
                    <div
                      className="h-full bg-yellow-500 hover:bg-yellow-600 cursor-pointer transition-colors flex items-center justify-center"
                      style={{ width: `${enCoursPct}%` }}
                      onClick={() => navigate(role === 'notaire' ? '/notaires/dossiers?status=En cours' : '/avocats/dossiers?status=En cours')}
                      title={`${counts.en_cours} en cours`}
                    >
                      {enCoursPct > 15 && (
                        <span className="text-xs font-medium text-white">{counts.en_cours}</span>
                      )}
                    </div>
                  )}
                  {counts.bloque > 0 && (
                    <div
                      className="h-full bg-red-500 hover:bg-red-600 cursor-pointer transition-colors flex items-center justify-center"
                      style={{ width: `${bloquePct}%` }}
                      onClick={() => navigate(role === 'notaire' ? '/notaires/dossiers?status=Bloqué' : '/avocats/dossiers?status=En attente')}
                      title={`${counts.bloque} bloqué${counts.bloque > 1 ? 's' : ''}`}
                    >
                      {bloquePct > 15 && (
                        <span className="text-xs font-medium text-white">{counts.bloque}</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Texte sous la barre */}
            <div className="text-center text-sm text-gray-600">
              {total === 0 ? (
                <span>Aucun dossier pour le moment</span>
              ) : (
                <span>
                  <span className="text-green-600 font-medium">{counts.conforme} conforme{counts.conforme > 1 ? 's' : ''}</span>
                  {' · '}
                  <span className="text-yellow-600 font-medium">{counts.en_cours} en cours</span>
                  {' · '}
                  <span className="text-red-600 font-medium">{counts.bloque} bloqué{counts.bloque > 1 ? 's' : ''}</span>
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
