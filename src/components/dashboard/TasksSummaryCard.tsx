import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { CheckSquare, Circle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Task {
  id: string;
  title: string;
  done: boolean;
  due_at: string | null;
}

export function TasksSummaryCard({ role = 'avocat' }: { role?: 'avocat' | 'notaire' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isActive = true;

    const loadTasks = async () => {
      if (!user) {
        setTasks([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('id, title, done, due_at')
          .eq('owner_id', user.id)
          .eq('role', role)
          .order('due_at', { ascending: true, nullsFirst: false })
          .limit(20);

        if (!isActive) return;
        if (!error && data) {
          setTasks(data);
        }
      } catch (e: unknown) {
        console.error('Erreur chargement tâches:', e);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadTasks();

    let channel: { subscribe?: () => unknown; unsubscribe?: () => unknown } | null = null;
    try {
      if (user) {
        channel = supabase.channel(`tasks-summary-${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `owner_id=eq.${user.id}` }, () => {
            loadTasks();
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
      className="cursor-pointer hover:shadow-lg transition-shadow relative overflow-hidden border-border"
      onClick={() => navigate(role === 'notaire' ? '/notaires/tasks' : '/avocats/tasks')}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">Tâches</CardTitle>
        <div className={`p-2 rounded-lg ${role === 'notaire' ? 'bg-orange-100' : 'bg-blue-100'}`}>
          <CheckSquare className={`h-4 w-4 ${role === 'notaire' ? 'text-orange-600' : 'text-blue-600'}`} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-gray-500">Chargement...</div>
        ) : tasks.length === 0 ? (
          <div className="text-sm text-gray-500">Aucune tâche</div>
        ) : (
          <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-start gap-2 p-3 rounded-lg transition-all border-l-4 shadow-sm ${
                  task.done 
                    ? 'bg-gray-50 border-gray-300' 
                    : 'bg-yellow-50 border-yellow-400 hover:shadow-md'
                }`}
              >
                {task.done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {task.title}
                  </p>
                  {task.due_at && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      📅 {new Date(task.due_at).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
