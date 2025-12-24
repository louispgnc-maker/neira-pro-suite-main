import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import { ManageCabinet } from "@/components/cabinet/ManageCabinet";
import { CreateCabinetDialog } from "@/components/cabinet/CreateCabinetDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateCabinet() {
  const { user } = useAuth();
  const location = useLocation();
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const [refreshKey, setRefreshKey] = useState(0);

  const refreshCabinet = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Créer un cabinet</h1>

        {/* Section Créer un cabinet */}
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
              <p className="text-xs text-foreground mt-2">
                Une fois créé, vous pourrez partager le code d'invitation avec vos collaborateurs.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Affichage du cabinet si l'utilisateur en a un */}
        {user && <ManageCabinet key={refreshKey} role={role} userId={user.id} />}
      </div>
    </AppLayout>
  );
}
