import { Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

type NotificationRow = {
  id: string;
  title: string;
  body?: string | null;
  read?: boolean;
  created_at?: string;
  metadata?: any;
};

export function NotificationBell({ role = 'avocat', compact = false }: { role?: 'avocat' | 'notaire', compact?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Use RPCs added in the DB to get unread count and notifications
        const { data: unreadData, error: unreadErr } = await supabase.rpc('get_unread_notifications_count');
        if (!unreadErr) {
          const cnt = typeof unreadData === 'number' ? unreadData : (Array.isArray(unreadData) ? Number(unreadData[0]) : 0);
          if (active) setUnreadCount(cnt ?? 0);
        }

        const { data: list, error: listErr } = await supabase.rpc('get_notifications', { p_limit: 20, p_offset: 0 });
        if (!listErr && active && Array.isArray(list)) {
          setNotifications(list as NotificationRow[]);
        }
      } catch (e) {
        console.error('[NotificationBell] load error', e);
        if (active) setNotifications([]);
      } finally {
        if (active) setLoading(false);
      } 
    };
    load();
    return () => { active = false; };
  }, [user, role]);

  // Realtime subscription to the notifications table for this user
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-user-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` }, (payload) => {
        try {
          const row = payload.new as NotificationRow;
          if (!row) return;
          setNotifications((cur) => (cur.some(n => n.id === row.id) ? cur : [row, ...cur]));
          setUnreadCount((c) => c + 1);
        } catch (e) { console.error('realtime insert notification', e); }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` }, (payload) => {
        try {
          const row = payload.new as NotificationRow;
          const old = payload.old as NotificationRow;
          if (!row) return;
          setNotifications((cur) => cur.map(n => n.id === row.id ? row : n));
          // If update marks as read, decrement unread
          if (old && old.read === false && row.read === true) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
        } catch (e) { console.error('realtime update notification', e); }
      });

    channel.subscribe();
    return () => { try { channel.unsubscribe(); } catch (e) { /* ignore */ } };
  }, [user]);

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
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-destructive rounded-full">{unread}</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[360px]">
        <DialogHeader>
          <div className="flex items-center gap-2 justify-between w-full">
            <DialogTitle>Notifications récentes</DialogTitle>
              <div className="ml-2">
                {/* subtle small button to mark all read */}
                <Button variant="ghost" size="sm" className={`text-[0.78rem] ${accentSubtle} px-2 py-1`} onClick={async () => {
                  try {
                    const { data, error } = await supabase.rpc('mark_all_notifications_read');
                    if (!error) {
                      setNotifications((cur) => cur.map(n => ({ ...n, read: true })));
                      setUnreadCount(0);
                    } else {
                      console.error('mark_all_notifications_read error', error);
                    }
                  } catch (e) { console.error('mark all read', e); }
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
                <div className="space-y-2">
                  {notifications.map(n => {
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

                    const onNavigate = async (meta?: any) => {
                      try {
                        if (!n.read) {
                          const { data, error } = await supabase.rpc('mark_notification_read', { p_id: n.id });
                          if (error) console.error('mark_notification_read error', error);
                        }
                      } catch (e) { console.error('mark_notification_read error', e); }

                      setNotifications((cur) => cur.map(x => x.id === n.id ? { ...x, read: true } : x));
                      setUnreadCount((c) => Math.max(0, c - (n.read ? 0 : 1)));

                      try {
                        let metadataToUse = meta;
                        // If metadata not present in the row, try to fetch it from the DB as a fallback
                        if ((!metadataToUse || typeof metadataToUse !== 'object') && n.id) {
                          try {
                            const { data: fetched, error: fetchErr } = await supabase
                              .from('notifications')
                              .select('metadata')
                              .eq('id', n.id)
                              .limit(1)
                              .single();
                            if (!fetchErr && fetched && (fetched as any).metadata) metadataToUse = (fetched as any).metadata;
                          } catch (fe) {
                            console.error('fetch notification metadata fallback error', fe);
                          }
                        }

                        if (metadataToUse && typeof metadataToUse === 'object') {
                          navigate(`/${role}s/espace-collaboratif`, { state: { notificationOpen: metadataToUse } });
                          setOpen(false);
                        } else {
                          // fallback: just open the collaborative space
                          navigate(`/${role}s/espace-collaboratif`);
                          setOpen(false);
                        }
                      } catch (e) {
                        console.error('navigation error', e);
                        try { navigate(`/${role}s/espace-collaboratif`); } catch (_) { /* ignore */ }
                        setOpen(false);
                      }
                    };

                    return (
                      <div key={n.id} className={`p-1`}>
                        {/* make the whole card clickable for better UX */}
                        <div role="button" tabIndex={0} onClick={() => onNavigate((n as any).metadata)} onKeyDown={(e) => { if (e.key === 'Enter') onNavigate((n as any).metadata); }} className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer ${n.read ? 'bg-background border-border' : 'bg-gradient-to-r from-primary/5 to-accent/5 border-transparent'}`}>
                          <div className="flex-1 text-sm">
                            <div className="font-medium text-sm mb-1">{n.title}</div>
                            {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                          </div>
                          <div className="flex flex-col items-end ml-2">
                            <div className="text-xs text-muted-foreground mb-2" title={when ? when.toLocaleString() : ''}>{timeAgo(when)}</div>
                            {/* colored circular open button so it's obvious and clickable */}
                            <button onClick={(e) => { e.stopPropagation(); onNavigate((n as any).metadata); }} title="Ouvrir" className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${accentBg}`}>
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
