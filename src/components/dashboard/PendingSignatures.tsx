import { Send, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const signatures = [
  { signer: "Jean Dupont", document: "Acte de vente", lastReminder: "Il y a 3j" },
  { signer: "Marie Martin", document: "Mandat exclusif", lastReminder: "Il y a 5j" },
  { signer: "SCI Patrimoine", document: "PV Assemblée", lastReminder: "Il y a 1j" },
];

export function PendingSignatures() {
  const handleCopyLink = () => {
    toast.success("Lien copié dans le presse-papier");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Signatures en attente</CardTitle>
        <Button variant="ghost" size="sm">
          Voir tout →
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {signatures.map((sig, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium text-sm">{sig.signer}</p>
                <p className="text-xs text-muted-foreground">{sig.document}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Dernière relance: {sig.lastReminder}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopyLink}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copier
                </Button>
                <Button size="sm" variant="default">
                  <Send className="h-3 w-3 mr-1" />
                  Relancer
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
