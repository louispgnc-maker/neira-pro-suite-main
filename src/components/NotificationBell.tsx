import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

type NotificationRow = {
  id: string;
  title: string;
  body?: string | null;
  read?: boolean;
  created_at?: string;
};

export function NotificationBell({ role = 'avocat', compact = false }: { role?: 'avocat' | 'notaire', compact?: boolean }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Try to fetch from a `notifications` table if present
        const { data, error } = await supabase
          .from('notifications')
          .select('id,title,body,read,created_at')
          .eq('owner_id', user.id)
          .eq('role', role)
          .order('created_at', { ascending: false })
          .limit(10);
        if (error) {
          // Table may not exist; fallback to empty
          console.debug('[NotificationBell] notifications fetch error:', error.message);
          if (active) setNotifications([]);
        } else {
          if (active) setNotifications((data || []) as NotificationRow[]);
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

  // Realtime subscriptions for relevant events
  useEffect(() => {
    if (!user) return;
    let channel: any = null;
    try {
      channel = supabase.channel(`notifications-listen-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'documents' }, (payload) => {
          try {
            const row = payload.new as any;
            if (row?.owner_id !== user.id) return; // only notify for this user's space
            const n = {
              id: `doc-${row.id}`,
              title: `Nouveau document: ${row.name || 'Document'}`,
              body: row.client_name || undefined,
              read: false,
              created_at: new Date().toISOString(),
            } as NotificationRow;
            setNotifications((s) => [n, ...s]);
          } catch (e) { console.error('notification doc payload', e); }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clients' }, (payload) => {
          try {
            const row = payload.new as any;
            if (row?.owner_id !== user.id) return;
            const n = {
              id: `client-${row.id}`,
              title: `Nouvelle fiche client: ${row.name || row.prenom || 'Client'}`,
              body: undefined,
              read: false,
              created_at: new Date().toISOString(),
            } as NotificationRow;
            setNotifications((s) => [n, ...s]);
          } catch (e) { console.error('notification client payload', e); }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'signatures' }, (payload) => {
          try {
            const row = payload.new as any;
            const old = payload.old as any;
            if (row?.owner_id !== user.id) return;
            // notify when signature becomes completed
            if (row.status === 'completed' && old?.status !== 'completed') {
              const n = {
                id: `sig-${row.id}`,
                title: `Document signé: ${row.document_name || 'Signature'}`,
                body: row.signer || undefined,
                read: false,
                created_at: new Date().toISOString(),
              } as NotificationRow;
              setNotifications((s) => [n, ...s]);
            }
          } catch (e) { console.error('notification sig payload', e); }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
          try {
            const row = payload.new as any;
            // someone joined — ensure it's not the current user
            if (!row || row.id === user.id) return;
            // optionally filter by role matching
            if (row.role && row.role !== role) return;
            const n = {
              id: `user-${row.id}`,
              title: `Nouvel utilisateur dans l'espace: ${row.first_name || row.email || 'Utilisateur'}`,
              body: undefined,
              read: false,
              created_at: new Date().toISOString(),
            } as NotificationRow;
            setNotifications((s) => [n, ...s]);
          } catch (e) { console.error('notification profile payload', e); }
        });

      channel.subscribe();
    } catch (e) {
      console.error('Realtime channel error:', e);
    }

    return () => {
      try { channel?.unsubscribe && channel.unsubscribe(); } catch (e) { /* ignore */ }
    };
  }, [user, role]);

  const unread = notifications.filter(n => !n.read).length;

  const baseColor = role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white';
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
          <DialogTitle>Notifications récentes</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {loading ? (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          ) : notifications.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucune notification</div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`p-3 rounded-md ${n.read ? 'bg-background' : 'bg-gradient-to-r from-primary/5 to-accent/5'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{n.title}</div>
                    {n.body && <div className="text-sm text-muted-foreground">{n.body}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground ml-4">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
