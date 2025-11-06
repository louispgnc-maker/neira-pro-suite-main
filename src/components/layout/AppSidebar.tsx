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
  const isActive = (path: string) => location.pathname === path;

  const { user } = useAuth();
  const profileEmail = user?.email || '—';
  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white">
            <UserCircle2 className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">Professionnel</span>
            </div>
          )}
        </div>
        <SidebarTrigger className="ml-auto" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 group"
            >
              <UserCircle2 className="h-4 w-4" />
              {!isCollapsed && <span>Profil</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className={role === 'notaire' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}>
            <div className="px-2 py-1.5 text-xs text-muted-foreground">Connecté</div>
            <DropdownMenuItem className={role === 'notaire' ? 'focus:bg-amber-600 focus:text-white' : 'focus:bg-blue-600 focus:text-white'} disabled>
              {profileEmail}
            </DropdownMenuItem>
            <DropdownMenuItem
              className={role === 'notaire' ? 'focus:bg-amber-600 focus:text-white' : 'focus:bg-blue-600 focus:text-white'}
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
