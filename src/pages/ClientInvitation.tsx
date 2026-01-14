import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle, Lock, Mail, User } from 'lucide-react';

interface ClientInvitation {
  id: string;
  client_id: string;
  email: string;
  token: string;
  expires_at: string;
  status: string;
  client?: {
    name: string;
    cabinet_id: string;
  };
}

export default function ClientInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<ClientInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token d\'invitation invalide');
      setLoading(false);
      return;
    }

    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('client_invitations')
        .select(`
          *,
          client:clients (
            name,
            cabinet_id
          )
        `)
        .eq('token', token)
        .single();

      if (error) throw error;

      if (!data) {
        setError('Invitation non trouvée');
        setLoading(false);
        return;
      }

      // Check if invitation has expired
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        setError('Cette invitation a expiré. Veuillez demander une nouvelle invitation à votre professionnel.');
        setLoading(false);
        return;
      }

      // Check if invitation is already active
      if (data.status === 'active') {
        setError('Cette invitation a déjà été utilisée.');
        setLoading(false);
        return;
      }

      setInvitation(data as ClientInvitation);
      setLoading(false);
    } catch (err) {
      console.error('Error loading invitation:', err);
      setError('Erreur lors du chargement de l\'invitation');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    setSubmitting(true);

    try {
      // 1. Create user account
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

      // 2. Update user metadata with client_id
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          role: 'client',
          client_id: invitation.client_id,
        },
      });

      if (updateError) throw updateError;

      // 3. Update invitation status to active
      const { error: invitationError } = await supabase
        .from('client_invitations')
        .update({ status: 'active' })
        .eq('id', invitation.id);

      if (invitationError) throw invitationError;

      // 4. Update client record with user_id
      const { error: clientError } = await supabase
        .from('clients')
        .update({ user_id: authData.user.id })
        .eq('id', invitation.client_id);

      if (clientError) throw clientError;

      toast.success('Compte créé avec succès ! Vous allez être redirigé vers votre espace client...');

      // 5. Redirect to client space after 2 seconds
      setTimeout(() => {
        navigate('/client-space');
      }, 2000);
    } catch (err: any) {
      console.error('Error creating account:', err);
      toast.error(err.message || 'Erreur lors de la création du compte');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-gray-900">Invitation invalide</CardTitle>
            <CardDescription className="text-gray-600">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-gray-900">Bienvenue sur votre espace client</CardTitle>
          <CardDescription className="text-gray-600">
            Créez votre compte pour accéder à vos documents et dossiers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-900">
                <User className="inline h-4 w-4 mr-2" />
                Nom
              </Label>
              <Input
                id="name"
                type="text"
                value={invitation?.client?.name || ''}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-900">
                <Mail className="inline h-4 w-4 mr-2" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={invitation?.email || ''}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-900">
                <Lock className="inline h-4 w-4 mr-2" />
                Mot de passe
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Au moins 8 caractères"
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-900">
                <Lock className="inline h-4 w-4 mr-2" />
                Confirmer le mot de passe
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez votre mot de passe"
                required
                minLength={8}
              />
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
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={submitting}
            >
              {submitting ? 'Création en cours...' : 'Créer mon compte'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
