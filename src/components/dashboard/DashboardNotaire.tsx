import { FileText, PenTool, Users, FolderPlus, Crown, UserPlus, FileUp, Share2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { GlobalStatusBar } from "@/components/dashboard/GlobalStatusBar";
import { AllTasksCard } from "@/components/dashboard/AllTasksCard";
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
      // Appliquer l'achat de signatures depuis sessionStorage
      const applySignaturePurchase = async () => {
        const pendingPurchase = sessionStorage.getItem('pending_signature_purchase');
        if (!pendingPurchase) {
          toast.success('Paiement réussi !', {
            description: 'Vos crédits de signatures ont été ajoutés.'
          });
          searchParams.delete('signature_payment');
          setSearchParams(searchParams);
          setTimeout(() => window.location.reload(), 1500);
          return;
        }

        try {
          const { cabinetId, targetUserId, quantity, price, expiresAt, timestamp } = JSON.parse(pendingPurchase);
          
          // Vérifier que l'achat n'a pas plus de 1 heure
          if (Date.now() - timestamp > 3600000) {
            console.warn('Achat expiré');
            sessionStorage.removeItem('pending_signature_purchase');
            return;
          }

          console.log('Application achat signatures:', { targetUserId, quantity });

          // Créditer les signatures directement
          const { error: updateError } = await supabase
            .from('cabinet_members')
            .update({
              signature_addon_quantity: quantity,
              signature_addon_price: price,
              signature_addon_purchased_at: new Date().toISOString(),
              signature_addon_expires_at: expiresAt
            })
            .eq('cabinet_id', cabinetId)
            .eq('user_id', targetUserId);

          if (updateError) {
            console.error('Erreur crédit signatures:', updateError);
            toast.error('Erreur lors du crédit des signatures');
          } else {
            console.log('✅ Signatures créditées:', quantity);
            toast.success('Paiement réussi !', {
              description: `${quantity} crédits de signatures ajoutés.`
            });
          }

          sessionStorage.removeItem('pending_signature_purchase');
        } catch (error) {
          console.error('Erreur application achat:', error);
          sessionStorage.removeItem('pending_signature_purchase');
        }
      };

      applySignaturePurchase();
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
        .from("dossiers")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire")
        .eq("status", "En attente de signature");

      // Clients à relancer
      const clientsQuery = supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire")
        .eq("kyc_status", "Partiel");

      // Tâches du jour
      const tasksQuery = supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire")
        .eq("done", false)
        .gte("due_at", `${dateStr}T00:00:00`)
        .lte("due_at", `${dateStr}T23:59:59`);

      // Dossiers actifs
      const dossiersQuery = supabase
        .from("dossiers")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("role", "notaire");

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
      <div className="w-full min-h-screen">
        <div className="p-8 space-y-8 max-w-[1400px] mx-auto">
        
        {/* 1️⃣ En-tête */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Bienvenue sur votre espace{profile?.first_name ? `, ${profile.first_name}` : ''}
              </h1>
              <p className="text-gray-600 mt-1">Aperçu de votre activité notariale</p>
            </div>
            <button
              onClick={() => navigate('/notaires/subscription')}
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

          {/* Barre de recherche globale */}
          <div className="flex justify-center">
            <div className="w-full max-w-2xl">
              <GlobalSearch userRole="notaire" />
            </div>
          </div>
        </div>

        {/* 2️⃣ KPI principaux - 4 cards maximum */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="À faire aujourd'hui"
            value={todayTasks}
            icon={FileText}
            iconColor="text-orange-600"
            iconBgColor="bg-orange-100"
            onClick={() => navigate('/notaires/tasks')}
          />
          <StatCard
            title="Signatures en attente"
            value={pendingSigCount}
            icon={PenTool}
            iconColor="text-orange-600"
            iconBgColor="bg-orange-100"
            onClick={() => navigate('/notaires/dossiers')}
          />
          <StatCard
            title="Dossiers actifs"
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
        </div>

        {/* 3️⃣ Bloc central - État global des dossiers */}
        <GlobalStatusBar role="notaire" />

        {/* 4️⃣ Bloc secondaire - Toutes les tâches */}
        <AllTasksCard role="notaire" />

        {/* 5️⃣ Action principale */}
        <PrimaryAction role="notaire" />

        {/* 6️⃣ Actions rapides secondaires */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            onClick={() => navigate('/notaires/clients')}
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-orange-50 hover:border-orange-300 transition-colors"
          >
            <UserPlus className="h-6 w-6 text-gray-700" />
            <span className="text-sm font-medium text-gray-900">Ajouter un client</span>
          </Button>
          <Button
            onClick={() => navigate('/notaires/documents')}
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-orange-50 hover:border-orange-300 transition-colors"
          >
            <FileUp className="h-6 w-6 text-gray-700" />
            <span className="text-sm font-medium text-gray-900">Importer un document</span>
          </Button>
          <Button
            onClick={() => navigate('/notaires/dossiers')}
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-orange-50 hover:border-orange-300 transition-colors"
          >
            <PenTool className="h-6 w-6 text-gray-700" />
            <span className="text-sm font-medium text-gray-900">Créer un acte</span>
          </Button>
          <Button
            onClick={() => navigate('/notaires/cabinet')}
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-orange-50 hover:border-orange-300 transition-colors"
          >
            <Share2 className="h-6 w-6 text-gray-700" />
            <span className="text-sm font-medium text-gray-900">Espace collaboratif</span>
          </Button>
        </div>

        {/* 7️⃣ Indicateur de confiance */}
        <TrustIndicator />

      </div>
      </div>
    </AppLayout>
  );
}
