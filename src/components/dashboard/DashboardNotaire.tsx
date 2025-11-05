import { FileText, PenTool, Users, Clock } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentDocuments } from "@/components/dashboard/RecentDocuments";
import { PendingSignatures } from "@/components/dashboard/PendingSignatures";
import { TasksCalendar } from "@/components/dashboard/TasksCalendar";
import { RecentClients } from "@/components/dashboard/RecentClients";
import { AlertsCompliance } from "@/components/dashboard/AlertsCompliance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

export function DashboardNotaire() {
  const { profile, user } = useAuth();
  const [docCount, setDocCount] = useState(0);
  const [docPrevCount, setDocPrevCount] = useState(0);
  const [pendingSigCount, setPendingSigCount] = useState(0);
  const [pendingSigPrevCount, setPendingSigPrevCount] = useState(0);
  const [clientsToFollow, setClientsToFollow] = useState(0);
  const [todayTasks, setTodayTasks] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function loadCounts() {
      if (!user) {
        setDocCount(0);
        setDocPrevCount(0);
        setPendingSigCount(0);
        setPendingSigPrevCount(0);
        setClientsToFollow(0);
        setTodayTasks(0);
        return;
      }

      // Dates for current and previous month
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevYyyy = prevMonth.getFullYear();
      const prevMm = String(prevMonth.getMonth() + 1).padStart(2, "0");

      // Documents en cours (status = 'En cours') - Filtre par role='notaire'
      const docsQuery = supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire")
        .eq("status", "En cours")
        .gte("updated_at", `${yyyy}-${mm}-01`)
        .lte("updated_at", `${yyyy}-${mm}-31`);

      const docsPrevQuery = supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire")
        .eq("status", "En cours")
        .gte("updated_at", `${prevYyyy}-${prevMm}-01`)
        .lte("updated_at", `${prevYyyy}-${prevMm}-31`);

      // Signatures en attente - Filtre par role='notaire'
      const sigQuery = supabase
        .from("signatures")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire")
        .in("status", ["pending", "awaiting", "en_attente"])
        .gte("updated_at", `${yyyy}-${mm}-01`)
        .lte("updated_at", `${yyyy}-${mm}-31`);

      const sigPrevQuery = supabase
        .from("signatures")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire")
        .in("status", ["pending", "awaiting", "en_attente"])
        .gte("updated_at", `${prevYyyy}-${prevMm}-01`)
        .lte("updated_at", `${prevYyyy}-${prevMm}-31`);

      // Clients à relancer (kyc_status = 'Partiel') - Filtre par role='notaire'
      const clientsQuery = supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire")
        .eq("kyc_status", "Partiel");

      // Tâches du jour - Filtre par role='notaire'
      const dd = String(now.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const tasksQuery = supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire")
        .eq("due_date", dateStr);

      const [docsRes, docsPrevRes, sigRes, sigPrevRes, clientsRes, tasksRes] = await Promise.allSettled([
        docsQuery,
        docsPrevQuery,
        sigQuery,
        sigPrevQuery,
        clientsQuery,
        tasksQuery,
      ]);

      if (!isMounted) return;
      setDocCount(docsRes.status === "fulfilled" && docsRes.value.count ? docsRes.value.count : 0);
      setDocPrevCount(docsPrevRes.status === "fulfilled" && docsPrevRes.value.count ? docsPrevRes.value.count : 0);
      setPendingSigCount(sigRes.status === "fulfilled" && sigRes.value.count ? sigRes.value.count : 0);
      setPendingSigPrevCount(sigPrevRes.status === "fulfilled" && sigPrevRes.value.count ? sigPrevRes.value.count : 0);
      setClientsToFollow(clientsRes.status === "fulfilled" && clientsRes.value.count ? clientsRes.value.count : 0);
      setTodayTasks(tasksRes.status === "fulfilled" && tasksRes.value.count ? tasksRes.value.count : 0);
    }
    loadCounts();
    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <AppLayout>
      <div className="bg-gradient-to-br from-primary/20 via-accent/10 to-background min-h-screen">
        <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">
                Bonjour, {profile?.first_name || 'Utilisateur'} {profile?.role && `(${profile.role.charAt(0).toUpperCase() + profile.role.slice(1)})`}
              </h1>
              <Badge className="bg-amber-600 text-white border-0 px-4 py-1.5 text-sm">
                Espace Notaire
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Voici un aperçu de votre activité notariale
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-gradient-primary text-white border-0 px-4 py-1.5">
              Premium
            </Badge>
            <Button>Créer un acte</Button>
            <Button variant="secondary">Nouveau client</Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Actes en cours"
            value={docCount}
            icon={FileText}
            trend={(() => {
              const prev = docPrevCount;
              const curr = docCount;
              if (prev === 0) return undefined;
              const pct = Math.round(((curr - prev) / prev) * 100);
              return {
                value: `${Math.abs(pct)}%`,
                positive: pct >= 0,
              };
            })()}
          />
          <StatCard
            title="Signatures en attente"
            value={pendingSigCount}
            icon={PenTool}
            trend={(() => {
              const prev = pendingSigPrevCount;
              const curr = pendingSigCount;
              if (prev === 0) return undefined;
              const pct = Math.round(((curr - prev) / prev) * 100);
              return {
                value: `${Math.abs(pct)}%`,
                positive: pct >= 0,
              };
            })()}
          />
          <StatCard
            title="Clients à relancer"
            value={clientsToFollow}
            icon={Users}
          />
          <StatCard
            title="Tâches du jour"
            value={todayTasks}
            icon={Clock}
          />
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Main Section - full width */}
        <div className="space-y-6">
          <RecentDocuments />
          <PendingSignatures />
          <AlertsCompliance />
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TasksCalendar />
          <RecentClients />
        </div>
      </div>
      </div>
    </AppLayout>
  );
}
