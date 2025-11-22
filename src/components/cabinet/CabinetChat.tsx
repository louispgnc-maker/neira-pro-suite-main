import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Users, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CabinetMember {
  id: string;
  user_id: string;
  role_cabinet: string;
  status: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

interface Message {
  id: string;
  cabinet_id: string;
  sender_id: string;
  recipient_id: string | null;
  message: string;
  created_at: string;
  sender_profile?: {
    first_name?: string;
    last_name?: string;
  };
}

interface CabinetChatProps {
  cabinetId: string;
  role: string;
}

export function CabinetChat({ cabinetId, role }: CabinetChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<CabinetMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load cabinet members
  useEffect(() => {
    if (!cabinetId) return;

    const loadMembers = async () => {
      const { data, error } = await supabase
        .from('cabinet_members')
        .select(`
          id,
          user_id,
          role_cabinet,
          status,
          profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('cabinet_id', cabinetId)
        .eq('status', 'active');

      if (error) {
        console.error('Error loading members:', error);
        return;
      }

      const membersWithProfiles = (data || []).map(m => ({
        ...m,
        profile: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      }));

      setMembers(membersWithProfiles);
    };

    loadMembers();
  }, [cabinetId]);

  // Load messages
  useEffect(() => {
    if (!cabinetId || !user) return;

    const loadMessages = async () => {
      // Load messages: general (recipient_id IS NULL) or private (involving current user)
      const { data, error } = await supabase
        .from('cabinet_messages')
        .select('*')
        .eq('cabinet_id', cabinetId)
        .or(`recipient_id.is.null,sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      // Load sender profiles
      const senderIds = [...new Set(data?.map(m => m.sender_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', senderIds);

      const profilesMap = new Map(
        profilesData?.map(p => [p.id, p]) || []
      );

      const messagesWithProfiles = (data || []).map(m => ({
        ...m,
        sender_profile: profilesMap.get(m.sender_id)
      }));

      setMessages(messagesWithProfiles);
    };

    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`cabinet_messages:${cabinetId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cabinet_messages',
          filter: `cabinet_id=eq.${cabinetId}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // Only add if it's a general message or involves current user
          if (
            newMsg.recipient_id === null ||
            newMsg.sender_id === user?.id ||
            newMsg.recipient_id === user?.id
          ) {
            // Load sender profile
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, first_name, last_name')
              .eq('id', newMsg.sender_id)
              .single();

            setMessages(prev => [...prev, {
              ...newMsg,
              sender_profile: profileData || undefined
            }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cabinetId, user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !cabinetId || sending) return;

    setSending(true);

    try {
      const { error } = await supabase
        .from('cabinet_messages')
        .insert({
          cabinet_id: cabinetId,
          sender_id: user.id,
          recipient_id: selectedRecipient,
          message: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getDisplayName = (profile?: { first_name?: string; last_name?: string }) => {
    if (!profile) return 'Inconnu';
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Inconnu';
  };

  const getInitials = (profile?: { first_name?: string; last_name?: string }) => {
    if (!profile) return '?';
    const first = profile.first_name?.[0] || '';
    const last = profile.last_name?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const getRoleBadgeColor = (roleStr: string) => {
    if (roleStr === 'notaire') return 'bg-orange-100 text-orange-600';
    if (roleStr === 'avocat') return 'bg-blue-100 text-blue-600';
    return 'bg-gray-100 text-gray-600';
  };

  // Filter messages based on selected recipient
  const filteredMessages = selectedRecipient
    ? messages.filter(m => 
        (m.sender_id === user?.id && m.recipient_id === selectedRecipient) ||
        (m.sender_id === selectedRecipient && m.recipient_id === user?.id)
      )
    : messages.filter(m => m.recipient_id === null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[calc(100vh-300px)]">
      {/* Sidebar: Members list */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Membres du cabinet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* General channel */}
          <Button
            variant={selectedRecipient === null ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setSelectedRecipient(null)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Salon général
          </Button>

          <div className="border-t pt-2 space-y-1">
            <p className="text-xs text-muted-foreground px-2 mb-2">Messages privés</p>
            {members
              .filter(m => m.user_id !== user?.id)
              .map(member => (
                <Button
                  key={member.id}
                  variant={selectedRecipient === member.user_id ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedRecipient(member.user_id)}
                >
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarFallback className={`text-xs ${getRoleBadgeColor(member.role_cabinet)}`}>
                      {getInitials(member.profile)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">
                    {getDisplayName(member.profile)}
                  </span>
                </Button>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Main chat area */}
      <Card className="md:col-span-3 flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedRecipient === null ? (
              <span className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Salon général
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className={`text-xs ${getRoleBadgeColor(
                    members.find(m => m.user_id === selectedRecipient)?.role_cabinet || ''
                  )}`}>
                    {getInitials(members.find(m => m.user_id === selectedRecipient)?.profile)}
                  </AvatarFallback>
                </Avatar>
                {getDisplayName(members.find(m => m.user_id === selectedRecipient)?.profile)}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {selectedRecipient === null 
              ? 'Discutez avec tous les membres du cabinet'
              : 'Conversation privée'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col min-h-0">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-3" ref={scrollAreaRef}>
            {filteredMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Aucun message pour le moment</p>
              </div>
            ) : (
              filteredMessages.map(msg => {
                const isOwnMessage = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={`text-xs ${
                        isOwnMessage 
                          ? getRoleBadgeColor(role)
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {getInitials(msg.sender_profile)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={`text-sm font-medium ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                          {isOwnMessage ? 'Vous' : getDisplayName(msg.sender_profile)}
                        </span>
                        <span className={`text-xs text-muted-foreground ${isOwnMessage ? 'order-1' : 'order-2'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <div className={`inline-block px-3 py-2 rounded-lg ${
                        isOwnMessage
                          ? role === 'notaire' 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-blue-500 text-white'
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div className="flex gap-2">
            <Textarea
              placeholder={
                selectedRecipient === null 
                  ? 'Écrivez votre message au salon général...'
                  : 'Écrivez votre message privé...'
              }
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-h-[60px] max-h-[120px]"
              disabled={sending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className={role === 'notaire' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
