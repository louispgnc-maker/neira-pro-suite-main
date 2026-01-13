import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const FullscreenButton = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const location = useLocation();
  const isRestoringRef = useRef(false);

  useEffect(() => {
    let restoreTimeout: NodeJS.Timeout;

    const handleFullscreenChange = () => {
      const fullscreenActive = !!document.fullscreenElement;
      setIsFullscreen(fullscreenActive);
      
      // Ne pas mettre à jour localStorage si on est en train de restaurer
      if (!isRestoringRef.current) {
        localStorage.setItem("fullscreenMode", fullscreenActive ? "true" : "false");
      }
      
      // Si on sort du plein écran mais qu'il devrait être actif, le restaurer
      if (!fullscreenActive && localStorage.getItem("fullscreenMode") === "true" && !isRestoringRef.current) {
        isRestoringRef.current = true;
        restoreTimeout = setTimeout(() => {
          document.documentElement.requestFullscreen().catch(() => {
            isRestoringRef.current = false;
          });
          isRestoringRef.current = false;
        }, 50);
      }
    };

    const restoreFullscreen = () => {
      const savedFullscreenMode = localStorage.getItem("fullscreenMode");
      if (savedFullscreenMode === "true" && !document.fullscreenElement) {
        setTimeout(() => {
          document.documentElement.requestFullscreen().catch(() => {});
        }, 100);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    
    // Tenter de restaurer le plein écran au chargement
    restoreFullscreen();
    
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (restoreTimeout) clearTimeout(restoreTimeout);
    };
  }, [location]); // Réexécuter à chaque changement de page

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        localStorage.setItem("fullscreenMode", "true");
      } else {
        await document.exitFullscreen();
        localStorage.setItem("fullscreenMode", "false");
      }
    } catch (error) {
      console.error("Erreur lors du passage en plein écran:", error);
    }
  };

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
