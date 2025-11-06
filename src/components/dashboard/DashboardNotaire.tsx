import { FileText, PenTool, Users, Clock, FolderPlus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentDocuments } from "@/components/dashboard/RecentDocuments";
import { RecentContrats } from "@/components/dashboard/RecentContrats";
import { RecentDossiers } from "@/components/dashboard/RecentDossiers";
import { PendingSignatures } from "@/components/dashboard/PendingSignatures";
import { TasksCalendar } from "@/components/dashboard/TasksCalendar";
import { RecentClients } from "@/components/dashboard/RecentClients";
import { AlertsCompliance } from "@/components/dashboard/AlertsCompliance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function DashboardNotaire() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [docCount, setDocCount] = useState(0);
  const [docPrevCount, setDocPrevCount] = useState(0);
  const [pendingSigCount, setPendingSigCount] = useState(0);
  const [pendingSigPrevCount, setPendingSigPrevCount] = useState(0);
  const [clientsToFollow, setClientsToFollow] = useState(0);
  const [dossierCount, setDossierCount] = useState(0);
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

      // Contrats en cours - TOUS les contrats actifs
      const docsQuery = supabase
        .from("contrats")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire");

      // Contrats du mois précédent pour calculer la tendance
      const docsPrevQuery = supabase
        .from("contrats")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire")
        .gte("created_at", `${prevYyyy}-${prevMm}-01`)
        .lte("created_at", `${prevYyyy}-${prevMm}-31`);

      // Signatures en attente - TOUTES les signatures en attente
      const sigQuery = supabase
        .from("signatures")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire")
        .in("status", ["pending", "awaiting", "en_attente"]);

      // Signatures du mois précédent pour calculer la tendance
      const sigPrevQuery = supabase
        .from("signatures")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire")
        .in("status", ["pending", "awaiting", "en_attente"])
        .gte("updated_at", `${prevYyyy}-${prevMm}-01`)
        .lte("updated_at", `${prevYyyy}-${prevMm}-31`);

      // Clients à relancer (kyc_status = 'Partiel')
      const clientsQuery = supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire")
        .eq("kyc_status", "Partiel");

      // Tâches du jour
      const dd = String(now.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const tasksQuery = supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire")
        .eq("due_date", dateStr);

      const dossiersQuery = supabase
        .from("dossiers")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire");

      const [docsRes, docsPrevRes, sigRes, sigPrevRes, clientsRes, tasksRes, dossiersRes] = await Promise.allSettled([
        docsQuery,
        docsPrevQuery,
        sigQuery,
        sigPrevQuery,
        clientsQuery,
        tasksQuery,
        dossiersQuery,
      ]);

      if (!isMounted) return;
      setDocCount(docsRes.status === "fulfilled" && docsRes.value.count ? docsRes.value.count : 0);
      setDocPrevCount(docsPrevRes.status === "fulfilled" && docsPrevRes.value.count ? docsPrevRes.value.count : 0);
      setPendingSigCount(sigRes.status === "fulfilled" && sigRes.value.count ? sigRes.value.count : 0);
      setPendingSigPrevCount(sigPrevRes.status === "fulfilled" && sigPrevRes.value.count ? sigPrevRes.value.count : 0);
      setClientsToFollow(clientsRes.status === "fulfilled" && clientsRes.value.count ? clientsRes.value.count : 0);
  setTodayTasks(tasksRes.status === "fulfilled" && tasksRes.value.count ? tasksRes.value.count : 0);
  setDossierCount(dossiersRes.status === "fulfilled" && dossiersRes.value.count ? dossiersRes.value.count : 0);
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
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 px-5 py-2 text-sm font-semibold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-shadow">
              ✨ Premium
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground mt-2">
          Voici un aperçu de votre activité notariale
        </p>

  {/* KPI Cards single row */}
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="Actes en cours"
            value={docCount}
            icon={FileText}
            iconColor="text-amber-600"
            iconBgColor="bg-amber-100"
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
            iconColor="text-amber-600"
            iconBgColor="bg-amber-100"
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
            title="Dossiers"
            value={dossierCount}
            icon={FolderPlus}
            iconColor="text-amber-600"
            iconBgColor="bg-amber-100"
          />
          <StatCard
            title="Clients à relancer"
            value={clientsToFollow}
            icon={Users}
            iconColor="text-amber-600"
            iconBgColor="bg-amber-100"
          />
          <StatCard
            title="Tâches du jour"
            value={todayTasks}
            icon={Clock}
            iconColor="text-amber-600"
            iconBgColor="bg-amber-100"
          />
        </div>

        {/* Quick Actions */}
        <QuickActions 
          role="notaire"
          primaryButtonColor="bg-amber-600 hover:bg-amber-700 text-white" 
        />

        {/* Main Section */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentDocuments 
              role="notaire"
              statusColorOverride={{
                "En cours": "bg-amber-100 text-amber-600 border-amber-200"
              }} 
            />
            <RecentContrats role="notaire" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentDossiers role="notaire" />
            <PendingSignatures role="notaire" />
          </div>
          <AlertsCompliance />
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TasksCalendar role="notaire" />
          <RecentClients role="notaire" />
        </div>
      </div>
      </div>
    </AppLayout>
  );
}
