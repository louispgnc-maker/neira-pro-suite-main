import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  created_at: string;
}

const EMAIL_PROVIDERS = [
  { 
    value: 'gmail', 
    label: 'Gmail', 
    icon: '📧', 
    color: 'bg-red-500',
    available: true 
  },
  { 
    value: 'outlook', 
    label: 'Outlook / Office 365', 
    icon: '📨', 
    color: 'bg-blue-500',
    available: true,
    description: 'Comptes @outlook.com, @hotmail.com ou Office 365 uniquement'
  },
  { 
    value: 'sfr', 
    label: 'SFR Mail', 
    icon: '📮', 
    color: 'bg-rose-500',
    available: false 
  },
  { 
    value: 'yahoo', 
    label: 'Yahoo Mail', 
    icon: '💌', 
    color: 'bg-purple-500',
    available: false 
  },
];

export default function EmailIntegration() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';

  useEffect(() => {
    loadAccounts();
  }, [user]);

  // Listen for OAuth callback messages from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'oauth-callback') {
        const { success, error, email } = event.data;

        if (success) {
          toast.success(`✅ Connexion réussie - ${email}`);
          // Reload accounts after a short delay to ensure database write completed
          setTimeout(() => {
            loadAccounts();
          }, 1000);
        } else if (error) {
          const messages: Record<string, string> = {
            missing_parameters: "Paramètres manquants",
            invalid_state: "État OAuth invalide",
            token_exchange_failed: "Échec de l'échange du code",
            profile_fetch_failed: "Impossible de récupérer le profil",
            database_error: "Erreur d'enregistrement",
            server_error: "Erreur serveur",
            access_denied: "Accès refusé",
          };
          toast.error(`❌ ${messages[error] || "Une erreur est survenue"}`);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user]); // Add user dependency

  // Remove old useEffect for searchParams (no longer needed)

  const loadAccounts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true); // Reset loading state
    try {
      console.log('[EmailIntegration] Loading accounts for user:', user.id);
      const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[EmailIntegration] Error loading accounts:', error);
        throw error;
      }
      
      console.log('[EmailIntegration] Accounts loaded:', data);
      setAccounts((data as EmailAccount[]) || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Erreur lors du chargement des comptes');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectProvider = async (provider: string) => {
    if (provider !== 'gmail' && provider !== 'outlook') {
      toast.info(`${EMAIL_PROVIDERS.find(p => p.value === provider)?.label} sera bientôt disponible`);
      return;
    }

    if (!user) {
      toast.error('Vous devez être connecté pour ajouter un compte email');
      return;
    }

    setConnectingProvider(provider);
    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.access_token) {
        throw new Error('Vous devez être connecté. Veuillez vous reconnecter.');
      }

      let authUrl;

      if (provider === 'gmail') {
        const response = await fetch(
          'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/gmail-operations',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjMzMTQsImV4cCI6MjA3NzczOTMxNH0.ItqpqcgP_FFqvmx-FunQv0RmCI9EATJlUWuYmw0zPvA'
            },
            body: JSON.stringify({ action: 'get-auth-url' })
          }
        );

        const responseText = await response.text();
        if (!response.ok) {
          throw new Error('Failed to get Gmail auth URL');
        }
        const data = JSON.parse(responseText);
        authUrl = data.authUrl;
      } else if (provider === 'outlook') {
        // Show informational message
        toast.info('⚠️ Outlook nécessite un compte @outlook.com, @hotmail.com ou Office 365', {
          duration: 5000,
        });
        
        // Generate Outlook OAuth URL
        const clientId = '5c2e5ad7-f18e-4b4c-ba53-1d96a5b8d1af'; // You'll need to register your app
        const redirectUri = encodeURIComponent('https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/outlook-oauth-callback');
        const state = btoa(JSON.stringify({ user_id: user.id, session_token: session.access_token }));
        const scope = encodeURIComponent('https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access');
        
        authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&response_mode=query`;
      }

      if (authUrl) {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        window.open(
          authUrl,
          `${provider === 'gmail' ? 'Gmail' : 'Outlook'} OAuth`,
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        toast.success(`Veuillez autoriser l'accès à votre ${provider === 'gmail' ? 'Gmail' : 'Outlook'}`);
      }
    } catch (error: any) {
      console.error('Error connecting provider:', error);
      toast.error(error.message || 'Erreur de connexion');
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Supprimer ce compte email ?')) return;

    try {
      const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      toast.success('Compte supprimé');
      loadAccounts();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Intégration Email</h1>
          <p className="text-gray-600 mt-1">Connectez vos comptes email professionnels</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Connecter un compte email
            </CardTitle>
            <CardDescription>
              Choisissez votre fournisseur d'email pour connecter votre boîte de réception
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {EMAIL_PROVIDERS.map((provider) => (
                <Card 
                  key={provider.value}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !provider.available ? 'opacity-60' : ''
                  }`}
                  onClick={() => handleConnectProvider(provider.value)}
                >
                  <CardContent className="p-6 flex flex-col items-center gap-3">
                    <div className={`w-16 h-16 ${provider.color} rounded-full flex items-center justify-center text-3xl`}>
                      {provider.icon}
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{provider.label}</p>
                      {provider.description && (
                        <p className="text-xs text-gray-600 mt-1">{provider.description}</p>
                      )}
                      {provider.available ? (
                        <Button
                          size="sm"
                          className="mt-2 w-full"
                          disabled={connectingProvider === provider.value}
                        >
                          {connectingProvider === provider.value ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Connexion...
                            </>
                          ) : (
                            'Connecter'
                          )}
                        </Button>
                      ) : (
                        <p className="text-xs text-gray-600 mt-2">Bientôt disponible</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-xl font-semibold mb-4">Comptes connectés</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : accounts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-600 mb-4" />
                <p className="text-gray-600">
                  Aucun compte email connecté
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <Card key={account.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">{account.email}</p>
                        <p className="text-sm text-gray-600">
                          Connecté le {new Date(account.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/${role}s/messagerie`)}
                        className={role === 'notaire' ? 'border-orange-600 text-orange-600 hover:bg-orange-50 hover:!text-black' : 'border-blue-600 text-blue-600 hover:bg-blue-50 hover:!text-black'}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Accéder à la messagerie
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(account.id)}
                      >
                        Déconnecter
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
