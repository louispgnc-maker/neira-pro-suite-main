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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [openAdd, setOpenAdd] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Form state
  const [provider, setProvider] = useState('gmail');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [imapServer, setImapServer] = useState('');
  const [imapPort, setImapPort] = useState('993');

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

  const handleAddAccount = async () => {
    if (!email || !provider) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Adresse email invalide');
      return;
    }

    try {
      const { error } = await supabase.from('email_accounts').insert({
        user_id: user?.id,
        email: email,
        provider: provider,
        status: 'pending',
        // En production, ces données sensibles seraient chiffrées
        credentials: {
          password: password,
          imap_server: provider === 'other' ? imapServer : undefined,
          imap_port: provider === 'other' ? imapPort : undefined,
        }
      });

      if (error) throw error;

      toast.success('Compte email ajouté avec succès');
      setOpenAdd(false);
      resetForm();
      loadAccounts();
    } catch (error: any) {
      console.error('Error adding email account:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout du compte');
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

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setImapServer('');
    setImapPort('993');
    setProvider('gmail');
  };

  const getProviderConfig = (providerValue: string) => {
    return EMAIL_PROVIDERS.find(p => p.value === providerValue) || EMAIL_PROVIDERS[0];
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Intégration Email</h1>
            <p className="text-foreground mt-1">Connectez vos comptes email professionnels</p>
          </div>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button className={mainButtonColor}>
                <Mail className="mr-2 h-4 w-4" />
                Ajouter un compte
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Connecter un compte email</DialogTitle>
                <DialogDescription>
                  Ajoutez votre adresse email professionnelle pour synchroniser vos messages
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Fournisseur</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_PROVIDERS.map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.icon} {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Adresse email</Label>
                  <Input
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mot de passe d'application</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {provider === 'gmail' && 'Utilisez un mot de passe d\'application Google'}
                    {provider === 'outlook' && 'Utilisez un mot de passe d\'application Microsoft'}
                    {provider === 'yahoo' && 'Utilisez un mot de passe d\'application Yahoo'}
                    {provider === 'other' && 'Mot de passe IMAP de votre compte'}
                  </p>
                </div>

                {provider === 'other' && (
                  <>
                    <div className="space-y-2">
                      <Label>Serveur IMAP</Label>
                      <Input
                        placeholder="imap.exemple.com"
                        value={imapServer}
                        onChange={(e) => setImapServer(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Port IMAP</Label>
                      <Input
                        placeholder="993"
                        value={imapPort}
                        onChange={(e) => setImapPort(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => { setOpenAdd(false); resetForm(); }}>
                    Annuler
                  </Button>
                  <Button className={mainButtonColor} onClick={handleAddAccount}>
                    Connecter
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">
                  Comment obtenir un mot de passe d'application ?
                </p>
                <p className="text-xs text-blue-700">
                  <strong>Gmail :</strong> Compte Google → Sécurité → Mots de passe d'application<br />
                  <strong>Outlook :</strong> Account → Sécurité → Vérification en deux étapes → Mot de passe d'application<br />
                  <strong>Yahoo :</strong> Paramètres → Sécurité → Générer un mot de passe d'application
                </p>
              </div>
            </div>
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
