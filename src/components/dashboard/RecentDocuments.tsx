import { MoreHorizontal, Eye, Download, Trash2 } from "lucide-react";
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

const documents = [
  { name: "Acte de vente - Dupont", client: "M. Dupont", status: "Signé", date: "Il y a 2h" },
  { name: "Mandat de vente", client: "Mme Martin", status: "En cours", date: "Il y a 5h" },
  { name: "PV Assemblée Générale", client: "SCI Belle Vue", status: "Brouillon", date: "Hier" },
  { name: "Contrat de prestation", client: "Cabinet Legrand", status: "En attente", date: "Il y a 2j" },
];

const statusColors: Record<string, string> = {
  "Signé": "bg-success/10 text-success border-success/20",
  "En cours": "bg-primary/10 text-primary border-primary/20",
  "Brouillon": "bg-muted text-muted-foreground border-border",
  "En attente": "bg-warning/10 text-warning border-warning/20",
};

export function RecentDocuments() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Documents récents</CardTitle>
        <Button variant="ghost" size="sm">
          Voir tout →
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom du document</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Modifié</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{doc.name}</TableCell>
                <TableCell className="text-muted-foreground">{doc.client}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[doc.status]}>
                    {doc.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{doc.date}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Voir
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
