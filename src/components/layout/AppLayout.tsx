import { ReactNode, useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BuildInfo } from "./BuildInfo";
import { GlobalSearch } from "@/components/GlobalSearch";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  
  // Récupère l'état initial du sidebar depuis le cookie
  const getInitialSidebarState = () => {
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('sidebar:state='));
    return cookie ? cookie.split('=')[1] === 'true' : true;
  };
  
  const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarState);
  
  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  
  // Définit le fond de page selon le rôle
  const backgroundClass = role === 'notaire'
    ? 'bg-gradient-to-br from-orange-100 to-red-100'
    : 'bg-gradient-to-br from-blue-100 to-indigo-100';
  
  // Gestionnaire pour le toggle du sidebar - seulement via le bouton
  const handleSidebarChange = useCallback((open: boolean) => {
    setSidebarOpen(open);
  }, []);
  
  return (
    <SidebarProvider 
      open={sidebarOpen} 
      onOpenChange={handleSidebarChange}
    >
      <div 
        className={`min-h-screen flex w-full ${backgroundClass}`}
      >
        <AppSidebar />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1">
            {children}
          </div>
          <BuildInfo />
        </main>
        {/* GlobalSearch sans bouton - uniquement pour Cmd+K global */}
        <GlobalSearch userRole={role} hideButton={true} />
      </div>
    </SidebarProvider>
  );
}
