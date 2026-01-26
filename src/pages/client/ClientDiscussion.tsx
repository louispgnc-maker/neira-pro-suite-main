import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Send, MessageSquare, Upload, FileText, Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ClientLayout from '@/components/client/ClientLayout';

interface Message {
  id: string;
  client_id: string;
  sender_id: string;
  sender_type: 'client' | 'professional';
  message: string;
  created_at: string;
  has_attachment?: boolean;
  attachment_name?: string;
  attachment_url?: string;
  attachment_type?: string;
  attachment_size?: number;
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
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerName, setViewerName] = useState('');
  const [viewerType, setViewerType] = useState('');
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
        // Get client info to find the cabinet
        const { data: clientData } = await supabase
          .from('clients')
          .select('owner_id')
          .eq('user_id', user.id)
          .single();

        if (clientData) {
          // Get the first cabinet member (professional) from the cabinet
          const { data: cabinetMember } = await supabase
            .from('cabinet_members')
            .select('user_id, profiles(id, first_name, last_name, photo_url, email)')
            .eq('cabinet_id', clientData.owner_id)
            .eq('status', 'active')
            .limit(1)
            .single();

          if (cabinetMember?.profiles) {
            setProfessional({
              id: cabinetMember.profiles.id,
              first_name: cabinetMember.profiles.first_name || '',
              last_name: cabinetMember.profiles.last_name || '',
              photo_url: cabinetMember.profiles.photo_url,
              email: cabinetMember.profiles.email,
            });
          }
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
        const { data: messagesData, error } = await supabase
          .from('client_messages')
          .select('*')
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Load sender profiles for all messages
        if (messagesData && messagesData.length > 0) {
          const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, photo_url')
            .in('id', senderIds);

          // Map profiles to messages
          const messagesWithProfiles = messagesData.map(msg => ({
            ...msg,
            sender_profile: profilesData?.find(p => p.id === msg.sender_id)
          }));

          setMessages(messagesWithProfiles || []);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        // Silent fail - just set empty messages
        setMessages([]);
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
    if ((!newMessage.trim() && !attachedFile) || !user || sending) return;

    try {
      setSending(true);

      // Get client ID
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, owner_id')
        .eq('user_id', user.id)
        .single();

      if (!clientData) throw new Error('Client not found');

      let attachmentData = {};
      
      // Upload file if attached
      if (attachedFile) {
        const fileExt = attachedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${clientData.owner_id}/messages/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, attachedFile);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = await supabase.storage
          .from('documents')
          .createSignedUrl(filePath, 365 * 24 * 60 * 60); // 1 year
        
        attachmentData = {
          has_attachment: true,
          attachment_name: attachedFile.name,
          attachment_url: urlData?.signedUrl || filePath,
          attachment_type: attachedFile.type,
          attachment_size: attachedFile.size,
        };
      }

      const { error } = await supabase
        .from('client_messages')
        .insert({
          client_id: clientData.id,
          sender_id: user.id,
          sender_type: 'client',
          message: newMessage.trim() || '📎 Fichier joint',
          ...attachmentData,
        })
        .select()
        .single();

      if (error) throw error;

      // Ajouter le message immédiatement à l'état local
      if (error) {
        const newMsg: Message = {
          id: error.id,
          client_id: clientData.id,
          sender_id: user.id,
          sender_type: 'client',
          message: newMessage.trim() || '📎 Fichier joint',
          created_at: new Date().toISOString(),
          sender_profile: {
            first_name: profile?.first_name,
            last_name: profile?.last_name,
            photo_url: profile?.photo_url,
          },
          ...attachmentData,
        };
        setMessages(prev => [...prev, newMsg]);
      }

      setNewMessage('');
      setAttachedFile(null);
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
      <ClientLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-gray-500">Chargement...</div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
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
                const isOwnMessage = msg.sender_type === 'client';
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
                        {msg.has_attachment && msg.attachment_url && (
                          <button
                            onClick={() => {
                              setViewerUrl(msg.attachment_url!);
                              setViewerName(msg.attachment_name || 'Fichier');
                              setViewerType(msg.attachment_type || '');
                              setViewerOpen(true);
                            }}
                            className={`flex items-center gap-2 mt-2 px-3 py-1.5 rounded text-xs ${
                              isOwnMessage ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                            }`}
                          >
                            <FileText className="w-4 h-4" />
                            {msg.attachment_name}
                          </button>
                        )}
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
          {attachedFile && (
            <div className="mb-3 flex items-center gap-2 p-2 bg-blue-50 rounded-md">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-900 flex-1">{attachedFile.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAttachedFile(null)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                placeholder="Écrivez votre message... (Entrée pour envoyer, Shift+Entrée pour nouvelle ligne)"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                className="resize-none"
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setAttachedFile(file);
                  }}
                />
                <Button variant="outline" type="button" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" asChild>
                  <span>
                    <Upload className="w-4 h-4" />
                  </span>
                </Button>
              </label>
              <Button
                onClick={handleSendMessage}
                disabled={(!newMessage.trim() && !attachedFile) || sending}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* File Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {viewerName}
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = viewerUrl;
                  link.download = viewerName;
                  link.click();
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </Button>
            </div>
          </DialogHeader>
          <div className="p-6 overflow-auto max-h-[calc(90vh-100px)]">
            {viewerType.startsWith('image/') ? (
              <img src={viewerUrl} alt={viewerName} className="w-full h-auto" />
            ) : viewerType === 'application/pdf' ? (
              <iframe
                src={viewerUrl}
                className="w-full h-[70vh]"
                title={viewerName}
              />
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">Aperçu non disponible pour ce type de fichier</p>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = viewerUrl;
                    link.download = viewerName;
                    link.click();
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger le fichier
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </ClientLayout>
  );
}
