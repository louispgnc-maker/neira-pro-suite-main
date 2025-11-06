import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

interface RecentDossiersProps {
  role?: 'avocat' | 'notaire';
}

type DossierRow = { id: string; title: string; status: string; created_at: string };

export function RecentDossiers({ role }: RecentDossiersProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  let derivedRole: 'avocat' | 'notaire' = role || 'avocat';
  if (!role) {
    if (location.pathname.includes('/notaires')) derivedRole = 'notaire';
    if (location.pathname.includes('/avocats')) derivedRole = 'avocat';
  }

  const btnClass = derivedRole === 'notaire'
    ? 'hover:bg-amber-600 hover:text-white'
    : 'hover:bg-blue-600 hover:text-white';

  const [rows, setRows] = useState<DossierRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user) { setRows([]); setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase
        .from('dossiers')
        .select('id,title,status,created_at')
        .eq('owner_id', user.id)
        .eq('role', derivedRole)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) {
        console.error('Erreur chargement dossiers récents:', error);
        if (mounted) setRows([]);
      } else if (mounted) {
        setRows((data || []) as DossierRow[]);
      }
      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [user, derivedRole]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Dossiers</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className={btnClass}
          onClick={() => navigate(derivedRole === 'notaire' ? '/notaires/dossiers' : '/avocats/dossiers')}
        >
          Voir tout →
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom du dossier</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créé le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">Chargement…</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">Aucun dossier.</TableCell>
              </TableRow>
            ) : (
              rows.map((d) => (
                <TableRow
                  key={d.id}
                  onDoubleClick={() => navigate(derivedRole === 'notaire' ? `/notaires/dossiers/${d.id}` : `/avocats/dossiers/${d.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{d.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.status}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
