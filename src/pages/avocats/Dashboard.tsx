import { DashboardAvocat } from "@/components/dashboard/DashboardAvocat";
import { useTrialGuard } from "@/hooks/useTrialGuard";

export default function AvocatDashboardPage() {
  const { isChecking } = useTrialGuard();
  
  if (isChecking) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }
  
  return <DashboardAvocat />;
}
