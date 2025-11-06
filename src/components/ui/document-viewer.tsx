import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    ? 'bg-amber-600 hover:bg-amber-700 text-white' 
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 [&>button]:hidden">
        <DialogHeader className="px-4 py-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold truncate pr-4">
              {documentName}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className={`h-7 w-7 rounded-full ${closeButtonClass}`}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <iframe
            src={documentUrl}
            className="w-full h-full border-0"
            title={documentName}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
