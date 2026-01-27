import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Check, Trash2, FileText, FolderOpen, FileSignature, UserPlus, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface CabinetNotification {
  id: string;
  cabinet_id: string;
  recipient_id: string;
  actor_id: string;
  title: string;
  message: string;
  type: 'cabinet_message' | 'cabinet_document' | 'cabinet_dossier' | 'cabinet_contrat' | 'cabinet_client';
  reference_id: string;
  is_read: boolean;
  created_at: string;
}

export function CabinetNotificationsCard() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<CabinetNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    
    // Écouter les nouvelles notifications en temps réel
    const channel = supabase
      .channel('cabinet_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cabinet_notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('cabinet_notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur chargement notifications:', error);
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('cabinet_notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour de la notification');
    } else {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('cabinet_notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour des notifications');
    } else {
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      toast.success('Toutes les notifications marquées comme lues');
    }
  };

  const deleteReadNotifications = async () => {
    const readIds = notifications.filter(n => n.is_read).map(n => n.id);
    if (readIds.length === 0) {
      toast.info('Aucune notification lue à supprimer');
      return;
    }

    const { error } = await supabase
      .from('cabinet_notifications')
      .delete()
      .in('id', readIds);

    if (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression des notifications');
    } else {
      setNotifications(prev => prev.filter(n => !n.is_read));
      toast.success(`${readIds.length} notification(s) supprimée(s)`);
    }
  };

  const getIcon = (type: CabinetNotification['type']) => {
    switch (type) {
      case 'cabinet_message':
        return <MessageSquare className="h-4 w-4" />;
      case 'cabinet_document':
        return <FileText className="h-4 w-4" />;
      case 'cabinet_dossier':
        return <FolderOpen className="h-4 w-4" />;
      case 'cabinet_contrat':
        return <FileSignature className="h-4 w-4" />;
      case 'cabinet_client':
        return <UserPlus className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications cabinet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications cabinet
              {unreadCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Activité de votre cabinet
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
              >
                <Check className="h-4 w-4 mr-2" />
                Tout marquer lu
              </Button>
            )}
            {notifications.some(n => n.is_read) && (
              <Button
                variant="outline"
                size="sm"
                onClick={deleteReadNotifications}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Effacer lues
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-lg border transition-colors ${
                  notif.is_read
                    ? 'bg-background border-border'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    notif.is_read ? 'bg-gray-100' : 'bg-blue-100'
                  }`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{notif.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notif.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notif.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notif.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
