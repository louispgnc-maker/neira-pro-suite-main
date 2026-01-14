import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Key, ArrowRight, Lock, CheckCircle2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';

interface ClientInvitation {
  id: string;
  email: string;
  status: 'pending' | 'active';
  client_id: string;
}

export default function ClientLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'code' | 'password' | 'create-password'>('code');
  const [accessCode, setAccessCode] = useState('');
  const [invitation, setInvitation] = useState<ClientInvitation | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fonction pour générer un mot de passe sécurisé
  const generateSecurePassword = () => {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    let password = '';
    
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%&*'[Math.floor(Math.random() * 7)];
    
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword();
    setPassword(newPassword);
    setConfirmPassword(newPassword);
    setShowPassword(true);
    setShowConfirmPassword(true);
    toast.success('Mot de passe sécurisé généré !', {
      description: 'Vous pouvez le copier ou le modifier selon vos préférences'
    });
  };

  useEffect(() => {
    if (step === 'create-password' && !password) {
      handleGeneratePassword();
    }
  }, [step]);

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessCode || accessCode.length !== 6) {
      toast.error('Veuillez entrer un code d\'accès à 6 caractères');
      return;
    }

    setLoading(true);
    try {
      // Vérifier si le code d'accès existe
      const { data: invitationData, error: invitationError } = await supabase
        .from('client_invitations')
        .select('id, email, status, client_id')
        .eq('access_code', accessCode.toUpperCase())
        .single();

      if (invitationError || !invitationData) {
        toast.error('Code d\'accès invalide');
        setLoading(false);
        return;
      }

      setInvitation(invitationData as ClientInvitation);

      // Si status = 'pending', c'est la première connexion
      if (invitationData.status === 'pending') {
        setStep('create-password');
      } else {
        // Si status = 'active', demander le mot de passe
        setStep('password');
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error verifying access code:', err);
      toast.error('Une erreur est survenue');
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      toast.error('Veuillez entrer votre mot de passe');
      return;
    }

    if (!invitation) return;

    setLoading(true);
    try {
      // Se connecter avec l'email et le mot de passe
      const { data, error } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: password,
      });

      if (error) {
        console.error('Login error:', error);
        toast.error('Mot de passe incorrect');
        setLoading(false);
        return;
      }

      toast.success('Connexion réussie !');
      navigate('/client-space');
    } catch (err: any) {
      console.error('Error during login:', err);
      toast.error('Une erreur est survenue lors de la connexion');
      setLoading(false);
    }
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (!invitation) return;

    setLoading(true);

    try {
      // 1. Créer le compte utilisateur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
        options: {
          data: {
            role: 'client',
            client_id: invitation.client_id,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      // 2. Mettre à jour le statut de l'invitation à 'active'
      const { error: invitationError } = await supabase
        .from('client_invitations')
        .update({ status: 'active' })
        .eq('id', invitation.id);

      if (invitationError) throw invitationError;

      // 3. Lier le client à l'utilisateur
      const { error: clientError } = await supabase
        .from('clients')
        .update({ user_id: authData.user.id })
        .eq('id', invitation.client_id);

      if (clientError) throw clientError;

      toast.success('Compte créé avec succès ! Vous allez être redirigé...');

      // 4. Rediriger vers l'espace client
      setTimeout(() => {
        navigate('/client-space');
      }, 1500);
    } catch (err: any) {
      console.error('Error creating account:', err);
      toast.error(err.message || 'Erreur lors de la création du compte');
      setLoading(false);
    }
  };

  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 pt-20">
        <Card className="w-full max-w-md">
          {/* Étape 1: Saisie du code d'accès */}
          {step === 'code' && (
            <>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <Key className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-gray-900">Espace client</CardTitle>
                <CardDescription className="text-gray-600">
                  Entrez votre code d'accès à 6 caractères
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accessCode" className="text-gray-900">
                      Code d'accès
                    </Label>
                    <Input
                      id="accessCode"
                      type="text"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                      placeholder="ABC123"
                      required
                      maxLength={6}
                      className="text-center text-2xl tracking-widest font-mono"
                      autoFocus
                    />
                    <p className="text-xs text-gray-500">
                      Vous avez reçu ce code par email lors de votre invitation
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={loading || accessCode.length !== 6}
                  >
                    {loading ? 'Vérification...' : 'Continuer'}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>

                  <div className="text-center pt-4">
                    <p className="text-sm text-gray-600">
                      Vous n'avez pas reçu de code ?{' '}
                      <span className="text-gray-500">Contactez votre professionnel</span>
                    </p>
                  </div>
                </form>
              </CardContent>
            </>
          )}

          {/* Étape 2: Connexion avec mot de passe (compte actif) */}
          {step === 'password' && invitation && (
            <>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <Lock className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-gray-900">Connexion</CardTitle>
                <CardDescription className="text-gray-600">
                  Entrez votre mot de passe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-600">Code d'accès vérifié</p>
                    <p className="text-xs text-gray-500 mt-1">{invitation.email}</p>
                  </div>

                  <input
                    type="email"
                    name="username"
                    value={invitation.email}
                    autoComplete="username"
                    style={{ display: 'none' }}
                    readOnly
                  />

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-900">
                      Mot de passe
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Votre mot de passe"
                      required
                      minLength={8}
                      autoComplete="current-password"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setStep('code');
                        setPassword('');
                        setInvitation(null);
                      }}
                      className="w-1/3"
                    >
                      Retour
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={loading}
                    >
                      {loading ? 'Connexion...' : 'Se connecter'}
                      {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          )}

          {/* Étape 3: Création du mot de passe (première connexion) */}
          {step === 'create-password' && invitation && (
            <>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-gray-900">Bienvenue !</CardTitle>
                <CardDescription className="text-gray-600">
                  Créez votre mot de passe pour accéder à votre espace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-900">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      name="username"
                      value={invitation.email}
                      autoComplete="username"
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="newPassword" className="text-gray-900">
                        Créer un mot de passe
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleGeneratePassword}
                        className="text-blue-600 hover:text-blue-700 h-auto p-1"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Suggérer
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        name="new-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 caractères"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    {password && password.length >= 8 && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Longueur suffisante
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-gray-900">
                      Confirmer le mot de passe
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Retapez votre mot de passe"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-600">Les mots de passe ne correspondent pas</p>
                    )}
                    {confirmPassword && password === confirmPassword && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Les mots de passe correspondent
                      </p>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold text-gray-900 text-sm">Votre espace client vous permet de :</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>✓ Consulter vos documents en temps réel</li>
                      <li>✓ Suivre l'avancement de vos dossiers</li>
                      <li>✓ Échanger de manière sécurisée</li>
                      <li>✓ Accéder à vos informations 24h/24</li>
                    </ul>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={loading}
                  >
                    {loading ? 'Création du compte...' : 'Créer mon compte'}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
