import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  pdfBase64: string | null;
  onPdfModified: (newPdfBase64: string, anchors: AnchorPosition[]) => void;
  signatoryCount: number;
  role?: 'avocat' | 'notaire';
  authToken: string;
};

const COLORS = [
  { border: 'border-blue-600', bg: 'bg-blue-600', text: 'text-blue-600', name: 'Bleu' },
  { border: 'border-green-600', bg: 'bg-green-600', text: 'text-green-600', name: 'Vert' },
  { border: 'border-purple-600', bg: 'bg-purple-600', text: 'text-purple-600', name: 'Violet' },
  { border: 'border-pink-600', bg: 'bg-pink-600', text: 'text-pink-600', name: 'Rose' },
  { border: 'border-orange-600', bg: 'bg-orange-600', text: 'text-orange-600', name: 'Orange' },
];

export function PdfAnchorSelector({ pdfUrl, pdfBase64, onPdfModified, signatoryCount, role = 'avocat', authToken }: PdfAnchorSelectorProps) {
  const [anchorPositions, setAnchorPositions] = useState<AnchorPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [clickMode, setClickMode] = useState(false);
  const [currentSignatoryIndex, setCurrentSignatoryIndex] = useState(0);
  const [currentPdfUrl, setCurrentPdfUrl] = useState(pdfUrl);
  const [currentPdfBase64, setCurrentPdfBase64] = useState(pdfBase64);
  const [modifying, setModifying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [pdfUrl]);

  const handleContainerClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clickMode || !containerRef.current || !currentPdfBase64) return;

    // Empêcher la propagation pour éviter les doubles clics
    e.stopPropagation();

    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = containerRef.current.scrollTop || 0;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top + scrollTop; // Position absolue avec scroll

    const containerWidth = rect.width;
    const pdfX = (x / containerWidth) * 595;
    const pdfY = y;

    console.log('[PdfAnchorSelector] Click at:', { x, y, pdfX, pdfY, scrollTop });

    const position: AnchorPosition = {
      page: 1,
      x: Math.round(pdfX),
      y: Math.round(pdfY),
      pageWidth: 595,
      pageHeight: 842,
      signatoryIndex: currentSignatoryIndex
    };

    // Ajouter l'ancre au tableau
    const newPositions = [...anchorPositions.filter(p => p.signatoryIndex !== currentSignatoryIndex), position];
    setAnchorPositions(newPositions);
    console.log('[PdfAnchorSelector] Anchor added to positions:', newPositions.length, 'anchors');

    // Modifier le PDF immédiatement
    setModifying(true);
    try {
      const response = await fetch(
        'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/add-signature-anchor',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            pdfBase64: currentPdfBase64,
            anchorPositions: [position] // Une seule ancre à la fois
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.pdfBase64) {
          // Mettre à jour le PDF
          setCurrentPdfBase64(result.pdfBase64);
          
          // Convertir en blob pour la preview
          const byteCharacters = atob(result.pdfBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const newPdfUrl = URL.createObjectURL(blob);
          setCurrentPdfUrl(newPdfUrl);
          
          // Notifier le parent
          onPdfModified(result.pdfBase64, newPositions);
          
          toast.success(`Ancre ${currentSignatoryIndex + 1} ajoutée au document`);
        }
      } else {
        toast.error('Erreur lors de l\'ajout de l\'ancre');
      }
    } catch (error) {
      console.error('[PdfAnchorSelector] Error adding anchor:', error);
      toast.error('Erreur lors de l\'ajout de l\'ancre');
    } finally {
      setModifying(false);
    }

    // Passer au signataire suivant ou désactiver le mode clic
    if (currentSignatoryIndex < signatoryCount - 1) {
      setCurrentSignatoryIndex(currentSignatoryIndex + 1);
    } else {
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
          {modifying && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Modification du PDF...
            </div>
          )}
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
                disabled={modifying}
                className={`${color.border} ${clickMode && currentSignatoryIndex === index ? color.bg + ' text-white' : color.text}`}
              >
                <MapPin className="h-4 w-4 mr-1" />
                Signataire {index + 1}
                {hasAnchor && ' ✓'}
              </Button>
            );
          })}
        </div>

        {clickMode && !modifying && (
          <div className={`mt-2 text-xs p-2 rounded ${
            role === 'notaire' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
          }`}>
            👆 Cliquez sur le document pour placer l'ancre du <strong>Signataire {currentSignatoryIndex + 1}</strong>
          </div>
        )}
      </div>

      <div 
        ref={containerRef}
        className="relative border rounded-b-lg bg-white"
        style={{ height: '400px', overflow: 'auto' }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Wrapper pour le PDF */}
        <div className="relative" style={{ height: '842px' }}>
          <iframe
            ref={iframeRef}
            src={currentPdfUrl}
            className="w-full border-0"
            style={{ 
              height: '100%',
              pointerEvents: clickMode ? 'none' : 'auto' // Désactiver l'iframe en mode clic
            }}
            title="Document preview"
          />
          
          {/* Marqueurs visuels colorés UNIQUEMENT pour la preview - disparaissent à l'envoi */}
          {anchorPositions.map((anchor) => {
            const color = COLORS[anchor.signatoryIndex % COLORS.length];
            return (
              <div
                key={anchor.signatoryIndex}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-20 ${color.text}`}
                style={{
                  left: `${(anchor.x / anchor.pageWidth) * 100}%`,
                  top: `${anchor.y}px`,
                  pointerEvents: 'none'
                }}
              >
                <div className="relative">
                  <MapPin className="h-8 w-8 fill-current drop-shadow-lg" />
                  <div className={`absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded text-xs font-medium text-white ${color.bg} shadow-lg`}>
                    Signataire {anchor.signatoryIndex + 1}
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Overlay transparent pour capturer les clics en mode placement */}
          {clickMode && !modifying && (
            <div 
              className="absolute inset-0 cursor-crosshair z-10"
              onClick={handleContainerClick}
              style={{ background: 'transparent' }}
            />
          )}
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
                  ✅ <strong>Signataire {anchor.signatoryIndex + 1}</strong> - Ancre ajoutée au document
                </span>
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
