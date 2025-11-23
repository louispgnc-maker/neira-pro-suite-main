import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export function NotificationFloatingButton() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [cabinetId, setCabinetId] = useState<string | null>(null);

  // Determine user role from URL
  const role: 'avocat' | 'notaire' = location.pathname.includes('/notaires') ? 'notaire' : 'avocat';
  const colorClass = role === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700'
    : 'bg-blue-600 hover:bg-blue-700';

  // Load cabinet ID
  useEffect(() => {
    if (!user) return;

    const loadCabinet = async () => {
      const { data, error } = await supabase
        .from('cabinet_members')
        .select('cabinet_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!error && data) {
        setCabinetId(data.cabinet_id);
      }
    };

    loadCabinet();
  }, [user]);

  // Load total unread message count
  useEffect(() => {
    if (!user || !cabinetId) return;

    const loadUnreadCount = async () => {
      try {
        const { data: allMessages, error } = await supabase
          .from('cabinet_messages')
          .select('id, conversation_id, recipient_id, sender_id, created_at')
          .eq('cabinet_id', cabinetId)
          .neq('sender_id', user.id);

        if (error) {
          console.error('Error loading messages:', error);
          return;
        }

        if (!allMessages || allMessages.length === 0) {
          setTotalUnreadCount(0);
          return;
        }

        let totalUnread = 0;
        const conversationIds = new Set<string>();
        
        // Identify all conversations
        allMessages.forEach(msg => {
          if (!msg.conversation_id && !msg.recipient_id) {
            conversationIds.add('general');
          } else if (msg.conversation_id) {
            conversationIds.add(msg.conversation_id);
          } else if (msg.recipient_id === user.id) {
            conversationIds.add(`direct-${msg.sender_id}`);
          }
        });

        // Count unread for each conversation
        for (const convId of conversationIds) {
          const lastViewedKey = `chat-last-viewed-${cabinetId}-${convId}`;
          const lastViewed = sessionStorage.getItem(lastViewedKey);
          
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
            const unreadInConv = convMessages.filter(m => new Date(m.created_at) > new Date(lastViewed)).length;
            totalUnread += unreadInConv;
          } else {
            totalUnread += convMessages.length;
          }
        }

        setTotalUnreadCount(totalUnread);
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };

    loadUnreadCount();

    // Subscribe to new messages
    const channel = supabase
      .channel(`floating-unread-messages-${cabinetId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cabinet_messages',
          filter: `cabinet_id=eq.${cabinetId}`
        },
        (payload) => {
          const newMsg = payload.new as { sender_id: string };
          if (newMsg.sender_id !== user.id) {
            setTotalUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    // Listen for conversation read events
    const handleConversationRead = () => {
      loadUnreadCount();
    };

    window.addEventListener('cabinet-conversation-read', handleConversationRead);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('cabinet-conversation-read', handleConversationRead);
    };
  }, [user, cabinetId]);

  const handleClick = () => {
    navigate(`/${role}s/espace-collaboratif?tab=discussion`);
  };

  // Don't show on the collaborative space discussion tab
  if (location.pathname.includes('/espace-collaboratif') && location.search.includes('tab=discussion')) {
    return null;
  }

  return (
    <Button
      onClick={handleClick}
      className={`fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg ${colorClass} text-white z-50 hover:scale-110 transition-transform`}
      title="Messages"
    >
      <div className="relative">
        <Mail className="h-6 w-6" />
        {totalUnreadCount > 0 && (
          <Badge 
            className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-1 bg-red-600 text-white border-2 border-white text-xs font-bold"
          >
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </Badge>
        )}
      </div>
    </Button>
  );
}
