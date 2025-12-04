import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SendClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cabinetId: string;
  userId: string;
}

export default function SendClientFormDialog({ open, onOpenChange, cabinetId, userId }: SendClientFormDialogProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  // Determine role from URL path first (most reliable), then profile
  const role = window.location.pathname.includes('/notaires/') ? 'notaire' : 
               window.location.pathname.includes('/avocats/') ? 'avocat' :
               (profile?.role || 'avocat');
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendEmail = async () => {
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

      // Create the form first
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
            userId,
            skipEmail: true // Don't send email, we'll open mailto instead
          })
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la création du formulaire');
      }

      const data = await response.json();
      
      if (data.formUrl) {
        // Get cabinet name for email
        const { data: cabinetData } = await supabase
          .from('cabinets')
          .select('nom')
          .eq('id', cabinetId)
          .single();

        const cabinetName = cabinetData?.nom || 'Notre cabinet';
        
        // Prepare email content
        const subject = `${cabinetName} - Formulaire à compléter`;
        const body = `Bonjour ${clientName || 'Client'},

${cabinetName} vous invite à compléter vos informations personnelles via notre formulaire sécurisé.

📋 Pourquoi ce formulaire ?
Ce formulaire nous permettra de créer votre dossier client et de vous accompagner au mieux dans vos démarches.

🔗 Lien du formulaire :
${data.formUrl}

⏱️ Temps estimé : 5-10 minutes
🔒 Toutes vos données sont chiffrées et confidentielles
📅 Validité : Ce lien expire dans 30 jours

Si vous rencontrez un problème avec ce formulaire, vous pouvez nous contacter directement.

Cordialement,
${cabinetName}`;

        // Navigate to messagerie with pre-filled compose data
        navigate(`/${role}s/messagerie`, {
          state: {
            composeTo: clientEmail,
            composeSubject: subject,
            composeBody: body,
            openCompose: true
          }
        });

        handleClose();

        toast.success('Redirection vers la messagerie !', {
          description: `Le formulaire a été créé pour ${clientEmail}`
        });
      } else {
        throw new Error('URL du formulaire non disponible');
      }
    } catch (error: any) {
      console.error('Error creating form:', error);
      toast.error(error.message || 'Erreur lors de la création du formulaire');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setClientEmail('');
    setClientName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer un formulaire client</DialogTitle>
          <DialogDescription>
            Vous serez redirigé vers votre messagerie avec un email pré-rempli contenant le lien du formulaire.
          </DialogDescription>
        </DialogHeader>

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
              onClick={handleSendEmail} 
              disabled={loading || !clientEmail}
              className={role === 'notaire' 
                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
