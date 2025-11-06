import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { CreateCabinetDialog } from "@/components/cabinet/CreateCabinetDialog";
import { ManageCabinet } from "@/components/cabinet/ManageCabinet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

export default function Profile() {
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';
  const [inviteCode, setInviteCode] = useState("");
  const [joiningCabinet, setJoiningCabinet] = useState(false);
  const [hasCabinet, setHasCabinet] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const colorClass = role === 'notaire' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white';

  useEffect(() => {
    checkUserCabinet();
  }, [user, role, refreshKey]);

  const checkUserCabinet = async () => {
    if (!user) return;
    try {
      // Utiliser la fonction RPC pour bypass les policies RLS
      const { data: cabinets, error } = await supabase
        .rpc('get_user_cabinets')
        .eq('role', role);

      if (error) throw error;
      
      // Vérifier si l'utilisateur est propriétaire d'un cabinet
      const ownedCabinet = cabinets?.find((c: any) => c.owner_id === user.id);
      setHasCabinet(!!ownedCabinet);
    } catch (error) {
      console.error('Erreur vérification cabinet:', error);
    }
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
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Erreur rejoindre cabinet:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Code invalide ou cabinet non trouvé',
        variant: 'destructive',
      });
    } finally {
      setJoiningCabinet(false);
    }
  };

  const handleCabinetCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Mon profil</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground">Email</div>
            <div className="font-medium">{user?.email || '—'}</div>
            <div className="text-sm text-muted-foreground mt-4">Espace</div>
            <Badge variant="outline" className={role === 'notaire' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
              {role}
            </Badge>
          </CardContent>
          <CardFooter className="pt-2 flex-col items-start gap-4">
            <div id="cabinet" className="w-full space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">Rejoindre un cabinet</div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Code d'invitation cabinet"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinCabinet()}
                  />
                  <Button 
                    className={colorClass} 
                    disabled={!inviteCode.trim() || joiningCabinet} 
                    onClick={handleJoinCabinet}
                  >
                    {joiningCabinet ? 'Vérification...' : 'Rejoindre'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Saisissez le code d'invitation fourni par votre cabinet pour relier votre compte.
                </p>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm font-medium mb-2">Créer un cabinet</div>
                <CreateCabinetDialog role={role} onSuccess={handleCabinetCreated} />
                <p className="text-xs text-muted-foreground mt-2">
                  Créez votre propre cabinet et invitez vos collaborateurs.
                </p>
              </div>
            </div>
          </CardFooter>
        </Card>

        {hasCabinet && user && (
          <ManageCabinet role={role} userId={user.id} key={refreshKey} />
        )}
      </div>
    </AppLayout>
  );
}
