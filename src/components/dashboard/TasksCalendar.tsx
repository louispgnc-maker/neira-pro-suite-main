import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type TaskRow = {
  id: string;
  title: string;
  due_date: string | null;
  due_at?: string | null;
};

interface TasksCalendarProps {
  role?: 'avocat' | 'notaire';
}

export function TasksCalendar({ role = 'avocat' }: TasksCalendarProps = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!user) {
        setTasks([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Fetch recent tasks for the user and role, then filter client-side to include
      // tasks that have either due_date or due_at on/after today. This keeps dashboard
      // and /tasks logic consistent even if some rows only populate due_at or due_date.
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,due_date,due_at,done")
        .eq("owner_id", user.id)
        .eq("role", role)
        // exclude already completed tasks so dashboard matches /tasks
        .eq("done", false)
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(20);

      if (error) {
        console.error("Erreur chargement tâches:", error);
        if (isMounted) setTasks([]);
      } else if (isMounted) {
        const raw = (data || []) as TaskRow[];
        const filtered = raw.filter((t) => {
          // safety: exclude tasks that are already marked done (some rows might still have done=true)
          if ((t as any).done) return false;
          try {
            // Include tasks without any due date so newly created tasks (no date) are visible
            if (!t.due_date && !t.due_at) return true;

            if (t.due_date && t.due_date >= dateStr) return true;
            if (t.due_at) {
              const d = new Date(t.due_at);
              const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              return dStr >= dateStr;
            }
          } catch (e) {
            return false;
          }
          return false;
        }).slice(0, 5);
        setTasks(filtered as TaskRow[]);
      }
      if (isMounted) setLoading(false);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [user, role]);

  const formatDay = (d?: string | null) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
  };

  const formatTime = (d?: string | null) => {
    if (!d) return "";
    const date = new Date(d);
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Tâches & échéances</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className={role === 'notaire' ? 'hover:bg-orange-600 hover:text-white' : 'hover:bg-blue-600 hover:text-white'}
          onClick={() => navigate(role === 'notaire' ? '/notaires/tasks' : '/avocats/tasks')}
        >
          Voir tout →
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-muted-foreground">Chargement…</p>
            ) : tasks.length === 0 ? (
              <p className="text-center text-muted-foreground">Aucune tâche à venir.</p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col items-center min-w-[60px] pt-1">
                  <span className="text-xs text-muted-foreground font-medium">{formatDay(task.due_date)}</span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(task.due_date)}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{task.title}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
