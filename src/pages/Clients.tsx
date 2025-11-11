import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { FicheClientMenu } from "@/components/dashboard/FicheClientMenu";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";

type ClientRow = {
  id: string;
  name: string;
  kyc_status: "Complet" | "Partiel" | string;
  missing_info: string | null;
  created_at?: string | null;
};

export default function Clients() {
  const { user } = useAuth();
  const location = useLocation();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const navigate = useNavigate();

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!user) {
        setClients([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      let query = supabase
        .from("clients")
        .select("id,name,kyc_status,missing_info,created_at")
        .eq("owner_id", user.id)
        .eq("role", role)
        .order("created_at", { ascending: false });
      if (debounced) {
        query = query.ilike('name', `%${debounced}%`);
      }
      const { data, error } = await query;
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
  }, [user, debounced]);

  // Couleur du bouton principal
  const mainButtonColor = role === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  // Couleur badge KYC partiel
  const kycPartielColor = role === 'notaire'
    ? 'bg-warning/10 text-warning border-warning/20'
    : 'bg-warning/10 text-warning border-warning/20'; // même couleur pour les deux, mais extensible

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Clients</h1>
            <p className="text-muted-foreground mt-1">Gérez votre base clients et KYC</p>
          </div>
          <div className="md:w-auto w-full flex justify-end">
            <FicheClientMenu variant="horizontal" colorClass={mainButtonColor} />
          </div>
        </div>
        <div className={clients.length > 0 ? "mb-4 bg-white p-4 rounded-lg border" : "mb-4"}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client…"
            className="w-full md:max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">Chargement…</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <div className="text-center">
              <p className="text-muted-foreground">Aucun client pour le moment</p>
              <div className="mt-4 flex justify-center">
                <FicheClientMenu
                  variant="horizontal"
                  label="Ajoutez votre premier client"
                  colorClass={role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg bg-white p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => (
                <Card 
                  key={client.id} 
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer" 
                  onClick={() => navigate(role === 'notaire' ? `/notaires/clients/${client.id}` : `/avocats/clients/${client.id}`)}
                >
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
                          : kycPartielColor
                      }
                    >
                      {client.kyc_status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
