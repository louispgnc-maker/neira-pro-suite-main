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
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type TaskRow = {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  done: boolean;
};

export default function Tasks() {
  const { user } = useAuth();
  const location = useLocation();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [taskText, setTaskText] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!user) {
        setTasks([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      let query = supabase
        .from("tasks")
        .select("id,title,description,due_date,done")
        .eq("owner_id", user.id)
        .eq("role", role)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (debounced) {
        query = query.or(`title.ilike.%${debounced}%,description.ilike.%${debounced}%`);
      }
      const { data, error } = await query;
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
  }, [user, role, debounced]);

  async function toggleDone(taskId: string, currentDone: boolean) {
    const newDone = !currentDone;
    const { error } = await supabase
      .from("tasks")
      .update({ done: newDone })
      .eq("id", taskId)
      .eq("owner_id", user?.id || '')
      .eq("role", role);
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

  // Couleur du bouton principal
  const mainButtonColor = role === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  async function createTask() {
    if (!user) return;
    const title = taskText.trim();
    if (!title) {
      toast.error('Merci de saisir la tâche');
      return;
    }
    setSaving(true);
    try {
      // Combine date + time -> keep date for storage, append time to notes if provided
      const dueDate = taskDate ? taskDate : null;
      const notesWithTime = taskTime ? `${taskNotes}\n[Heure: ${taskTime}]` : taskNotes;
      const insertObj: any = {
        owner_id: user.id,
        role,
        title,
        description: notesWithTime || null,
        due_date: dueDate,
      };
      const { error } = await supabase.from('tasks').insert(insertObj);
      if (error) throw error;
      toast.success('Tâche créée');
      // Reset form and close
      setTaskText("");
      setTaskNotes("");
      setTaskDate("");
      setTaskTime("");
      setOpen(false);
      // Reload tasks list
      let query = supabase
        .from("tasks")
        .select("id,title,description,due_date,done")
        .eq("owner_id", user.id)
        .eq("role", role)
        .order("due_date", { ascending: true, nullsFirst: false });
      const { data } = await query;
      setTasks((data || []) as TaskRow[]);
    } catch (err: any) {
      console.error('Erreur création tâche:', err);
      toast.error('Erreur lors de la création', { description: err?.message || String(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Tâches</h1>
            <p className="text-muted-foreground mt-1">Organisez vos tâches et échéances</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className={mainButtonColor}>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle tâche
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle tâche</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tâche</label>
                  <Textarea
                    rows={3}
                    placeholder="Décrivez la tâche à réaliser"
                    value={taskText}
                    onChange={(e) => setTaskText(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (optionnel)</label>
                  <Textarea
                    rows={2}
                    placeholder="Notes complémentaires"
                    value={taskNotes}
                    onChange={(e) => setTaskNotes(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date (optionnel)</label>
                    <input type="date" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Heure (optionnel)</label>
                    <input type="time" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button className={mainButtonColor} disabled={saving} onClick={createTask}>
                    {saving ? 'Enregistrement…' : 'Créer'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (titre ou description)…"
            className="w-full md:max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">Chargement…</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <div className="text-center">
              <p className="text-muted-foreground">Aucune tâche à venir</p>
              <Button className={mainButtonColor + " mt-4"} onClick={() => setOpen(true)}>
                Ajoutez ici vos prochaines tâches
              </Button>
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
                    <TableRow
                      key={task.id}
                      className={task.done ? "opacity-50 cursor-pointer" : "cursor-pointer"}
                      onDoubleClick={() => {/* Future detail/edit modal */}}
                    >
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
