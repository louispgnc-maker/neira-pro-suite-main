import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, AlertCircle, Loader2, Lock, Check, Inbox, Clock, Shield } from "lucide-react";
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
    description: 'Synchronisez vos emails Gmail avec vos dossiers Neira.',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg',
    color: 'from-red-50 to-red-100',
    hoverColor: 'hover:from-red-100 hover:to-red-200',
    available: true,
    recommended: true 
  },
  { 
    value: 'outlook', 
    label: 'Outlook / Office 365', 
    description: 'Synchronisez vos emails professionnels Outlook ou Microsoft 365 avec Neira.',
    logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/microsoftoutlook.svg',
    color: 'from-blue-50 to-blue-100',
    hoverColor: 'hover:from-blue-100 hover:to-blue-200',
    available: true
  },
  { 
    value: 'sfr', 
    label: 'SFR Mail', 
    description: 'Bientôt disponible',
    logoUrl: '',
    icon: '📮',
    color: 'from-gray-50 to-gray-100',
    hoverColor: '',
    available: false 
  },
  { 
    value: 'yahoo', 
    label: 'Yahoo Mail', 
    description: 'Bientôt disponible',
    logoUrl: '',
    icon: '💌',
    color: 'from-gray-50 to-gray-100',
    hoverColor: '',
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
        const clientId = '74658136-14ec-4630-ad9b-26e160ff0fc6'; // User's app (needs to be fixed in Azure Portal)
        const redirectUri = encodeURIComponent('https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/outlook-oauth-callback');
        const state = btoa(JSON.stringify({ user_id: user.id, session_token: session.access_token }));
        const scope = encodeURIComponent('https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access');
        
        authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&response_mode=query&prompt=select_account`;
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
      <div className="p-6 space-y-8">
        {/* Header amélioré */}
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Intégration Email</h1>
          <p className="text-lg text-gray-600 max-w-3xl">
            Connectez votre messagerie professionnelle pour centraliser les échanges avec vos clients.
          </p>
        </div>

        {/* Cartes providers améliorées */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Mail className="h-6 w-6 text-primary" />
              Connecter un compte email
            </CardTitle>
            <CardDescription className="text-base">
              Choisissez votre fournisseur d'email pour connecter votre boîte de réception
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {EMAIL_PROVIDERS.map((provider) => (
                <div 
                  key={provider.value}
                  className="relative"
                >
                  {/* Badge recommandé */}
                  {provider.recommended && (
                    <Badge className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-md text-xs">
                      Recommandé pour les cabinets
                    </Badge>
                  )}
                  
                  <Card 
                    className={`h-full cursor-pointer transition-all duration-300 rounded-2xl shadow-md ${
                      provider.available 
                        ? `bg-gradient-to-br ${provider.color} ${provider.hoverColor} hover:shadow-xl hover:scale-105 hover:border-primary/50 border-2 border-transparent` 
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => provider.available && handleConnectProvider(provider.value)}
                  >
                    <CardContent className="p-8 flex flex-col items-center gap-4 h-full">
                      {/* Logo/Icône */}
                      <div className="w-20 h-20 flex items-center justify-center">
                        {provider.logoUrl ? (
                          <img 
                            src={provider.logoUrl} 
                            alt={provider.label}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-5xl">{provider.icon}</span>
                        )}
                      </div>
                      
                      {/* Nom du provider */}
                      <div className="text-center space-y-2 flex-1">
                        <p className="font-bold text-lg text-gray-900">{provider.label}</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {provider.description}
                        </p>
                      </div>
                      
                      {/* Bouton */}
                      {provider.available && (
                        <Button
                          size="lg"
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                          disabled={connectingProvider === provider.value}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConnectProvider(provider.value);
                          }}
                        >
                          {connectingProvider === provider.value ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Connexion en cours...
                            </>
                          ) : (
                            'Connecter le compte'
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            {/* Note de sécurité */}
            <div className="mt-8 flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <Lock className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Connexion sécurisée via OAuth.</span> Neira n'a jamais accès à votre mot de passe.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section Comptes connectés améliorée */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border-2">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Comptes connectés</h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : accounts.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-6">
                <div className="p-4 bg-gray-100 rounded-full">
                  <Inbox className="h-12 w-12 text-gray-400" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-gray-900">Aucun compte email connecté</h3>
                  <p className="text-gray-600 max-w-md">
                    Connectez votre messagerie pour centraliser les emails de vos clients directement dans leurs dossiers.
                  </p>
                </div>
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg"
                  onClick={() => document.querySelector<HTMLDivElement>('[data-provider-cards]')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Mail className="mr-2 h-5 w-5" />
                  Connecter un compte email
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4" data-provider-cards>
              {accounts.map((account) => (
                <Card key={account.id} className="border-2 shadow-sm hover:shadow-md transition-all">
                  <CardContent className="flex items-center justify-between py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-full">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-bold text-lg text-gray-900">
                            {account.provider === 'gmail' ? 'Gmail' : 'Outlook / Office 365'}
                          </p>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Check className="mr-1 h-3 w-3" />
                            Connecté
                          </Badge>
                        </div>
                        <p className="text-gray-900 font-medium">{account.email}</p>
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          Connecté le {new Date(account.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => navigate(`/${role}s/messagerie`)}
                        className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold transition-all"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Gérer
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => handleDelete(account.id)}
                        className="border-2 border-red-500 text-red-600 hover:bg-red-500 hover:text-white font-semibold transition-all"
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

        {/* Section Pourquoi connecter */}
        <Card className="border-2 bg-gradient-to-br from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Pourquoi connecter votre messagerie ?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex gap-4">
                <div className="p-3 bg-blue-100 rounded-xl h-fit">
                  <Inbox className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Centralisez vos échanges</h3>
                  <p className="text-sm text-gray-700">
                    Retrouvez tous les échanges clients directement dans vos dossiers.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="p-3 bg-purple-100 rounded-xl h-fit">
                  <CheckCircle2 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Association automatique</h3>
                  <p className="text-sm text-gray-700">
                    Les emails sont automatiquement associés aux dossiers concernés.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="p-3 bg-green-100 rounded-xl h-fit">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Historique complet</h3>
                  <p className="text-sm text-gray-700">
                    Retrouvez facilement l'historique de toutes vos communications.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
