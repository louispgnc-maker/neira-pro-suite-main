import { AppLayout } from "@/components/layout/AppLayout";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export default function Dossiers() {
  const location = useLocation();
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';
  const accent = role === 'notaire' ? 'amber' : 'blue';

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dossiers</h1>
          <p className="text-muted-foreground mt-1">Gestion des dossiers (à définir)</p>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Liste des dossiers</CardTitle>
            <Button
              variant="outline"
              className={role === 'notaire' ? 'border-amber-300 text-amber-700 hover:bg-amber-600 hover:text-white' : 'border-blue-300 text-blue-700 hover:bg-blue-600 hover:text-white'}
              disabled
            >
              Nouveau dossier (bientôt)
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Aucun dossier pour l'instant.
                    <div className="text-xs mt-1">Fonctionnalité à venir.</div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
