import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export function useUnreadEmailCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const loadUnreadCount = async () => {
      try {
        // Récupérer tous les comptes email de l'utilisateur
        const { data: accounts } = await supabase
          .from('email_accounts')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'connected');

        if (!accounts || accounts.length === 0) {
          setUnreadCount(0);
          return;
        }

        const accountIds = accounts.map(a => a.id);

        // Compter les emails non lus
        const { count, error } = await supabase
          .from('emails')
          .select('*', { count: 'exact', head: true })
          .in('account_id', accountIds)
          .eq('read', false)
          .eq('folder', 'inbox');

        if (!error && count !== null) {
          setUnreadCount(count);
        }
      } catch (error) {
        console.error('Error loading unread email count:', error);
      }
    };

    loadUnreadCount();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('email-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emails' }, () => {
        loadUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return unreadCount;
}
