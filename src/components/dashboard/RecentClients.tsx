import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type ClientRow = {
  id: string;
  name: string;
  kyc_status: "Complet" | "Partiel" | string;
  missing_info: string | null;
  created_at?: string | null;
};

export function RecentClients() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
        .order("created_at", { ascending: false })
        .limit(4);
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Clients récents / KYC</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/clients')}>
          Voir tout →
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-muted-foreground">Chargement…</p>
            ) : clients.length === 0 ? (
              <p className="text-center text-muted-foreground">Aucuns clients récents.</p>
          ) : (
            clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{client.name}</p>
                  {client.missing_info ? (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      Manque: {client.missing_info}
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
                    client.kyc_status === "Complet"
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-warning/10 text-warning border-warning/20"
                  }
                >
                  {client.kyc_status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
