import { FileText, PenTool, Users, Clock, ChevronDown } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function DashboardAvocat() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
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

      // Documents en cours (status = 'En cours')
      const docsQuery = supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "avocat")
        .eq("status", "En cours")
        .gte("updated_at", `${yyyy}-${mm}-01`)
        .lte("updated_at", `${yyyy}-${mm}-31`);

      const docsPrevQuery = supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "avocat")
        .eq("status", "En cours")
        .gte("updated_at", `${prevYyyy}-${prevMm}-01`)
        .lte("updated_at", `${prevYyyy}-${prevMm}-31`);

      // Signatures en attente
      const sigQuery = supabase
        .from("signatures")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "avocat")
        .in("status", ["pending", "awaiting", "en_attente"])
        .gte("updated_at", `${yyyy}-${mm}-01`)
        .lte("updated_at", `${yyyy}-${mm}-31`);

      const sigPrevQuery = supabase
        .from("signatures")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "avocat")
        .in("status", ["pending", "awaiting", "en_attente"])
        .gte("updated_at", `${prevYyyy}-${prevMm}-01`)
        .lte("updated_at", `${prevYyyy}-${prevMm}-31`);

      // Clients à relancer (kyc_status = 'Partiel')
      const clientsQuery = supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "avocat")
        .eq("kyc_status", "Partiel");

      // Tâches du jour
      const dd = String(now.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const tasksQuery = supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "avocat")
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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">
              Bienvenue sur votre espace
            </h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="bg-blue-600 text-white hover:bg-blue-700 hover:text-white border-0 px-4 py-1.5 text-sm h-auto gap-2">
                  Espace Avocat
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white"
                  onClick={() => navigate("/avocats/dashboard")}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>Espace Avocat</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white"
                  onClick={() => navigate("/notaires/dashboard")}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-600" />
                    <span>Espace Notaire</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 px-5 py-2 text-sm font-semibold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-shadow">
              ✨ Premium
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground mt-2">
          Voici un aperçu de votre activité juridique
        </p>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Dossiers en cours"
            value={docCount}
            icon={FileText}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
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
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
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
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
          />
          <StatCard
            title="Tâches du jour"
            value={todayTasks}
            icon={Clock}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
          />
        </div>

        {/* Quick Actions */}
        <QuickActions 
          role="avocat"
          primaryButtonColor="bg-blue-600 hover:bg-blue-700 text-white" 
        />

        {/* Main Section - full width */}
        <div className="space-y-6">
          <RecentDocuments 
            role="avocat"
            statusColorOverride={{
              "En cours": "bg-blue-100 text-blue-600 border-blue-200"
            }} 
          />
          <PendingSignatures role="avocat" />
          <AlertsCompliance />
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TasksCalendar role="avocat" />
          <RecentClients role="avocat" />
        </div>
      </div>
      </div>
    </AppLayout>
  );
}
