import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, FileText } from "lucide-react";
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
        <div className="flex-1 overflow-hidden h-[calc(90vh-4rem)] flex items-center justify-center bg-gray-50">
          {documentUrl ? (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <FileText className="h-16 w-16 text-gray-400" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-700">Document prêt à visualiser</p>
                <p className="text-sm text-gray-500">Cliquez sur le bouton ci-dessous pour ouvrir le document</p>
              </div>
              <Button 
                onClick={() => window.open(documentUrl, '_blank')}
                className={closeButtonClass}
                size="lg"
              >
                <FileText className="h-4 w-4 mr-2" />
                Ouvrir le document
              </Button>
            </div>
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
