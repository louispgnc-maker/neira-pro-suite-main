import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => Math.min(Math.max(1, prevPageNumber + offset), numPages));
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold truncate flex-1 mr-4">{documentName || 'Document'}</h2>
          <div className="flex items-center gap-2">
            {numPages > 0 && (
              <>
                <Button
                  onClick={previousPage}
                  disabled={pageNumber <= 1}
                  size="sm"
                  variant="outline"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  Page {pageNumber} / {numPages}
                </span>
                <Button
                  onClick={nextPage}
                  disabled={pageNumber >= numPages}
                  size="sm"
                  variant="outline"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button onClick={onClose} size="sm" className={closeButtonClass}>
              <X className="h-4 w-4 mr-2" />
              Fermer
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto h-[calc(90vh-4rem)] flex items-center justify-center bg-gray-100">
          {documentUrl ? (
            <Document
              file={documentUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Chargement du document...</p>
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <p className="text-red-600">Erreur de chargement du document</p>
                  <Button 
                    onClick={() => window.open(documentUrl, '_blank')}
                    className={closeButtonClass}
                  >
                    Ouvrir dans un nouvel onglet
                  </Button>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                width={Math.min(window.innerWidth * 0.9, 1200)}
              />
            </Document>
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
