import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export default function JoinCabinetPublic() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'code' | 'account'>('code');
  const [cabinetInfo, setCabinetInfo] = useState<{ id: string; nom: string; role: string } | null>(null);

  const handleCheckCode = async () => {
    if (!accessCode.trim() || !email.trim()) {
      toast.error('Code d\'accès et email requis');
      return;
    }

    setLoading(true);
    try {
      // Utiliser la fonction RPC publique
      const { data, error } = await supabase.rpc('verify_access_code', {
        code_param: accessCode.trim(),
        email_param: email.trim()
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; cabinet?: any; invitation?: any };

      if (!result.success) {
        toast.error(result.error || 'Erreur de vérification');
        return;
      }

      // Code valide et invitation trouvée
      setCabinetInfo({
        id: result.cabinet.id,
        nom: result.cabinet.nom,
        role: result.cabinet.role
      });
      
      const fullName = result.invitation.nom || '';
      setFirstName(fullName.split(' ')[0] || '');
      setLastName(fullName.split(' ').slice(1).join(' ') || '');
      setStep('account');
      toast.success(`Invitation trouvée pour le cabinet "${result.cabinet.nom}"`);
    } catch (error) {
      console.error('Erreur vérification code:', error);
      toast.error('Erreur lors de la vérification');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!password || !firstName.trim() || !lastName.trim() || !cabinetInfo) {
      toast.error('Tous les champs sont requis');
      return;
    }

    setLoading(true);
    try {
      let userId: string;
      let isNewAccount = false;

      // Vérifier si l'utilisateur existe déjà en essayant de créer le compte
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            role: cabinetInfo.role,
          }
        }
      });

      if (authError && authError.message.includes('already registered')) {
        // L'utilisateur existe déjà, se connecter
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password
        });

        if (signInError) {
          throw new Error('Email déjà utilisé. Vérifiez votre mot de passe.');
        }

        userId = signInData.user.id;
      } else if (authError) {
        throw authError;
      } else {
        // Nouveau compte créé
        if (!authData.user) throw new Error('Compte non créé');
        userId = authData.user.id;
        isNewAccount = true;
      }

      // Si c'est un nouveau compte, attendre que le trigger crée le profil
      if (isNewAccount) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Vérifier si un membre pending existe déjà
      const { data: existingMember } = await supabase
        .from('cabinet_members')
        .select('id, status')
        .eq('cabinet_id', cabinetInfo.id)
        .eq('email', email.trim().toLowerCase())
        .single();

      if (existingMember?.status === 'pending') {
        // Mettre à jour le membre existant de pending à active
        const { error: updateError } = await supabase
          .from('cabinet_members')
          .update({
            user_id: userId,
            status: 'active',
            nom: `${firstName.trim()} ${lastName.trim()}`,
            joined_at: new Date().toISOString()
          })
          .eq('id', existingMember.id);

        if (updateError) {
          console.error('Erreur mise à jour membre:', updateError);
          throw updateError;
        }
      } else {
        // Créer un nouveau membre directement actif
        const { error: insertError } = await supabase
          .from('cabinet_members')
          .insert({
            cabinet_id: cabinetInfo.id,
            user_id: userId,
            email: email.trim().toLowerCase(),
            nom: `${firstName.trim()} ${lastName.trim()}`,
            status: 'active',
            joined_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Erreur création membre:', insertError);
          throw insertError;
        }
      }

      // Vérifier que le membre est bien créé avant de continuer
      const { data: verifyMember } = await supabase
        .from('cabinet_members')
        .select('id')
        .eq('cabinet_id', cabinetInfo.id)
        .eq('user_id', userId,)
        .eq('status', 'active')
        .single();

      if (!verifyMember) {
        throw new Error('Le membre n\'a pas pu être créé dans le cabinet');
      }

      // Attendre que la session soit complètement établie
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Vérifier que la session est bien active avec le bon utilisateur
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== userId) {
        throw new Error('Session non établie correctement');
      }

      // Vérifier que get_user_cabinets retourne bien le cabinet avant de rediriger
      let cabinetFound = false;
      for (let i = 0; i < 10; i++) {
        const { data: userCabinets, error: cabinetsError } = await supabase.rpc('get_user_cabinets');
        
        console.log(`[JoinCabinet] Tentative ${i + 1}/10:`, {
          cabinets: userCabinets,
          error: cabinetsError,
          sessionUserId: session.user.id,
          expectedUserId: userId
        });

        if (userCabinets && userCabinets.length > 0) {
          const matchingCabinet = userCabinets.find((c: any) => c.id === cabinetInfo.id);
          if (matchingCabinet) {
            cabinetFound = true;
            console.log('[JoinCabinet] Cabinet trouvé:', matchingCabinet);
            break;
          }
        }
        // Attendre un peu avant de réessayer
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!cabinetFound) {
        console.error('[JoinCabinet] Cabinet non trouvé après 10 tentatives');
        throw new Error('Le cabinet n\'apparaît pas dans vos cabinets. Réessayez de vous connecter.');
      }

      toast.success('Vous avez rejoint le cabinet !', {
        description: `Bienvenue dans "${cabinetInfo.nom}"`
      });

      // Attendre un peu pour que le toast s'affiche
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Rediriger vers le dashboard selon le rôle avec rechargement complet
      const dashboardUrl = cabinetInfo.role === 'notaire' 
        ? 'https://www.neira.fr/notaires/dashboard' 
        : 'https://www.neira.fr/avocats/dashboard';
      
      // Utiliser window.location.replace pour un rechargement complet
      window.location.replace(dashboardUrl);
    } catch (error: any) {
      console.error('Erreur création compte:', error);
      toast.error('Erreur', {
        description: error.message || 'Impossible de créer le compte'
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
            {step === 'code' 
              ? 'Entrez le code d\'accès qui vous a été communiqué'
              : `Créez votre compte pour rejoindre "${cabinetInfo?.nom}"`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'code' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="accessCode">Code d'accès du cabinet</Label>
                <Input
                  id="accessCode"
                  placeholder="D87714..."
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Votre adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
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
                onClick={handleCheckCode}
                disabled={loading || !accessCode.trim() || !email.trim()}
              >
                {loading ? 'Vérification...' : 'Vérifier le code'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                <Button
                  variant="link"
                  onClick={() => navigate('/')}
                  className="text-xs"
                >
                  Retour à l'accueil
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  placeholder="Jean"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  placeholder="Dupont"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-sm text-green-800">
                  ✓ Invitation validée pour "{cabinetInfo?.nom}"<br />
                  ✓ Pas d'abonnement requis
                </AlertDescription>
              </Alert>
              <Button
                className="w-full"
                onClick={handleCreateAccount}
                disabled={loading || !password || !firstName.trim() || !lastName.trim()}
              >
                {loading ? 'Création...' : 'Créer mon compte'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStep('code')}
                disabled={loading}
              >
                Retour
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
