import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { Share2 } from 'lucide-react';
import ShareToCollaborativeButton from '@/components/cabinet/ShareToCollaborativeButton';
import { FicheClientMenu } from "@/components/dashboard/FicheClientMenu";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { ResourceCounter } from "@/components/subscription/ResourceCounter";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
// sharing removed: no client-side sharing RPCs

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

  const limits = useSubscriptionLimits(role);

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
  }, [user, debounced, role]);

  // Couleur du bouton principal
  const mainButtonColor = role === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  // Couleur badge KYC partiel
  const kycPartielColor = role === 'notaire'
    ? 'bg-warning/10 text-warning border-warning/20'
    : 'bg-warning/10 text-warning border-warning/20'; // même couleur pour les deux, mais extensible

  // sharing removed: no client-side share function. The UI button remains
  // but will render a disabled placeholder dialog component.

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Clients</h1>
            <p className="text-foreground mt-1">Gérez votre base clients et KYC</p>
          </div>
          <div className="md:w-auto w-full flex justify-end">
            <FicheClientMenu variant="horizontal" colorClass={mainButtonColor} />
          </div>
        </div>

        {/* Clients Counter */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <ResourceCounter
              current={clients.length}
              max={limits.max_clients}
              label="Clients actifs"
              type="count"
              subscriptionPlan={limits.subscription_plan}
              role={role}
            />
          </CardContent>
        </Card>

        <div className={clients.length > 0 ? "mb-4 bg-white p-4 rounded-lg border" : "mb-4"}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client…"
            className="w-full md:max-w-sm rounded-md border border-input bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground/50"
          />
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <p className="text-foreground">Chargement…</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <div className="text-center">
              <p className="text-foreground">Aucun client pour le moment</p>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Liste des clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg bg-white p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clients.map((client) => (
                    <Card 
                      key={client.id} 
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer" 
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1" onClick={() => navigate(role === 'notaire' ? `/notaires/clients/${client.id}` : `/avocats/clients/${client.id}`)}>
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
                            <p className="text-xs text-foreground mt-2">
                              Ajouté le {new Date(client.created_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
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
                          <ShareToCollaborativeButton clientId={client.id} clientName={client.name} role={role} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
