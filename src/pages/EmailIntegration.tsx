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
    available: false 
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

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const email = searchParams.get("email");

    if (success) {
      toast.success(`✅ Connexion réussie - ${email}`);
      loadAccounts();
      const basePath = role === 'notaire' ? '/notaires/email-integration' : '/avocats/email-integration';
      navigate(basePath, { replace: true });
    }

    if (error) {
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
      const basePath = role === 'notaire' ? '/notaires/email-integration' : '/avocats/email-integration';
      navigate(basePath, { replace: true });
    }
  }, [searchParams]);

  const loadAccounts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts((data as EmailAccount[]) || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Erreur lors du chargement des comptes');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectProvider = async (provider: string) => {
    if (provider !== 'gmail') {
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
      
      console.log('[EmailIntegration] Session status:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        userId: session?.user?.id
      });
      
      if (!session || !session.access_token) {
        throw new Error('Vous devez être connecté. Veuillez vous reconnecter.');
      }

      // Use fetch directly to ensure headers are sent properly
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

      console.log('[EmailIntegration] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[EmailIntegration] Error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }

      const data = await response.json();
      
      if (data?.authUrl) {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        window.open(
          data.authUrl,
          'Gmail OAuth',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        toast.success('Veuillez autoriser l\'accès à votre Gmail');
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
          <h1 className="text-3xl font-bold">Intégration Email</h1>
          <p className="text-muted-foreground mt-1">Connectez vos comptes email professionnels</p>
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
                        <p className="text-xs text-muted-foreground mt-2">Bientôt disponible</p>
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
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
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
                        <p className="text-sm text-muted-foreground">
                          Connecté le {new Date(account.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(account.id)}
                    >
                      Déconnecter
                    </Button>
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
