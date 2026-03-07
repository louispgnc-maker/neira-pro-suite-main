import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';

type AnchorPosition = {
  page: number;
  x: number;
  y: number;
  pageWidth: number;
  pageHeight: number;
};

type PdfAnchorSelectorProps = {
  pdfUrl: string;
  onAnchorSet: (position: AnchorPosition) => void;
  role?: 'avocat' | 'notaire';
};

export function PdfAnchorSelector({ pdfUrl, onAnchorSet, role = 'avocat' }: PdfAnchorSelectorProps) {
  const [anchorPosition, setAnchorPosition] = useState<AnchorPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Attendre que l'iframe soit chargée
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [pdfUrl]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Dimensions approximatives d'une page A4 en points PDF (595x842)
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    
    // Convertir les coordonnées du clic en coordonnées PDF
    // On suppose une page A4 standard
    const pdfX = (x / containerWidth) * 595;
    const pdfY = (y / containerHeight) * 842;

    const position: AnchorPosition = {
      page: 1, // Pour l'instant on suppose page 1, on peut améliorer plus tard
      x: Math.round(pdfX),
      y: Math.round(pdfY),
      pageWidth: 595,
      pageHeight: 842
    };

    setAnchorPosition(position);
    onAnchorSet(position);
  };

  const clearAnchor = () => {
    setAnchorPosition(null);
  };

  return (
    <div className="space-y-3">
      <div className="bg-gray-50 px-4 py-3 border-b rounded-t-lg">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Aperçu - Cliquez pour placer la signature</h4>
          {anchorPosition && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAnchor}
              className={role === 'notaire' 
                ? 'hover:bg-orange-100 hover:text-black' 
                : 'hover:bg-blue-100 hover:text-black'}
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative border rounded-b-lg overflow-hidden bg-white cursor-crosshair"
        style={{ height: '400px' }}
        onClick={handleContainerClick}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={pdfUrl}
          className="w-full h-full border-0 pointer-events-none"
          title="Document preview"
        />

        {/* Marqueur de position de signature */}
        {anchorPosition && (
          <div
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 ${
              role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
            }`}
            style={{
              left: `${(anchorPosition.x / anchorPosition.pageWidth) * 100}%`,
              top: `${(anchorPosition.y / anchorPosition.pageHeight) * 100}%`
            }}
          >
            <div className="relative">
              <MapPin className="h-8 w-8 fill-current" />
              <div className={`absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded text-xs font-medium text-white ${
                role === 'notaire' ? 'bg-orange-600' : 'bg-blue-600'
              }`}>
                [SIGNER_ICI]
              </div>
            </div>
          </div>
        )}
      </div>

      {anchorPosition && (
        <div className={`text-xs p-3 rounded-lg ${
          role === 'notaire' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'
        }`}>
          ✅ Position de signature définie : Page {anchorPosition.page}, X: {anchorPosition.x}pt, Y: {anchorPosition.y}pt
        </div>
      )}

      {!anchorPosition && (
        <div className="text-xs p-3 bg-gray-50 text-gray-600 rounded-lg">
          👆 Cliquez sur le document ci-dessus pour placer l'ancre de signature
        </div>
      )}
    </div>
  );
}
