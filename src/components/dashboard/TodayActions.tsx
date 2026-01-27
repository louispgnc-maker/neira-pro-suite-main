import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Action {
  id: string;
  title: string;
  deadline: string | null;
  status: string;
  type: 'task' | 'signature' | 'dossier';
}

export function TodayActions({ role = 'avocat' }: { role?: 'avocat' | 'notaire' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isActive = true;

    const loadActions = async () => {
      if (!user) {
        setActions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // Récupérer les tâches du jour
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, title, due_at, done')
          .eq('owner_id', user.id)
          .eq('role', role)
          .eq('done', false)
          .gte('due_at', `${today}T00:00:00`)
          .lte('due_at', `${today}T23:59:59`)
          .order('due_at', { ascending: true })
          .limit(3);

        // Récupérer les signatures urgentes (en attente depuis plus de 7 jours)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: signaturesData } = await supabase
          .from('signatures')
          .select('id, contract_title, created_at, status')
          .eq('owner_id', user.id)
          .eq('role', role)
          .eq('status', 'pending')
          .lte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: true })
          .limit(2);

        if (!isActive) return;

        const actionsArray: Action[] = [];

        // Ajouter les tâches
        if (tasksData) {
          tasksData.forEach(task => {
            actionsArray.push({
              id: task.id,
              title: task.title,
              deadline: task.due_at,
              status: 'À faire',
              type: 'task'
            });
          });
        }

        // Ajouter les signatures urgentes
        if (signaturesData) {
          signaturesData.forEach(sig => {
            actionsArray.push({
              id: sig.id,
              title: `Signature: ${sig.contract_title}`,
              deadline: sig.created_at,
              status: 'En attente',
              type: 'signature'
            });
          });
        }

        // Limiter à 3 actions max
        setActions(actionsArray.slice(0, 3));
      } catch (e: unknown) {
        console.error('Erreur chargement actions:', e);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadActions();

    return () => {
      isActive = false;
    };
  }, [user, role]);

  const handleActionClick = (action: Action) => {
    if (action.type === 'task') {
      navigate(role === 'notaire' ? '/notaires/tasks' : '/avocats/tasks');
    } else if (action.type === 'signature') {
      navigate(role === 'notaire' ? '/notaires/signatures' : '/avocats/signatures');
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          À faire aujourd'hui
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-gray-500">Chargement...</div>
        ) : actions.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-600">Aucune action urgente 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => (
              <div
                key={action.id}
                onClick={() => handleActionClick(action)}
                className="flex items-start justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{action.title}</p>
                  {action.deadline && (
                    <p className="text-xs text-gray-500 mt-1">
                      {action.type === 'task' ? '📅' : '⏰'} {new Date(action.deadline).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short',
                        hour: action.type === 'task' ? '2-digit' : undefined,
                        minute: action.type === 'task' ? '2-digit' : undefined
                      })}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  action.status === 'En attente' 
                    ? 'bg-orange-100 text-orange-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {action.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
