import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

export function TasksSummaryCard({ role = 'avocat' }: { role?: 'avocat' | 'notaire' }) {
  const { user } = useAuth();
  const [todoCount, setTodoCount] = useState<number>(0);
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isActive = true;

    const loadCounts = async () => {
      if (!user) {
        setTodoCount(0);
        setOverdueCount(0);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayISO = `${yyyy}-${mm}-${dd}`;

        const todoRes = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id)
          .eq('role', role)
          .eq('done', false);

        const overdueRes = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id)
          .eq('role', role)
          .eq('done', false)
          .lt('due_at', todayISO);

        if (!isActive) return;
        setTodoCount(todoRes.count ?? 0);
        setOverdueCount(overdueRes.count ?? 0);
      } catch (e: unknown) {
        console.error('Erreur chargement compteurs tâches:', e);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadCounts();

      let channel: { subscribe?: () => unknown; unsubscribe?: () => unknown } | null = null;
    try {
      if (user) {
        channel = supabase.channel(`tasks-counts-${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `owner_id=eq.${user.id}` }, () => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Tâches du jour</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{todoCount + overdueCount}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div className="text-sm">À faire: <span className="font-semibold">{todoCount}</span></div>
            <div className="text-sm text-destructive">En retard: <span className="font-semibold">{overdueCount}</span></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
