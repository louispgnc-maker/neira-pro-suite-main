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
  // Determine role from URL path first (most reliable), then profile
  const role = window.location.pathname.includes('/notaires/') ? 'notaire' : 
               window.location.pathname.includes('/avocats/') ? 'avocat' :
               (profile?.role || 'avocat');
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [formUrl, setFormUrl] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSend = async () => {
    if (!clientEmail) {
      toast.error('Veuillez saisir l\'email du client');
      return;
    }

    setLoading(true);
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      const response = await fetch(
        'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/send-client-form',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
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
        setEmailSent(data.emailSent || false);
        
        if (data.emailSent) {
          toast.success('Email envoyé avec succès !', {
            description: `Le formulaire a été envoyé à ${clientEmail}`
          });
        } else {
          toast.success('Lien du formulaire généré', {
            description: `Copiez le lien pour l'envoyer à ${clientEmail}`
          });
        }
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
    setEmailSent(false);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un lien de formulaire client</DialogTitle>
          <DialogDescription>
            Générez un lien sécurisé que vous pourrez envoyer au client pour qu'il complète ses informations.
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
                    Générer le lien
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {emailSent ? (
              // Email envoyé avec succès
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="text-sm text-green-800 font-medium mb-2">
                  ✅ Email envoyé avec succès !
                </p>
                <p className="text-sm text-green-700">
                  Le formulaire a été envoyé à <strong>{clientEmail}</strong>. Le client recevra un email avec un lien sécurisé pour compléter ses informations.
                </p>
              </div>
            ) : (
              // Email non envoyé (configuration manquante)
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
                <p className="text-sm text-orange-800 font-medium mb-2">
                  ⚠️ Lien du formulaire généré
                </p>
                <p className="text-sm text-orange-700">
                  Copiez ce lien et envoyez-le à <strong>{clientEmail}</strong> par votre moyen de communication habituel (email, SMS, WhatsApp, etc.)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Lien du formulaire à partager</Label>
              <div className="flex gap-2">
                <Input
                  value={formUrl}
                  readOnly
                  className="font-mono text-xs bg-gray-50"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cliquez sur le champ pour sélectionner tout le lien, ou utilisez le bouton copier
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
