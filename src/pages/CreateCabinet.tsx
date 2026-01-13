import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import { ManageCabinet } from "@/components/cabinet/ManageCabinet";
import { CreateCabinetDialog } from "@/components/cabinet/CreateCabinetDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserCabinet } from "@/hooks/useUserCabinet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";

export default function CreateCabinet() {
  const { user } = useAuth();
  const location = useLocation();
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const [refreshKey, setRefreshKey] = useState(0);
  const [localRefresh, setLocalRefresh] = useState(0);
  const { hasCabinet, cabinet, loading } = useUserCabinet(user?.id, role, localRefresh);

  const refreshCabinet = () => {
    setRefreshKey(prev => prev + 1);
    setLocalRefresh(prev => prev + 1);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-5xl mx-auto">
          <p className="text-center text-gray-900">Chargement...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {hasCabinet ? (
          // L'utilisateur a déjà un cabinet
          <>
            <div>
              <h1 className="text-3xl font-bold mb-2">Mon Cabinet</h1>
              <Alert className="mb-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Vous êtes déjà membre du cabinet <strong>{cabinet?.nom}</strong>
                </AlertDescription>
              </Alert>
            </div>
            {user && <ManageCabinet key={refreshKey} role={role} userId={user.id} />}
          </>
        ) : (
          // L'utilisateur n'a pas de cabinet
          <>
            <h1 className="text-3xl font-bold">Créer un cabinet</h1>
            <Card>
              <CardHeader>
                <CardTitle>Créer votre cabinet collaboratif</CardTitle>
                <CardDescription>
                  Créez votre propre cabinet et invitez vos collaborateurs à vous rejoindre
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <CreateCabinetDialog role={role} onSuccess={refreshCabinet} />
                  <p className="text-xs text-gray-900 mt-2">
                    Une fois créé, vous pourrez partager le code d'invitation avec vos collaborateurs.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
