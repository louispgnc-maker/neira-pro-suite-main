import { Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

type NotificationRow = {
  id: string;
  title: string;
  body?: string | null;
  read?: boolean;
  created_at?: string;
  metadata?: unknown;
};

export function NotificationBell({ role = 'avocat', compact = false, cabinetId }: { role?: 'avocat' | 'notaire', compact?: boolean, cabinetId?: string | null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { toast } = useToast();

  const loadNotifications = async () => {
    if (!user || !cabinetId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Get all messages in the cabinet where user is not the sender
      const { data: allMessages, error } = await supabase
        .from('cabinet_messages')
        .select('id, conversation_id, recipient_id, sender_id, created_at, content, sender:profiles!cabinet_messages_sender_id_fkey(first_name, last_name)')
        .eq('cabinet_id', cabinetId)
        .neq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading messages:', error);
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      if (!allMessages || allMessages.length === 0) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      let totalUnread = 0;
      const conversationIds = new Set<string>();
      const unreadByConversation = new Map<string, { count: number; lastMessage: any }>();
      
      // Identify all conversations and count unread
      allMessages.forEach(msg => {
        let convId = '';
        if (!msg.conversation_id && !msg.recipient_id) {
          convId = 'general';
        } else if (msg.conversation_id) {
          convId = msg.conversation_id;
        } else if (msg.recipient_id === user.id) {
          convId = `direct-${msg.sender_id}`;
        }
        
        if (convId) {
          conversationIds.add(convId);
        }
      });

      // Count unread for each conversation
      for (const convId of conversationIds) {
        const lastViewedKey = `chat-last-viewed-${cabinetId}-${convId}`;
        const lastViewed = localStorage.getItem(lastViewedKey);
        
        let convMessages = [];
        if (convId === 'general') {
          convMessages = allMessages.filter(m => !m.conversation_id && !m.recipient_id);
        } else if (convId.startsWith('direct-')) {
          const senderId = convId.replace('direct-', '');
          convMessages = allMessages.filter(m => 
            m.sender_id === senderId && 
            m.recipient_id === user.id && 
            !m.conversation_id
          );
        } else {
          convMessages = allMessages.filter(m => m.conversation_id === convId);
        }

        if (lastViewed) {
          const unreadInConv = convMessages.filter(m => new Date(m.created_at) > new Date(lastViewed));
          const count = unreadInConv.length;
          totalUnread += count;
          
          if (count > 0 && unreadInConv[0]) {
            unreadByConversation.set(convId, { count, lastMessage: unreadInConv[0] });
          }
        } else {
          totalUnread += convMessages.length;
          if (convMessages.length > 0) {
            unreadByConversation.set(convId, { count: convMessages.length, lastMessage: convMessages[0] });
          }
        }
      }

      // Convert to notification format for display
      const notificationsList: NotificationRow[] = Array.from(unreadByConversation.entries())
        .filter(([_, data]) => data && data.lastMessage)
        .map(([convId, data]) => {
          const sender = data.lastMessage?.sender;
          const senderName = sender ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() : 'Quelqu\'un';
          
          let title = '';
          if (convId === 'general') {
            title = 'Canal Général';
          } else if (convId.startsWith('direct-')) {
            title = `Message de ${senderName}`;
          } else {
            title = `Discussion`;
          }

          return {
            id: convId,
            title,
            body: `${data.count} message${data.count > 1 ? 's' : ''} non lu${data.count > 1 ? 's' : ''}`,
            read: false,
            created_at: data.lastMessage?.created_at || new Date().toISOString(),
            metadata: { conversationId: convId }
          };
        })
        .filter(n => n && n.id && n.title) // Double filtrage pour être sûr
        .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());

      setNotifications(notificationsList);
      setUnreadCount(totalUnread);
    } catch (e) {
      console.error('[NotificationBell] load error', e);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && cabinetId) {
      loadNotifications();
    }
  }, [user, role, cabinetId]);

  // Recharger quand la modal se ferme pour s'assurer d'avoir le bon compteur
  useEffect(() => {
    if (!open && user) {
      // Petit délai pour laisser le temps aux updates de se propager
      const timer = setTimeout(() => {
        loadNotifications();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [open, user]);

  // Realtime subscription to the cabinet_messages table for new messages
  useEffect(() => {
    if (!user || !cabinetId) return;
    const channel = supabase
      .channel(`chat-messages-${cabinetId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'cabinet_messages', 
        filter: `cabinet_id=eq.${cabinetId}` 
      }, (payload) => {
        try {
          const row = payload.new as any;
          if (!row || row.sender_id === user.id) return;
          
          // Increment unread count
          setUnreadCount((c) => c + 1);
          
          // Reload to update the list
          loadNotifications();
        } catch (e) { 
          console.error('realtime insert message', e); 
        }
      })
      .subscribe();

    // Listen for conversation read events to update counter
    const handleConversationRead = () => {
      loadNotifications();
    };

    window.addEventListener('cabinet-conversation-read', handleConversationRead);

    return () => { 
      try { 
        channel.unsubscribe(); 
        window.removeEventListener('cabinet-conversation-read', handleConversationRead);
      } catch (e) { /* ignore */ } 
    };
  }, [user, cabinetId]);

  const unread = unreadCount;

  const baseColor = role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white';
  const accentBg = role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white';
  // subtle mark-all button: on hover the text/background becomes slightly darker (not lighter)
  const accentSubtle = role === 'notaire'
    ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-100'
    : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100';
  const btnSizeClass = compact ? 'h-8 w-8 p-0 flex items-center justify-center rounded-md' : 'p-2 rounded-md';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className={`relative ${btnSizeClass} ${baseColor}`}> 
          <Bell className={compact ? 'h-4 w-4 text-white' : 'h-5 w-5 text-white'} />
          {unread > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0.5 bg-red-600 text-white text-[10px] font-bold"
            >
              {unread > 99 ? '99+' : unread}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[360px]">
        <DialogHeader>
          <div className="flex items-center gap-2 justify-between w-full">
            <DialogTitle>Messages non lus</DialogTitle>
              <div className="ml-2">
                <Button variant="ghost" size="sm" className={`text-[0.78rem] ${accentSubtle} px-2 py-1`} onClick={async () => {
                  try {
                    if (!cabinetId) return;
                    
                    // Mark all conversations as read
                    const { data: allMessages } = await supabase
                      .from('cabinet_messages')
                      .select('id, conversation_id, recipient_id, sender_id')
                      .eq('cabinet_id', cabinetId)
                      .neq('sender_id', user.id);

                    if (allMessages && allMessages.length > 0) {
                      const conversationIds = new Set<string>();
                      
                      allMessages.forEach(msg => {
                        if (!msg.conversation_id && !msg.recipient_id) {
                          conversationIds.add('general');
                        } else if (msg.conversation_id) {
                          conversationIds.add(msg.conversation_id);
                        } else if (msg.recipient_id === user.id) {
                          conversationIds.add(`direct-${msg.sender_id}`);
                        }
                      });

                      const now = new Date().toISOString();
                      conversationIds.forEach(convId => {
                        const lastViewedKey = `chat-last-viewed-${cabinetId}-${convId}`;
                        localStorage.setItem(lastViewedKey, now);
                      });

                      setNotifications([]);
                      setUnreadCount(0);
                      toast({ title: 'Messages marqués comme lus', description: 'Tous les messages ont été marqués comme lus' });
                    }
                  } catch (e: unknown) { 
                    console.error('mark all read', e); 
                    toast({ title: 'Erreur', description: String(e), variant: 'destructive' }); 
                  }
                }}>Tout marquer comme lu</Button>
              </div>
          </div>
        </DialogHeader>
        <div className="space-y-3 mt-2">
              {loading ? (
                <div className="text-sm text-muted-foreground">Chargement…</div>
              ) : notifications.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aucune notification</div>
              ) : (
                // limit visible area to exactly ~3 items and allow scrolling for older notifications
                <div className="space-y-2 max-h-[216px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300" style={{ scrollbarWidth: 'thin' }}>
                  {notifications.map(n => {
                    if (!n || !n.id) return null;
                    const when = n.created_at ? new Date(n.created_at) : null;
                    const timeAgo = (d: Date | null) => {
                      if (!d) return '';
                      const now = new Date();
                      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
                      if (diffSec < 10) return "À l'instant";
                      if (diffSec < 60) return `Il y a ${diffSec} s`;
                      const diffMin = Math.floor(diffSec / 60);
                      if (diffMin < 60) return `Il y a ${diffMin} min`;
                      const diffH = Math.floor(diffMin / 60);
                      if (diffH < 24) return `Il y a ${diffH} h`;
                      const diffDays = Math.floor(diffH / 24);
                      if (diffDays === 1) return 'Hier';
                      if (diffDays < 7) return `Il y a ${diffDays} j`;
                      try {
                        return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
                      } catch (e) {
                        return d.toLocaleDateString();
                      }
                    };

                    const onNavigate = async (meta?: unknown) => {
                      // Navigate to discussion tab with the conversation
                      try {
                        const metadata = meta as { conversationId?: string } | undefined;
                        if (metadata?.conversationId) {
                          navigate(`/${role}s/espace-collaboratif?tab=discussion&conv=${metadata.conversationId}`);
                        } else {
                          navigate(`/${role}s/espace-collaboratif?tab=discussion`);
                        }
                        setOpen(false);
                      } catch (e) {
                        console.error('navigation error', e);
                        try { navigate(`/${role}s/espace-collaboratif?tab=discussion`); } catch (_) { /* ignore */ }
                        setOpen(false);
                      }
                    };

                    return (
                      <div key={n.id} className={`p-1`}> 
                        {/* make the whole card clickable for better UX */}
                        <div role="button" tabIndex={0} onClick={() => onNavigate(n.metadata)} onKeyDown={(e) => { if (e.key === 'Enter') onNavigate(n.metadata); }} className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer box-border overflow-hidden ${n.read ? 'bg-background border-border' : 'bg-gradient-to-r from-primary/5 to-accent/5 border-transparent'}`}>
                          <div className="flex-1 text-sm">
                            <div className="font-medium text-sm mb-1">{n.title}</div>
                            {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                          </div>
                          <div className="flex flex-col items-end ml-2">
                            <div className="text-xs text-muted-foreground mb-2" title={when ? when.toLocaleString() : ''}>{timeAgo(when)}</div>
                            {/* colored circular open button so it's obvious and clickable */}
                            <button onClick={(e) => { e.stopPropagation(); onNavigate(n.metadata); }} title="Ouvrir" className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${accentBg}`}>
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
