import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BuildInfo } from "./BuildInfo";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  
  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  
  // Définit le fond de page selon le rôle
  const backgroundImage = role === 'notaire'
    ? 'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Fond%20orange.png)'
    : 'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/fond%20de%20page%20.png)';
  
  return (
    <SidebarProvider>
      <div 
        className="min-h-screen flex w-full bg-background" 
        style={{ 
          backgroundImage, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center', 
          backgroundAttachment: 'fixed' 
        }}
      >
        <AppSidebar />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1">
            {children}
          </div>
          <BuildInfo />
        </main>
      </div>
    </SidebarProvider>
  );
}
