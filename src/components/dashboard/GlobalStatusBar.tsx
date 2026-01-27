import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface StatusCounts {
  termine: number;
  en_attente_signature: number;
  en_cours: number;
}

export function GlobalStatusBar({ role = 'avocat' }: { role?: 'avocat' | 'notaire' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<StatusCounts>({ termine: 0, en_attente_signature: 0, en_cours: 0 });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isActive = true;

    const loadCounts = async () => {
      if (!user) {
        setCounts({ termine: 0, en_attente_signature: 0, en_cours: 0 });
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
          const termine = data.filter(d => d.status === 'Terminé').length;
          const en_attente_signature = data.filter(d => d.status === 'En attente de signature').length;
          const en_cours = data.filter(d => d.status === 'En cours').length;
          setCounts({ termine, en_attente_signature, en_cours });
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

  const total = counts.termine + counts.en_attente_signature + counts.en_cours;
  const terminePct = total === 0 ? 0 : (counts.termine / total) * 100;
  const enAttenteSignaturePct = total === 0 ? 0 : (counts.en_attente_signature / total) * 100;
  const enCoursPct = total === 0 ? 0 : (counts.en_cours / total) * 100;

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
                  {counts.termine > 0 && (
                    <div
                      className="h-full bg-green-500 hover:bg-green-600 cursor-pointer transition-colors flex items-center justify-center"
                      style={{ width: `${terminePct}%` }}
                      onClick={() => navigate(role === 'notaire' ? '/notaires/dossiers?status=Terminé' : '/avocats/dossiers?status=Terminé')}
                      title={`${counts.termine} terminé${counts.termine > 1 ? 's' : ''}`}
                    >
                      {terminePct > 15 && (
                        <span className="text-xs font-medium text-white">{counts.termine}</span>
                      )}
                    </div>
                  )}
                  {counts.en_attente_signature > 0 && (
                    <div
                      className="h-full bg-yellow-500 hover:bg-yellow-600 cursor-pointer transition-colors flex items-center justify-center"
                      style={{ width: `${enAttenteSignaturePct}%` }}
                      onClick={() => navigate(role === 'notaire' ? '/notaires/dossiers?status=En attente de signature' : '/avocats/dossiers?status=En attente de signature')}
                      title={`${counts.en_attente_signature} en attente de signature`}
                    >
                      {enAttenteSignaturePct > 15 && (
                        <span className="text-xs font-medium text-white">{counts.en_attente_signature}</span>
                      )}
                    </div>
                  )}
                  {counts.en_cours > 0 && (
                    <div
                      className="h-full bg-red-500 hover:bg-red-600 cursor-pointer transition-colors flex items-center justify-center"
                      style={{ width: `${enCoursPct}%` }}
                      onClick={() => navigate(role === 'notaire' ? '/notaires/dossiers?status=En cours' : '/avocats/dossiers?status=En cours')}
                      title={`${counts.en_cours} en cours`}
                    >
                      {enCoursPct > 15 && (
                        <span className="text-xs font-medium text-white">{counts.en_cours}</span>
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
                  <span className="text-green-600 font-medium">{counts.termine} terminé{counts.termine > 1 ? 's' : ''}</span>
                  {' · '}
                  <span className="text-yellow-600 font-medium">{counts.en_attente_signature} en attente de signature</span>
                  {' · '}
                  <span className="text-red-600 font-medium">{counts.en_cours} en cours</span>
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
