import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  CheckSquare,
  PenTool,
  FolderPlus,
  Folder,
  LogOut,
  UserCircle2,
  Mail,
  BarChart3,
  Lock,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useUnreadEmailCount } from '@/hooks/useUnreadEmailCount';

function getMenuItems(role: 'avocat' | 'notaire') {
  const prefix = role === 'notaire' ? '/notaires' : '/avocats';
  return [
    { title: "Tableau de bord", url: `${prefix}/dashboard`, icon: LayoutDashboard },
    { title: "Documents", url: `${prefix}/documents`, icon: FileText },
    { title: "Messagerie", url: `${prefix}/messagerie`, icon: Mail },
    { title: "Dossiers", url: `${prefix}/dossiers`, icon: Folder },
    { title: role === 'notaire' ? "Actes" : "Contrats", url: `${prefix}/contrats`, icon: FolderPlus },
    { title: "Signatures", url: `${prefix}/signatures`, icon: PenTool },
    { title: "Clients", url: `${prefix}/clients`, icon: Users },
    { title: "Tâches", url: `${prefix}/tasks`, icon: CheckSquare },
    { title: "Mon cabinet", url: `${prefix}/espace-collaboratif?tab=dashboard`, icon: Users },
    { title: "Statistiques", url: `${prefix}/statistiques`, icon: BarChart3 },
  ];
}

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';
  
  const menuItems = getMenuItems(role);
  const primaryItems = menuItems.filter((m) => ["Tableau de bord", "Mon cabinet"].includes(m.title));
  const secondaryItems = menuItems.filter((m) => !["Tableau de bord", "Mon cabinet"].includes(m.title));
  const isActive = (path: string) => location.pathname === path;

  const { user, profile } = useAuth();
  const profileEmail = user?.email || '—';
  const displayName = profile?.first_name || profile?.email?.split('@')[0] || 'Compte';
  const [currentCabinetId, setCurrentCabinetId] = useState<string | null>(null);
  const unreadEmailCount = useUnreadEmailCount();

  useEffect(() => {
    let mounted = true;
    const loadCabinetForRole = async () => {
      if (!user) return setCurrentCabinetId(null);
      try {
        const { data } = await supabase.rpc('get_user_cabinets');
        const cabinets = Array.isArray(data) ? (data as unknown[]) : [];
        const found = cabinets.find((c) => {
          const cc = c as Record<string, unknown>;
          return cc.role === role;
        });
        let foundId: string | null = null;
        if (found) {
          const cc = found as Record<string, unknown>;
          if (typeof cc.id === 'string') foundId = cc.id;
        }
        if (mounted) setCurrentCabinetId(foundId ?? (typeof profile?.cabinet_id === 'string' ? profile!.cabinet_id : null));
      } catch (e: unknown) {
        if (mounted) setCurrentCabinetId(typeof profile?.cabinet_id === 'string' ? profile!.cabinet_id : null);
      }
    };
    loadCabinetForRole();
    return () => { mounted = false; };
  }, [user, role, profile]);

  // Load unread message count
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !currentCabinetId) return;

    const loadUnreadCount = async () => {
      try {
        const { data: allMessages, error } = await supabase
          .from('cabinet_messages')
          .select('id, conversation_id, recipient_id, sender_id, created_at')
          .eq('cabinet_id', currentCabinetId)
          .neq('sender_id', user.id);

        if (error || !allMessages || allMessages.length === 0) {
          setTotalUnreadCount(0);
          return;
        }

        let totalUnread = 0;
        const conversationIds = new Set<string>();
        
        allMessages.forEach(msg => {
          if (!msg.conversation_id && !msg.recipient_id) {
            conversationIds.add('general');
          } else if (msg.conversation_id) {
            conversationIds.add(msg.conversation_id);
          } else if (msg.recipient_id === user.id) {
            conversationIds.add(`direct-${msg.sender_id}`);
          }
        });

        for (const convId of conversationIds) {
          const lastViewedKey = `chat-last-viewed-${currentCabinetId}-${convId}`;
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
            totalUnread += convMessages.filter(m => new Date(m.created_at) > new Date(lastViewed)).length;
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

    const channel = supabase
      .channel(`sidebar-unread-messages-${currentCabinetId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cabinet_messages',
          filter: `cabinet_id=eq.${currentCabinetId}`
        },
        (payload) => {
          const newMsg = payload.new as { sender_id: string };
          if (newMsg.sender_id !== user.id) {
            setTotalUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    const handleConversationRead = () => {
      loadUnreadCount();
    };

    window.addEventListener('cabinet-conversation-read', handleConversationRead);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('cabinet-conversation-read', handleConversationRead);
    };
  }, [user, currentCabinetId]);

  // Couleurs espace selon rôle
  const spaceBtnClass = role === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';
  
  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarHeader className={`border-b border-sidebar-border ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-2`}>
          <SidebarTrigger
            className={
              `h-8 w-8 rounded-md flex-shrink-0 ${role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`
            }
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <Separator className="my-2" />
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                      {item.title === "Messagerie" && unreadEmailCount > 0 && (
                        <Badge className="ml-auto bg-red-600 text-white h-5 min-w-5 flex items-center justify-center text-xs">
                          {unreadEmailCount > 99 ? '99+' : unreadEmailCount}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={`border-t border-sidebar-border ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <div className={`flex ${isCollapsed ? 'flex-col items-center' : 'items-center justify-start'} gap-2`}> 
          <button
            className={`h-8 w-8 flex items-center justify-center rounded-md flex-shrink-0 relative transition-colors ${role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            onClick={() => navigate(`${role === 'notaire' ? '/notaires' : '/avocats'}/espace-collaboratif?tab=discussion`)}
            title="Messages"
          >
            <Mail className="h-4 w-4 text-white" />
            {totalUnreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0.5 bg-red-600 text-white text-[10px] font-bold"
              >
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </Badge>
            )}
          </button>
          <NotificationBell role={role} compact={true} cabinetId={currentCabinetId} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`h-8 w-8 p-0 flex items-center justify-center rounded-md flex-shrink-0 ${role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                <UserCircle2 className="h-4 w-4 text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className={role === 'notaire' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}>
              <div className="px-2 py-1.5 text-xs text-muted-foreground">Connecté</div>
              <DropdownMenuItem className={role === 'notaire' ? 'focus:bg-orange-600 focus:text-white' : 'focus:bg-blue-600 focus:text-white'} disabled>
                {profileEmail}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={role === 'notaire' ? 'focus:bg-orange-600 focus:text-white hover:bg-orange-600 hover:text-white' : 'focus:bg-blue-600 focus:text-white hover:bg-blue-600 hover:text-white'}
                onClick={() => navigate(role === 'notaire' ? '/notaires/profile' : '/avocats/profile')}
              >
                Ouvrir le profil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                onClick={() => (window.location.href = '/')}
              >
                <LogOut className="mr-2 h-4 w-4" /> Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
