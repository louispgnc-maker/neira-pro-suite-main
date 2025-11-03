import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const clients = [
  { name: "Jean Dupont", kyc: "Complet", missing: null },
  { name: "Marie Martin", kyc: "Partiel", missing: "Justificatif domicile" },
  { name: "SCI Patrimoine", kyc: "Partiel", missing: "Statuts à jour" },
  { name: "Cabinet Legrand", kyc: "Complet", missing: null },
];

export function RecentClients() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Clients récents / KYC</CardTitle>
        <Button variant="ghost" size="sm">
          Voir tout →
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {clients.map((client, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium text-sm">{client.name}</p>
                {client.missing ? (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    Manque: {client.missing}
                  </p>
                ) : (
                  <p className="text-xs text-success flex items-center gap-1 mt-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Dossier complet
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className={
                  client.kyc === "Complet"
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-warning/10 text-warning border-warning/20"
                }
              >
                {client.kyc}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
