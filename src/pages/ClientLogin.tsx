import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowRight, Lock, CheckCircle2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';

export default function ClientLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [accessCode, setAccessCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    toast.success('Mot de passe sécurisé généré !');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error('Email ou mot de passe incorrect');
        setLoading(false);
        return;
      }

      toast.success('Connexion réussie !');
      navigate('/client-space');
    } catch (err: any) {
      toast.error('Une erreur est survenue');
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessCode || accessCode.length !== 6) {
      toast.error('Code d\'accès invalide (6 caractères requis)');
      return;
    }

    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      // 1. Vérifier le code d'accès
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

      if (invitationData.email.toLowerCase() !== email.toLowerCase()) {
        toast.error('L\'email ne correspond pas au code d\'accès');
        setLoading(false);
        return;
      }

      if (invitationData.status !== 'pending') {
        toast.error('Ce code a déjà été utilisé');
        setLoading(false);
        return;
      }

      // 2. Créer le compte
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitationData.email,
        password,
        options: {
          data: {
            role: 'client',
            client_id: invitationData.client_id,
          },
        },
      });

      if (authError) {
        // Vérifier si c'est une erreur de compte déjà existant
        if (authError.message?.includes('already registered') || authError.message?.includes('User already registered')) {
          toast.error('Ce compte existe déjà. Veuillez vous connecter.', {
            description: 'Cliquez sur "Se connecter" pour accéder à votre espace'
          });
          setLoading(false);
          // Basculer automatiquement vers le mode connexion
          setTimeout(() => setMode('login'), 2000);
          return;
        }
        throw authError;
      }
      if (!authData.user) throw new Error('Erreur lors de la création du compte');

      // 3. Mettre à jour l'invitation
      await supabase
        .from('client_invitations')
        .update({ status: 'active' })
        .eq('id', invitationData.id);

      // 4. Lier le client à l'utilisateur
      await supabase
        .from('clients')
        .update({ user_id: authData.user.id })
        .eq('id', invitationData.client_id);

      toast.success('Compte créé avec succès !');
      setTimeout(() => navigate('/client-space'), 1500);
    } catch (err: any) {
      console.error('Error:', err);
      toast.error(err.message || 'Erreur lors de la création du compte');
      setLoading(false);
    }
  };

  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 pt-20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Lock className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-gray-900">Espace client</CardTitle>
            <CardDescription className="text-gray-600">
              {mode === 'login' ? 'Connectez-vous à votre espace' : 'Créez votre compte client'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Boutons de sélection */}
            <div className="flex gap-2 mb-6">
              <Button
                type="button"
                variant={mode === 'login' ? 'default' : 'outline'}
                onClick={() => setMode('login')}
                className={`flex-1 ${mode === 'login' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                Se connecter
              </Button>
              <Button
                type="button"
                variant={mode === 'signup' ? 'default' : 'outline'}
                onClick={() => setMode('signup')}
                className={`flex-1 ${mode === 'signup' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                Créer mon compte
              </Button>
            </div>

            {/* Formulaire de connexion */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>
            )}

            {/* Formulaire d'inscription */}
            {mode === 'signup' && (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code d'accès *</Label>
                  <Input
                    id="code"
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                    placeholder="ABC123"
                    maxLength={6}
                    className="text-center text-xl tracking-widest font-mono"
                    required
                  />
                  <p className="text-xs text-gray-500">Code reçu par email</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupEmail">Email *</Label>
                  <Input
                    id="signupEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="newPassword">Mot de passe *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGeneratePassword}
                      className="text-blue-600 h-auto p-1"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Suggérer
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 caractères"
                      minLength={8}
                      className="pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {password && password.length >= 8 && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Longueur suffisante
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Retapez le mot de passe"
                      minLength={8}
                      className="pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-600">Les mots de passe ne correspondent pas</p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Mots de passe identiques
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Votre espace client :</p>
                  <ul className="space-y-1 text-xs text-gray-600">
                    <li>✓ Consultez vos documents</li>
                    <li>✓ Suivez vos dossiers</li>
                    <li>✓ Échangez en sécurité</li>
                    <li>✓ Accès 24h/24</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={loading}
                >
                  {loading ? 'Création...' : 'Créer mon compte'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
