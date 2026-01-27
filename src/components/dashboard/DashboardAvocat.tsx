import { FileText, PenTool, Users, FolderPlus, Crown, UserPlus, FileUp, Share2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { GlobalStatusBar } from "@/components/dashboard/GlobalStatusBar";
import { TodayActions } from "@/components/dashboard/TodayActions";
import { PrimaryAction } from "@/components/dashboard/PrimaryAction";
import { TrustIndicator } from "@/components/dashboard/TrustIndicator";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAutoCreateCabinet } from "@/hooks/use-auto-create-cabinet";
import { toast } from "sonner";

export function DashboardAvocat() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Hook pour créer automatiquement le cabinet après inscription
  useAutoCreateCabinet(user, 'avocat');
  
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
  
  const [pendingSigCount, setPendingSigCount] = useState(0);
  const [clientsToFollow, setClientsToFollow] = useState(0);
  const [dossierCount, setDossierCount] = useState(0);
  const [todayTasks, setTodayTasks] = useState(0);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('essentiel');

  useEffect(() => {
    let isMounted = true;
    async function loadCounts() {
      if (!user) {
        setPendingSigCount(0);
        setClientsToFollow(0);
        setTodayTasks(0);
        setDossierCount(0);
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

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Signatures en attente
      const sigQuery = supabase
        .from("signatures")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "avocat")
        .eq("status", "pending");

      // Clients à relancer
      const clientsQuery = supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "avocat")
        .eq("kyc_status", "Partiel");

      // Tâches du jour
      const tasksQuery = supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "avocat")
        .eq("done", false)
        .gte("due_at", `${dateStr}T00:00:00`)
        .lte("due_at", `${dateStr}T23:59:59`);

      // Dossiers actifs
      const dossiersQuery = supabase
        .from("dossiers")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "avocat");

      const [sigRes, clientsRes, tasksRes, dossiersRes] = await Promise.allSettled([
        sigQuery,
        clientsQuery,
        tasksQuery,
        dossiersQuery,
      ]);

      if (!isMounted) return;
      setPendingSigCount(sigRes.status === "fulfilled" && sigRes.value.count ? sigRes.value.count : 0);
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
      <div className="w-full bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
        <div className="p-8 space-y-8 max-w-[1400px] mx-auto">
        
        {/* 1️⃣ En-tête */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Bienvenue sur votre espace{profile?.first_name ? `, ${profile.first_name}` : ''}
              </h1>
              <p className="text-gray-600 mt-1">Aperçu de votre activité juridique</p>
            </div>
            <button
              onClick={() => navigate('/avocats/subscription')}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 px-5 py-2 rounded-md text-sm font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-shadow cursor-pointer"
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

          {/* Barre de recherche globale */}
          <div className="flex justify-center">
            <div className="w-full max-w-2xl">
              <GlobalSearch userRole="avocat" />
            </div>
          </div>
        </div>

        {/* 2️⃣ KPI principaux - 4 cards maximum */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="À faire aujourd'hui"
            value={todayTasks}
            icon={FileText}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
            onClick={() => navigate('/avocats/tasks')}
          />
          <StatCard
            title="Signatures en attente"
            value={pendingSigCount}
            icon={PenTool}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
            onClick={() => navigate('/avocats/signatures')}
          />
          <StatCard
            title="Dossiers actifs"
            value={dossierCount}
            icon={FolderPlus}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
            onClick={() => navigate('/avocats/dossiers')}
          />
          <StatCard
            title="Clients à relancer"
            value={clientsToFollow}
            icon={Users}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
            onClick={() => navigate('/avocats/clients')}
          />
        </div>

        {/* 3️⃣ Bloc central - État global des dossiers */}
        <GlobalStatusBar role="avocat" />

        {/* 4️⃣ Bloc secondaire - À faire aujourd'hui */}
        <TodayActions role="avocat" />

        {/* 5️⃣ Action principale */}
        <PrimaryAction role="avocat" />

        {/* 6️⃣ Actions rapides secondaires */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            onClick={() => navigate('/avocats/clients')}
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <UserPlus className="h-6 w-6 text-gray-600" />
            <span className="text-sm font-medium">Ajouter un client</span>
          </Button>
          <Button
            onClick={() => navigate('/avocats/documents')}
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <FileUp className="h-6 w-6 text-gray-600" />
            <span className="text-sm font-medium">Importer un document</span>
          </Button>
          <Button
            onClick={() => navigate('/avocats/signatures')}
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <PenTool className="h-6 w-6 text-gray-600" />
            <span className="text-sm font-medium">Lancer une signature</span>
          </Button>
          <Button
            onClick={() => navigate('/avocats/cabinet')}
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <Share2 className="h-6 w-6 text-gray-600" />
            <span className="text-sm font-medium">Espace collaboratif</span>
          </Button>
        </div>

        {/* 7️⃣ Indicateur de confiance */}
        <TrustIndicator />

      </div>
      </div>
    </AppLayout>
  );
}
