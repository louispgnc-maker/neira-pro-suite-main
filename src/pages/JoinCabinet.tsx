import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import { ManageCabinet } from "@/components/cabinet/ManageCabinet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useUserCabinet } from "@/hooks/useUserCabinet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";

export default function JoinCabinet() {
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const [inviteCode, setInviteCode] = useState("");
  const [joiningCabinet, setJoiningCabinet] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { hasCabinet, cabinet, loading } = useUserCabinet(user?.id, role);
  const colorClass = role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white';

  const refreshCabinet = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleJoinCabinet = async () => {
    if (!inviteCode.trim()) return;
    setJoiningCabinet(true);

    try {
      const { data, error } = await supabase.rpc('join_cabinet_by_code', {
        code: inviteCode.trim(),
      });

      if (error) throw error;

      toast({
        title: 'Cabinet rejoint !',
        description: 'Vous avez rejoint le cabinet avec succès.',
      });

      setInviteCode('');
      refreshCabinet(); // Recharger le composant ManageCabinet
    } catch (error: unknown) {
      console.error('Erreur rejoindre cabinet:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Erreur',
        description: message || 'Code invalide ou cabinet non trouvé',
        variant: 'destructive',
      });
    } finally {
      setJoiningCabinet(false);
    }
  };

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
            <h1 className="text-3xl font-bold">Rejoindre un cabinet</h1>
            <Card>
              <CardHeader>
                <CardTitle>Rejoindre un cabinet collaboratif</CardTitle>
                <CardDescription>
                  Saisissez le code d'invitation fourni par votre cabinet pour rejoindre l'équipe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">Code d'invitation</div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Entrez le code d'invitation"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinCabinet()}
                      className="text-lg"
                    />
                    <Button 
                      className={colorClass} 
                      disabled={!inviteCode.trim() || joiningCabinet} 
                      onClick={handleJoinCabinet}
                      size="lg"
                    >
                      {joiningCabinet ? 'Vérification...' : 'Rejoindre'}
                    </Button>
                  </div>
                  <p className="text-xs text-foreground mt-2">
                    Le code d'invitation est fourni par le fondateur ou un associé du cabinet.
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
