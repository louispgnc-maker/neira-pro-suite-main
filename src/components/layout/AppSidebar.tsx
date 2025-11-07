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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

function getMenuItems(role: 'avocat' | 'notaire') {
  const prefix = role === 'notaire' ? '/notaires' : '/avocats';
  return [
    { title: "Tableau de bord", url: `${prefix}/dashboard`, icon: LayoutDashboard },
    { title: "Documents", url: `${prefix}/documents`, icon: FileText },
    { title: "Dossiers", url: `${prefix}/dossiers`, icon: Folder },
    { title: "Contrats", url: `${prefix}/contrats`, icon: FolderPlus },
    { title: "Signatures", url: `${prefix}/signatures`, icon: PenTool },
    { title: "Clients", url: `${prefix}/clients`, icon: Users },
    { title: "Tâches", url: `${prefix}/tasks`, icon: CheckSquare },
    { title: "Mon cabinet", url: `${prefix}/cabinet`, icon: Users },
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
  // Couleurs espace selon rôle
  const spaceBtnClass = role === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';
  const spaceLabel = "Changer d'espace";
  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarHeader className={`border-b border-sidebar-border space-y-3 ${isCollapsed ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center justify-between gap-2">
          <SidebarTrigger
            className={
              `h-8 w-8 rounded-md flex-shrink-0 ${role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`
            }
          />
          {!isCollapsed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className={`h-8 px-3 text-xs font-semibold rounded-md shadow-sm text-white ${role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  Changer d'espace
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className={role === 'notaire' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}
              >
                <DropdownMenuItem
                  onClick={() => navigate('/avocats/dashboard')}
                  disabled={role === 'avocat'}
                  className={
                    role === 'avocat'
                      ? 'opacity-60 text-muted-foreground'
                      : 'hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white data-[highlighted]:bg-blue-600 data-[highlighted]:text-white'
                  }
                >
                  Espace Avocat
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/notaires/dashboard')}
                  disabled={role === 'notaire'}
                  className={
                    role === 'notaire'
                      ? 'opacity-60 text-muted-foreground'
                      : 'hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white data-[highlighted]:bg-orange-600 data-[highlighted]:text-white'
                  }
                >
                  Espace Notaire
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center text-white ${role === 'notaire' ? 'bg-orange-600' : 'bg-blue-600'}`}> 
            <UserCircle2 className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground truncate max-w-[120px]" title={displayName}>{displayName}</span>
            </div>
          )}
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
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={`border-t border-sidebar-border ${isCollapsed ? 'p-3' : 'p-4'}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={`${isCollapsed ? 'h-8 w-8 p-0 justify-center' : 'w-full justify-start gap-2'} group font-medium rounded-md flex-shrink-0 ${role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              <UserCircle2 className="h-4 w-4" />
              {!isCollapsed && <span>Profil</span>}
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
      </SidebarFooter>
    </Sidebar>
  );
}
