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
  from: string;
  to: string;
  body: string;
  html_body?: string;
  received_at: string;
  read: boolean;
  starred: boolean;
  has_attachments: boolean;
  folder: 'inbox' | 'sent' | 'archive' | 'trash';
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

  const loadAccounts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'connected')
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
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('account_id', selectedAccount)
        .eq('folder', currentFolder)
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
      // Appeler l'edge function pour synchroniser avec Gmail
      const { data, error } = await supabase.functions.invoke('gmail-sync', {
        body: { 
          action: 'sync',
          account_id: selectedAccount 
        }
      });

      if (error) throw error;
      
      const syncedCount = data?.synced || 0;
      toast.success(`${syncedCount} nouveau(x) email(s) synchronisé(s)`);
      loadEmails();
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
        .update({ read: true })
        .eq('id', emailId);

      if (error) throw error;
      
      setEmails(prev => prev.map(e => e.id === emailId ? { ...e, read: true } : e));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail({ ...selectedEmail, read: true });
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const toggleStar = async (emailId: string, currentStarred: boolean) => {
    try {
      const { error } = await supabase
        .from('emails')
        .update({ starred: !currentStarred })
        .eq('id', emailId);

      if (error) throw error;
      
      setEmails(prev => prev.map(e => e.id === emailId ? { ...e, starred: !currentStarred } : e));
      toast.success(currentStarred ? 'Étoile retirée' : 'Email marqué');
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
    setComposeTo(email.from);
    setComposeSubject(`Re: ${email.subject}`);
    setComposeBody(`\n\n--- Message original ---\nDe: ${email.from}\nDate: ${new Date(email.received_at).toLocaleString('fr-FR')}\nObjet: ${email.subject}\n\n${email.body}`);
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
      // Appeler l'edge function pour envoyer l'email via Gmail API
      const { error } = await supabase.functions.invoke('gmail-sync', {
        body: { 
          action: 'send',
          account_id: selectedAccount,
          to: composeTo,
          subject: composeSubject,
          body: composeBody
        }
      });

      if (error) throw error;
      
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
      email.from.toLowerCase().includes(query) ||
      email.body.toLowerCase().includes(query)
    );
  });

  const unreadCount = emails.filter(e => !e.read).length;

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
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-background flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.email}
                  </SelectItem>
                ))}
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

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Synchroniser
            </Button>
            <Button className={mainButtonColor} size="sm" onClick={handleCompose}>
              <Send className="h-4 w-4 mr-2" />
              Nouveau
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r bg-muted/10 p-4 space-y-2 overflow-y-auto">
            <Button
              variant={currentFolder === 'inbox' ? 'default' : 'ghost'}
              className={`w-full justify-start ${currentFolder === 'inbox' ? mainButtonColor : ''}`}
              onClick={() => setCurrentFolder('inbox')}
            >
              <Inbox className="h-4 w-4 mr-2" />
              Boîte de réception
              {unreadCount > 0 && (
                <Badge className="ml-auto" variant="secondary">{unreadCount}</Badge>
              )}
            </Button>
            
            <Button
              variant={currentFolder === 'sent' ? 'default' : 'ghost'}
              className={`w-full justify-start ${currentFolder === 'sent' ? mainButtonColor : ''}`}
              onClick={() => setCurrentFolder('sent')}
            >
              <Send className="h-4 w-4 mr-2" />
              Envoyés
            </Button>
            
            <Button
              variant={currentFolder === 'archive' ? 'default' : 'ghost'}
              className={`w-full justify-start ${currentFolder === 'archive' ? mainButtonColor : ''}`}
              onClick={() => setCurrentFolder('archive')}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archivés
            </Button>
            
            <Button
              variant={currentFolder === 'trash' ? 'default' : 'ghost'}
              className={`w-full justify-start ${currentFolder === 'trash' ? mainButtonColor : ''}`}
              onClick={() => setCurrentFolder('trash')}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Corbeille
            </Button>
          </div>

          {/* Email List */}
          <div className="w-96 border-r bg-background overflow-y-auto">
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
                    } ${!email.read ? 'bg-blue-50/50' : ''}`}
                    onClick={() => {
                      setSelectedEmail(email);
                      if (!email.read) markAsRead(email.id);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(email.id, email.starred);
                        }}
                        className="mt-1"
                      >
                        <Star
                          className={`h-4 w-4 ${
                            email.starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm truncate ${!email.read ? 'font-bold' : ''}`}>
                            {email.from}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {new Date(email.received_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                        
                        <div className={`text-sm mb-1 truncate ${!email.read ? 'font-semibold' : ''}`}>
                          {email.subject}
                        </div>
                        
                        <div className="text-xs text-muted-foreground truncate">
                          {email.body.substring(0, 100)}...
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
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEmail(null)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Retour
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleReply(selectedEmail)}>
                      <Reply className="h-4 w-4 mr-1" />
                      Répondre
                    </Button>
                    <Button variant="outline" size="sm">
                      <Forward className="h-4 w-4 mr-1" />
                      Transférer
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
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
                        {selectedEmail.from[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{selectedEmail.from}</div>
                      <div className="text-sm text-muted-foreground">
                        À: {selectedEmail.to}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(selectedEmail.received_at).toLocaleString('fr-FR')}
                    </div>
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {selectedEmail.body}
                    </pre>
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
