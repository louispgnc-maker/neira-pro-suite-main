import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Tasks() {
  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Tâches</h1>
            <p className="text-muted-foreground mt-1">
              Organisez vos tâches et échéances
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle tâche
          </Button>
        </div>
        
        <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
          <div className="text-center">
            <p className="text-muted-foreground">Liste des tâches à venir</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
