import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type TaskRow = {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  done: boolean;
};

export default function Tasks() {
  const { user } = useAuth();
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
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,description,due_date,done")
        .eq("owner_id", user.id)
        .order("due_date", { ascending: true, nullsFirst: false });
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

  async function toggleDone(taskId: string, currentDone: boolean) {
    const newDone = !currentDone;
    const { error } = await supabase
      .from("tasks")
      .update({ done: newDone })
      .eq("id", taskId);
    if (error) {
      console.error("Erreur mise à jour tâche:", error);
      toast.error("Erreur lors de la mise à jour");
    } else {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, done: newDone } : t))
      );
      toast.success(newDone ? "Tâche marquée comme terminée" : "Tâche rouverte");
    }
  }

  function isOverdue(dueDate: string | null | undefined): boolean {
    if (!dueDate) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < now;
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Tâches</h1>
            <p className="text-muted-foreground mt-1">
              Organisez vos tâches et échéances
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle tâche
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">Chargement…</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <div className="text-center">
              <p className="text-muted-foreground">Aucune tâche à venir</p>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Fait</TableHead>
                  <TableHead>Tâche</TableHead>
                  <TableHead>Échéance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const overdue = !task.done && isOverdue(task.due_date);
                  return (
                    <TableRow key={task.id} className={task.done ? "opacity-50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={task.done}
                          onCheckedChange={() => toggleDone(task.id, task.done)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className={task.done ? "line-through" : ""}>
                          <div className="font-medium">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-muted-foreground">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.due_date ? (
                          <Badge variant={overdue ? "destructive" : "outline"}>
                            {new Date(task.due_date).toLocaleDateString()}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Pas d'échéance</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
