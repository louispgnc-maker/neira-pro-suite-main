import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { Bell, Check, Folder, FileText, User, MessageSquare, FileSignature, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'dossier_created' | 'dossier_updated' | 'document_added' | 'profile_updated' | 'new_message' | 'contrat_shared';
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationsCardProps {
  clientId: string;
  professionType?: 'avocat' | 'notaire';
}

export default function NotificationsCard({ clientId, professionType = 'avocat' }: NotificationsCardProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('client-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_notifications',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('client_notifications')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('client_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Erreur lors de la mise à jour de la notification');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('client_notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erreur lors de la mise à jour des notifications');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    // Navigate based on notification type
    switch (notification.type) {
      case 'dossier_created':
      case 'dossier_updated':
        if (notification.reference_id) {
          navigate(`/client-space/dossiers/${notification.reference_id}`);
        } else {
          navigate('/client-space/dossiers');
        }
        break;
      case 'document_added':
        navigate('/client-space/documents');
        break;
      case 'new_message':
        navigate('/client-space/discussion');
        break;
      case 'profile_updated':
        navigate('/client-space/profile');
        break;
      case 'contrat_shared':
        navigate('/client-space/contrats');
        break;
      default:
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = professionType === 'avocat' ? 'text-blue-600' : 'text-orange-600';
    
    switch (type) {
      case 'dossier_created':
      case 'dossier_updated':
        return <Folder className={`h-5 w-5 ${iconClass}`} />;
      case 'document_added':
        return <FileText className={`h-5 w-5 ${iconClass}`} />;
      case 'new_message':
        return <MessageSquare className={`h-5 w-5 ${iconClass}`} />;
      case 'profile_updated':
        return <User className={`h-5 w-5 ${iconClass}`} />;
      case 'contrat_shared':
        return <FileSignature className={`h-5 w-5 ${iconClass}`} />;
      default:
        return <Bell className={`h-5 w-5 ${iconClass}`} />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return "À l'instant";
    if (diffInMins < 60) return `Il y a ${diffInMins} min`;
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className={`h-5 w-5 ${professionType === 'avocat' ? 'text-blue-600' : 'text-orange-600'}`} />
            <CardTitle className="text-lg">Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge
                variant="default"
                className={professionType === 'avocat' ? 'bg-blue-600' : 'bg-orange-600'}
              >
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Check className="h-3 w-3 mr-1" />
              Tout marquer lu
            </Button>
          )}
        </div>
        <CardDescription>Restez informé de toutes les nouveautés</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Chargement...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Aucune notification</p>
            <p className="text-sm text-gray-400 mt-1">
              Vous serez notifié des nouveautés ici
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  notification.is_read
                    ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    : professionType === 'avocat'
                    ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    : 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-medium text-sm ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                      {notification.title}
                    </p>
                    {!notification.is_read && (
                      <div
                        className={`h-2 w-2 rounded-full flex-shrink-0 mt-1.5 ${
                          professionType === 'avocat' ? 'bg-blue-600' : 'bg-orange-600'
                        }`}
                      />
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${notification.is_read ? 'text-gray-500' : 'text-gray-600'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatTime(notification.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
