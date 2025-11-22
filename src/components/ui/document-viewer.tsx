import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface DocumentViewerProps {
  open: boolean;
  onClose: () => void;
  documentUrl: string;
  documentName: string;
  role?: 'avocat' | 'notaire';
}

export function DocumentViewer({ open, onClose, documentUrl, documentName, role = 'avocat' }: DocumentViewerProps) {
  const closeButtonClass = role === 'notaire' 
    ? 'bg-orange-600 hover:bg-orange-700 text-white' 
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  const [blobUrl, setBlobUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || !documentUrl) return;

    let objectUrl = "";
    
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // Télécharger le PDF
        const response = await fetch(documentUrl);
        if (!response.ok) throw new Error('Failed to fetch');
        
        // Convertir en blob
        const blob = await response.blob();
        
        // Créer une URL blob locale (même origine, pas de CORS)
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setLoading(false);
      } catch (err) {
        console.error('Error loading document:', err);
        setError(true);
        setLoading(false);
      }
    };

    loadDocument();

    // Cleanup: libérer la mémoire quand on ferme
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [documentUrl, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold truncate flex-1 mr-4">{documentName || 'Document'}</h2>
          <Button onClick={onClose} size="sm" className={closeButtonClass}>
            <X className="h-4 w-4 mr-2" />
            Fermer
          </Button>
        </div>
        <div className="flex-1 overflow-hidden h-[calc(90vh-4rem)]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Chargement du document...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-red-600">Erreur de chargement</p>
              <Button 
                onClick={() => window.open(documentUrl, '_blank')}
                className={closeButtonClass}
              >
                Ouvrir dans un nouvel onglet
              </Button>
            </div>
          ) : blobUrl ? (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title={documentName}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Aucun document à afficher</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
