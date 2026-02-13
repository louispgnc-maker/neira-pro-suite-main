import { DashboardNotaire } from "@/components/dashboard/DashboardNotaire";
import { useTrialGuard } from "@/hooks/useTrialGuard";

export default function NotaireDashboardPage() {
  const { isChecking } = useTrialGuard();
  
  if (isChecking) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
    </div>;
  }
  
  return <DashboardNotaire />;
}
