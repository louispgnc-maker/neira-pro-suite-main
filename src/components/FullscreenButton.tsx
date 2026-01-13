import { useState, useEffect } from "react";
import { Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const FullscreenButton = () => {
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    // Restaurer l'état du zoom depuis localStorage
    const savedZoomMode = localStorage.getItem("zoomMode");
    if (savedZoomMode === "true") {
      setIsZoomed(true);
      document.documentElement.style.transform = "scale(1.15)";
      document.documentElement.style.transformOrigin = "top center";
      document.documentElement.style.width = "calc(100% / 1.15)";
      document.documentElement.style.height = "calc(100% / 1.15)";
    }
  }, []);

  const toggleZoom = () => {
    const newZoomState = !isZoomed;
    setIsZoomed(newZoomState);
    
    if (newZoomState) {
      document.documentElement.style.transform = "scale(1.15)";
      document.documentElement.style.transformOrigin = "top center";
      document.documentElement.style.width = "calc(100% / 1.15)";
      document.documentElement.style.height = "calc(100% / 1.15)";
      localStorage.setItem("zoomMode", "true");
    } else {
      document.documentElement.style.transform = "";
      document.documentElement.style.transformOrigin = "";
      document.documentElement.style.width = "";
      document.documentElement.style.height = "";
      localStorage.setItem("zoomMode", "false");
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
Zoom}
          className="fixed bottom-6 right-6 z-50 h-9 w-9 rounded-md opacity-30 hover:opacity-100 transition-opacity duration-200 bg-gray-100/50 hover:bg-gray-200 text-gray-600 hover:text-gray-900"
          aria-label={isZoomed ? "Vue normale" : "Agrandir l'affichage"}
        >
          {isZoomed ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>{isZoomed ? "Vue normale" : "Agrandir l'affichage