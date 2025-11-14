import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';

interface ShareToCollaborativeDialogProps {
  itemId: string;
  itemName: string;
  itemType: 'document' | 'dossier' | 'contrat' | 'client';
  role: 'avocat' | 'notaire';
  onSuccess?: () => void;
  // When true, the dialog will not render its built-in trigger button.
  hideTrigger?: boolean;
  // If true, the dialog will open immediately when mounted.
  initialOpen?: boolean;
  // Called when the dialog is closed (either cancel or after success).
  onClose?: () => void;
}

export function ShareToCollaborativeDialog({ hideTrigger = false }: ShareToCollaborativeDialogProps) {
  // Sharing UI removed: preserve a harmless placeholder so pages importing
  // this component keep working without change. If hideTrigger is true we
  // render nothing; otherwise render a disabled icon button.
  if (hideTrigger) return null;
  return (
    <Button variant="ghost" size="sm" disabled title="Partage désactivé">
      <Share2 className="h-4 w-4" />
    </Button>
  );
}
