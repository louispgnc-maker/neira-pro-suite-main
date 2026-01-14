import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface InviteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  clientEmail: string;
  onSuccess: () => void;
}

export function InviteClientModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  clientEmail,
  onSuccess,
}: InviteClientModalProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const hasClientEmail = clientEmail && clientEmail.includes("@");

  // Générer le code d'accès à l'ouverture de la modal
  useEffect(() => {
    if (isOpen) {
      setEmail(clientEmail || "");
      
      // Générer un code d'accès unique à 6 caractères (lettres majuscules et chiffres)
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let newAccessCode = '';
      for (let i = 0; i < 6; i++) {
        newAccessCode += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      setAccessCode(newAccessCode);
    }
  }, [isOpen, clientEmail]);

  const handleSendInvitation = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Veuillez entrer une adresse email valide");
      return;
    }

    setSending(true);
    try {
      // Générer un token sécurisé
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48); // Expire dans 48h

      // Créer l'invitation dans la base avec le code déjà généré
      const { error: inviteError } = await supabase
        .from("client_invitations")
        .insert({
          client_id: clientId,
          email: email,
          token: token,
          access_code: accessCode,
          expires_at: expiresAt.toISOString(),
          status: "pending",
        });

      if (inviteError) {
        console.error("Error creating invitation:", inviteError);
        toast.error("Erreur lors de la création de l'invitation");
        return;
      }

      // Envoyer l'email via Edge Function
      const { error: emailError } = await supabase.functions.invoke(
        "send-client-invitation",
        {
          body: {
            email: email,
            clientName: clientName,
            token: token,
            accessCode: accessCode,
          },
        }
      );

      if (emailError) {
        console.error("Error sending email:", emailError);
        toast.error("Erreur lors de l'envoi de l'email");
        return;
      }

      toast.success(`Invitation envoyée à ${email}`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter le client à son espace</DialogTitle>
          <DialogDescription>
            Le client recevra un email sécurisé pour accéder à ses documents et
            signatures.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!hasClientEmail && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucun email n'est renseigné dans la fiche client. Veuillez entrer l'adresse email du client ci-dessous.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email du client</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              disabled={hasClientEmail}
              className={hasClientEmail ? "bg-gray-50" : ""}
            />
            {hasClientEmail && (
              <p className="text-xs text-gray-500">
                Email provenant de la fiche client
              </p>
            )}
          </div>

          {/* Affichage du code d'accès généré */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <Label className="text-sm font-semibold text-gray-900 mb-2 block">
              🔑 Code d'accès généré
            </Label>
            <div className="flex items-center justify-center gap-3">
              <code className="text-3xl font-bold text-blue-600 tracking-widest font-mono bg-white px-4 py-2 rounded border border-blue-300">
                {accessCode}
              </code>
            </div>
            <p className="text-xs text-gray-600 text-center mt-2">
              Ce code sera envoyé au client par email et lui permettra d'accéder à son espace. Il ne peut pas être modifié.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleSendInvitation} disabled={sending}>
            {sending ? "Envoi..." : "Envoyer l'invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
