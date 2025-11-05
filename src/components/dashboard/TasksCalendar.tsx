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
};

export function TasksCalendar() {
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
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,due_date")
        .eq("owner_id", user.id)
        .gte("due_date", dateStr)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(5);
      if (error) {
        console.error("Erreur chargement tâches:", error);
        if (isMounted) setTasks([]);
      } else if (isMounted) {
        setTasks(data as TaskRow[]);
      }
      if (isMounted) setLoading(false);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

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
        <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
          Voir tout →
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-muted-foreground">Chargement…</p>
          ) : tasks.length === 0 ? (
            <p className="text-center text-muted-foreground">aucune tâche à venir</p>
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
