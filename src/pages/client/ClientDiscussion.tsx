import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  client_id: string;
  sender_id: string;
  sender_type: 'client' | 'professional';
  message: string;
  created_at: string;
  sender_profile?: {
    first_name?: string;
    last_name?: string;
    photo_url?: string;
  };
}

interface Professional {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
  email?: string;
}

export default function ClientDiscussion() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load professional info
  useEffect(() => {
    const loadProfessional = async () => {
      if (!user) return;

      try {
        // Get client info to find the professional
        const { data: clientData } = await supabase
          .from('clients')
          .select('owner_id, profiles!clients_owner_id_fkey(id, first_name, last_name, photo_url, email)')
          .eq('user_id', user.id)
          .single();

        if (clientData && clientData.profiles) {
          setProfessional({
            id: clientData.profiles.id,
            first_name: clientData.profiles.first_name || '',
            last_name: clientData.profiles.last_name || '',
            photo_url: clientData.profiles.photo_url,
            email: clientData.profiles.email,
          });
        }
      } catch (error) {
        console.error('Error loading professional:', error);
      }
    };

    loadProfessional();
  }, [user]);

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Get client ID
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!clientData) {
          setLoading(false);
          return;
        }

        // Load messages
        const { data, error } = await supabase
          .from('client_messages')
          .select(`
            *,
            sender_profile:profiles!client_messages_sender_id_fkey(first_name, last_name, photo_url)
          `)
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setMessages(data || []);
      } catch (error) {
        console.error('Error loading messages:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les messages",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [user, toast]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return;

    let clientId: string;

    const setupSubscription = async () => {
      // Get client ID
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!clientData) return;
      clientId = clientData.id;

      const channel = supabase
        .channel(`client_messages:${clientId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'client_messages',
            filter: `client_id=eq.${clientId}`,
          },
          async (payload) => {
            const newMsg = payload.new as Message;
            
            // Load sender profile
            const { data: profileData } = await supabase
              .from('profiles')
              .select('first_name, last_name, photo_url')
              .eq('id', newMsg.sender_id)
              .single();

            setMessages((prev) => [...prev, { 
              ...newMsg, 
              sender_profile: profileData || undefined 
            }]);
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    };

    setupSubscription();
  }, [user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return;

    try {
      setSending(true);

      // Get client ID
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!clientData) throw new Error('Client not found');

      const { error } = await supabase
        .from('client_messages')
        .insert({
          client_id: clientData.id,
          sender_id: user.id,
          sender_type: 'client',
          message: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Discussion</h1>
        <p className="text-gray-600">
          Communiquez avec votre professionnel
        </p>
      </div>

      <Card className="h-[calc(100vh-280px)] flex flex-col">
        {/* Header with professional info */}
        {professional && (
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={professional.photo_url} />
                <AvatarFallback>
                  {professional.first_name[0]}{professional.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">
                  {professional.first_name} {professional.last_name}
                </CardTitle>
                {professional.email && (
                  <CardDescription>{professional.email}</CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
        )}

        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Aucun message
              </h3>
              <p className="text-gray-500 max-w-md">
                Commencez la conversation avec votre professionnel
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isOwnMessage = msg.sender_id === user?.id;
                const senderName = msg.sender_profile
                  ? `${msg.sender_profile.first_name || ''} ${msg.sender_profile.last_name || ''}`.trim()
                  : 'Utilisateur';

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={msg.sender_profile?.photo_url} />
                      <AvatarFallback className="text-xs">
                        {senderName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={`text-sm font-medium ${isOwnMessage ? 'order-2' : ''}`}>
                          {isOwnMessage ? 'Vous' : senderName}
                        </span>
                        <span className={`text-xs text-gray-500 ${isOwnMessage ? 'order-1' : ''}`}>
                          {new Date(msg.created_at).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div
                        className={`inline-block px-4 py-2 rounded-lg ${
                          isOwnMessage
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Écrivez votre message... (Entrée pour envoyer, Shift+Entrée pour nouvelle ligne)"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="resize-none"
              rows={2}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
