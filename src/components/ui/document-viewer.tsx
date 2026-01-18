import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [viewUrl, setViewUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fileType, setFileType] = useState<string>("");

  useEffect(() => {
    if (!open || !documentUrl) {
      setViewUrl("");
      setLoading(true);
      setError(false);
      return;
    }

    let objectUrl = "";
    
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // Détecter le type de fichier depuis l'extension
        const fileExt = documentName.toLowerCase();
        let type = '';
        if (fileExt.endsWith('.png') || fileExt.endsWith('.jpg') || fileExt.endsWith('.jpeg') || fileExt.endsWith('.gif') || fileExt.endsWith('.webp') || fileExt.endsWith('.svg')) {
          type = 'image/';
        } else if (fileExt.endsWith('.pdf')) {
          type = 'application/pdf';
        }
        setFileType(type);
        
        // Télécharger le document et créer blob URL
        const response = await fetch(documentUrl);
        if (!response.ok) throw new Error('Failed to fetch');
        
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setViewUrl(objectUrl);
        setLoading(false);
      } catch (err) {
        console.error('Error loading document:', err);
        setError(true);
        setLoading(false);
      }
    };

    loadDocument();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [documentUrl, documentName, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="truncate">{documentName || 'Document'}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Chargement du document...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-red-600">Erreur de chargement</p>
            <Button 
              onClick={() => window.open(documentUrl, '_blank')}
              className={role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}
            >
              Ouvrir dans un nouvel onglet
            </Button>
          </div>
        ) : viewUrl ? (
          fileType.startsWith('image/') ? (
            <img 
              src={viewUrl} 
              alt={documentName}
              className="w-full h-[calc(90vh-5.5rem)] object-contain bg-white"
            />
          ) : (
            <iframe
              src={viewUrl}
              className="w-full h-[calc(90vh-5.5rem)] border-0"
              title={documentName}
            />
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
