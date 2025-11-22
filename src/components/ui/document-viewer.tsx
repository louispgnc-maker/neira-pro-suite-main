import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
          {documentUrl ? (
            <object
              data={documentUrl}
              type="application/pdf"
              className="w-full h-full"
            >
              <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
                <p className="text-gray-600">Impossible d'afficher le PDF dans le navigateur</p>
                <Button 
                  onClick={() => window.open(documentUrl, '_blank')}
                  className={closeButtonClass}
                >
                  Ouvrir dans un nouvel onglet
                </Button>
              </div>
            </object>
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
