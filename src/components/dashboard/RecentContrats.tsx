import { MoreHorizontal, Eye, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type ContratRow = {
  id: string;
  name: string;
  category: string;
  type: string;
  created_at: string | null;
  client_names?: string[]; // Liste des noms de clients associés
};

interface RecentContratsProps {
  role?: 'avocat' | 'notaire';
  title?: string;
}

export function RecentContrats({ role = 'avocat', title = 'Contrats récents' }: RecentContratsProps = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contrats, setContrats] = useState<ContratRow[]>([]);
  const [loading, setLoading] = useState(true);

  const handleView = (contrat: ContratRow) => {
    // Navigation vers la page contrats (listing pour l'instant)
    navigate(role === 'notaire' ? '/notaires/contrats' : '/avocats/contrats');
  };

  const handleDelete = async (contrat: ContratRow) => {
    if (!user) return;
    if (!confirm(`Supprimer le contrat "${contrat.name}" ?`)) return;
    
    try {
      const { error } = await supabase
        .from('contrats')
        .delete()
        .eq('id', contrat.id)
        .eq('owner_id', user.id);
      
      if (error) throw error;
      
      setContrats((prev) => prev.filter((c) => c.id !== contrat.id));
      toast.success('Contrat supprimé');
    } catch (err: unknown) {
      console.error('Erreur suppression contrat:', err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error('Erreur lors de la suppression', { description: message });
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!user) {
        setContrats([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      
      // Récupérer les contrats
      const { data: contratsData, error: contratsError } = await supabase
        .from("contrats")
        .select("id,name,category,type,created_at")
        .eq("owner_id", user.id)
        .eq("role", role)
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(5);
      
      if (contratsError) {
        console.error("Erreur chargement contrats:", contratsError);
        if (isMounted) {
          setContrats([]);
          setLoading(false);
        }
        return;
      }
      
      if (!contratsData || contratsData.length === 0) {
        if (isMounted) {
          setContrats([]);
          setLoading(false);
        }
        return;
      }
      
      // Récupérer les associations client_contrats pour ces contrats
      const contratIds = contratsData.map(c => c.id);
      const { data: links, error: linksError } = await supabase
        .from("client_contrats")
        .select("contrat_id, client_id")
        .eq("owner_id", user.id)
        .eq("role", role)
        .in("contrat_id", contratIds);
      
      if (linksError) {
        console.error("Erreur chargement liens:", linksError);
      }
      
      // Récupérer les noms des clients si des liens existent
      const clientsMap = new Map<string, string>();
      const linksArr = Array.isArray(links) ? links as unknown[] : [];
      if (linksArr.length > 0) {
        const clientIds = [...new Set(linksArr.map(l => String((l as Record<string, unknown>)['client_id'] ?? '')))];
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, name")
          .in("id", clientIds);
        
        if (!clientsError && Array.isArray(clientsData)) {
          (clientsData as unknown[]).forEach(client => {
            const c = client as Record<string, unknown>;
            const id = String(c['id'] ?? '');
            const name = String(c['name'] ?? '');
            if (id) clientsMap.set(id, name);
          });
        }
      }
      
      // Enrichir les contrats avec les noms des clients
      const enrichedContrats = contratsData.map(contrat => {
        const clientLinks = (linksArr.filter((l) => String((l as Record<string, unknown>)['contrat_id'] ?? '') === contrat.id) as unknown[]);
        const clientNames = clientLinks
          .map(link => clientsMap.get(String((link as Record<string, unknown>)['client_id'] ?? '')))
          .filter(Boolean) as string[];
        
        return {
          ...contrat,
          client_names: clientNames
        };
      });
      
      if (isMounted) {
        setContrats(enrichedContrats as ContratRow[]);
        setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [user, role]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
  <CardTitle className="text-lg">{title}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className={role === 'notaire' ? 'hover:bg-orange-600 hover:text-white' : 'hover:bg-blue-600 hover:text-white'}
          onClick={() => navigate(role === 'notaire' ? '/notaires/contrats' : '/avocats/contrats')}
        >
          Voir tout →
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom du contrat</TableHead>
              <TableHead>Client(s)</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : contrats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Aucun contrat.
                </TableCell>
              </TableRow>
            ) : (
              contrats.map((contrat) => (
                <TableRow
                  key={contrat.id}
                  onDoubleClick={() => handleView(contrat)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{contrat.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {contrat.client_names && contrat.client_names.length > 0
                      ? contrat.client_names.join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={role === 'notaire' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                      {contrat.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{contrat.type}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {contrat.created_at ? new Date(contrat.created_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className={role === 'notaire' ? 'hover:bg-orange-100 hover:text-orange-600' : 'hover:bg-blue-100 hover:text-blue-600'}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className={role === 'notaire' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}>
                        <DropdownMenuItem 
                          className={role === 'notaire' ? 'hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white' : 'hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white'}
                          onClick={() => handleView(contrat)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Voir les détails
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className={`text-destructive ${role === 'notaire' ? 'hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white' : 'hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white'}`}
                          onClick={() => handleDelete(contrat)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
