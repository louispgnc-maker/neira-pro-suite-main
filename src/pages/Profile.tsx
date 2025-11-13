import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Profile() {
  const { user, profile } = useAuth();
  const location = useLocation();
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const [cabinetName, setCabinetName] = useState<string | null>(null);
  const [loadingCabinet, setLoadingCabinet] = useState(true);

  const loadUserCabinet = useCallback(async () => {
    if (!user) return;
    setLoadingCabinet(true);
    try {
      const { data: cabinetsData, error } = await supabase.rpc('get_user_cabinets');
      if (error) throw error;
      const cabinets = Array.isArray(cabinetsData) ? (cabinetsData as unknown[]) : [];
      const filtered = cabinets.filter((c) => ((c as Record<string, unknown>)['role'] === role));
      if (filtered && filtered.length > 0) {
        const nom = (filtered[0] as Record<string, unknown>)['nom'];
        setCabinetName(typeof nom === 'string' && nom.trim() ? nom : null);
      } else {
        setCabinetName(null);
      }
    } catch (error) {
      console.error('Erreur chargement cabinet:', error);
      setCabinetName(null);
    } finally {
      setLoadingCabinet(false);
    }
  }, [user, role]);

  useEffect(() => {
    loadUserCabinet();
  }, [loadUserCabinet]);

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Mon profil</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Nom</div>
              <div className="font-medium">{profile?.last_name || '—'}</div>
            </div>
            
            <div>
              <div className="text-sm text-muted-foreground">Prénom</div>
              <div className="font-medium">{profile?.first_name || '—'}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="font-medium">{user?.email || '—'}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Espace</div>
              <Badge variant="outline" className={role === 'notaire' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                {role}
              </Badge>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Cabinet</div>
              {loadingCabinet ? (
                <div className="font-medium text-muted-foreground">Chargement...</div>
              ) : cabinetName ? (
                <div className="font-medium">{cabinetName}</div>
              ) : (
                <div className="font-medium text-muted-foreground">Aucun cabinet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
