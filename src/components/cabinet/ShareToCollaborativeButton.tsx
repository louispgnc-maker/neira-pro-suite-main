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

  const baseClass = role === 'notaire'
    ? 'text-orange-600 hover:bg-orange-100 hover:text-orange-600'
    : 'text-blue-600 hover:bg-blue-100 hover:text-blue-600';

  return (
    <>
      <Button variant="ghost" size="sm" onClick={handleClick} disabled={disabled} className={baseClass}>
        <Share2 className="h-4 w-4" />
      </Button>
      {open && (
        <ShareToCollaborativeDialog
          itemId={clientId}
          itemName={clientName}
          itemType="client"
          role={role}
          hideTrigger={true}
          onSuccess={() => {
            if (onDone) onDone();
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
