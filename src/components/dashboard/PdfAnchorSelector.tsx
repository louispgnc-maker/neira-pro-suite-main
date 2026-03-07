import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';

type AnchorPosition = {
  page: number;
  x: number;
  y: number;
  pageWidth: number;
  pageHeight: number;
  signatoryIndex: number;
};

type PdfAnchorSelectorProps = {
  pdfUrl: string;
  onAnchorsSet: (positions: AnchorPosition[]) => void;
  signatoryCount: number;
  role?: 'avocat' | 'notaire';
};

const COLORS = [
  { border: 'border-blue-600', bg: 'bg-blue-600', text: 'text-blue-600', name: 'Bleu' },
  { border: 'border-green-600', bg: 'bg-green-600', text: 'text-green-600', name: 'Vert' },
  { border: 'border-purple-600', bg: 'bg-purple-600', text: 'text-purple-600', name: 'Violet' },
  { border: 'border-pink-600', bg: 'bg-pink-600', text: 'text-pink-600', name: 'Rose' },
  { border: 'border-orange-600', bg: 'bg-orange-600', text: 'text-orange-600', name: 'Orange' },
];

export function PdfAnchorSelector({ pdfUrl, onAnchorsSet, signatoryCount, role = 'avocat' }: PdfAnchorSelectorProps) {
  const [anchorPositions, setAnchorPositions] = useState<AnchorPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [clickMode, setClickMode] = useState(false);
  const [currentSignatoryIndex, setCurrentSignatoryIndex] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Attendre que l'iframe soit chargée
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [pdfUrl]);

  useEffect(() => {
    // Notifier le parent quand les positions changent
    onAnchorsSet(anchorPositions);
  }, [anchorPositions, onAnchorsSet]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clickMode || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Dimensions approximatives d'une page A4 en points PDF (595x842)
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    
    // Convertir les coordonnées du clic en coordonnées PDF
    const pdfX = (x / containerWidth) * 595;
    const pdfY = (y / containerHeight) * 842;

    const position: AnchorPosition = {
      page: 1,
      x: Math.round(pdfX),
      y: Math.round(pdfY),
      pageWidth: 595,
      pageHeight: 842,
      signatoryIndex: currentSignatoryIndex
    };

    // Remplacer l'ancre existante pour ce signataire ou en ajouter une nouvelle
    const newPositions = [...anchorPositions.filter(p => p.signatoryIndex !== currentSignatoryIndex), position];
    setAnchorPositions(newPositions);

    // Passer au signataire suivant automatiquement
    if (currentSignatoryIndex < signatoryCount - 1) {
      setCurrentSignatoryIndex(currentSignatoryIndex + 1);
    } else {
      // Désactiver le mode clic après la dernière ancre
      setClickMode(false);
    }
  };

  const removeAnchor = (signatoryIndex: number) => {
    setAnchorPositions(anchorPositions.filter(p => p.signatoryIndex !== signatoryIndex));
  };

  const startPlacingAnchor = (index: number) => {
    setCurrentSignatoryIndex(index);
    setClickMode(true);
  };

  return (
    <div className="space-y-3">
      <div className="bg-gray-50 px-4 py-3 border-b rounded-t-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">Aperçu du document</h4>
        </div>
        
        {/* Boutons pour placer les ancres */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: signatoryCount }).map((_, index) => {
            const color = COLORS[index % COLORS.length];
            const hasAnchor = anchorPositions.some(p => p.signatoryIndex === index);
            
            return (
              <Button
                key={index}
                variant={clickMode && currentSignatoryIndex === index ? "default" : "outline"}
                size="sm"
                onClick={() => startPlacingAnchor(index)}
                className={`${color.border} ${clickMode && currentSignatoryIndex === index ? color.bg + ' text-white' : color.text}`}
              >
                <MapPin className="h-4 w-4 mr-1" />
                Signataire {index + 1}
                {hasAnchor && ' ✓'}
              </Button>
            );
          })}
        </div>

        {clickMode && (
          <div className={`mt-2 text-xs p-2 rounded ${
            role === 'notaire' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
          }`}>
            👆 Cliquez sur le document pour placer l'ancre du <strong>Signataire {currentSignatoryIndex + 1}</strong>
          </div>
        )}
      </div>

      <div 
        ref={containerRef}
        className={`relative border rounded-b-lg bg-white ${clickMode ? 'cursor-crosshair' : 'cursor-auto'}`}
        style={{ height: '400px', overflow: 'auto' }}
        onClick={handleContainerClick}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Wrapper pour le PDF et les ancres - scrolle ensemble */}
        <div className="relative" style={{ minHeight: '100%' }}>
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            className={`w-full border-0 ${clickMode ? 'pointer-events-none' : 'pointer-events-auto'}`}
            style={{ height: '842px' }} // Hauteur fixe approximative d'une page A4
            title="Document preview"
          />

          {/* Marqueurs de position de signature - à l'intérieur du wrapper qui scrolle */}
          {anchorPositions.map((anchor) => {
            const color = COLORS[anchor.signatoryIndex % COLORS.length];
            return (
              <div
                key={anchor.signatoryIndex}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-20 ${color.text}`}
                style={{
                  left: `${(anchor.x / anchor.pageWidth) * 100}%`,
                  top: `${anchor.y}px`, // Position en pixels pour suivre le scroll
                  pointerEvents: 'none'
                }}
              >
                <div className="relative">
                  <MapPin className="h-8 w-8 fill-current" />
                  <div className={`absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded text-xs font-medium text-white ${color.bg}`}>
                    Signataire {anchor.signatoryIndex + 1}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Résumé des ancres placées */}
      {anchorPositions.length > 0 && (
        <div className="space-y-1">
          {anchorPositions.map((anchor) => {
            const color = COLORS[anchor.signatoryIndex % COLORS.length];
            return (
              <div key={anchor.signatoryIndex} className={`text-xs p-2 rounded-lg flex items-center justify-between ${color.bg} bg-opacity-10 ${color.text}`}>
                <span>
                  ✅ <strong>Signataire {anchor.signatoryIndex + 1}</strong> - Page {anchor.page}, X: {anchor.x}pt, Y: {anchor.y}pt
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAnchor(anchor.signatoryIndex)}
                  className="h-6 px-2"
                >
                  Retirer
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {anchorPositions.length < signatoryCount && (
        <div className="text-xs p-3 bg-gray-50 text-gray-600 rounded-lg">
          📍 Placez les ancres pour {signatoryCount - anchorPositions.length} signataire(s) restant(s)
        </div>
      )}
    </div>
  );
}
