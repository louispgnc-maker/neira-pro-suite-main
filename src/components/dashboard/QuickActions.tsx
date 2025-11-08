import { FileText, Upload, PenTool, Users } from "lucide-react";
import { ContractSelectorNotaire } from "@/components/dashboard/ContractSelectorNotaire";
import { ContractSelectorAvocat } from "@/components/dashboard/ContractSelectorAvocat";
import { FicheClientMenu } from "@/components/dashboard/FicheClientMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRef, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const actions = [
  { key: "create", label: "Créer un contrat", icon: FileText, variant: "default" as const },
  { key: "import", label: "Importer PDF", icon: Upload, variant: "secondary" as const },
  { key: "sign", label: "Lancer signature", icon: PenTool, variant: "secondary" as const },
  // { key: "collect", label: "Lien de collecte", icon: Link2, variant: "secondary" as const },
];

interface QuickActionsProps {
  primaryButtonColor?: string;
  role?: 'avocat' | 'notaire';
}

export function QuickActions({ primaryButtonColor, role = 'avocat' }: QuickActionsProps = {}) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [checkingCabinet, setCheckingCabinet] = useState(false);
  const [hasCabinet, setHasCabinet] = useState(false);
  const [todoCount, setTodoCount] = useState<number>(0);
  const [overdueCount, setOverdueCount] = useState<number>(0);

  const triggerImport = () => {
    if (!user) {
      toast.error("Connexion requise", { description: "Veuillez vous connecter pour importer des fichiers." });
      return;
    }
    fileInputRef.current?.click();
  };

  const onFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;
    setUploading(true);
    try {
      // Assure-toi d'avoir créé le bucket "documents" dans Supabase Storage (private de préférence)
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (file.type !== 'application/pdf') {
          toast.error(`Format non supporté: ${file.name}`, { description: "Seuls les PDF sont acceptés." });
          continue;
        }
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from('documents').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf',
        });
        if (upErr) {
          toast.error(`Échec import: ${file.name}`, { description: upErr.message });
          continue;
        }
        // Insère une ligne dans la table documents
        const { error: dbErr } = await supabase.from('documents').insert({
          owner_id: user.id,
          name: file.name,
          client_name: null,
          status: 'En cours',
          role: role,
          storage_path: path,
        });
        if (dbErr) {
          toast.error(`Importé mais non référencé: ${file.name}`, { description: dbErr.message });
        } else {
          uploaded.push(file.name);
        }
      }
      if (uploaded.length > 0) {
        toast.success(`Import terminé`, { description: `${uploaded.length} fichier(s) ajouté(s)` });
      }
    } catch (err: any) {
      toast.error("Erreur d'import", { description: err?.message || String(err) });
    } finally {
      setUploading(false);
      // Reset input to allow re-selecting the same file
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Check cabinet membership (only relevant for notaire role per requirement)
  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!user || role !== 'notaire') return;
      setCheckingCabinet(true);
      try {
        const { data, error } = await supabase
          .rpc('get_user_cabinets')
          .eq('role', role);
        if (!active) return;
        if (error) {
          console.error('Erreur vérification cabinet:', error.message);
          setHasCabinet(false);
        } else {
          setHasCabinet(Array.isArray(data) && data.length > 0);
        }
      } catch (err) {
        console.error('Exception vérification cabinet:', err);
        if (active) setHasCabinet(false);
      } finally {
        if (active) setCheckingCabinet(false);
      }
    };
    check();

    // Load task counters (to-do and overdue) and subscribe to realtime updates for the current user
    let statsActive = true;
    const loadTaskCounts = async () => {
      if (!user) return;
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayISO = `${yyyy}-${mm}-${dd}`; // compare date portion

        // To-do: not done
        const todoRes = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id)
          .eq('role', role)
          .eq('done', false);

        // Overdue: not done and due_at < today
        const overdueRes = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id)
          .eq('role', role)
          .eq('done', false)
          .lt('due_at', todayISO);

        if (!statsActive) return;
        setTodoCount(todoRes.count ?? 0);
        setOverdueCount(overdueRes.count ?? 0);
      } catch (err) {
        console.error('Erreur chargement compteurs tâches:', err);
      }
    };
    loadTaskCounts();

    // Realtime subscription to tasks changes for current user to update counts live
    let channel: any = null;
    try {
      if (user) {
        channel = supabase.channel(`tasks-counts-${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `owner_id=eq.${user.id}` }, () => {
            loadTaskCounts();
          });
        channel.subscribe();
      }
    } catch (e) {
      console.error('Impossible de créer le channel realtime:', e);
    }

    return () => {
      active = false;
      statsActive = false;
      try { channel?.unsubscribe && channel.unsubscribe(); } catch (e) { /* ignore */ }
    };
  }, [user, role]);

  const handleCollaborative = () => {
    if (role !== 'notaire') return; // Only for notaires as specified
    // If still checking, block navigation briefly
    if (checkingCabinet) {
      toast.info('Vérification en cours…');
      return;
    }
    if (!hasCabinet) {
      // Redirect to cabinet setup page
      window.location.href = 'https://www.neira.fr/notaires/cabinet';
      return;
    }
    // Redirect to collaborative space
    window.location.href = 'https://www.neira.fr/notaires/espace-collaboratif';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Actions rapides</CardTitle>
      </CardHeader>
  <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Hidden file input for PDF import */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={onFilesSelected}
        />

        {/* Mini-card Tâches: split en deux (À faire / En retard) */}
        <div className="col-span-1 md:col-span-1">
          <div className="rounded-lg border border-border p-3 h-full flex flex-col justify-between bg-background">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Tâches</div>
                <div className="text-lg font-semibold">{todoCount + overdueCount}</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => window.location.href = (role === 'notaire' ? '/notaires/tasks' : '/avocats/tasks')} className="px-2 py-2 rounded-md bg-white border border-input text-sm flex flex-col items-center">
                <span className="text-xs text-muted-foreground">À faire</span>
                <span className="text-base font-bold">{todoCount}</span>
              </button>
              <button onClick={() => window.location.href = (role === 'notaire' ? '/notaires/tasks' : '/avocats/tasks')} className="px-2 py-2 rounded-md bg-white border border-input text-sm flex flex-col items-center">
                <span className="text-xs text-muted-foreground">En retard</span>
                <span className="text-base font-bold text-destructive">{overdueCount}</span>
              </button>
            </div>
          </div>
        </div>

        {role === 'notaire' ? (
          <ContractSelectorNotaire />
        ) : (
          <ContractSelectorAvocat />
        )}

        {/* Espace collaboratif (only for notaire). Placed after first selector to appear near middle visually */}
        {role === 'notaire' && (
          <Button
            onClick={handleCollaborative}
            disabled={checkingCabinet}
            className={`${primaryButtonColor || 'bg-orange-600 hover:bg-orange-700 text-white'} h-auto flex-col gap-2 py-4`}
          >
            <Users className="h-5 w-5" />
            <span className="text-xs">
              {checkingCabinet ? 'Chargement…' : 'Espace collaboratif'}
            </span>
          </Button>
        )}
        {actions.slice(1).filter(a => a.key !== 'collect').map((action) => {
          const onClick = () => {
            if (action.key === 'import') return triggerImport();
            // TODO: wire other actions
          };
          const colorClass = primaryButtonColor || (role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white');
          const buttonClass = `${colorClass} h-auto flex-col gap-2 py-4`;
          return (
            <Button
              key={action.key}
              variant={primaryButtonColor ? undefined : action.variant}
              className={buttonClass}
              onClick={onClick}
              disabled={uploading && action.key === 'import'}
            >
              <action.icon className="h-5 w-5" />
              <span className="text-xs">{action.key === 'import' && uploading ? 'Import…' : action.label}</span>
            </Button>
          );
        })}
        {/* Remplace 'Lien de collecte' par menu Fiche client avec même contenu */}
        <FicheClientMenu
          variant="vertical"
          colorClass={primaryButtonColor || (role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')}
        />
      </CardContent>
    </Card>
  );
}
