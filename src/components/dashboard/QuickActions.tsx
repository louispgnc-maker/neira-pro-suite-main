import { FileText, Upload, PenTool, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const actions = [
  { label: "Créer un contrat", icon: FileText, variant: "default" as const },
  { label: "Importer PDF", icon: Upload, variant: "secondary" as const },
  { label: "Lancer signature", icon: PenTool, variant: "secondary" as const },
  { label: "Lien de collecte", icon: Link2, variant: "secondary" as const },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Actions rapides</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            className="h-auto flex-col gap-2 py-4"
          >
            <action.icon className="h-5 w-5" />
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
