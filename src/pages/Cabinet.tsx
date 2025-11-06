import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { ManageCabinet } from "@/components/cabinet/ManageCabinet";

export default function Cabinet() {
  const { user } = useAuth();
  const location = useLocation();
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Mon cabinet</h1>
        {user && <ManageCabinet role={role} userId={user.id} />}
      </div>
    </AppLayout>
  );
}
