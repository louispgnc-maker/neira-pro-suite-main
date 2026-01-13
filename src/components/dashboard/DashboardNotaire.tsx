import { FileText, PenTool, Users, Clock, FolderPlus, Crown } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { TasksSummaryCard } from "@/components/dashboard/TasksSummaryCard";
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
import { GlobalSearch } from "@/components/GlobalSearch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAutoCreateCabinet } from "@/hooks/use-auto-create-cabinet";
import { toast } from "sonner";

export function DashboardNotaire() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Hook pour créer automatiquement le cabinet après inscription
  useAutoCreateCabinet(user, 'notaire');
  
  // Gérer le retour du paiement Stripe
  useEffect(() => {
    const paymentStatus = searchParams.get('signature_payment');
    if (paymentStatus === 'success') {
      toast.success('Paiement réussi !', {
        description: 'Vos crédits de signatures ont été ajoutés à votre compte.'
      });
      // Nettoyer l'URL
      searchParams.delete('signature_payment');
      setSearchParams(searchParams);
      // Recharger les données
      setTimeout(() => window.location.reload(), 1500);
    } else if (paymentStatus === 'cancelled') {
      toast.error('Paiement annulé', {
        description: 'Votre achat de signatures a été annulé.'
      });
      // Nettoyer l'URL
      searchParams.delete('signature_payment');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);
  const [docCount, setDocCount] = useState(0);
  const [docPrevCount, setDocPrevCount] = useState(0);
  const [pendingSigCount, setPendingSigCount] = useState(0);
  const [pendingSigPrevCount, setPendingSigPrevCount] = useState(0);
  const [clientsToFollow, setClientsToFollow] = useState(0);
  const [dossierCount, setDossierCount] = useState(0);
  const [todayTasks, setTodayTasks] = useState(0);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('essentiel');

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

      // Load subscription tier from cabinet
      const { data: profileData } = await supabase
        .from('profiles')
        .select('cabinet_id')
        .eq('id', user.id)
        .single();

      let cabinetId = profileData?.cabinet_id;

      // If no cabinet in profile, check cabinet_members
      if (!cabinetId) {
        const { data: memberData } = await supabase
          .from('cabinet_members')
          .select('cabinet_id')
          .eq('user_id', user.id)
          .single();
        
        cabinetId = memberData?.cabinet_id;
      }

      if (cabinetId) {
        const { data: cabinetData } = await supabase
          .from('cabinets')
          .select('subscription_plan')
          .eq('id', cabinetId);
        
        if (cabinetData && cabinetData.length > 0 && cabinetData[0].subscription_plan) {
          setSubscriptionTier(cabinetData[0].subscription_plan);
        }
      }

      // Dates for current and previous month
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevYyyy = prevMonth.getFullYear();
      const prevMm = String(prevMonth.getMonth() + 1).padStart(2, "0");
      
      // Get last day of previous month
      const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();

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
        .gte("created_at", `${prevYyyy}-${prevMm}-01T00:00:00`)
        .lt("created_at", `${yyyy}-${mm}-01T00:00:00`);

      // Signatures en attente - Dossiers avec statut "En attente de signature"
      const sigQuery = supabase
        .from("dossiers")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire")
        .eq("status", "En attente de signature");

      // Signatures du mois précédent pour calculer la tendance  
      const sigPrevQuery = supabase
        .from("dossiers")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire")
        .eq("status", "En attente de signature");

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
      
      // Log errors for debugging but don't throw
      if (docsRes.status === "rejected") console.error('[Dashboard Notaire] Contrats query failed:', docsRes.reason);
      if (docsPrevRes.status === "rejected") console.error('[Dashboard Notaire] Contrats prev query failed:', docsPrevRes.reason);
      if (sigRes.status === "rejected") console.error('[Dashboard Notaire] Signatures query failed:', sigRes.reason);
      if (sigPrevRes.status === "rejected") console.error('[Dashboard Notaire] Signatures prev query failed:', sigPrevRes.reason);
      if (clientsRes.status === "rejected") console.error('[Dashboard Notaire] Clients query failed:', clientsRes.reason);
      if (tasksRes.status === "rejected") console.error('[Dashboard Notaire] Tasks query failed:', tasksRes.reason);
      if (dossiersRes.status === "rejected") console.error('[Dashboard Notaire] Dossiers query failed:', dossiersRes.reason);
      
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
      <div className="w-full">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Bienvenue sur votre espace{profile?.first_name ? `, ${profile.first_name}` : ''}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                console.log('Dashboard subscription button clicked', { subscriptionTier });
                navigate('/notaires/subscription');
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 px-5 py-2 rounded-md text-sm font-semibold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-shadow cursor-pointer"
            >
              <Crown className="h-4 w-4" />
              <span>
                {subscriptionTier === 'cabinet-plus' 
                  ? 'Neira Cabinet+' 
                  : subscriptionTier === 'professionnel' 
                  ? 'Neira Professionnel' 
                  : 'Neira Essentiel'}
              </span>
            </button>
          </div>
        </div>
        <p className="text-lg text-gray-600 mt-2">
          Voici un aperçu de votre activité notariale
        </p>

        {/* Barre de recherche */}
        <GlobalSearch userRole="notaire" />

  {/* KPI Cards single row */}
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="Actes en cours"
            value={docCount}
            icon={FileText}
            iconColor="text-orange-600"
            iconBgColor="bg-orange-100"
            onClick={() => navigate('/notaires/contrats')}
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
            iconColor="text-orange-600"
            iconBgColor="bg-orange-100"
            onClick={() => navigate('/notaires/signatures')}
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
            iconColor="text-orange-600"
            iconBgColor="bg-orange-100"
            onClick={() => navigate('/notaires/dossiers')}
          />
          <StatCard
            title="Clients à relancer"
            value={clientsToFollow}
            icon={Users}
            iconColor="text-orange-600"
            iconBgColor="bg-orange-100"
            onClick={() => navigate('/notaires/clients')}
          />
          <TasksSummaryCard role="notaire" />
        </div>

        {/* Quick Actions */}
        <QuickActions 
          role="notaire"
          primaryButtonColor="bg-orange-600 hover:bg-orange-700 text-white" 
        />

        {/* Main Section */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentDocuments 
              role="notaire"
              statusColorOverride={{
                "En cours": "bg-orange-100 text-orange-600 border-orange-200"
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
