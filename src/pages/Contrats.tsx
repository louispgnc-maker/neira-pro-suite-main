import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { FileText, Search, MoreHorizontal, Trash2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ContractSelectorNotaire } from "@/components/dashboard/ContractSelectorNotaire";
import { ContractSelectorAvocat } from "@/components/dashboard/ContractSelectorAvocat";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ShareToCollaborativeDialog } from "@/components/cabinet/ShareToCollaborativeDialog";

type ContratRow = {
  id: string;
  name: string;
  category: string;
  type: string;
  created_at: string;
  updated_at: string;
};

// Catégories filtrage dynamiques selon le rôle
const categoriesNotaire = [
  "Tous",
  "Immobilier",
  "Famille & Patrimoine",
  "Succession",
  "Procurations & Actes divers"
];

const categoriesAvocat = [
  "Tous",
  "Droit des affaires / Commercial",
  "Droit du travail",
  "Droit immobilier",
  "Droit civil / Vie privée",
  "Propriété intellectuelle & Numérique",
];

export default function Contrats() {
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [contrats, setContrats] = useState<ContratRow[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tous");
  const [debounced, setDebounced] = useState("");

  // debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const mainButtonColor = role === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!user) {
        setContrats([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      let query = supabase
        .from('contrats')
        .select('id,name,category,type,created_at,updated_at')
        .eq('owner_id', user.id)
        .eq('role', role)
        .order('created_at', { ascending: false });
      if (debounced) {
        query = query.or(`name.ilike.%${debounced}%,type.ilike.%${debounced}%`);
      }
      if (categoryFilter && categoryFilter !== 'Tous') {
        query = query.eq('category', categoryFilter);
      }
      const { data, error } = await query;
      if (error) {
        console.error('Erreur chargement contrats:', error);
        if (isMounted) setContrats([]);
      } else if (isMounted) {
        setContrats(data as ContratRow[]);
      }
      if (isMounted) setLoading(false);
    }
    load();
    return () => { isMounted = false; };
  }, [user, role, debounced, categoryFilter]);

  const refreshContrats = () => {
    // Force un rechargement
    if (!user) return;
    supabase
      .from('contrats')
      .select('id,name,category,type,created_at,updated_at')
      .eq('owner_id', user.id)
      .eq('role', role)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Erreur rechargement contrats:', error);
        } else {
          setContrats(data as ContratRow[]);
        }
      });
  };

  const handleDelete = async (contrat: ContratRow) => {
    if (!user) return;
    if (!confirm(`Supprimer "${contrat.name}" ?`)) return;
    
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

  // Résultats déjà filtrés côté SQL
  const filteredContrats = contrats;

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Contrats</h1>
            <p className="text-muted-foreground mt-1">
              Centralisez et créez vos modèles de contrats
            </p>
          </div>
          <div>
            {role === 'notaire' ? (
              <ContractSelectorNotaire variant="horizontal" onContractCreated={refreshContrats} />
            ) : (
              <ContractSelectorAvocat variant="horizontal" onContractCreated={refreshContrats} />
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">Chargement…</p>
          </div>
        ) : contrats.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <div className="text-center">
              <p className="text-muted-foreground">Aucun contrat pour le moment</p>
              {role === 'notaire' ? (
                <div className="mt-4 flex justify-center">
                  <ContractSelectorNotaire variant="horizontal" label="Ajoutez votre premier contrat" onContractCreated={refreshContrats} />
                </div>
              ) : (
                <div className="mt-4 flex justify-center">
                  <ContractSelectorAvocat variant="horizontal" label="Ajoutez votre premier contrat" onContractCreated={refreshContrats} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un contrat..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {(role === 'notaire' ? categoriesNotaire : categoriesAvocat).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom du contrat</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContrats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Aucun contrat trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContrats.map((contrat) => (
                      <TableRow key={contrat.id}>
                        <TableCell className="font-medium">{contrat.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{contrat.type}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            role === 'notaire'
                              ? 'bg-orange-100 text-orange-600 border-orange-200'
                              : 'bg-blue-100 text-blue-600 border-blue-200'
                          }>
                            {contrat.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(contrat.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <ShareToCollaborativeDialog
                              itemId={contrat.id}
                              itemName={contrat.name}
                              itemType="contrat"
                              role={role}
                              onSuccess={() => {
                                toast.success('Contrat partagé');
                              }}
                            />
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
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDelete(contrat)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
