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

export default function Dashboard() {
  const { profile } = useAuth();
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
            value="12"
            icon={FileText}
            trend={{ value: "8%", positive: true }}
          />
          <StatCard
            title="Signatures en attente"
            value="5"
            icon={PenTool}
            trend={{ value: "3%", positive: false }}
          />
          <StatCard
            title="Clients à relancer"
            value="3"
            icon={Users}
          />
          <StatCard
            title="Tâches du jour"
            value="7"
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
