import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { ShareToCollaborativeDialog } from './ShareToCollaborativeDialog';

interface Props {
  clientId: string;
  clientName: string;
  role: 'avocat' | 'notaire';
  disabled?: boolean;
  onStart?: () => void;
  onDone?: () => void;
}

export default function ShareToCollaborativeButton({ clientId, clientName, role, disabled, onStart, onDone }: Props) {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    if (onStart) onStart();
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    if (onDone) onDone();
  };

  return (
    <>
      <Button variant="outline" size="icon" onClick={handleClick} disabled={disabled} className="bg-blue-50 text-blue-600 border-blue-300 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-400">
        <Share2 className="h-4 w-4" />
      </Button>
      <ShareToCollaborativeDialog
        itemId={clientId}
        itemName={clientName}
        itemType="client"
        role={role}
        hideTrigger={true}
        initialOpen={open}
        onClose={() => {
          setOpen(false);
          if (onDone) onDone();
        }}
        onSuccess={() => {
          if (onDone) onDone();
          setOpen(false);
        }}
      />
    </>
  );
}
