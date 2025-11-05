import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ClientRow = {
  id: string;
  name: string;
  kyc_status: "Complet" | "Partiel" | string;
  missing_info: string | null;
  created_at?: string | null;
};

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!user) {
        setClients([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("id,name,kyc_status,missing_info,created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Erreur chargement clients:", error);
        if (isMounted) setClients([]);
      } else if (isMounted) {
        setClients(data as ClientRow[]);
      }
      if (isMounted) setLoading(false);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

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
        
        {loading ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">Chargement…</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <div className="text-center">
              <p className="text-muted-foreground">Aucun client pour le moment</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <Card key={client.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{client.name}</h3>
                    {client.missing_info ? (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-2">
                        <AlertCircle className="h-3 w-3" />
                        Manque: {client.missing_info}
                      </p>
                    ) : (
                      <p className="text-xs text-success flex items-center gap-1 mt-2">
                        <CheckCircle2 className="h-3 w-3" />
                        Dossier complet
                      </p>
                    )}
                    {client.created_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Ajouté le {new Date(client.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      client.kyc_status === "Complet"
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-warning/10 text-warning border-warning/20"
                    }
                  >
                    {client.kyc_status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
