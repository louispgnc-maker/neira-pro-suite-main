import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { CheckSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function TasksSummaryCard({ role = 'avocat' }: { role?: 'avocat' | 'notaire' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
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
          .eq('done', false)
          .gte('due_at', todayISO);

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
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow relative overflow-hidden border-border bg-gradient-card"
      onClick={() => navigate(role === 'notaire' ? '/notaires/tasks' : '/avocats/tasks')}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Tâches du jour</CardTitle>
        <div className={`p-2 rounded-lg ${role === 'notaire' ? 'bg-orange-100' : 'bg-blue-100'}`}>
          <CheckSquare className={`h-4 w-4 ${role === 'notaire' ? 'text-orange-600' : 'text-blue-600'}`} />
        </div>
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
