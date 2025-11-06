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
    ? 'bg-amber-600 hover:bg-amber-700 text-white' 
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 [&>button]:hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-1 border-b shrink-0">
          <h2 className="text-sm font-semibold truncate pr-3">
            {documentName}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={`h-6 w-6 rounded-full ${closeButtonClass}`}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex-1 min-h-0">
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
