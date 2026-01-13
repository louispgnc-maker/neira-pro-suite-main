import { useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";

const FullscreenButton = () => {
  const { user } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    
    // Appliquer le style plein écran personnalisé
    const appElement = document.querySelector('.min-h-screen.flex.w-full') as HTMLElement;
    if (appElement) {
      if (!isFullscreen) {
        appElement.style.position = 'fixed';
        appElement.style.top = '0';
        appElement.style.left = '0';
        appElement.style.width = '100vw';
        appElement.style.height = '100vh';
        appElement.style.zIndex = '9999';
      } else {
        appElement.style.position = '';
        appElement.style.top = '';
        appElement.style.left = '';
        appElement.style.width = '';
        appElement.style.height = '';
        appElement.style.zIndex = '';
      }
    }
  };

  // N'afficher le bouton que si l'utilisateur est connecté
  if (!user) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          className="fixed bottom-6 right-6 z-50 h-9 w-9 rounded-md opacity-30 hover:opacity-100 transition-opacity duration-200 bg-gray-100/50 hover:bg-gray-200 text-gray-600 hover:text-gray-900"
          aria-label={isFullscreen ? "Quitter le plein écran" : "Passer en plein écran"}
        >
          {isFullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>{isFullscreen ? "Quitter le plein écran" : "Passer en plein écran"}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default FullscreenButton;
