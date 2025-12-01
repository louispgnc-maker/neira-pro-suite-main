import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Mail, 
  Inbox, 
  Send, 
  Archive, 
  Trash2, 
  Star, 
  RefreshCw, 
  Search,
  ChevronLeft,
  Reply,
  Forward,
  Paperclip,
  MoreVertical,
  Settings
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type EmailAccount = {
  id: string;
  email: string;
  provider: string;
  status: string;
};

type Email = {
  id: string;
  account_id: string;
  subject: string;
  from_address: string;
  to_address: string;
  body_text: string;
  body_html?: string;
  received_at: string;
  is_read: boolean;
  is_starred: boolean;
  labels?: string[];
};

export default function EmailInbox() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState<'inbox' | 'sent' | 'archive' | 'trash'>('inbox');
  const [showCompose, setShowCompose] = useState(false);
  
  // Compose form
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const mainButtonColor = role === 'notaire' 
    ? 'bg-orange-600 hover:bg-orange-700 text-white' 
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  useEffect(() => {
    loadAccounts();
  }, [user]);

  useEffect(() => {
    if (selectedAccount) {
      loadEmails();
    }
  }, [selectedAccount, currentFolder]);

  // Auto-sync every 3 seconds for near real-time updates
  useEffect(() => {
    if (!selectedAccount) return;

    let syncAttempts = 0;
    const MAX_FAILED_ATTEMPTS = 3;

    const autoSync = async () => {
      try {
        // Get account to check provider and token
        const { data: accountData, error: accountError } = await supabase
          .from('email_accounts')
          .select('provider, access_token, status')
          .eq('id', selectedAccount)
          .single();

        if (accountError || !accountData) {
          console.log('[Auto-sync] Account not found');
          return;
        }

        // If no access token or account is not active, skip sync
        if (!accountData?.access_token || accountData?.status !== 'active') {
          console.log('[Auto-sync] Account not ready for sync (no token or inactive)');
          return;
        }

        const provider = accountData?.provider || 'gmail';
        const refreshUrl = provider === 'outlook'
          ? 'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/outlook-refresh-token'
          : 'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/gmail-refresh-token';
        const syncUrl = provider === 'outlook'
          ? 'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/outlook-sync'
          : 'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/gmail-sync';

        // First, refresh token if needed
        const refreshResponse = await fetch(refreshUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: selectedAccount })
        });

        // If refresh failed with 401, the account needs re-authentication
        if (refreshResponse.status === 401) {
          syncAttempts++;
          if (syncAttempts >= MAX_FAILED_ATTEMPTS) {
            console.log('[Auto-sync] Too many failed attempts - stopping auto-sync');
            // Mark account as needing re-auth
            await supabase
              .from('email_accounts')
              .update({ status: 'error' })
              .eq('id', selectedAccount);
            toast.error('Votre compte email nécessite une reconnexion', {
              description: 'Veuillez vous rendre sur la page d\'intégration email pour reconnecter votre compte.',
              duration: 10000
            });
          }
          return;
        }

        // Reset counter on success
        if (refreshResponse.ok) {
          syncAttempts = 0;
        }

        // Then sync emails
        const response = await fetch(syncUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: selectedAccount })
        });

        // If sync failed with 401 or 500, handle appropriately
        if (response.status === 401 || response.status === 500) {
          syncAttempts++;
          if (syncAttempts >= MAX_FAILED_ATTEMPTS) {
            console.log('[Auto-sync] Too many failed sync attempts - stopping');
            return;
          }
          return;
        }

        if (response.ok) {
          syncAttempts = 0; // Reset on success
          const data = await response.json();
          if (data?.synced > 0) {
            await loadEmails();
          }
        }
      } catch (error) {
        syncAttempts++;
        console.error('Auto-sync failed:', error);
      }
    };

    // Initial sync after a short delay
    const initialTimeout = setTimeout(autoSync, 1000);

    const interval = setInterval(autoSync, 5000); // Check every 5 seconds (less aggressive)

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [selectedAccount]);

  const loadAccounts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const accountsList = (data as EmailAccount[]) || [];
      setAccounts(accountsList);
      
      if (accountsList.length > 0 && !selectedAccount) {
        setSelectedAccount(accountsList[0].id);
      } else if (accountsList.length === 0) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Erreur lors du chargement des comptes');
      setLoading(false);
    }
  };

  const loadEmails = async () => {
    if (!selectedAccount) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('emails')
        .select('*')
        .eq('account_id', selectedAccount);

      // Filter by folder
      if (currentFolder === 'inbox') {
        // Inbox shows all emails (starred or not)
        // No filter needed - shows everything
      } else if (currentFolder === 'sent') {
        query = query.contains('labels', ['SENT']);
      } else if (currentFolder === 'archive') {
        // Archive shows only starred emails
        query = query.eq('is_starred', true);
      } else if (currentFolder === 'trash') {
        query = query.contains('labels', ['TRASH']);
      }

      const { data, error } = await query
        .order('received_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEmails((data as Email[]) || []);
    } catch (error) {
      console.error('Error loading emails:', error);
      toast.error('Erreur lors du chargement des emails');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!selectedAccount) return;
    
    setSyncing(true);
    try {
      // Get account to check provider
      const { data: accountData } = await supabase
        .from('email_accounts')
        .select('provider')
        .eq('id', selectedAccount)
        .single();

      const provider = accountData?.provider || 'gmail';
      const syncUrl = provider === 'outlook' 
        ? 'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/outlook-sync'
        : 'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/gmail-sync';
      
      console.log('[EmailInbox] Starting sync for', provider, 'account:', selectedAccount);
      
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccount })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[EmailInbox] Sync error:', errorText);
        throw new Error('Erreur lors de la synchronisation');
      }

      const data = await response.json();
      console.log('[EmailInbox] Sync result:', data);
      
      const syncedCount = data?.synced || 0;
      toast.success(`${syncedCount} nouveau(x) email(s) synchronisé(s)`);
      await loadEmails();
    } catch (error: any) {
      console.error('Error syncing:', error);
      toast.error(error.message || 'Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const markAsRead = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('emails')
        .update({ is_read: true })
        .eq('id', emailId);

      if (error) throw error;
      
      setEmails(prev => prev.map(e => e.id === emailId ? { ...e, is_read: true } : e));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail({ ...selectedEmail, is_read: true });
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const toggleStar = async (emailId: string, currentStarred: boolean) => {
    try {
      const { error } = await supabase
        .from('emails')
        .update({ is_starred: !currentStarred })
        .eq('id', emailId);

      if (error) throw error;
      
      setEmails(prev => prev.map(e => e.id === emailId ? { ...e, is_starred: !currentStarred } : e));
      toast.success(currentStarred ? 'Retiré des archives' : 'Ajouté aux archives');
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const moveToFolder = async (emailId: string, folder: 'inbox' | 'sent' | 'archive' | 'trash') => {
    try {
      const { error } = await supabase
        .from('emails')
        .update({ folder })
        .eq('id', emailId);

      if (error) throw error;
      
      setEmails(prev => prev.filter(e => e.id !== emailId));
      setSelectedEmail(null);
      toast.success(folder === 'archive' ? 'Email archivé' : folder === 'trash' ? 'Email supprimé' : 'Email déplacé');
    } catch (error) {
      console.error('Error moving email:', error);
      toast.error('Erreur lors du déplacement');
    }
  };

  const handleCompose = () => {
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
    setShowCompose(true);
  };

  const handleReply = (email: Email) => {
    setComposeTo(email.from_address);
    setComposeSubject(`Re: ${email.subject}`);
    setComposeBody(`\n\n--- Message original ---\nDe: ${email.from_address}\nDate: ${new Date(email.received_at).toLocaleString('fr-FR')}\nObjet: ${email.subject}\n\n${email.body_text}`);
    setShowCompose(true);
  };

  const sendEmail = async () => {
    if (!composeTo || !composeSubject || !composeBody) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (!selectedAccount) {
      toast.error('Aucun compte sélectionné');
      return;
    }

    try {
      console.log('[EmailInbox] Sending email from account:', selectedAccount);
      
      // Call edge function to send email via Gmail API
      const response = await fetch(
        'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/gmail-send',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            accountId: selectedAccount,
            to: composeTo,
            subject: composeSubject,
            body: composeBody
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[EmailInbox] Send error:', errorText);
        throw new Error('Erreur lors de l\'envoi de l\'email');
      }

      const data = await response.json();
      console.log('[EmailInbox] Email sent:', data);
      
      toast.success('Email envoyé avec succès');
      setShowCompose(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi');
    }
  };

  const filteredEmails = emails.filter(email => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      email.subject.toLowerCase().includes(query) ||
      email.from_address.toLowerCase().includes(query) ||
      email.body_text.toLowerCase().includes(query)
    );
  });

  const unreadCount = emails.filter(e => !e.is_read).length;

  if (accounts.length === 0) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <Mail className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">Aucun compte connecté</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Connectez d'abord un compte email pour accéder à votre messagerie
              </p>
              <Button 
                className={mainButtonColor}
                onClick={() => navigate(`/${role}s/email-integration`)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Gérer les comptes email
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-4 h-screen flex flex-col">
        {/* Header Card */}
        <Card className="shadow-lg">
          <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <Select value={selectedAccount} onValueChange={(value) => {
              if (value === 'add-account') {
                navigate(`/${role}s/email-integration`);
              } else {
                setSelectedAccount(value);
              }
            }}>
              <SelectTrigger className="w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.email}
                  </SelectItem>
                ))}
                <SelectItem value="add-account" className="text-orange-600 font-medium">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Ajouter un compte
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans les emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 flex-1">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                className={`relative ${mainButtonColor}`}
                onClick={() => setCurrentFolder('inbox')}
                title="Boîte de réception"
              >
                <Inbox className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs" variant="secondary">{unreadCount}</Badge>
                )}
              </Button>
              
              <Button
                size="icon"
                className={mainButtonColor}
                onClick={() => setCurrentFolder('sent')}
                title="Envoyés"
              >
                <Send className="h-4 w-4" />
              </Button>
              
              <Button
                size="icon"
                className={mainButtonColor}
                onClick={() => setCurrentFolder('archive')}
                title="Archivés"
              >
                <Archive className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="icon"
                className={mainButtonColor}
                onClick={() => setCurrentFolder('trash')}
                title="Corbeille"
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <Button
                className={mainButtonColor}
                size="icon"
                onClick={handleSync}
                disabled={syncing}
                title="Synchroniser"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button 
                className={mainButtonColor} 
                size="icon" 
                onClick={handleCompose}
                title="Nouveau message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        </Card>

        {/* Email Content Card */}
        <Card className="flex-1 flex flex-col overflow-hidden shadow-lg">        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="flex h-full overflow-hidden rounded-lg border bg-card">
            {/* Email List */}
            <div className="w-[450px] border-r overflow-y-auto bg-background">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                <p className="mt-2 text-sm text-muted-foreground">Chargement...</p>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="p-8 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">Aucun email</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredEmails.map(email => (
                  <div
                    key={email.id}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedEmail?.id === email.id ? 'bg-muted' : ''
                    } ${!email.is_read ? 'bg-blue-50/50' : ''}`}
                    onClick={() => {
                      setSelectedEmail(email);
                      if (!email.is_read) markAsRead(email.id);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(email.id, email.is_starred);
                        }}
                        className="mt-1"
                      >
                        <Star
                          className={`h-4 w-4 ${
                            email.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm truncate ${!email.is_read ? 'font-bold' : ''}`}>
                            {currentFolder === 'sent' ? email.to_address : email.from_address}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {new Date(email.received_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                        
                        <div className={`text-sm mb-1 truncate ${!email.is_read ? 'font-semibold' : ''}`}>
                          {email.subject}
                        </div>
                        
                        <div className="text-xs text-muted-foreground truncate">
                          {email.body_text.substring(0, 100)}...
                        </div>
                        
                        {email.has_attachments && (
                          <div className="mt-2">
                            <Badge variant="secondary" className="text-xs">
                              <Paperclip className="h-3 w-3 mr-1" />
                              Pièce jointe
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email Content */}
          <div className="flex-1 overflow-y-auto bg-background">
            {selectedEmail ? (
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <Button
                    className={mainButtonColor}
                    size="sm"
                    onClick={() => setSelectedEmail(null)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Retour
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button className={mainButtonColor} size="sm" onClick={() => handleReply(selectedEmail)}>
                      <Reply className="h-4 w-4 mr-1" />
                      Répondre
                    </Button>
                    <Button className={mainButtonColor} size="sm">
                      <Forward className="h-4 w-4 mr-1" />
                      Transférer
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className={mainButtonColor} size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => moveToFolder(selectedEmail.id, 'archive')}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archiver
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => moveToFolder(selectedEmail.id, 'trash')}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="space-y-4">
                  <h1 className="text-2xl font-bold">{selectedEmail.subject}</h1>
                  
                  <div className="flex items-center gap-3 pb-4 border-b">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {selectedEmail.from_address[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{selectedEmail.from_address}</div>
                      <div className="text-sm text-muted-foreground">
                        À: {selectedEmail.to_address}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(selectedEmail.received_at).toLocaleString('fr-FR')}
                    </div>
                  </div>

                  <div className="prose prose-sm max-w-none">
                    {selectedEmail.body_html ? (
                      <iframe
                        title="Email Content"
                        srcDoc={`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <meta charset="UTF-8">
                              <style>
                                body {
                                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                  line-height: 1.6;
                                  color: #1f2937;
                                  margin: 0;
                                  padding: 16px;
                                  overflow-x: hidden;
                                }
                                img {
                                  max-width: 100% !important;
                                  height: auto !important;
                                }
                                table {
                                  max-width: 100% !important;
                                }
                                a {
                                  color: #2563eb;
                                }
                              </style>
                            </head>
                            <body>${selectedEmail.body_html}</body>
                          </html>
                        `}
                        className="w-full border-0"
                        style={{ minHeight: '400px' }}
                        sandbox="allow-same-origin"
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans text-sm">
                        {selectedEmail.body_text}
                      </pre>
                    )}
                  </div>

                  {selectedEmail.has_attachments && (
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-medium mb-3">Pièces jointes</h3>
                      <div className="flex gap-2">
                        <Card className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50">
                          <Paperclip className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">document.pdf</div>
                            <div className="text-xs text-muted-foreground">245 KB</div>
                          </div>
                        </Card>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Mail className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p>Sélectionnez un email pour le lire</p>
                </div>
              </div>
            )}
          </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Destinataire"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder="Objet"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
              />
            </div>
            <div>
              <Textarea
                placeholder="Votre message..."
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                rows={12}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCompose(false)}>
                Annuler
              </Button>
              <Button className={mainButtonColor} onClick={sendEmail}>
                <Send className="h-4 w-4 mr-2" />
                Envoyer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
