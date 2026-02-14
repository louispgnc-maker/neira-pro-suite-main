import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export default function JoinCabinetWithCode() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    // Vérifier que l'utilisateur est bien connecté
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vous devez être connecté');
        navigate('/');
        return;
      }
      setUserEmail(session.user.email || '');
      setUserId(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const handleJoinCabinet = async () => {
    if (!accessCode.trim()) {
      toast.error('Code d\'accès requis');
      return;
    }

    setLoading(true);
    try {
      // Vérifier le code d'accès
      const { data, error } = await supabase.rpc('verify_access_code', {
        code_param: accessCode.trim(),
        email_param: userEmail
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; cabinet?: any; invitation?: any };

      if (!result.success) {
        toast.error(result.error || 'Code d\'accès invalide');
        return;
      }

      const cabinetInfo = result.cabinet;
      const invitation = result.invitation;

      // Vérifier si un membre pending existe déjà
      const { data: existingMember } = await supabase
        .from('cabinet_members')
        .select('id, status, nom')
        .eq('cabinet_id', cabinetInfo.id)
        .eq('email', userEmail)
        .single();

      if (existingMember?.status === 'pending') {
        // Mettre à jour le membre existant de pending à active
        const { error: updateError } = await supabase
          .from('cabinet_members')
          .update({
            user_id: userId,
            status: 'active',
            joined_at: new Date().toISOString()
          })
          .eq('id', existingMember.id);

        if (updateError) {
          console.error('Erreur mise à jour membre:', updateError);
          throw updateError;
        }
      } else {
        // Créer un nouveau membre directement actif
        const nom = invitation?.nom || '';
        const { error: insertError } = await supabase
          .from('cabinet_members')
          .insert({
            cabinet_id: cabinetInfo.id,
            user_id: userId,
            email: userEmail,
            nom: nom,
            status: 'active',
            joined_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Erreur création membre:', insertError);
          throw insertError;
        }
      }

      // Vérifier que le membre est bien créé
      const { data: verifyMember } = await supabase
        .from('cabinet_members')
        .select('id')
        .eq('cabinet_id', cabinetInfo.id)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!verifyMember) {
        throw new Error('Le membre n\'a pas pu être créé dans le cabinet');
      }

      // Attendre que la base de données se synchronise
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Vérifier que get_user_cabinets retourne bien le cabinet
      let cabinetFound = false;
      for (let i = 0; i < 10; i++) {
        const { data: userCabinets, error: cabinetsError } = await supabase.rpc('get_user_cabinets');
        
        if (userCabinets && userCabinets.length > 0) {
          const matchingCabinet = userCabinets.find((c: any) => c.id === cabinetInfo.id);
          if (matchingCabinet) {
            cabinetFound = true;
            break;
          }
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!cabinetFound) {
        throw new Error('Le cabinet n\'apparaît pas dans vos cabinets. Réessayez de vous connecter.');
      }

      toast.success('Vous avez rejoint le cabinet !', {
        description: `Bienvenue dans "${cabinetInfo.nom}"`
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Rediriger vers le dashboard selon le rôle
      const dashboardUrl = cabinetInfo.role === 'notaire' 
        ? '/notaires/dashboard' 
        : '/avocats/dashboard';
      
      window.location.replace(dashboardUrl);
    } catch (error: any) {
      console.error('Erreur rejoindre cabinet:', error);
      toast.error('Erreur', {
        description: error.message || 'Impossible de rejoindre le cabinet'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Rejoindre un cabinet</CardTitle>
          <CardDescription>
            Entrez le code d'accès qui vous a été communiqué
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Votre email</Label>
            <Input
              id="email"
              type="email"
              value={userEmail}
              disabled
              className="bg-gray-50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessCode">Code d'accès du cabinet</Label>
            <Input
              id="accessCode"
              placeholder="D87714..."
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              disabled={loading}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinCabinet()}
            />
          </div>
          <Alert>
            <AlertDescription className="text-sm">
              Ce code vous a été communiqué par le responsable de votre cabinet.
              Votre abonnement est pris en charge par le cabinet.
            </AlertDescription>
          </Alert>
          <Button
            className="w-full"
            onClick={handleJoinCabinet}
            disabled={loading || !accessCode.trim()}
          >
            {loading ? 'Vérification...' : 'Rejoindre le cabinet'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            <Button
              variant="link"
              onClick={() => navigate('/no-cabinet-options')}
              className="text-xs"
            >
              Retour
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
