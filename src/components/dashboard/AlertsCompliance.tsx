import { AlertTriangle, Clock, FileWarning } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const alerts = [
  {
    type: "warning",
    icon: Clock,
    message: "3 signatures expirent dans moins de 48h",
  },
  {
    type: "error",
    icon: FileWarning,
    message: "2 clients avec pièces justificatives manquantes",
  },
  {
    type: "warning",
    icon: AlertTriangle,
    message: "Renouvellement assurance RC à prévoir ce mois",
  },
];

export function AlertsCompliance() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Alertes & conformité</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <Alert
              key={index}
              variant={alert.type === "error" ? "destructive" : "default"}
              className="border-l-4"
            >
              <alert.icon className="h-4 w-4" />
              <AlertDescription className="ml-2">{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
