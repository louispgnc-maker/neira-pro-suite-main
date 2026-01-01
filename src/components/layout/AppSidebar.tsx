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
  Settings,
  Power,
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
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useUnreadEmailCount } from '@/hooks/useUnreadEmailCount';

function getMenuItems(role: 'avocat' | 'notaire') {
  const prefix = role === 'notaire' ? '/notaires' : '/avocats';
  const iconColor = role === 'notaire' ? 'text-orange-600' : 'text-blue-600';
  return {
    navigation: [
      { title: "Tableau de bord", url: `${prefix}/dashboard`, icon: LayoutDashboard, color: iconColor },
    ],
    activiteJuridique: [
      { title: "Dossiers", url: `${prefix}/dossiers`, icon: Folder, color: iconColor },
      { title: role === 'notaire' ? "Actes" : "Contrats", url: `${prefix}/contrats`, icon: FolderPlus, color: iconColor },
      { title: "Signatures", url: `${prefix}/signatures`, icon: PenTool, color: iconColor },
      { title: "Documents", url: `${prefix}/documents`, icon: FileText, color: iconColor },
    ],
    organisationSuivi: [
      { title: "Messagerie", url: `${prefix}/messagerie`, icon: Mail, color: iconColor, badge: true },
      { title: "Tâches", url: `${prefix}/tasks`, icon: CheckSquare, color: iconColor },
    ],
    clientsCabinet: [
      { title: "Clients", url: `${prefix}/clients`, icon: Users, color: iconColor },
      { title: "Mon cabinet", url: `${prefix}/espace-collaboratif?tab=dashboard`, icon: Users, color: iconColor },
    ],
    outils: [
      { title: "Statistiques", url: `${prefix}/statistiques`, icon: BarChart3, color: iconColor },
      { title: "Paramètres", url: `${prefix}/profile`, icon: Settings, color: iconColor },
    ],
  };
}

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';
  
  const menuItems = getMenuItems(role);
  const isActive = (path: string) => location.pathname === path;

  // Fonction pour gérer le clic sur un lien du menu
  const handleMenuItemClick = () => {
    // Sur mobile uniquement, fermer le sidebar après le clic
    if (isMobile) {
      setOpenMobile(false);
    }
    // Sur desktop, l'état du sidebar est maintenant contrôlé et ne change que via le bouton toggle
  };

  // Fonction de déconnexion
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const { user, profile } = useAuth();
  const profileEmail = user?.email || '—';
  const displayName = profile?.first_name || profile?.email?.split('@')[0] || 'Compte';
  const [currentCabinetId, setCurrentCabinetId] = useState<string | null>(null);
  const unreadEmailCount = useUnreadEmailCount();

  useEffect(() => {
    let mounted = true;
    const loadCabinetForRole = async () => {
      if (!user) {
        setCurrentCabinetId(null);
        return;
      }
      
      try {
        // Essayer d'abord avec get_user_cabinets
        const { data, error } = await supabase.rpc('get_user_cabinets');
        
        if (!error && data) {
          const cabinets = Array.isArray(data) ? (data as unknown[]) : [];
          const found = cabinets.find((c) => {
            const cc = c as Record<string, unknown>;
            return cc.role === role;
          });
          
          if (found) {
            const cc = found as Record<string, unknown>;
            const foundId = typeof cc.id === 'string' ? cc.id : null;
            if (foundId && mounted) {
              setCurrentCabinetId(foundId);
              return;
            }
          }
        }
        
        // Fallback: chercher directement dans cabinet_members
        const { data: memberData } = await supabase
          .from('cabinet_members')
          .select('cabinet_id, cabinets!inner(role)')
          .eq('user_id', user.id)
          .limit(1)
          .single();
        
        if (memberData && mounted) {
          setCurrentCabinetId(memberData.cabinet_id);
          return;
        }
        
        // Dernier fallback: cabinet_id du profile
        if (profile?.cabinet_id && mounted) {
          setCurrentCabinetId(profile.cabinet_id);
        }
        
      } catch (e) {
        console.error('Error loading cabinet:', e);
        if (profile?.cabinet_id && mounted) {
          setCurrentCabinetId(profile.cabinet_id);
        }
      }
    };
    
    loadCabinetForRole();
    return () => { mounted = false; };
  }, [user, role, profile]);

  // Load unread message count
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    if (!user || !currentCabinetId) return;
    
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
        const lastViewed = localStorage.getItem(lastViewedKey);
        
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
  }, [user, currentCabinetId]);

  useEffect(() => {
    if (!user || !currentCabinetId) return;
    
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
  }, [user, currentCabinetId, loadUnreadCount]);

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
              {menuItems.navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-3" onClick={handleMenuItemClick}>
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Activité juridique</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.activiteJuridique.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-3" onClick={handleMenuItemClick}>
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>          <SidebarGroupLabel>Organisation et suivi</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.organisationSuivi.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-3 relative" onClick={handleMenuItemClick}>
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                      {!isCollapsed && <span>{item.title}</span>}
                      {item.badge && unreadEmailCount > 0 && (
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

        <SidebarGroup>          <SidebarGroupLabel>Clients & cabinet</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.clientsCabinet.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-3" onClick={handleMenuItemClick}>
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Outils</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.outils.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-3" onClick={handleMenuItemClick}>
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className={`w-full justify-start gap-3 ${role === 'notaire' ? 'hover:bg-orange-50 hover:text-orange-700' : 'hover:bg-blue-50 hover:text-blue-700'}`}
        >
          <Power className="h-4 w-4" />
          {!isCollapsed && <span>Déconnexion</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
