import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Key, ArrowRight } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';

export default function ClientLogin() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessCode || accessCode.length !== 6) {
      toast.error('Veuillez entrer un code d\'accès à 6 chiffres');
      return;
    }

    if (!password) {
      toast.error('Veuillez entrer votre mot de passe');
      return;
    }

    setLoading(true);
    try {
      // Vérifier si le code d'accès existe et récupérer l'email
      const { data: invitation, error: invitationError } = await supabase
        .from('client_invitations')
        .select('email, status')
        .eq('access_code', accessCode)
        .eq('status', 'active')
        .single();

      if (invitationError || !invitation) {
        toast.error('Code d\'accès invalide ou compte non activé');
        setLoading(false);
        return;
      }

      // Se connecter avec l'email et le mot de passe
      const { data, error } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: password,
      });

      if (error) {
        console.error('Login error:', error);
        toast.error('Email ou mot de passe incorrect');
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

  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 pt-20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Key className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-gray-900">Connexion espace client</CardTitle>
          <CardDescription className="text-gray-600">
            Entrez votre code d'accès et votre mot de passe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessCode" className="text-gray-900">
                Code d'accès (6 chiffres)
              </Label>
              <Input
                id="accessCode"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
              />
              <p className="text-xs text-gray-500">
                Vous avez reçu ce code par email lors de votre invitation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-900">
                Mot de passe
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                required
                minLength={8}
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

            <div className="text-center pt-4">
              <p className="text-sm text-gray-600">
                Vous n'avez pas encore de compte ?{' '}
                <span className="text-gray-500">Contactez votre professionnel</span>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
