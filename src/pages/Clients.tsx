import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Clients() {
  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Clients</h1>
            <p className="text-muted-foreground mt-1">
              Gérez votre base clients et KYC
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau client
          </Button>
        </div>
        
        <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
          <div className="text-center">
            <p className="text-muted-foreground">Liste des clients à venir</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
