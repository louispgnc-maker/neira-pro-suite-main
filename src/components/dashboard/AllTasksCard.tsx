import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { CheckSquare, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Task {
  id: string;
  title: string;
  due_at: string | null;
  done: boolean;
  description: string | null;
}

export function AllTasksCard({ role = 'avocat' }: { role?: 'avocat' | 'notaire' }) {
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
        // Récupérer toutes les tâches (pas seulement celles du jour)
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, title, due_at, done, description')
          .eq('owner_id', user.id)
          .eq('role', role)
          .order('done', { ascending: true })
          .order('due_at', { ascending: true, nullsFirst: false })
          .limit(10);

        if (!isActive) return;

        setTasks(tasksData || []);
      } catch (e: unknown) {
        console.error('Erreur chargement tâches:', e);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadTasks();

    return () => {
      isActive = false;
    };
  }, [user, role]);

  const handleCheckTask = async (taskId: string, checked: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ done: checked })
        .eq('id', taskId);

      if (!error) {
        // Mettre à jour l'état local
        setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, done: checked } : t
        ));
      }
    } catch (e) {
      console.error('Erreur mise à jour tâche:', e);
    }
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    
    const date = new Date(deadline);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return {
        text: "Aujourd'hui",
        color: "text-red-600",
        bg: "bg-red-50"
      };
    } else if (diffDays === 1) {
      return {
        text: "Demain",
        color: "text-orange-600",
        bg: "bg-orange-50"
      };
    } else if (diffDays < 0) {
      return {
        text: `En retard (${Math.abs(diffDays)}j)`,
        color: "text-red-700",
        bg: "bg-red-100"
      };
    } else if (diffDays <= 7) {
      return {
        text: `Dans ${diffDays}j`,
        color: "text-blue-600",
        bg: "bg-blue-50"
      };
    } else {
      return {
        text: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        color: "text-gray-600",
        bg: "bg-gray-50"
      };
    }
  };

  const colorClass = role === 'notaire' ? 'text-orange-600' : 'text-blue-600';
  const hoverClass = role === 'notaire' ? 'hover:bg-orange-50' : 'hover:bg-blue-50';

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${colorClass}`}>
          <CheckSquare className="h-5 w-5" />
          Tâches
        </CardTitle>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate(role === 'notaire' ? '/notaires/tasks' : '/avocats/tasks')}
          className={hoverClass}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nouvelle tâche
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-gray-500">Chargement...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-600 mb-3">Aucune tâche 🎉</p>
            <Button
              size="sm"
              onClick={() => navigate(role === 'notaire' ? '/notaires/tasks' : '/avocats/tasks')}
              className={role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}
            >
              <Plus className="h-4 w-4 mr-1" />
              Créer une tâche
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const deadlineInfo = formatDeadline(task.due_at);
              
              return (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3 border border-gray-200 rounded-lg transition-colors ${
                    task.done ? 'bg-gray-50' : hoverClass
                  }`}
                >
                  <Checkbox
                    checked={task.done}
                    onCheckedChange={(checked) => handleCheckTask(task.id, checked as boolean)}
                    className="mt-0.5"
                  />
                  <div 
                    className="flex-1 cursor-pointer min-w-0"
                    onClick={() => navigate(role === 'notaire' ? '/notaires/tasks' : '/avocats/tasks')}
                  >
                    <p className={`text-sm font-medium ${task.done ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                    {task.description && !task.done && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {task.description}
                      </p>
                    )}
                    {deadlineInfo && !task.done && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${deadlineInfo.bg} ${deadlineInfo.color} font-medium`}>
                          📅 {deadlineInfo.text}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {tasks.length >= 10 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => navigate(role === 'notaire' ? '/notaires/tasks' : '/avocats/tasks')}
              >
                Voir toutes les tâches
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
