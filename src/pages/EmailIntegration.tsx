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

export default function EmailIntegration() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

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

  const handleConnectGmail = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-operations', {
        body: { action: 'get-auth-url' }
      });

      if (error) throw error;
      
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
      console.error('Error connecting Gmail:', error);
      toast.error(error.message || 'Erreur de connexion');
    } finally {
      setConnecting(false);
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
          <p className="text-muted-foreground mt-1">Connectez votre compte Gmail</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Connecter Gmail
            </CardTitle>
            <CardDescription>
              Autorisez l'accès à votre compte Gmail pour envoyer et recevoir des emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleConnectGmail}
              disabled={connecting}
              className="w-full sm:w-auto"
            >
              {connecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Connecter mon Gmail
                </>
              )}
            </Button>
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
