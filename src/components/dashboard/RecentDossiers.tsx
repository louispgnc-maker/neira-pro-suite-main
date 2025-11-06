import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocation, useNavigate } from "react-router-dom";

interface RecentDossiersProps {
  role?: 'avocat' | 'notaire';
}

export function RecentDossiers({ role }: RecentDossiersProps) {
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
              <TableHead>Client</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créé le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Aucun dossier.
                <div className="text-xs mt-1">Cette section arrive bientôt.</div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
