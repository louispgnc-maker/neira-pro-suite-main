import { FileText, PenTool, Users, Clock } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentDocuments } from "@/components/dashboard/RecentDocuments";
import { PendingSignatures } from "@/components/dashboard/PendingSignatures";
import { TasksCalendar } from "@/components/dashboard/TasksCalendar";
import { RecentClients } from "@/components/dashboard/RecentClients";
import { AlertsCompliance } from "@/components/dashboard/AlertsCompliance";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [docCount, setDocCount] = useState(0);
  const [pendingSigCount, setPendingSigCount] = useState(0);
  const [clientsToFollow, setClientsToFollow] = useState(0);
  const [todayTasks, setTodayTasks] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function loadCounts() {
      if (!user) {
        setDocCount(0);
        setPendingSigCount(0);
        setClientsToFollow(0);
        setTodayTasks(0);
        return;
      }

      // Documents en cours (status = 'En cours')
      const docsQuery = supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("status", "En cours");

      // Signatures en attente
      const sigQuery = supabase
        .from("signatures")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .in("status", ["pending", "awaiting", "en_attente"]);

      // Clients à relancer (kyc_status = 'Partiel')
      const clientsQuery = supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("kyc_status", "Partiel");

      // Tâches du jour (optional: from a "tasks" table)
      // If tasks table doesn't exist, we keep 0; otherwise count tasks with due_date = today
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const tasksQuery = supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("due_date", dateStr);

      const [docsRes, sigRes, clientsRes, tasksRes] = await Promise.allSettled([
        docsQuery,
        sigQuery,
        clientsQuery,
        tasksQuery,
      ]);

      if (!isMounted) return;
      setDocCount(docsRes.status === "fulfilled" && docsRes.value.count ? docsRes.value.count : 0);
      setPendingSigCount(sigRes.status === "fulfilled" && sigRes.value.count ? sigRes.value.count : 0);
      setClientsToFollow(clientsRes.status === "fulfilled" && clientsRes.value.count ? clientsRes.value.count : 0);
      // If tasks table is missing, the query will error; we fallback to 0
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
            <h1 className="text-3xl font-bold text-foreground">
              Bonjour, {profile?.first_name || 'Utilisateur'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Voici un aperçu de votre activité
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-gradient-primary text-white border-0 px-4 py-1.5">
              Premium
            </Badge>
            <Button>Créer un document</Button>
            <Button variant="secondary">Nouveau client</Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Documents en cours"
            value={docCount}
            icon={FileText}
            trend={{ value: "8%", positive: true }}
          />
          <StatCard
            title="Signatures en attente"
            value={pendingSigCount}
            icon={PenTool}
            trend={{ value: "3%", positive: false }}
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

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            <RecentDocuments />
            <PendingSignatures />
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            <OnboardingChecklist />
            <AlertsCompliance />
          </div>
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
