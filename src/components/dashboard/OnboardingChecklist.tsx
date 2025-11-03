import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const steps = [
  { label: "Ajouter un premier client", completed: true },
  { label: "Créer un premier document", completed: true },
  { label: "Envoyer une signature", completed: false },
  { label: "Finaliser le profil", completed: false },
];

export function OnboardingChecklist() {
  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-lg">Prise en main</CardTitle>
        <Progress value={progress} className="mt-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {completedCount} sur {steps.length} étapes complétées
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-3">
              {step.completed ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <span
                className={`text-sm ${
                  step.completed ? "text-muted-foreground line-through" : "font-medium"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
