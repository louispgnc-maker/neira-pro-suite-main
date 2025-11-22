import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Users, MessageSquare, Plus, UserPlus } from 'lucide-react';
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
  }>;
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
  const [membersLoading, setMembersLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
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
        .select('id, first_name, last_name')
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
      
      // Add general channel
      conversationsWithMembers.push({
        id: 'general',
        name: 'Salon général',
        is_group: true,
        member_ids: members.map(m => m.user_id)
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
            .select('id, first_name, last_name')
            .in('id', memberIds);

          conversationsWithMembers.push({
            id: conv.id,
            name: conv.name,
            is_group: true,
            member_ids: memberIds,
            member_profiles: profilesData || []
          });
        }
      }

      // Add direct conversations (existing private messages)
      const otherMembers = members.filter(m => m.user_id !== user.id);
      for (const member of otherMembers) {
        conversationsWithMembers.push({
          id: `direct-${member.user_id}`,
          name: getDisplayName(member.profile),
          is_group: false,
          member_ids: [user.id, member.user_id],
          member_profiles: [member.profile] as any
        });
      }

      setConversations(conversationsWithMembers);
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

      const { error } = await supabase
        .from('cabinet_messages')
        .insert(messageData);

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
          .select('id, first_name, last_name')
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
          {conversations.map(conv => (
            <Button
              key={conv.id}
              variant={selectedConversation === conv.id ? 'default' : 'ghost'}
              className={`w-full justify-start ${
                conv.id === 'general' 
                  ? selectedConversation === conv.id
                    ? role === 'notaire'
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                    : role === 'notaire' 
                      ? 'hover:bg-orange-100 hover:text-orange-600' 
                      : 'hover:bg-blue-100 hover:text-blue-600'
                  : ''
              }`}
              onClick={() => setSelectedConversation(conv.id)}
            >
              {conv.is_group ? (
                <>
                  {conv.id === 'general' ? (
                    <MessageSquare className="h-4 w-4 mr-2" />
                  ) : (
                    <Users className="h-4 w-4 mr-2" />
                  )}
                  <span className="text-sm truncate">{conv.name}</span>
                </>
              ) : (
                <>
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarFallback className="text-xs bg-gray-100 text-gray-600">
                      {getInitials(conv.member_profiles?.[0])}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{conv.name}</span>
                </>
              )}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Main chat area */}
      <Card className="md:col-span-3 flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg">
            Membres du cabinet ({members.length})
          </CardTitle>
          <CardDescription>
            Liste de tous les membres actifs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="text-center text-muted-foreground py-8">
              Chargement des membres...
            </div>
          ) : members.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Aucun membre trouvé
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar>
                    <AvatarFallback className={getRoleBadgeColor(member.role_cabinet)}>
                      {getInitials(member.profile)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{getDisplayName(member.profile)}</div>
                    <div className="text-sm text-muted-foreground">{member.profile?.email}</div>
                  </div>
                  <Badge className={getRoleBadgeColor(member.role_cabinet)}>
                    {member.role_cabinet}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
