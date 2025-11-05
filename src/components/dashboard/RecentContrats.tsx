import { MoreHorizontal, Eye, Trash2, FileText } from "lucide-react";
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
};

interface RecentContratsProps {
  role?: 'avocat' | 'notaire';
}

export function RecentContrats({ role = 'avocat' }: RecentContratsProps = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contrats, setContrats] = useState<ContratRow[]>([]);
  const [loading, setLoading] = useState(true);

  const handleView = (contrat: ContratRow) => {
    // Pour l'instant, navigation vers la page contrats (peut être étendu plus tard)
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
    } catch (err: any) {
      console.error('Erreur suppression contrat:', err);
      toast.error('Erreur lors de la suppression', { description: err?.message || String(err) });
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
      const { data, error } = await supabase
        .from("contrats")
        .select("id,name,category,type,created_at")
        .eq("owner_id", user.id)
        .eq("role", role)
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(5);
      if (error) {
        console.error("Erreur chargement contrats:", error);
        if (isMounted) setContrats([]);
      } else if (isMounted) {
        setContrats(data as ContratRow[]);
      }
      if (isMounted) setLoading(false);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [user, role]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Contrats récents</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className={role === 'notaire' ? 'hover:bg-amber-600 hover:text-white' : 'hover:bg-blue-600 hover:text-white'}
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
              <TableHead>Catégorie</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : contrats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Aucun contrat.
                </TableCell>
              </TableRow>
            ) : (
              contrats.map((contrat) => (
                <TableRow key={contrat.id}>
                  <TableCell className="font-medium">{contrat.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={role === 'notaire' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
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
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(contrat)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Voir les détails
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
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
