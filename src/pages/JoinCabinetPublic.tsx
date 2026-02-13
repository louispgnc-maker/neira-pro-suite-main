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
      // Créer le compte Supabase Auth
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

      if (authError) throw authError;
      if (!authData.user) throw new Error('Compte non créé');

      // Attendre un peu que le trigger de création de profil s'exécute
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mettre à jour le membre cabinet de pending à active
      const { error: updateError } = await supabase
        .from('cabinet_members')
        .update({
          user_id: authData.user.id,
          status: 'active',
          joined_at: new Date().toISOString()
        })
        .eq('cabinet_id', cabinetInfo.id)
        .eq('email', email.trim().toLowerCase())
        .eq('status', 'pending');

      if (updateError) {
        console.error('Erreur mise à jour membre:', updateError);
      }

      toast.success('Compte créé avec succès !', {
        description: `Vous avez rejoint le cabinet "${cabinetInfo.nom}"`
      });

      // Rediriger vers le dashboard selon le rôle
      const dashboardPath = cabinetInfo.role === 'notaire' ? '/notaires/dashboard' : '/avocats/dashboard';
      navigate(dashboardPath, { replace: true });
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
