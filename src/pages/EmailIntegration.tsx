import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, AlertCircle, Trash2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

type EmailAccount = {
  id: string;
  email: string;
  provider: string;
  status: 'connected' | 'error' | 'pending';
  last_sync?: string | null;
  created_at?: string;
};

const EMAIL_PROVIDERS = [
  { value: 'gmail', label: 'Gmail', icon: '📧', color: 'bg-red-500' },
  { value: 'outlook', label: 'Outlook / Office 365', icon: '📨', color: 'bg-blue-500' },
  { value: 'yahoo', label: 'Yahoo Mail', icon: '💌', color: 'bg-purple-500' },
  { value: 'icloud', label: 'iCloud Mail', icon: '☁️', color: 'bg-gray-500' },
  { value: 'other', label: 'Autre (IMAP)', icon: '📮', color: 'bg-slate-500' },
];

export default function EmailIntegration() {
  const { user } = useAuth();
  const location = useLocation();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const mainButtonColor = role === 'notaire' 
    ? 'bg-orange-600 hover:bg-orange-700 text-white' 
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  useEffect(() => {
    loadAccounts();
  }, [user]);

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
      console.error('Error loading email accounts:', error);
      toast.error('Erreur lors du chargement des comptes email');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectProvider = async (selectedProvider: string) => {
    try {
      // Pour l'instant, seul Gmail est supporté avec OAuth2
      if (selectedProvider === 'gmail') {
        const { data, error } = await supabase.functions.invoke('gmail-sync', {
          body: { action: 'get-auth-url' }
        });

        if (error) throw error;
        
        if (data?.authUrl) {
          // Ouvrir la popup OAuth
          const width = 600;
          const height = 700;
          const left = window.screen.width / 2 - width / 2;
          const top = window.screen.height / 2 - height / 2;
          
          window.open(
            data.authUrl,
            'Gmail Authorization',
            `width=${width},height=${height},left=${left},top=${top}`
          );
          
          toast.success('Veuillez autoriser l\'accès à votre compte Gmail');
        }
      } else {
        // Les autres providers ne sont pas encore implémentés
        toast.info(`${selectedProvider} sera bientôt disponible`);
      }
    } catch (error: any) {
      console.error('Error connecting provider:', error);
      toast.error(error.message || 'Erreur lors de la connexion');
    }
  };

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    try {
      // Simulation de synchronisation - en production, appeler une edge function
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { error } = await supabase
        .from('email_accounts')
        .update({ last_sync: new Date().toISOString(), status: 'connected' })
        .eq('id', accountId);

      if (error) throw error;

      toast.success('Synchronisation réussie');
      loadAccounts();
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce compte email ?')) return;

    try {
      const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast.success('Compte email supprimé');
      loadAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getProviderConfig = (providerValue: string) => {
    return EMAIL_PROVIDERS.find(p => p.value === providerValue) || EMAIL_PROVIDERS[0];
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Intégration Email</h1>
          <p className="text-muted-foreground mt-1">Connectez vos comptes email professionnels</p>
        </div>

        {/* Provider Selection Cards */}
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {EMAIL_PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handleConnectProvider(p.value)}
                  className={`
                    relative p-6 rounded-lg border-2 transition-all
                    hover:border-blue-500 hover:shadow-md hover:scale-105
                    flex flex-col items-center gap-3
                    ${p.value === 'gmail' ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'}
                  `}
                >
                  <div className={`h-12 w-12 rounded-full ${p.color} flex items-center justify-center text-white text-2xl`}>
                    {p.icon}
                  </div>
                  <span className="text-sm font-medium text-center">{p.label}</span>
                  {p.value === 'gmail' && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                      Disponible
                    </span>
                  )}
                  {p.value !== 'gmail' && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-gray-400 text-white text-xs rounded-full">
                      Bientôt
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Cliquez sur un fournisseur pour connecter votre compte via OAuth2 sécurisé
            </p>
          </CardContent>
        </Card>

        {/* Accounts List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="mt-2 text-sm text-muted-foreground">Chargement...</p>
          </div>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun compte connecté</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Commencez par connecter votre première adresse email
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => {
              const providerConfig = getProviderConfig(account.provider);
              return (
                <Card key={account.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-10 w-10 rounded-full ${providerConfig.color} flex items-center justify-center text-white text-xl`}>
                          {providerConfig.icon}
                        </div>
                        <div>
                          <CardTitle className="text-base">{providerConfig.label}</CardTitle>
                          <CardDescription className="text-xs break-all">{account.email}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Statut</span>
                      {account.status === 'connected' && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connecté
                        </Badge>
                      )}
                      {account.status === 'error' && (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Erreur
                        </Badge>
                      )}
                      {account.status === 'pending' && (
                        <Badge variant="secondary">
                          En attente
                        </Badge>
                      )}
                    </div>

                    {account.last_sync && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Dernière sync</span>
                        <span className="text-xs">
                          {new Date(account.last_sync).toLocaleString('fr-FR')}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleSync(account.id)}
                        disabled={syncing === account.id}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${syncing === account.id ? 'animate-spin' : ''}`} />
                        Sync
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive hover:text-white"
                        onClick={() => handleDelete(account.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
