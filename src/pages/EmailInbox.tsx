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
  Settings,
  FileText
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
  has_attachments?: boolean;
  folder?: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }>;
};

export default function EmailInbox() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(() => {
    // Restore selected email from localStorage on mount
    const savedEmailId = localStorage.getItem('selectedEmailId');
    return savedEmailId ? null : null; // Will be loaded once emails are fetched
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState<'inbox' | 'sent' | 'archive' | 'trash' | 'drafts'>('inbox');
  const [drafts, setDrafts] = useState<any[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<any | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  
  // Resizable email list width
  const [emailListWidth, setEmailListWidth] = useState(() => {
    const saved = localStorage.getItem('emailListWidth');
    return saved ? parseInt(saved) : 450;
  });
  const [isResizing, setIsResizing] = useState(false);
  
  // Compose form
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAttachments, setComposeAttachments] = useState<File[]>([]);

  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const mainButtonColor = role === 'notaire' 
    ? 'bg-orange-600 hover:bg-orange-700 text-white' 
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  // Handle resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      requestAnimationFrame(() => {
        const newWidth = e.clientX - 300; // Adjust based on sidebar width
        if (newWidth >= 300 && newWidth <= 800) {
          setEmailListWidth(newWidth);
        }
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Save to localStorage only when done resizing
      localStorage.setItem('emailListWidth', emailListWidth.toString());
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, emailListWidth]);

  useEffect(() => {
    loadAccounts();
  }, [user]);

  // Handle pre-filled compose from navigation state
  useEffect(() => {
    if (location.state?.openCompose && selectedAccount) {
      setComposeTo(location.state.composeTo || '');
      setComposeCc('');
      setComposeSubject(location.state.composeSubject || '');
      setComposeBody(location.state.composeBody || '');
      setComposeAttachments([]);
      setShowCompose(true);
      
      // Clear the state so it doesn't reopen on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, selectedAccount]);

  useEffect(() => {
    if (selectedAccount) {
      if (currentFolder === 'drafts') {
        loadDrafts();
      } else {
        loadEmails();
      }
    }
  }, [selectedAccount, currentFolder]);

  // Sync on page load
  useEffect(() => {
    if (selectedAccount) {
      // Sync silently without showing loading state
      handleSync();
    }
  }, [selectedAccount]);

  // Fast refresh: reload emails from database every 30 seconds (without API sync)
  useEffect(() => {
    if (!selectedAccount || currentFolder === 'drafts') return;

    const fastRefresh = async () => {
      try {
        // Just reload from database, no API call
        let query = supabase
          .from('emails')
          .select('*')
          .eq('account_id', selectedAccount);

        if (currentFolder === 'inbox') {
          query = query.or('folder.is.null,folder.eq.inbox');
        } else if (currentFolder === 'sent') {
          query = query.or('labels.cs.{SENT},folder.eq.sent');
        } else if (currentFolder === 'archive') {
          query = query.eq('folder', 'archive');
        } else if (currentFolder === 'trash') {
          query = query.eq('folder', 'trash');
        }

        const { data, error } = await query
          .order('received_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          setEmails(data as Email[]);
        }
      } catch (error) {
        console.log('[Fast refresh] Error:', error);
      }
    };

    // Fast refresh every 30 seconds
    const interval = setInterval(fastRefresh, 30 * 1000);

    return () => clearInterval(interval);
  }, [selectedAccount, currentFolder]);

  // Auto-sync every 2 minutes (optimized for faster updates)
  useEffect(() => {
    if (!selectedAccount) return;

    const autoSync = async () => {
      try {
        // Get account to check provider and token
        const { data: accountData, error: accountError } = await supabase
          .from('email_accounts')
          .select('provider, access_token, status, token_expires_at')
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
        
        // Get Supabase session token for authorization
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token;
        
        // Check if token needs refresh (expired or about to expire in next 5 minutes)
        const expiresAt = accountData?.token_expires_at ? new Date(accountData.token_expires_at) : null;
        const needsRefresh = !expiresAt || expiresAt <= new Date(Date.now() + 5 * 60 * 1000);
        
        // Refresh token if needed
        if (needsRefresh) {
          console.log('[Auto-sync] Token expired or about to expire, refreshing...');
          const refreshUrl = provider === 'outlook'
            ? 'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/outlook-refresh-token'
            : 'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/gmail-refresh-token';
          
          const refreshResponse = await fetch(refreshUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ accountId: selectedAccount })
          });
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            console.log('[Auto-sync] Token refreshed:', refreshData.message);
          } else {
            console.log('[Auto-sync] Token refresh failed, will try sync anyway');
          }
        }

        const syncUrl = provider === 'outlook'
          ? 'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/outlook-sync'
          : 'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/gmail-sync';

        console.log('[Auto-sync] Starting background sync for', provider);

        // Sync silently
        const syncResponse = await fetch(syncUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ accountId: selectedAccount })
        });

        if (syncResponse.ok) {
          const data = await syncResponse.json();
          console.log('[Auto-sync] Success:', data.synced, 'new emails');
          
          // Reload emails if new ones were synced
          if (data.synced > 0) {
            await loadEmails();
          }
        } else {
          console.log('[Auto-sync] Failed, will retry on next cycle');
        }
      } catch (error) {
        console.error('[Auto-sync] Error:', error);
      }
    };

    // Initial sync after 2 seconds (faster initial load)
    const initialTimeout = setTimeout(autoSync, 2000);

    // Then sync every 2 minutes (more frequent updates)
    const interval = setInterval(autoSync, 2 * 60 * 1000);

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
        // Inbox shows emails without a folder set or folder='inbox'
        query = query.or('folder.is.null,folder.eq.inbox');
      } else if (currentFolder === 'sent') {
        // Sent folder uses labels OR folder='sent'
        query = query.or('labels.cs.{SENT},folder.eq.sent');
      } else if (currentFolder === 'archive') {
        // Archive shows emails with folder='archive'
        query = query.eq('folder', 'archive');
      } else if (currentFolder === 'trash') {
        // Trash shows emails with folder='trash'
        query = query.eq('folder', 'trash');
      }

      const { data, error } = await query
        .order('received_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      const emailList = (data as Email[]) || [];
      setEmails(emailList);
      
      // Restore selected email from localStorage if exists
      const savedEmailId = localStorage.getItem('selectedEmailId');
      if (savedEmailId && emailList.length > 0) {
        const emailToSelect = emailList.find(e => e.id === savedEmailId);
        if (emailToSelect) {
          setSelectedEmail(emailToSelect);
        }
      }
    } catch (error) {
      console.error('Error loading emails:', error);
      toast.error('Erreur lors du chargement des emails');
    } finally {
      setLoading(false);
    }
  };

  const loadDrafts = async () => {
    if (!selectedAccount || !user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_drafts')
        .select('*')
        .eq('account_id', selectedAccount)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error('Error loading drafts:', error);
      toast.error('Erreur lors du chargement des brouillons');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!selectedAccount) return;
    
    setSyncing(true);
    try {
      // Get account to check provider and token
      const { data: accountData } = await supabase
        .from('email_accounts')
        .select('provider, token_expires_at')
        .eq('id', selectedAccount)
        .single();

      const provider = accountData?.provider || 'gmail';
      
      // Check if token needs refresh (expired or about to expire in next 5 minutes)
      const expiresAt = accountData?.token_expires_at ? new Date(accountData.token_expires_at) : null;
      const needsRefresh = !expiresAt || expiresAt <= new Date(Date.now() + 5 * 60 * 1000);
      
      // Get Supabase session token for authorization
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      
      // Refresh token if needed
      if (needsRefresh) {
        console.log('[EmailInbox] Token expired or about to expire, refreshing...');
        const refreshUrl = provider === 'outlook'
          ? 'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/outlook-refresh-token'
          : 'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/gmail-refresh-token';
        
        const refreshResponse = await fetch(refreshUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ accountId: selectedAccount })
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          console.log('[EmailInbox] Token refreshed:', refreshData.message);
        } else {
          console.log('[EmailInbox] Token refresh failed, will try sync anyway');
        }
      }

      const syncUrl = provider === 'outlook' 
        ? 'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/outlook-sync'
        : 'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/gmail-sync';
      
      console.log('[EmailInbox] Starting sync for', provider, 'account:', selectedAccount);
      
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ accountId: selectedAccount })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[EmailInbox] Sync error:', errorText);
        
        // Don't show error for 401 - just log and continue to reload emails
        if (response.status === 401) {
          console.log('[EmailInbox] Token needs refresh, but reloading emails anyway');
          // Don't return - continue to reload emails below
        } else {
          throw new Error('Erreur lors de la synchronisation');
        }
      }

      const data = response.ok ? await response.json() : null;
      console.log('[EmailInbox] Sync result:', data);
      
      const syncedCount = data?.synced || 0;
      if (response.ok) {
        toast.success(`${syncedCount} nouveau(x) email(s) synchronisé(s)`);
      }
      
      // Always reload emails to show what we have
      if (currentFolder !== 'drafts') {
        await loadEmails();
      }
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

  const markAllAsRead = async () => {
    try {
      if (!selectedAccount) return;
      
      const unreadEmails = filteredEmails.filter(e => !e.is_read);
      if (unreadEmails.length === 0) {
        toast.info('Aucun email non lu');
        return;
      }

      const { error } = await supabase
        .from('emails')
        .update({ is_read: true })
        .eq('account_id', selectedAccount)
        .eq('is_read', false);

      if (error) throw error;
      
      setEmails(prev => prev.map(e => ({ ...e, is_read: true })));
      if (selectedEmail && !selectedEmail.is_read) {
        setSelectedEmail({ ...selectedEmail, is_read: true });
      }
      
      toast.success(`${unreadEmails.length} email(s) marqué(s) comme lu(s)`);
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erreur lors du marquage des emails');
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
      if (selectedEmail?.id === emailId) {
        setSelectedEmail({ ...selectedEmail, is_starred: !currentStarred });
      }
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const moveToFolder = async (emailId: string, folder: 'inbox' | 'sent' | 'archive' | 'trash') => {
    try {
      // For archive, toggle between archive and inbox (like star)
      if (folder === 'archive') {
        const email = emails.find(e => e.id === emailId) || selectedEmail;
        const newFolder = email?.folder === 'archive' ? 'inbox' : 'archive';
        
        const { error } = await supabase
          .from('emails')
          .update({ folder: newFolder })
          .eq('id', emailId);

        if (error) throw error;
        
        // Update local state
        if (currentFolder === 'archive' || newFolder === 'archive') {
          setEmails(prev => prev.filter(e => e.id !== emailId));
          setSelectedEmail(null);
          localStorage.removeItem('selectedEmailId');
        } else {
          await loadEmails();
        }
        
        toast.success(newFolder === 'archive' ? 'Email archivé' : 'Email désarchivé');
      } else {
        // For trash, just move to trash folder
        const { error } = await supabase
          .from('emails')
          .update({ folder })
          .eq('id', emailId);

        if (error) throw error;
        
        setEmails(prev => prev.filter(e => e.id !== emailId));
        setSelectedEmail(null);
        localStorage.removeItem('selectedEmailId');
        toast.success(folder === 'trash' ? 'Email supprimé' : 'Email déplacé');
      }
    } catch (error) {
      console.error('Error moving email:', error);
      toast.error('Erreur lors du déplacement');
    }
  };

  const handleCompose = () => {
    setComposeTo('');
    setComposeCc('');
    setComposeSubject('');
    setComposeBody('');
    setComposeAttachments([]);
    setShowCompose(true);
  };

  const handleReply = (email: Email) => {
    setComposeTo(email.from_address);
    setComposeCc('');
    setComposeSubject(`Re: ${email.subject}`);
    setComposeBody(`\n\n--- Message original ---\nDe: ${email.from_address}\nDate: ${new Date(email.received_at).toLocaleString('fr-FR')}\nObjet: ${email.subject}\n\n${email.body_text}`);
    setComposeAttachments([]);
    setShowCompose(true);
  };

  const handleForward = (email: Email) => {
    setComposeTo('');
    setComposeCc('');
    setComposeSubject(`Fwd: ${email.subject}`);
    setComposeBody(`\n\n--- Message transféré ---\nDe: ${email.from_address}\nDate: ${new Date(email.received_at).toLocaleString('fr-FR')}\nObjet: ${email.subject}\n\n${email.body_text}`);
    setComposeAttachments([]);
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
      
      // Get the current session token for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
      
      // Call edge function to send email via Gmail API
      const response = await fetch(
        'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/gmail-send',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
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
      setComposeCc('');
      setComposeSubject('');
      setComposeBody('');
      setComposeAttachments([]);
      setSelectedDraft(null);
      
      // If we sent from a draft, delete it
      if (selectedDraft) {
        await supabase.from('email_drafts').delete().eq('id', selectedDraft.id);
        loadDrafts();
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi');
    }
  };

  const saveDraft = async () => {
    if (!selectedAccount || !user) return;

    try {
      const draftData = {
        account_id: selectedAccount,
        user_id: user.id,
        to_address: composeTo,
        cc_address: composeCc,
        subject: composeSubject,
        body: composeBody,
        attachments: composeAttachments.map(f => ({ name: f.name, size: f.size })),
        updated_at: new Date().toISOString()
      };

      if (selectedDraft) {
        // Update existing draft
        const { error } = await supabase
          .from('email_drafts')
          .update(draftData)
          .eq('id', selectedDraft.id);
        
        if (error) throw error;
        toast.success('Brouillon mis à jour');
      } else {
        // Create new draft
        const { error } = await supabase
          .from('email_drafts')
          .insert(draftData);
        
        if (error) throw error;
        toast.success('Brouillon sauvegardé');
      }
      
      setShowCompose(false);
      loadDrafts();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Erreur lors de la sauvegarde du brouillon');
    }
  };

  const deleteDraft = async (draftId: string) => {
    try {
      const { error } = await supabase
        .from('email_drafts')
        .delete()
        .eq('id', draftId);
      
      if (error) throw error;
      toast.success('Brouillon supprimé');
      loadDrafts();
      setSelectedDraft(null);
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const openDraft = (draft: any) => {
    setSelectedDraft(draft);
    setComposeTo(draft.to_address || '');
    setComposeCc(draft.cc_address || '');
    setComposeSubject(draft.subject || '');
    setComposeBody(draft.body || '');
    setComposeAttachments([]);
    setShowCompose(true);
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
        {/* Buttons Bar */}
        <div className="bg-white/40 backdrop-blur-md rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Navigation */}
            <div className="flex items-center gap-3">
              <Button
                style={{ backgroundColor: currentFolder === 'inbox' ? (role === 'notaire' ? '#f97316' : '#2563eb') : 'white' }}
                className={`relative h-10 rounded-full text-sm transition-all border-2 ${
                  currentFolder === 'inbox' 
                    ? `text-white ${role === 'notaire' ? '!border-orange-500 hover:!bg-orange-600' : '!border-blue-500 hover:!bg-blue-600'} shadow-md` 
                    : `text-gray-700 !border-gray-200 ${role === 'notaire' ? 'hover:!bg-orange-50/50 hover:!border-orange-300' : 'hover:!bg-blue-50/50 hover:!border-blue-300'}`
                }`}
                onClick={() => setCurrentFolder('inbox')}
                title="Boîte de réception"
              >
                <Inbox className="h-4 w-4 mr-2" />
                Réception
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500" variant="secondary">{unreadCount}</Badge>
                )}
              </Button>
              
              <Button
                style={{ backgroundColor: currentFolder === 'sent' ? '#f97316' : 'white' }}
                className={`h-10 rounded-full text-sm transition-all border-2 ${
                  currentFolder === 'sent'
                    ? 'text-white !border-orange-500 shadow-md hover:!bg-orange-600'
                    : 'text-gray-700 !border-gray-200 hover:!bg-orange-50/50 hover:!border-orange-300'
                }`}
                onClick={() => setCurrentFolder('sent')}
                title="Envoyés"
              >
                <Send className="h-4 w-4 mr-2" />
                Envoyés
              </Button>

              {/* More Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    style={{ backgroundColor: 'white' }}
                    className={`h-10 rounded-full text-sm text-gray-700 border-2 !border-gray-200 ${role === 'notaire' ? 'hover:!bg-orange-50/50 hover:!border-orange-300' : 'hover:!bg-blue-50/50 hover:!border-blue-300'} transition-all`}
                    title="Plus d'options"
                  >
                    <MoreVertical className="h-4 w-4 mr-2" />
                    Plus
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setCurrentFolder('archive')}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archivés
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCurrentFolder('drafts')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Brouillons
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCurrentFolder('trash')}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Corbeille
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Quick Actions - Icon Only */}
              <Button
                style={{ backgroundColor: 'white' }}
                className={`h-10 w-10 rounded-full border-2 !border-gray-200 ${role === 'notaire' ? 'hover:!bg-orange-50/50 hover:!border-orange-300' : 'hover:!bg-blue-50/50 hover:!border-blue-300'} transition-all p-0`}
                onClick={handleSync}
                disabled={syncing}
                title="Synchroniser"
              >
                <RefreshCw className={`h-4 w-4 text-gray-600 ${syncing ? 'animate-spin' : ''}`} />
              </Button>

              <Button
                style={{ backgroundColor: 'white' }}
                className={`h-10 w-10 rounded-full border-2 !border-gray-200 ${role === 'notaire' ? 'hover:!bg-orange-50/50 hover:!border-orange-300' : 'hover:!bg-blue-50/50 hover:!border-blue-300'} transition-all p-0`}
                onClick={markAllAsRead}
                title="Marquer tout comme lu"
              >
                <Mail className="h-4 w-4 text-gray-600" />
              </Button>
              
              {/* Primary CTA */}
              <Button 
                className={`h-10 rounded-full text-sm !text-white shadow-md hover:shadow-lg transition-all border-0 ${role === 'notaire' ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700' : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'}`}
                onClick={handleCompose}
                title="Nouveau message"
              >
                <Send className="h-4 w-4 mr-2" />
                Écrire
              </Button>
            </div>
          </div>
        </div>

        {/* Search Bar & Account Selector */}
        <Card className="shadow-lg">
          <div className="p-4 flex items-center gap-4">
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

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans les emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </Card>

        {/* Email Content Card */}
        <Card className="flex-1 flex flex-col overflow-hidden shadow-lg">        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="flex h-full overflow-hidden rounded-lg border bg-card">
            {/* Email List */}
            <div 
              className="border-r overflow-y-auto bg-background" 
              style={{ width: `${emailListWidth}px`, minWidth: '300px', maxWidth: '800px' }}
            >
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                <p className="mt-2 text-sm text-muted-foreground">Chargement...</p>
              </div>
            ) : currentFolder === 'drafts' ? (
              drafts.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Aucun brouillon</p>
                </div>
              ) : (
                <div className="divide-y">
                  {drafts.map(draft => (
                    <div
                      key={draft.id}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedDraft?.id === draft.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => openDraft(draft)}
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm truncate font-medium">
                              {draft.to_address || '(Aucun destinataire)'}
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {new Date(draft.updated_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                          
                          <div className="text-sm mb-1 truncate font-semibold">
                            {draft.subject || '(Sans objet)'}
                          </div>
                          
                          <div className="text-xs text-muted-foreground truncate">
                            {draft.body ? draft.body.substring(0, 100) + '...' : '(Vide)'}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteDraft(draft.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
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
                      localStorage.setItem('selectedEmailId', email.id);
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

          {/* Resize Handle */}
          <div
            className={`w-1 hover:w-1.5 bg-border hover:bg-primary/50 cursor-col-resize relative group transition-colors ${
              isResizing ? 'w-1.5 bg-primary/50' : ''
            }`}
            onMouseDown={handleMouseDown}
            style={{ transition: isResizing ? 'none' : 'all 0.2s' }}
          >
            <div className="absolute inset-y-0 -left-2 -right-2" />
          </div>

          {/* Email Content */}
          <div className="flex-1 overflow-y-auto bg-background">
            {selectedEmail ? (
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <Button
                    className={mainButtonColor}
                    size="sm"
                    onClick={() => {
                      setSelectedEmail(null);
                      localStorage.removeItem('selectedEmailId');
                    }}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Retour
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button className={mainButtonColor} size="sm" onClick={() => handleReply(selectedEmail)}>
                      <Reply className="h-4 w-4 mr-1" />
                      Répondre
                    </Button>
                    <Button className={mainButtonColor} size="sm" onClick={() => handleForward(selectedEmail)}>
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

                  {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                    <div className="flex items-center gap-2 py-2 px-3 bg-muted/30 rounded-md">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {selectedEmail.attachments.length} pièce{selectedEmail.attachments.length > 1 ? 's' : ''} jointe{selectedEmail.attachments.length > 1 ? 's' : ''}
                      </span>
                      <div className="flex-1" />
                      <div className="flex gap-1">
                        {selectedEmail.attachments.map((attachment, index) => (
                          <Button 
                            key={index}
                            size="sm"
                            variant="ghost"
                            className={role === 'notaire' 
                              ? 'h-7 text-xs px-2 hover:bg-orange-100 hover:text-orange-700' 
                              : 'h-7 text-xs px-2 hover:bg-blue-100 hover:text-blue-700'}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                toast.info('Téléchargement en cours...');
                                
                                // Get auth token
                                const { data: { session } } = await supabase.auth.getSession();
                                const authToken = session?.access_token;
                                
                                const response = await fetch(
                                  'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/gmail-operations',
                                  {
                                    method: 'POST',
                                    headers: { 
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${authToken}`
                                    },
                                    body: JSON.stringify({
                                      action: 'get-attachment',
                                      accountId: selectedAccount,
                                      messageId: selectedEmail.id,
                                      attachmentId: attachment.attachmentId
                                    })
                                  }
                                );
                                
                                if (!response.ok) {
                                  const errorData = await response.json().catch(() => ({}));
                                  throw new Error(errorData.error || 'Erreur lors du téléchargement');
                                }
                                
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = attachment.filename;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                                
                                toast.success('Fichier téléchargé');
                              } catch (error) {
                                console.error('Error downloading attachment:', error);
                                toast.error(error instanceof Error ? error.message : 'Erreur lors du téléchargement');
                              }
                            }}
                          >
                            <Paperclip className="h-3 w-3 mr-1" />
                            {attachment.filename}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="prose prose-sm max-w-none">
                    {selectedEmail.body_html ? (
                      <iframe
                        title="Email Content"
                        srcDoc={`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <meta charset="UTF-8">
                              <base target="_blank">
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
                                  text-decoration: underline;
                                  cursor: pointer;
                                }
                                a:hover {
                                  color: #1d4ed8;
                                }
                                button {
                                  cursor: pointer;
                                }
                              </style>
                            </head>
                            <body>${selectedEmail.body_html}</body>
                          </html>
                        `}
                        className="w-full border-0"
                        style={{ minHeight: '400px' }}
                        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans text-sm">
                        {selectedEmail.body_text}
                      </pre>
                    )}
                  </div>
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
                placeholder="Destinataires (séparer par des virgules)"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder="Cc (optionnel, séparer par des virgules)"
                value={composeCc}
                onChange={(e) => setComposeCc(e.target.value)}
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
                rows={10}
              />
            </div>
            
            {/* Attachments */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={role === 'notaire' ? 'border-orange-600 text-orange-600 hover:bg-orange-50' : 'border-blue-600 text-blue-600 hover:bg-blue-50'}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Joindre des fichiers
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setComposeAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
                    }
                  }}
                />
              </div>
              
              {composeAttachments.length > 0 && (
                <div className="space-y-1">
                  {composeAttachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-3 w-3" />
                        <span>{file.name}</span>
                        <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setComposeAttachments(prev => prev.filter((_, i) => i !== index))}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCompose(false)}>
                Annuler
              </Button>
              <Button 
                variant="outline" 
                className={role === 'notaire' ? 'border-orange-600 text-orange-600 hover:bg-orange-50' : 'border-blue-600 text-blue-600 hover:bg-blue-50'}
                onClick={saveDraft}
              >
                <FileText className="h-4 w-4 mr-2" />
                Sauvegarder en brouillon
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
