import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { Send, Users, MessageSquare, Plus, UserPlus, Bell, Settings, Trash2, UserMinus, Upload, FileText, Eye, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CabinetMember {
  id: string;
  user_id: string;
  role_cabinet: string;
  status: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    photo_url?: string;
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

interface CabinetDocument {
  id: string;
  title: string;
  file_url: string | null;
  file_name: string | null;
  shared_at: string;
  shared_by: string;
}

interface PersonalDocument {
  id: string;
  name: string;
  storage_path: string;
  created_at: string;
}

interface CabinetDossier {
  id: string;
  title: string;
  description?: string;
  shared_at: string;
  shared_by: string;
  dossier_id?: string;
}

interface PersonalDossier {
  id: string;
  title: string;
  description?: string;
  created_at: string;
}

interface CabinetClient {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  shared_at: string;
  shared_by: string;
  client_id?: string;
}

interface PersonalClient {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  created_at: string;
}

interface ConversationTask {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  assigned_to?: string[];
  status: string;
  created_at: string;
  created_by: string;
}

interface CabinetChatProps {
  cabinetId: string;
  role: string;
}

export function CabinetChat({ cabinetId, role }: CabinetChatProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [members, setMembers] = useState<CabinetMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<Map<string, number>>(new Map());
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(() => {
    // First check URL params
    const convFromUrl = searchParams.get('conv');
    if (convFromUrl) return convFromUrl;
    
    // Otherwise restore last selected conversation from localStorage
    const saved = localStorage.getItem(`chat-selected-conversation-${cabinetId}`);
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
  
  // Mention system state
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [filteredMembers, setFilteredMembers] = useState<CabinetMember[]>([]);
  const [mentionStartPos, setMentionStartPos] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Group settings state
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [groupMemberSearch, setGroupMemberSearch] = useState('');
  const [groupFiles, setGroupFiles] = useState<Array<{ name: string; url: string }>>([]);
  
  // Share dialogs state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareType, setShareType] = useState<'document' | 'dossier' | 'client' | 'task' | null>(null);
  const [shareSource, setShareSource] = useState<'collaboratif' | 'perso' | 'ordinateur' | null>(null);
  
  // Items selection state
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false);
  const [availableDocuments, setAvailableDocuments] = useState<CabinetDocument[] | PersonalDocument[]>([]);
  const [availableDossiers, setAvailableDossiers] = useState<CabinetDossier[] | PersonalDossier[]>([]);
  const [availableClients, setAvailableClients] = useState<CabinetClient[] | PersonalClient[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Group resources tabs
  const [activeTab, setActiveTab] = useState<'messages' | 'documents' | 'dossiers' | 'clients' | 'tasks'>('messages');
  const [conversationDocuments, setConversationDocuments] = useState<any[]>([]);
  const [conversationDossiers, setConversationDossiers] = useState<any[]>([]);
  const [conversationClients, setConversationClients] = useState<any[]>([]);
  const [conversationTasks, setConversationTasks] = useState<ConversationTask[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  
  // Document viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerTitle, setViewerTitle] = useState('');

  // Save selected conversation to localStorage whenever it changes
  useEffect(() => {
    if (selectedConversation) {
      localStorage.setItem(`chat-selected-conversation-${cabinetId}`, selectedConversation);
      
      // Remove conv param from URL after setting the conversation
      if (searchParams.has('conv')) {
        searchParams.delete('conv');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [selectedConversation, cabinetId, searchParams, setSearchParams]);

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
        .select('*', { count: 'exact', head: true })
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
      const lastViewed = localStorage.getItem(lastViewedKey);
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
      localStorage.setItem(lastViewedKey, new Date().toISOString());

      // Notify parent component to update global unread count
      window.dispatchEvent(new CustomEvent('cabinet-conversation-read', { 
        detail: { cabinetId, conversationId: selectedConversation } 
      }));
      
      // Load conversation resources for group conversations
      if (!selectedConversation.startsWith('direct-') && selectedConversation !== 'general') {
        loadConversationResources();
      }
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
        .eq('cabinet_id', cabinetId);

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
      
      console.log('Loaded group conversations from DB:', groupConvs);

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
        .maybeSingle();
      
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
            .maybeSingle();

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

      // Add direct conversations (only those with actual messages)
      const otherMembers = members.filter(m => m.user_id !== user.id);
      
      // Deduplicate members by user_id to avoid showing duplicate conversations
      const uniqueMembers = Array.from(
        new Map(otherMembers.map(m => [m.user_id, m])).values()
      );
      
      // Detect duplicate names to add email disambiguation
      const nameCount = new Map<string, number>();
      uniqueMembers.forEach(m => {
        const name = getDisplayName(m.profile);
        if (name !== 'Inconnu' && name !== 'Membre du cabinet') {
          nameCount.set(name, (nameCount.get(name) || 0) + 1);
        }
      });
      
      for (const member of uniqueMembers) {
        // Get last message time for this direct conversation
        const { data: directLastMsg } = await supabase
          .from('cabinet_messages')
          .select('created_at')
          .eq('cabinet_id', cabinetId)
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${member.user_id}),and(sender_id.eq.${member.user_id},recipient_id.eq.${user.id})`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Only show conversation if there's at least one message
        if (directLastMsg) {
          // Get base display name
          let displayName = getDisplayName(member.profile);
          if (displayName === 'Inconnu') {
            displayName = member.email || `Membre ${member.user_id.slice(0, 8)}`;
          }
          
          // Add email in parentheses if there are duplicate names
          const baseName = getDisplayName(member.profile);
          if (baseName !== 'Inconnu' && baseName !== 'Membre du cabinet' && (nameCount.get(baseName) || 0) > 1 && member.email) {
            displayName = `${baseName} (${member.email})`;
          }
          
          conversationsWithMembers.push({
            id: `direct-${member.user_id}`,
            name: displayName,
            is_group: false,
            member_ids: [user.id, member.user_id],
            member_profiles: [member.profile] as any,
            last_message_at: directLastMsg.created_at
          });
        }
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

      // Load sender profiles WITH emails from cabinet_members
      const senderIds = [...new Set(data?.map(m => m.sender_id) || [])];
      
      console.log('Messages - Sender IDs to load:', senderIds);
      
      // Get profiles
      const { data: profilesData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, photo_url')
        .in('id', senderIds);

      if (profileError) {
        console.error('Error loading profiles for messages:', profileError);
      }

      // Get emails from cabinet_members
      const { data: memberEmails, error: emailError } = await supabase
        .from('cabinet_members')
        .select('user_id, email')
        .eq('cabinet_id', cabinetId)
        .in('user_id', senderIds);

      if (emailError) {
        console.error('Error loading emails for messages:', emailError);
      }

      console.log('Messages - Loaded profiles:', profilesData);
      console.log('Messages - Loaded emails:', memberEmails);

      const emailsMap = new Map(
        memberEmails?.map(m => [m.user_id, m.email]) || []
      );

      const profilesMap = new Map(
        profilesData?.map(p => [p.id, { ...p, email: emailsMap.get(p.id) }]) || []
      );

      console.log('Messages - Profiles map:', Array.from(profilesMap.entries()));

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
              .maybeSingle();

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
        .maybeSingle();

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

  // Load documents from collaborative space
  const loadCollaborativeDocuments = async () => {
    if (!cabinetId) return;
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('cabinet_documents')
        .select('id, title, file_url, file_name, shared_at, shared_by')
        .eq('cabinet_id', cabinetId)
        .order('shared_at', { ascending: false });
      
      if (error) throw error;
      setAvailableDocuments(data || []);
      setShowDocumentsDialog(true);
    } catch (error) {
      console.error('Error loading collaborative documents:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les documents',
        variant: 'destructive'
      });
    } finally {
      setLoadingItems(false);
    }
  };

  // Load documents from personal space
  const loadPersonalDocuments = async () => {
    if (!user) return;
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, name, storage_path, created_at')
        .eq('owner_id', user.id)
        .eq('role', role)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAvailableDocuments(data || []);
      setShowDocumentsDialog(true);
    } catch (error) {
      console.error('Error loading personal documents:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les documents',
        variant: 'destructive'
      });
    } finally {
      setLoadingItems(false);
    }
  };

  // Load dossiers from collaborative space
  const loadCollaborativeDossiers = async () => {
    if (!cabinetId) return;
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('cabinet_dossiers')
        .select('id, title, description, shared_at, shared_by, dossier_id')
        .eq('cabinet_id', cabinetId)
        .order('shared_at', { ascending: false });
      
      if (error) throw error;
      setAvailableDossiers(data || []);
      setShowDocumentsDialog(true);
    } catch (error) {
      console.error('Error loading collaborative dossiers:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les dossiers',
        variant: 'destructive'
      });
    } finally {
      setLoadingItems(false);
    }
  };

  // Load dossiers from personal space
  const loadPersonalDossiers = async () => {
    if (!user) return;
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('dossiers')
        .select('id, title, description, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAvailableDossiers(data || []);
      setShowDocumentsDialog(true);
    } catch (error) {
      console.error('Error loading personal dossiers:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les dossiers',
        variant: 'destructive'
      });
    } finally {
      setLoadingItems(false);
    }
  };

  // Load clients from collaborative space
  const loadCollaborativeClients = async () => {
    if (!cabinetId) return;
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('cabinet_clients')
        .select('id, first_name, last_name, email, phone, shared_at, shared_by, client_id')
        .eq('cabinet_id', cabinetId)
        .order('shared_at', { ascending: false });
      
      if (error) throw error;
      setAvailableClients(data || []);
      setShowDocumentsDialog(true);
    } catch (error) {
      console.error('Error loading collaborative clients:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les clients',
        variant: 'destructive'
      });
    } finally {
      setLoadingItems(false);
    }
  };

  // Load clients from personal space
  const loadPersonalClients = async () => {
    if (!user) return;
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, phone, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAvailableClients(data || []);
      setShowDocumentsDialog(true);
    } catch (error) {
      console.error('Error loading personal clients:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les clients',
        variant: 'destructive'
      });
    } finally {
      setLoadingItems(false);
    }
  };

  // Handle document selection - add to conversation
  const handleSelectDocument = async (doc: CabinetDocument | PersonalDocument) => {
    if (!selectedConversation || !user || selectedConversation.startsWith('direct-')) return;
    
    try {
      let fileUrl: string | null = null;
      let fileName: string = '';
      let title: string = '';
      
      if ('file_url' in doc) {
        // Cabinet document
        fileUrl = doc.file_url;
        fileName = doc.file_name || doc.title;
        title = doc.title;
      } else {
        // Personal document - get public URL
        const storagePath = doc.storage_path;
        const { data: publicData } = supabase.storage
          .from('documents')
          .getPublicUrl(storagePath);
        fileUrl = publicData?.publicUrl || null;
        fileName = doc.name;
        title = doc.name;
      }
      
      if (!fileUrl) {
        toast({
          title: 'Erreur',
          description: 'Impossible de récupérer l\'URL du document',
          variant: 'destructive'
        });
        return;
      }
      
      // Add document to conversation_documents table
      const { error } = await supabase.from('conversation_documents').insert({
        conversation_id: selectedConversation,
        title,
        file_url: fileUrl,
        file_name: fileName,
        added_by: user.id
      });
      
      if (error) throw error;
      
      setShowDocumentsDialog(false);
      setShowShareDialog(false);
      toast({
        title: 'Succès',
        description: 'Document ajouté au groupe'
      });
      
      // Reload conversation documents
      loadConversationResources();
    } catch (error) {
      console.error('Error sharing document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter le document',
        variant: 'destructive'
      });
    }
  };

  // Handle dossier selection
  const handleSelectDossier = async (dossier: CabinetDossier | PersonalDossier) => {
    if (!selectedConversation || !user || selectedConversation.startsWith('direct-')) return;
    
    try {
      const title = dossier.title;
      const description = dossier.description || null;
      const dossierId = 'dossier_id' in dossier ? dossier.dossier_id : dossier.id;
      
      // Add dossier to conversation_dossiers table
      const { error } = await supabase.from('conversation_dossiers').insert({
        conversation_id: selectedConversation,
        dossier_id: dossierId,
        title,
        description,
        added_by: user.id
      });
      
      if (error) throw error;
      
      setShowDocumentsDialog(false);
      setShowShareDialog(false);
      toast({
        title: 'Succès',
        description: 'Dossier ajouté au groupe'
      });
      
      loadConversationResources();
    } catch (error) {
      console.error('Error sharing dossier:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter le dossier',
        variant: 'destructive'
      });
    }
  };

  // Handle client selection
  const handleSelectClient = async (client: CabinetClient | PersonalClient) => {
    if (!selectedConversation || !user || selectedConversation.startsWith('direct-')) return;
    
    try {
      const clientId = 'client_id' in client ? client.client_id : client.id;
      
      // Add client to conversation_clients table
      const { error } = await supabase.from('conversation_clients').insert({
        conversation_id: selectedConversation,
        client_id: clientId,
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email || null,
        phone: client.phone || null,
        added_by: user.id
      });
      
      if (error) throw error;
      
      setShowDocumentsDialog(false);
      setShowShareDialog(false);
      toast({
        title: 'Succès',
        description: 'Client ajouté au groupe'
      });
      
      loadConversationResources();
    } catch (error) {
      console.error('Error sharing client:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter le client',
        variant: 'destructive'
      });
    }
  };

  // Load conversation resources (documents, dossiers, clients, tasks)
  const loadConversationResources = async () => {
    if (!selectedConversation || selectedConversation.startsWith('direct-')) return;
    
    setLoadingResources(true);
    try {
      // Load documents
      const { data: docs } = await supabase
        .from('conversation_documents')
        .select('*')
        .eq('conversation_id', selectedConversation)
        .order('created_at', { ascending: false });
      setConversationDocuments(docs || []);
      
      // Load dossiers
      const { data: doss } = await supabase
        .from('conversation_dossiers')
        .select('*')
        .eq('conversation_id', selectedConversation)
        .order('created_at', { ascending: false });
      setConversationDossiers(doss || []);
      
      // Load clients
      const { data: clients } = await supabase
        .from('conversation_clients')
        .select('*')
        .eq('conversation_id', selectedConversation)
        .order('created_at', { ascending: false });
      setConversationClients(clients || []);
      
      // Load tasks
      const { data: tasks } = await supabase
        .from('conversation_tasks')
        .select('*')
        .eq('conversation_id', selectedConversation)
        .order('created_at', { ascending: false });
      setConversationTasks(tasks || []);
    } catch (error) {
      console.error('Error loading conversation resources:', error);
    } finally {
      setLoadingResources(false);
    }
  };

  // Handle file upload from computer
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user || !selectedConversation || selectedConversation.startsWith('direct-')) return;
    
    setUploadingFile(true);
    try {
      for (const file of Array.from(files)) {
        if (file.type !== 'application/pdf') {
          toast({
            title: 'Format non supporté',
            description: `${file.name} n'est pas un PDF`,
            variant: 'destructive'
          });
          continue;
        }
        
        // Upload to storage
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'application/pdf'
          });
        
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: publicData } = supabase.storage
          .from('documents')
          .getPublicUrl(path);
        
        if (!publicData?.publicUrl) {
          throw new Error('Impossible de générer l\'URL publique');
        }
        
        // Add document to conversation_documents table
        const { error: docError } = await supabase.from('conversation_documents').insert({
          conversation_id: selectedConversation,
          title: file.name,
          file_url: publicData.publicUrl,
          file_name: file.name,
          added_by: user.id
        });
        
        if (docError) throw docError;
        
        toast({
          title: 'Succès',
          description: `${file.name} ajouté au groupe`
        });
      }
      
      setShowShareDialog(false);
      loadConversationResources();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'uploader le fichier',
        variant: 'destructive'
      });
    } finally {
      setUploadingFile(false);
    }
  };

  // View document function
  const handleViewDocument = async (doc: CabinetDocument | PersonalDocument) => {
    let fileUrl: string | null = null;
    
    if ('file_url' in doc) {
      fileUrl = doc.file_url;
    } else {
      const { data: publicData } = supabase.storage
        .from('documents')
        .getPublicUrl(doc.storage_path);
      fileUrl = publicData?.publicUrl || null;
    }
    
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    } else {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ouvrir le document',
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

  // Handle message change - detect @ mentions
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Detect @ symbol for mentions
    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Only show dropdown if @ is followed by valid characters (no spaces)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt.toLowerCase());
        setMentionStartPos(lastAtIndex);
        const filtered = members.filter(m => 
          m.user_id !== user?.id && // Don't mention yourself
          (m.profile?.first_name?.toLowerCase().includes(textAfterAt.toLowerCase()) ||
           m.profile?.last_name?.toLowerCase().includes(textAfterAt.toLowerCase()))
        );
        setFilteredMembers(filtered);
        setShowMentionDropdown(filtered.length > 0);
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  // Insert mention into message
  const insertMention = (member: CabinetMember) => {
    const beforeMention = newMessage.slice(0, mentionStartPos);
    const afterMention = newMessage.slice(textareaRef.current?.selectionStart || newMessage.length);
    const firstName = member.profile?.first_name || '';
    const lastName = member.profile?.last_name || '';
    const mentionText = `@[${firstName} ${lastName}](${member.user_id})`;
    const newText = beforeMention + mentionText + ' ' + afterMention;
    setNewMessage(newText);
    setShowMentionDropdown(false);
    
    // Restore focus
    setTimeout(() => textareaRef.current?.focus(), 0);
  };
  
  // Render message text with mentions highlighted
  const renderMessageWithMentions = (text: string) => {
    // Parse @[Name](user_id) format
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      
      // Add mention with styling - just @Name in bold
      const mentionName = match[1];
      const mentionUserId = match[2];
      parts.push(
        <span
          key={`mention-${match.index}`}
          className="font-bold"
          title={`Mentionné: ${mentionName}`}
        >
          @{mentionName}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };

  const getDisplayName = (profile?: { first_name?: string; last_name?: string; email?: string }) => {
    if (!profile) return 'Inconnu';
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    if (fullName) return fullName;
    // Fallback to email if no name
    return profile.email || 'Membre du cabinet';
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
    <>
      {/* Document Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewerTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <iframe 
              src={viewerUrl} 
              className="w-full h-full border-0" 
              title={viewerTitle}
            />
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[calc(100vh-350px)] mb-4">
        {/* Sidebar: Conversations list */
        <Card className="md:col-span-1 h-full flex flex-col">
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
                          <p className="text-sm text-gray-600">Chargement des membres...</p>
                        ) : members.length === 0 ? (
                          <p className="text-sm text-gray-600">
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
                                  variant="outline"
                                  className={`w-full justify-start ${
                                    selectedDirectMember === member.user_id 
                                      ? role === 'notaire' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                                      : role === 'notaire' ? 'hover:bg-orange-100 hover:text-orange-600' : 'hover:bg-blue-100 hover:text-blue-600'
                                  }`}
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
                          <p className="text-sm text-gray-600">Chargement des membres...</p>
                        ) : members.length === 0 ? (
                          <p className="text-sm text-gray-600">
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
                  <p className="text-xs text-gray-600 mt-2 px-2">Groupes</p>
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
                  <p className="text-xs text-gray-600 mt-2 px-2">Messages directs</p>
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
      }
      {/* Main chat area */}
      <Card className="md:col-span-3 flex flex-col h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
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
            </div>
            {currentConversation?.is_group && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditGroupName(currentConversation.name);
                  setShowGroupSettings(true);
                }}
                className={`shrink-0 ${role === 'notaire' ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'}`}
              >
                <Settings className="h-5 w-5" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <>
            {/* Messages area with fixed height and scroll */}
            <div className="overflow-y-scroll mb-4 space-y-3 pr-2" style={{ maxHeight: 'calc(100vh - 450px)' }} ref={scrollAreaRef}>
          {!selectedConversation ? (
            <div className="flex items-center justify-center h-full text-gray-600">
                <p>Sélectionnez une conversation pour commencer</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600">
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
                          {isOwnMessage 
                            ? 'Vous' 
                            : getDisplayName(msg.sender_profile)
                          }
                        </span>
                        <span className={`text-xs text-gray-600 ${isOwnMessage ? 'order-1' : 'order-2'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <div className={`inline-block px-3 py-2 rounded-lg ${
                        isOwnMessage ? 'bg-muted' : 'bg-muted'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{renderMessageWithMentions(msg.message)}</p>
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
              <div className="relative flex-1">
                <Textarea
                  ref={textareaRef}
                  placeholder="Écrivez votre message... (utilisez @ pour mentionner)"
                  value={newMessage}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewMessage(value);
                    
                    // Detect @ mentions
                    const cursorPos = e.target.selectionStart || 0;
                    const textBeforeCursor = value.slice(0, cursorPos);
                    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                    
                    if (lastAtIndex !== -1) {
                      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
                      // Only show dropdown if @ is followed by valid characters (no spaces)
                      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
                        setMentionSearch(textAfterAt.toLowerCase());
                        setMentionStartPos(lastAtIndex);
                        const filtered = members.filter(m => 
                          m.user_id !== user?.id && // Don't mention yourself
                          (m.profile?.first_name?.toLowerCase().includes(textAfterAt.toLowerCase()) ||
                           m.profile?.last_name?.toLowerCase().includes(textAfterAt.toLowerCase()))
                        );
                        setFilteredMembers(filtered);
                        setShowMentionDropdown(filtered.length > 0);
                      } else {
                        setShowMentionDropdown(false);
                      }
                    } else {
                      setShowMentionDropdown(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (showMentionDropdown) {
                      // Handle mention dropdown navigation - will implement later
                      // For now, Escape closes dropdown
                      if (e.key === 'Escape') {
                        setShowMentionDropdown(false);
                        return;
                      }
                    }
                    handleKeyDown(e);
                  }}
                  className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                  disabled={sending}
                />
                
                {/* Mention dropdown */}
                {showMentionDropdown && filteredMembers.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                    {filteredMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          // Insert mention
                          const beforeMention = newMessage.slice(0, mentionStartPos);
                          const afterMention = newMessage.slice(textareaRef.current?.selectionStart || newMessage.length);
                          const mentionText = `@[${member.profile?.first_name || ''} ${member.profile?.last_name || ''}](${member.user_id})`;
                          const newText = beforeMention + mentionText + ' ' + afterMention;
                          setNewMessage(newText);
                          setShowMentionDropdown(false);
                          
                          // Restore focus
                          setTimeout(() => textareaRef.current?.focus(), 0);
                        }}
                        className="w-full flex items-center gap-2 p-2 hover:bg-gray-100 text-left"
                      >
                        {member.profile?.photo_url ? (
                          <img src={member.profile.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {member.profile?.first_name?.[0]}{member.profile?.last_name?.[0]}
                            </span>
                          </div>
                        )}
                        <span className="text-sm font-medium">
                          {member.profile?.first_name} {member.profile?.last_name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className={role === 'notaire' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
            </>
        </CardContent>
      </Card>

      {/* Group Settings Dialog */}
      <Dialog open={showGroupSettings} onOpenChange={setShowGroupSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Paramètres du groupe</DialogTitle>
            <DialogDescription>
              Modifier le nom et gérer les membres
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* General Settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Nom du groupe</Label>
                <Input
                  id="group-name"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder="Nom du groupe"
                />
              </div>
              <Button
                onClick={async () => {
                  if (!editGroupName.trim() || !currentConversation?.id) return;
                  try {
                    const newName = editGroupName.trim();
                    
                    console.log('Updating group name from', currentConversation.name, 'to', newName, 'for conversation', currentConversation.id);
                    
                    const { error, data } = await supabase
                      .from('cabinet_conversations')
                      .update({ name: newName })
                      .eq('id', currentConversation.id)
                      .select();
                    
                    console.log('Update result:', { error, data });
                    
                    if (error) throw error;
                    
                    // Update local state immediately
                    setConversations(prev => prev.map(c => 
                      c.id === currentConversation.id ? { ...c, name: newName } : c
                    ));
                    
                    // Close dialog to show the updated name
                    setShowGroupSettings(false);
                    
                    toast({
                      title: 'Succès',
                      description: `Nom du groupe changé en "${newName}"`
                    });
                  } catch (error) {
                    console.error('Error updating group name:', error);
                    toast({
                      title: 'Erreur',
                      description: 'Impossible de modifier le nom',
                      variant: 'destructive'
                    });
                  }
                }}
                className={role === 'notaire' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}
              >
                Enregistrer
              </Button>

              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!currentConversation?.id || !window.confirm('Êtes-vous sûr de vouloir supprimer cette conversation ? Cette action est irréversible.')) return;
                    
                    try {
                      // Delete conversation members
                      await supabase
                        .from('cabinet_conversation_members')
                        .delete()
                        .eq('conversation_id', currentConversation.id);
                      
                      // Delete messages
                      await supabase
                        .from('cabinet_messages')
                        .delete()
                        .eq('conversation_id', currentConversation.id);
                      
                      // Delete conversation
                      const { error } = await supabase
                        .from('cabinet_conversations')
                        .delete()
                        .eq('id', currentConversation.id);
                      
                      if (error) throw error;
                      
                      setConversations(prev => prev.filter(c => c.id !== currentConversation.id));
                      setSelectedConversation(null);
                      setShowGroupSettings(false);
                      
                      toast({
                        title: 'Succès',
                        description: 'Conversation supprimée'
                      });
                    } catch (error) {
                      console.error('Error deleting conversation:', error);
                      toast({
                        title: 'Erreur',
                        description: 'Impossible de supprimer la conversation',
                        variant: 'destructive'
                      });
                    }
                  }}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer la conversation
                </Button>
              </div>
            </div>

            {/* Members Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Membres du groupe ({currentConversation?.member_ids.length || 0})</Label>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {members
                  .filter(m => currentConversation?.member_ids.includes(m.user_id))
                  .map(member => (
                    <div key={member.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {member.profile?.photo_url && (
                            <AvatarImage src={member.profile.photo_url} alt="Photo" />
                          )}
                          <AvatarFallback className={`text-xs ${getRoleBadgeColor(member.role_cabinet)}`}>
                            {getInitials(member.profile)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {getDisplayName(member.profile)}
                        </span>
                      </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (!currentConversation?.id) return;
                            try {
                              await supabase
                                .from('cabinet_conversation_members')
                                .delete()
                                .eq('conversation_id', currentConversation.id)
                                .eq('user_id', member.user_id);
                              
                              setConversations(prev => prev.map(c => 
                                c.id === currentConversation.id 
                                  ? { ...c, member_ids: c.member_ids.filter(id => id !== member.user_id) }
                                  : c
                              ));
                              
                              toast({
                                title: 'Succès',
                                description: 'Membre retiré'
                              });
                            } catch (error) {
                              console.error('Error removing member:', error);
                              toast({
                                title: 'Erreur',
                                description: 'Impossible de retirer le membre',
                                variant: 'destructive'
                              });
                            }
                          }}
                          className={role === 'notaire' ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label>Ajouter des membres</Label>
                <Input
                  placeholder="Rechercher un membre..."
                  value={groupMemberSearch}
                  onChange={(e) => setGroupMemberSearch(e.target.value)}
                />
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {members
                    .filter(m => 
                      !currentConversation?.member_ids.includes(m.user_id) &&
                      m.user_id !== user?.id &&
                      (m.profile?.first_name?.toLowerCase().includes(groupMemberSearch.toLowerCase()) ||
                       m.profile?.last_name?.toLowerCase().includes(groupMemberSearch.toLowerCase()))
                    )
                    .map(member => (
                      <div key={member.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            {member.profile?.photo_url && (
                              <AvatarImage src={member.profile.photo_url} alt="Photo" />
                            )}
                            <AvatarFallback className={`text-xs ${getRoleBadgeColor(member.role_cabinet)}`}>
                              {getInitials(member.profile)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {getDisplayName(member.profile)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!currentConversation?.id) return;
                            try {
                              await supabase
                                .from('cabinet_conversation_members')
                                .insert({
                                  conversation_id: currentConversation.id,
                                  user_id: member.user_id
                                });
                              
                              setConversations(prev => prev.map(c => 
                                c.id === currentConversation.id 
                                  ? { ...c, member_ids: [...c.member_ids, member.user_id] }
                                  : c
                              ));
                              
                              toast({
                                title: 'Succès',
                                description: 'Membre ajouté'
                              });
                            } catch (error) {
                              console.error('Error adding member:', error);
                              toast({
                                title: 'Erreur',
                                description: 'Impossible d\'ajouter le membre',
                                variant: 'destructive'
                              });
                            }
                          }}
                          className={role === 'notaire' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Ajouter
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Source Selection Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {shareType === 'document' && 'Partager un document'}
              {shareType === 'dossier' && 'Partager un dossier'}
              {shareType === 'client' && 'Partager un client'}
              {shareType === 'task' && 'Créer une tâche'}
            </DialogTitle>
            <DialogDescription>
              Choisissez la source du contenu à partager
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Button
              className={`w-full justify-start h-auto py-4 ${role === 'notaire' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
              onClick={() => {
                setShareSource('collaboratif');
                setShowShareDialog(false);
                if (shareType === 'document') loadCollaborativeDocuments();
                else if (shareType === 'dossier') loadCollaborativeDossiers();
                else if (shareType === 'client') loadCollaborativeClients();
              }}
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-semibold">Depuis l'espace collaboratif</span>
                <span className="text-xs text-white/80">
                  Partager un élément déjà dans l'espace collaboratif
                </span>
              </div>
            </Button>

            <Button
              className={`w-full justify-start h-auto py-4 ${role === 'notaire' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
              onClick={() => {
                setShareSource('perso');
                setShowShareDialog(false);
                if (shareType === 'document') loadPersonalDocuments();
                else if (shareType === 'dossier') loadPersonalDossiers();
                else if (shareType === 'client') loadPersonalClients();
              }}
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-semibold">Depuis mon espace personnel</span>
                <span className="text-xs text-white/80">
                  Partager un élément de votre espace personnel
                </span>
              </div>
            </Button>

            {shareType === 'document' && (
              <Button
                className={`w-full justify-start h-auto py-4 ${role === 'notaire' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                onClick={() => {
                  setShareSource('ordinateur');
                  setShowShareDialog(false);
                  fileInputRef.current?.click();
                }}
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="font-semibold">Depuis mon ordinateur</span>
                  <span className="text-xs text-white/80">
                    Importer un fichier depuis votre ordinateur
                  </span>
                </div>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Items Selection Dialog */}
      <Dialog open={showDocumentsDialog} onOpenChange={setShowDocumentsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {shareType === 'document' && (shareSource === 'collaboratif' ? 'Documents de l\'espace collaboratif' : 'Mes documents personnels')}
              {shareType === 'dossier' && (shareSource === 'collaboratif' ? 'Dossiers de l\'espace collaboratif' : 'Mes dossiers personnels')}
              {shareType === 'client' && (shareSource === 'collaboratif' ? 'Clients de l\'espace collaboratif' : 'Mes clients personnels')}
            </DialogTitle>
            <DialogDescription>
              Sélectionnez {shareType === 'document' ? 'un document' : shareType === 'dossier' ? 'un dossier' : 'un client'} à ajouter au groupe
            </DialogDescription>
          </DialogHeader>

          {loadingItems ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-600">Chargement...</div>
            </div>
          ) : (
            <>
              {/* Documents list */}
              {shareType === 'document' && availableDocuments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-600">
                  <FileText className="h-12 w-12 mb-2 opacity-50" />
                  <p>Aucun document disponible</p>
                </div>
              )}
              {shareType === 'document' && availableDocuments.length > 0 && (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {availableDocuments.map((doc) => {
                    const title = 'title' in doc ? doc.title : doc.name;
                    const date = 'shared_at' in doc ? new Date(doc.shared_at).toLocaleDateString() : new Date(doc.created_at).toLocaleDateString();
                    
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className={`h-5 w-5 ${role === 'notaire' ? 'text-orange-500' : 'text-blue-500'}`} />
                          <div className="flex-1">
                            <p className="font-medium">{title}</p>
                            <p className="text-xs text-gray-600">{date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewDocument(doc)}
                            className={role === 'notaire' ? 'hover:bg-orange-100 hover:text-orange-600' : 'hover:bg-blue-100 hover:text-blue-600'}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSelectDocument(doc)}
                            className={role === 'notaire' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}
                          >
                            Ajouter
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Dossiers list */}
              {shareType === 'dossier' && availableDossiers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-600">
                  <FileText className="h-12 w-12 mb-2 opacity-50" />
                  <p>Aucun dossier disponible</p>
                </div>
              )}
              {shareType === 'dossier' && availableDossiers.length > 0 && (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {availableDossiers.map((dossier) => {
                    const date = 'shared_at' in dossier ? new Date(dossier.shared_at).toLocaleDateString() : new Date(dossier.created_at).toLocaleDateString();
                    
                    return (
                      <div
                        key={dossier.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className={`h-5 w-5 ${role === 'notaire' ? 'text-orange-500' : 'text-blue-500'}`} />
                          <div className="flex-1">
                            <p className="font-medium">{dossier.title}</p>
                            {dossier.description && (
                              <p className="text-xs text-gray-600">{dossier.description}</p>
                            )}
                            <p className="text-xs text-gray-600">{date}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSelectDossier(dossier)}
                          className={role === 'notaire' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}
                        >
                          Ajouter
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Clients list */}
              {shareType === 'client' && availableClients.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-600">
                  <Users className="h-12 w-12 mb-2 opacity-50" />
                  <p>Aucun client disponible</p>
                </div>
              )}
              {shareType === 'client' && availableClients.length > 0 && (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {availableClients.map((client) => {
                    const date = 'shared_at' in client ? new Date(client.shared_at).toLocaleDateString() : new Date(client.created_at).toLocaleDateString();
                    
                    return (
                      <div
                        key={client.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Users className={`h-5 w-5 ${role === 'notaire' ? 'text-orange-500' : 'text-blue-500'}`} />
                          <div className="flex-1">
                            <p className="font-medium">{client.first_name} {client.last_name}</p>
                            {client.email && (
                              <p className="text-xs text-gray-600">{client.email}</p>
                            )}
                            <p className="text-xs text-gray-600">{date}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSelectClient(client)}
                          className={role === 'notaire' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}
                        >
                          Ajouter
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden file input for upload from computer */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={handleFileUpload}
        disabled={uploadingFile}
      />
    </div>
    </>
  );
}
