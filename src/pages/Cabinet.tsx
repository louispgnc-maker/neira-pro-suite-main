import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { ManageCabinet } from "@/components/cabinet/ManageCabinet";
import { CreateCabinetDialog } from "@/components/cabinet/CreateCabinetDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

export default function Cabinet() {
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const [inviteCode, setInviteCode] = useState("");
  const [joiningCabinet, setJoiningCabinet] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const colorClass = role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white';

  const refreshCabinet = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Scroll automatique vers la section ciblée par l'ancre dans l'URL
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight temporaire de la section
          element.style.backgroundColor = role === 'notaire' ? '#fed7aa' : '#dbeafe';
          setTimeout(() => {
            element.style.backgroundColor = '';
          }, 2000);
        }
      }, 100);
    }
  }, [location.hash, role]);

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

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Mon cabinet</h1>

        {/* Sections Rejoindre et Créer un cabinet */}
        <Card>
          <CardHeader>
            <CardTitle>Gestion de cabinet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div id="join">
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
              <p className="text-xs text-foreground mt-2">
                Saisissez le code d'invitation fourni par votre cabinet pour relier votre compte.
              </p>
            </div>

            <div id="create" className="border-t pt-4">
              <div className="text-sm font-medium mb-2">Créer un cabinet</div>
              <CreateCabinetDialog role={role} onSuccess={refreshCabinet} />
              <p className="text-xs text-foreground mt-2">
                Créez votre propre cabinet et invitez vos collaborateurs.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Composant ManageCabinet */}
        {user && <ManageCabinet key={refreshKey} role={role} userId={user.id} />}
      </div>
    </AppLayout>
  );
}
