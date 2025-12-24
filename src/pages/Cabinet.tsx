import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { ManageCabinet } from "@/components/cabinet/ManageCabinet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserCabinet } from "@/hooks/useUserCabinet";
import { Plus, LogIn } from "lucide-react";

export default function Cabinet() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cabinetIdFromUrl = searchParams.get('id') || undefined;
  
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const [refreshKey, setRefreshKey] = useState(0);
  const [localRefresh, setLocalRefresh] = useState(0);
  const { hasCabinet, cabinet, loading } = useUserCabinet(user?.id, role, localRefresh);
  const colorClass = role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white';

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-5xl mx-auto">
          <p className="text-center text-foreground">Chargement...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {hasCabinet ? (
          // L'utilisateur a un cabinet - Afficher ManageCabinet
          <>
            <h1 className="text-3xl font-bold">Mon cabinet</h1>
            {user && <ManageCabinet key={refreshKey} role={role} userId={user.id} cabinetId={cabinetIdFromUrl || cabinet?.id} />}
          </>
        ) : (
          // L'utilisateur n'a pas de cabinet - Proposer création ou join
          <>
            <h1 className="text-3xl font-bold">Gestion de cabinet</h1>
            
            <div className="grid gap-4 md:grid-cols-2">
              {/* Créer un cabinet */}
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Créer un cabinet
                  </CardTitle>
                  <CardDescription>
                    Créez votre propre cabinet et invitez vos collaborateurs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className={`w-full ${colorClass}`}
                    onClick={() => navigate(`/${role}s/create-cabinet`)}
                  >
                    Créer mon cabinet
                  </Button>
                </CardContent>
              </Card>
              
              {/* Rejoindre un cabinet */}
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LogIn className="h-5 w-5" />
                    Rejoindre un cabinet
                  </CardTitle>
                  <CardDescription>
                    Rejoignez un cabinet existant avec un code d'invitation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className={`w-full ${colorClass}`}
                    onClick={() => navigate(`/${role}s/join-cabinet`)}
                  >
                    Rejoindre un cabinet
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
