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

  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!open || !documentUrl) {
      setBlobUrl('');
      setError('');
      return;
    }

    const loadDocument = async () => {
      setLoading(true);
      setError('');
      
      try {
        const response = await fetch(documentUrl);
        if (!response.ok) {
          throw new Error('Impossible de charger le document');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (err) {
        console.error('Error loading document:', err);
        setError('Impossible de charger le document. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [open, documentUrl]);

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
          {loading && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Chargement du document...</p>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-red-600">{error}</p>
              <Button 
                onClick={() => window.open(documentUrl, '_blank')}
                className={closeButtonClass}
              >
                Ouvrir dans un nouvel onglet
              </Button>
            </div>
          )}
          {!loading && !error && blobUrl && (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title={documentName}
            />
          )}
          {!loading && !error && !blobUrl && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Aucun document à afficher</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
