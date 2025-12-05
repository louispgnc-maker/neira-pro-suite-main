import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Users, MessageSquare, Plus, UserPlus, Bell } from 'lucide-react';
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

interface Conversation {
  id: string;
  name: string;
  is_group: boolean;
  member_ids: string[];
  member_profiles?: Array<{
    first_name?: string;
    last_name?: string;
    photo_url?: string;
  }>;
  last_message_at?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  cabinet_id: string;
  sender_id: string;
  recipient_id: string | null;
  conversation_id: string | null;
  message: string;
  created_at: string;
  sender_profile?: {
    first_name?: string;
    last_name?: string;
    photo_url?: string;
  };
}

interface CabinetChatProps {
  cabinetId: string;
  role: string;
}

export function CabinetChat({ cabinetId, role }: CabinetChatProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [members, setMembers] = useState<CabinetMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<Map<string, number>>(new Map());
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(() => {
    // Restore last selected conversation from sessionStorage
    const saved = sessionStorage.getItem(`chat-selected-conversation-${cabinetId}`);
    return saved || null;
  });
  const [sending, setSending] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createMode, setCreateMode] = useState<'direct' | 'group' | null>(null);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedDirectMember, setSelectedDirectMember] = useState<string | null>(null);
  const [memberSearchDirect, setMemberSearchDirect] = useState('');
  const [memberSearchGroup, setMemberSearchGroup] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Save selected conversation to sessionStorage whenever it changes
  useEffect(() => {
    if (selectedConversation) {
      sessionStorage.setItem(`chat-selected-conversation-${cabinetId}`, selectedConversation);
    }
  }, [selectedConversation, cabinetId]);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to load unread counts for conversations
  const loadUnreadCounts = async (convs: Conversation[]) => {
    if (!user) return;

    const counts = new Map<string, number>();

    for (const conv of convs) {
      if (conv.id === selectedConversation) {
        // Current conversation has no unread
        counts.set(conv.id, 0);
        continue;
      }

      let query = supabase
        .from('cabinet_messages')
        .select('id', { count: 'exact', head: true })
        .eq('cabinet_id', cabinetId)
        .neq('sender_id', user.id);

      if (conv.id === 'general') {
        query = query.is('recipient_id', null).is('conversation_id', null);
      } else if (conv.id.startsWith('direct-')) {
        const recipientId = conv.id.replace('direct-', '');
        query = query.eq('sender_id', recipientId).eq('recipient_id', user.id);
      } else {
        query = query.eq('conversation_id', conv.id);
      }

      // Only count messages created after the user last viewed
      const lastViewedKey = `chat-last-viewed-${cabinetId}-${conv.id}`;
      const lastViewed = sessionStorage.getItem(lastViewedKey);
      if (lastViewed) {
        query = query.gt('created_at', lastViewed);
      }

      const { count } = await query;
      counts.set(conv.id, count || 0);
    }

    setUnreadMessages(counts);
  };

  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedConversation) {
      // Mark as read
      setUnreadMessages(prev => {
        const newMap = new Map(prev);
        newMap.set(selectedConversation, 0);
        return newMap;
      });
      
      // Save last viewed time
      const lastViewedKey = `chat-last-viewed-${cabinetId}-${selectedConversation}`;
      sessionStorage.setItem(lastViewedKey, new Date().toISOString());

      // Notify parent component to update global unread count
      window.dispatchEvent(new CustomEvent('cabinet-conversation-read', { 
        detail: { cabinetId, conversationId: selectedConversation } 
      }));
    }
  }, [selectedConversation, cabinetId]);

  // Load cabinet members
  useEffect(() => {
    console.log('Members useEffect triggered - cabinetId:', cabinetId);
    if (!cabinetId) {
      console.log('Members load skipped - no cabinetId');
      return;
    }

    const loadMembers = async () => {
      console.log('Loading members for cabinet:', cabinetId);
      setMembersLoading(true);
      
      // First get cabinet members (including email from this table)
      const { data: membersData, error: membersError } = await supabase
        .from('cabinet_members')
        .select('id, user_id, role_cabinet, status, email')
        .eq('cabinet_id', cabinetId)
        .eq('status', 'active');

      if (membersError) {
        console.error('Error loading members:', membersError);
        setMembersLoading(false);
        return;
      }

      if (!membersData || membersData.length === 0) {
        console.log('No members found');
        setMembers([]);
        setMembersLoading(false);
        return;
      }

      // Then get profiles for those users (first_name and last_name only)
      const userIds = membersData.map(m => m.user_id).filter(Boolean);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, photo_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        setMembersLoading(false);
        return;
      }

      // Merge members with their profiles
      const membersWithProfiles = membersData.map(member => ({
        ...member,
        profile: {
          ...profilesData?.find(p => p.id === member.user_id),
          email: member.email // Use email from cabinet_members
        }
      }));

      console.log('Members loaded:', membersWithProfiles.length, membersWithProfiles);
      setMembers(membersWithProfiles);
      setMembersLoading(false);
    };

    loadMembers();
  }, [cabinetId]);

  // Load conversations
  useEffect(() => {
    if (!cabinetId || !user || members.length === 0) {
      console.log('Conversations load skipped - cabinetId:', cabinetId, 'user:', !!user, 'members:', members.length);
      return;
    }

    const loadConversations = async () => {
      console.log('Loading conversations for cabinet:', cabinetId, 'with', members.length, 'members');
      // Load group conversations where user is a member
      const { data: groupConvs, error: groupError } = await supabase
        .from('cabinet_conversations')
        .select(`
          id,
          name,
          cabinet_conversation_members!inner (
            user_id
          )
        `)
        .eq('cabinet_id', cabinetId);

      if (groupError) {
        console.error('Error loading conversations:', groupError);
        return;
      }

      // Load members for each conversation
      const conversationsWithMembers: Conversation[] = [];
      
      // Get last message time for general channel
      const { data: generalLastMsg } = await supabase
        .from('cabinet_messages')
        .select('created_at')
        .eq('cabinet_id', cabinetId)
        .is('recipient_id', null)
        .is('conversation_id', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // Add general channel
      conversationsWithMembers.push({
        id: 'general',
        name: 'Salon général',
        is_group: true,
        member_ids: members.map(m => m.user_id),
        last_message_at: generalLastMsg?.created_at || new Date(0).toISOString()
      });

      // Add group conversations
      for (const conv of groupConvs || []) {
        const { data: convMembers } = await supabase
          .from('cabinet_conversation_members')
          .select('user_id')
          .eq('conversation_id', conv.id);

        const memberIds = convMembers?.map(m => m.user_id) || [];
        
        // Only show conversations where current user is a member
        if (memberIds.includes(user.id)) {
          // Load profiles for members
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, photo_url')
            .in('id', memberIds);

          // Get last message time
          const { data: lastMsg } = await supabase
            .from('cabinet_messages')
            .select('created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          conversationsWithMembers.push({
            id: conv.id,
            name: conv.name,
            is_group: true,
            member_ids: memberIds,
            member_profiles: profilesData || [],
            last_message_at: lastMsg?.created_at || new Date(0).toISOString()
          });
        }
      }

      // Add direct conversations (existing private messages)
      const otherMembers = members.filter(m => m.user_id !== user.id);
      for (const member of otherMembers) {
        // Get last message time for this direct conversation
        const { data: directLastMsg } = await supabase
          .from('cabinet_messages')
          .select('created_at')
          .eq('cabinet_id', cabinetId)
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${member.user_id}),and(sender_id.eq.${member.user_id},recipient_id.eq.${user.id})`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        conversationsWithMembers.push({
          id: `direct-${member.user_id}`,
          name: getDisplayName(member.profile),
          is_group: false,
          member_ids: [user.id, member.user_id],
          member_profiles: [member.profile] as any,
          last_message_at: directLastMsg?.created_at || new Date(0).toISOString()
        });
      }

      // Sort conversations by last message time (most recent first)
      conversationsWithMembers.sort((a, b) => {
        const timeA = new Date(a.last_message_at || 0).getTime();
        const timeB = new Date(b.last_message_at || 0).getTime();
        return timeB - timeA;
      });

      setConversations(conversationsWithMembers);
      
      // Load unread counts for all conversations
      await loadUnreadCounts(conversationsWithMembers);
    };

    loadConversations();
  }, [cabinetId, user, members]);

  // Load messages
  useEffect(() => {
    if (!cabinetId || !user || !selectedConversation) return;

    const loadMessages = async () => {
      let query = supabase
        .from('cabinet_messages')
        .select('*')
        .eq('cabinet_id', cabinetId)
        .order('created_at', { ascending: true });

      if (selectedConversation === 'general') {
        // General channel: messages with no recipient and no conversation
        query = query.is('recipient_id', null).is('conversation_id', null);
      } else if (selectedConversation.startsWith('direct-')) {
        // Direct message: legacy recipient_id system
        const recipientId = selectedConversation.replace('direct-', '');
        query = query.or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`);
      } else {
        // Group conversation
        query = query.eq('conversation_id', selectedConversation);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      // Load sender profiles
      const senderIds = [...new Set(data?.map(m => m.sender_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, photo_url')
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
      .channel(`cabinet_messages:${cabinetId}:${selectedConversation}`)
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
          
          // Check if message belongs to current conversation
          let shouldAdd = false;
          if (selectedConversation === 'general' && !newMsg.recipient_id && !newMsg.conversation_id) {
            shouldAdd = true;
          } else if (selectedConversation.startsWith('direct-')) {
            const recipientId = selectedConversation.replace('direct-', '');
            if (
              (newMsg.sender_id === user.id && newMsg.recipient_id === recipientId) ||
              (newMsg.sender_id === recipientId && newMsg.recipient_id === user.id)
            ) {
              shouldAdd = true;
            }
          } else if (newMsg.conversation_id === selectedConversation) {
            shouldAdd = true;
          }

          if (shouldAdd) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, photo_url')
              .eq('id', newMsg.sender_id)
              .single();

            setMessages(prev => [...prev, {
              ...newMsg,
              sender_profile: profileData || undefined
            }]);
          } else {
            // Message is for a different conversation - increment unread count
            let conversationId = '';
            if (!newMsg.recipient_id && !newMsg.conversation_id) {
              conversationId = 'general';
            } else if (newMsg.recipient_id && !newMsg.conversation_id) {
              conversationId = `direct-${newMsg.sender_id}`;
            } else if (newMsg.conversation_id) {
              conversationId = newMsg.conversation_id;
            }

            if (conversationId && newMsg.sender_id !== user.id) {
              setUnreadMessages(prev => {
                const newMap = new Map(prev);
                const current = newMap.get(conversationId) || 0;
                newMap.set(conversationId, current + 1);
                return newMap;
              });

              // Update conversation order (move to top)
              setConversations(prev => {
                const updated = prev.map(c => 
                  c.id === conversationId 
                    ? { ...c, last_message_at: newMsg.created_at }
                    : c
                );
                return updated.sort((a, b) => {
                  const timeA = new Date(a.last_message_at || 0).getTime();
                  const timeB = new Date(b.last_message_at || 0).getTime();
                  return timeB - timeA;
                });
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cabinetId, user, selectedConversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !cabinetId || sending || !selectedConversation) return;

    setSending(true);

    try {
      const messageData: any = {
        cabinet_id: cabinetId,
        sender_id: user.id,
        message: newMessage.trim()
      };

      if (selectedConversation === 'general') {
        // General channel
        messageData.recipient_id = null;
        messageData.conversation_id = null;
      } else if (selectedConversation.startsWith('direct-')) {
        // Direct message
        messageData.recipient_id = selectedConversation.replace('direct-', '');
        messageData.conversation_id = null;
      } else {
        // Group conversation
        messageData.recipient_id = null;
        messageData.conversation_id = selectedConversation;
      }

      const { data: insertedMessage, error } = await supabase
        .from('cabinet_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      // Get sender profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, photo_url')
        .eq('id', user.id)
        .single();

      // Add message to UI immediately
      setMessages(prev => [...prev, {
        ...insertedMessage,
        sender_profile: profileData || undefined
      }]);

      setNewMessage('');
      
      // Update conversation timestamp and move to top
      setConversations(prev => {
        const updated = prev.map(c => 
          c.id === selectedConversation 
            ? { ...c, last_message_at: new Date().toISOString() }
            : c
        );
        return updated.sort((a, b) => {
          const timeA = new Date(a.last_message_at || 0).getTime();
          const timeB = new Date(b.last_message_at || 0).getTime();
          return timeB - timeA;
        });
      });
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

  const handleCreateConversation = async () => {
    if (!user || !cabinetId) return;

    try {
      if (createMode === 'direct') {
        // Just switch to the direct conversation
        if (selectedDirectMember) {
          setSelectedConversation(`direct-${selectedDirectMember}`);
          setShowCreateDialog(false);
          setCreateMode(null);
          setSelectedDirectMember(null);
        }
      } else if (createMode === 'group') {
        // Create group conversation
        if (!groupName.trim() || selectedMembers.length === 0) {
          toast({
            title: 'Erreur',
            description: 'Veuillez saisir un nom et sélectionner au moins un membre',
            variant: 'destructive'
          });
          return;
        }

        // Create conversation
        const { data: newConv, error: convError } = await supabase
          .from('cabinet_conversations')
          .insert({
            cabinet_id: cabinetId,
            name: groupName.trim(),
            created_by: user.id
          })
          .select()
          .single();

        if (convError) throw convError;

        // Add members (including creator)
        const membersToAdd = [...selectedMembers, user.id];
        const { error: membersError } = await supabase
          .from('cabinet_conversation_members')
          .insert(
            membersToAdd.map(userId => ({
              conversation_id: newConv.id,
              user_id: userId
            }))
          );

        if (membersError) throw membersError;

        toast({
          title: 'Succès',
          description: 'Conversation créée avec succès'
        });

        // Reload conversations
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, photo_url')
          .in('id', membersToAdd);

        setConversations(prev => [
          ...prev,
          {
            id: newConv.id,
            name: newConv.name,
            is_group: true,
            member_ids: membersToAdd,
            member_profiles: profilesData || []
          }
        ]);

        setSelectedConversation(newConv.id);
        setShowCreateDialog(false);
        setCreateMode(null);
        setGroupName('');
        setSelectedMembers([]);
      }
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la conversation',
        variant: 'destructive'
      });
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

  const currentConversation = conversations.find(c => c.id === selectedConversation);
  const conversationTitle = currentConversation?.name || 'Sélectionnez une conversation';

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[calc(100vh-300px)]">
      {/* Sidebar: Conversations list */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversations
            </CardTitle>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className={role === 'notaire' ? 'hover:bg-orange-100 hover:text-orange-600' : 'hover:bg-blue-100 hover:text-blue-600'}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle conversation</DialogTitle>
                  <DialogDescription>
                    Choisissez le type de conversation à créer
                  </DialogDescription>
                </DialogHeader>
                
                {!createMode ? (
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className={`w-full justify-start ${role === 'notaire' ? 'hover:bg-orange-100 hover:text-orange-600' : 'hover:bg-blue-100 hover:text-blue-600'}`}
                      onClick={() => setCreateMode('direct')}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Conversation directe
                    </Button>
                    <Button
                      variant="outline"
                      className={`w-full justify-start ${role === 'notaire' ? 'hover:bg-orange-100 hover:text-orange-600' : 'hover:bg-blue-100 hover:text-blue-600'}`}
                      onClick={() => setCreateMode('group')}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Créer un groupe
                    </Button>
                    <Button
                      variant="outline"
                      className={`w-full ${role === 'notaire' ? 'hover:bg-orange-100 hover:text-orange-600' : 'hover:bg-blue-100 hover:text-blue-600'}`}
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                ) : createMode === 'direct' ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Sélectionner un membre</Label>
                      <Input
                        placeholder="Rechercher un membre..."
                        value={memberSearchDirect}
                        onChange={(e) => setMemberSearchDirect(e.target.value)}
                        className="mt-2"
                      />
                      <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {membersLoading ? (
                          <p className="text-sm text-muted-foreground">Chargement des membres...</p>
                        ) : members.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Aucun membre disponible (total: {members.length}, user: {user?.id ? 'présent' : 'absent'})
                          </p>
                        ) : (
                          (() => {
                            const filtered = members.filter(m => m.user_id !== user?.id);
                            console.log('Direct conversation - Total members:', members.length, 'Filtered:', filtered.length);
                            return filtered
                              .filter(m => {
                                if (!memberSearchDirect) return true;
                                const name = getDisplayName(m.profile).toLowerCase();
                                return name.includes(memberSearchDirect.toLowerCase());
                              })
                              .map(member => (
                                <Button
                                  key={member.id}
                                  variant={selectedDirectMember === member.user_id ? 'default' : 'outline'}
                                  className="w-full justify-start"
                                  onClick={() => setSelectedDirectMember(member.user_id)}
                                >
                                  <Avatar className="h-6 w-6 mr-2">
                                    <AvatarFallback className={`text-xs ${getRoleBadgeColor(member.role_cabinet)}`}>
                                      {getInitials(member.profile)}
                                    </AvatarFallback>
                                  </Avatar>
                                  {getDisplayName(member.profile)}
                                </Button>
                              ));
                          })()
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => { setCreateMode(null); setSelectedDirectMember(null); }}
                        className={role === 'notaire' ? 'hover:bg-orange-100 hover:text-orange-600' : 'hover:bg-blue-100 hover:text-blue-600'}
                      >
                        Retour
                      </Button>
                      <Button 
                        onClick={handleCreateConversation}
                        disabled={!selectedDirectMember}
                        className={role === 'notaire' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}
                      >
                        Démarrer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="group-name">Nom du groupe</Label>
                      <Input
                        id="group-name"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Ex: Équipe Lyon, Dossier Martin..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Membres du groupe</Label>
                      <Input
                        placeholder="Rechercher un membre..."
                        value={memberSearchGroup}
                        onChange={(e) => setMemberSearchGroup(e.target.value)}
                        className="mt-2"
                      />
                      <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {membersLoading ? (
                          <p className="text-sm text-muted-foreground">Chargement des membres...</p>
                        ) : members.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Aucun membre disponible (total: {members.length}, user: {user?.id ? 'présent' : 'absent'})
                          </p>
                        ) : (
                          (() => {
                            const filtered = members.filter(m => m.user_id !== user?.id);
                            console.log('Group conversation - Total members:', members.length, 'Filtered:', filtered.length);
                            return filtered
                              .filter(m => {
                                if (!memberSearchGroup) return true;
                                const name = getDisplayName(m.profile).toLowerCase();
                                return name.includes(memberSearchGroup.toLowerCase());
                              })
                              .map(member => (
                              <div key={member.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`member-${member.id}`}
                                  checked={selectedMembers.includes(member.user_id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedMembers(prev => [...prev, member.user_id]);
                                    } else {
                                      setSelectedMembers(prev => prev.filter(id => id !== member.user_id));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`member-${member.id}`}
                                  className="flex items-center gap-2 cursor-pointer flex-1"
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className={`text-xs ${getRoleBadgeColor(member.role_cabinet)}`}>
                                      {getInitials(member.profile)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{getDisplayName(member.profile)}</span>
                                </label>
                              </div>
                            ));
                          })()
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => { setCreateMode(null); setGroupName(''); setSelectedMembers([]); }}
                        className={role === 'notaire' ? 'hover:bg-orange-100 hover:text-orange-600' : 'hover:bg-blue-100 hover:text-blue-600'}
                      >
                        Retour
                      </Button>
                      <Button 
                        onClick={handleCreateConversation}
                        disabled={!groupName.trim() || selectedMembers.length === 0}
                        className={role === 'notaire' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}
                      >
                        Créer le groupe
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {/* Section 1: General channel */}
          {(() => {
            const generalConv = conversations.find(c => c.id === 'general');
            if (!generalConv) return null;
            
            const unreadCount = unreadMessages.get(generalConv.id) || 0;
            return (
              <>
                <Button
                  key={generalConv.id}
                  variant={selectedConversation === generalConv.id ? 'default' : 'ghost'}
                  className={`w-full justify-start relative ${
                    selectedConversation === generalConv.id
                      ? role === 'notaire'
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                      : role === 'notaire' 
                        ? 'hover:bg-orange-100 hover:text-orange-600' 
                        : 'hover:bg-blue-100 hover:text-blue-600'
                  }`}
                  onClick={() => setSelectedConversation(generalConv.id)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <span className="text-sm truncate flex-1 text-left">{generalConv.name}</span>
                  {unreadCount > 0 && (
                    <Badge 
                      className={`ml-auto ${
                        role === 'notaire' 
                          ? 'bg-orange-600 text-white' 
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </>
            );
          })()}
          
          {/* Section 2: Groups */}
          {(() => {
            const groups = conversations.filter(c => c.id !== 'general' && c.is_group);
            if (groups.length === 0) return null;
            
            return (
              <>
                <div className="py-2">
                  <div className="border-t border-gray-200"></div>
                  <p className="text-xs text-muted-foreground mt-2 px-2">Groupes</p>
                </div>
                {groups.map(conv => {
                  const unreadCount = unreadMessages.get(conv.id) || 0;
                  return (
                    <Button
                      key={conv.id}
                      variant={selectedConversation === conv.id ? 'default' : 'ghost'}
                      className={`w-full justify-start relative ${
                        selectedConversation === conv.id
                          ? role === 'notaire'
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                          : role === 'notaire' 
                            ? 'hover:bg-orange-100 hover:text-orange-600' 
                            : 'hover:bg-blue-100 hover:text-blue-600'
                      }`}
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      <span className="text-sm truncate flex-1 text-left">{conv.name}</span>
                      {unreadCount > 0 && (
                        <Badge 
                          className={`ml-auto ${
                            role === 'notaire' 
                              ? 'bg-orange-600 text-white' 
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {unreadCount}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </>
            );
          })()}
          
          {/* Section 3: Direct messages */}
          {(() => {
            const directMessages = conversations.filter(c => !c.is_group);
            if (directMessages.length === 0) return null;
            
            return (
              <>
                <div className="py-2">
                  <div className="border-t border-gray-200"></div>
                  <p className="text-xs text-muted-foreground mt-2 px-2">Messages directs</p>
                </div>
                {directMessages.map(conv => {
                  const unreadCount = unreadMessages.get(conv.id) || 0;
                  return (
                    <Button
                      key={conv.id}
                      variant={selectedConversation === conv.id ? 'default' : 'ghost'}
                      className={`w-full justify-start relative ${
                        selectedConversation === conv.id
                          ? role === 'notaire'
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                          : role === 'notaire' 
                            ? 'hover:bg-orange-100 hover:text-orange-600' 
                            : 'hover:bg-blue-100 hover:text-blue-600'
                      }`}
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <Avatar className="h-6 w-6 mr-2">
                        {conv.member_profiles?.[0]?.photo_url && (
                          <AvatarImage src={conv.member_profiles[0].photo_url} alt="Photo de profil" />
                        )}
                        <AvatarFallback className="text-xs bg-gray-100 text-gray-600">
                          {getInitials(conv.member_profiles?.[0])}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate flex-1 text-left">{conv.name}</span>
                      {unreadCount > 0 && (
                        <Badge 
                          className={`ml-auto ${
                            role === 'notaire' 
                              ? 'bg-orange-600 text-white' 
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {unreadCount}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Main chat area */}
      <Card className="md:col-span-3 flex flex-col h-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {selectedConversation === 'general' ? (
              <>
                <MessageSquare className="h-5 w-5" />
                {conversationTitle}
              </>
            ) : currentConversation?.is_group ? (
              <>
                <Users className="h-5 w-5" />
                {conversationTitle}
              </>
            ) : (
              <>
                <Avatar className="h-6 w-6">
                  {currentConversation?.member_profiles?.[0]?.photo_url && (
                    <AvatarImage src={currentConversation.member_profiles[0].photo_url} alt="Photo" />
                  )}
                  <AvatarFallback className="text-xs bg-gray-100 text-gray-600">
                    {getInitials(currentConversation?.member_profiles?.[0])}
                  </AvatarFallback>
                </Avatar>
                {conversationTitle}
              </>
            )}
          </CardTitle>
          <CardDescription>
            {selectedConversation === 'general' 
              ? 'Discutez avec tous les membres du cabinet'
              : currentConversation?.is_group
              ? `${currentConversation.member_ids.length} membres`
              : 'Conversation privée'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Messages area with fixed height and scroll */}
          <div className="overflow-y-auto mb-4 space-y-3 pr-2" style={{ maxHeight: 'calc(100vh - 450px)' }} ref={scrollAreaRef}>
            {!selectedConversation ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Sélectionnez une conversation pour commencer</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Aucun message pour le moment</p>
              </div>
            ) : (
              messages.map(msg => {
                const isOwnMessage = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <Avatar className="h-8 w-8">
                      {msg.sender_profile?.photo_url && (
                        <AvatarImage src={msg.sender_profile.photo_url} alt="Photo de profil" />
                      )}
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

          {/* Message input - fixed at bottom */}
          {selectedConversation && (
            <div className="flex gap-2 flex-shrink-0">
              <Textarea
                placeholder="Écrivez votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 min-h-[60px] max-h-[120px] resize-none"
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
