import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Send, Copy, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SendClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cabinetId: string;
  userId: string;
}

export default function SendClientFormDialog({ open, onOpenChange, cabinetId, userId }: SendClientFormDialogProps) {
  const { profile } = useAuth();
  const role = profile?.role || 'notaire';
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [formUrl, setFormUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSend = async () => {
    if (!clientEmail) {
      toast.error('Veuillez saisir l\'email du client');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/send-client-form',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientEmail,
            clientName,
            cabinetId,
            userId
          })
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi du formulaire');
      }

      const data = await response.json();
      
      if (data.formUrl) {
        setFormUrl(data.formUrl);
        toast.success('Formulaire envoyé avec succès !', {
          description: `Un email a été envoyé à ${clientEmail}`
        });
      } else {
        throw new Error('URL du formulaire non disponible');
      }
    } catch (error: any) {
      console.error('Error sending form:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi du formulaire');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (formUrl) {
      navigator.clipboard.writeText(formUrl);
      setCopied(true);
      toast.success('Lien copié dans le presse-papier');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setClientEmail('');
    setClientName('');
    setFormUrl('');
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer un formulaire au client</DialogTitle>
          <DialogDescription>
            Le client recevra un email avec un lien pour compléter ses informations.
          </DialogDescription>
        </DialogHeader>

        {!formUrl ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nom du client (optionnel)</Label>
              <Input
                id="client-name"
                placeholder="Jean Dupont"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-email">Email du client *</Label>
              <Input
                id="client-email"
                type="email"
                placeholder="client@email.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Annuler
              </Button>
              <Button 
                onClick={handleSend} 
                disabled={loading || !clientEmail}
                className={role === 'notaire' 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Envoyer
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-sm text-green-800">
                ✓ Formulaire envoyé avec succès à <strong>{clientEmail}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Lien du formulaire</Label>
              <div className="flex gap-2">
                <Input
                  value={formUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Vous pouvez également partager ce lien directement avec votre client
              </p>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleClose}
                className={role === 'notaire' 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'}
              >
                Fermer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
