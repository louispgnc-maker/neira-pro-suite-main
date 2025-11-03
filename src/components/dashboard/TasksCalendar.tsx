import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const tasks = [
  { day: "Lun 3", task: "Rendez-vous client Dupont", time: "14:00" },
  { day: "Mar 4", task: "Échéance signature Martin", time: "17:00" },
  { day: "Mer 5", task: "Dépôt acte notarié", time: "10:00" },
  { day: "Jeu 6", task: "Relance KYC SCI Patrimoine", time: "09:00" },
  { day: "Ven 7", task: "Assemblée Générale", time: "15:30" },
];

export function TasksCalendar() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Tâches & échéances</CardTitle>
        <Button variant="ghost" size="sm">
          Voir tout →
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col items-center min-w-[60px] pt-1">
                <span className="text-xs text-muted-foreground font-medium">{task.day}</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3" />
                  {task.time}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{task.task}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
