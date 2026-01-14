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
  const [loading, setLoading] = useState(false);
  const hasClientEmail = clientEmail && clientEmail.includes("@");

  // Charger le code existant UNE SEULE FOIS à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setEmail(clientEmail || "");
      loadExistingAccessCode();
    }
  }, [isOpen, clientId]);

  const loadExistingAccessCode = async () => {
    setLoading(true);
    try {
      // Chercher le code existant pour ce client (créé lors de la création de la fiche)
      const { data: existingInvitation, error } = await supabase
        .from("client_invitations")
        .select("access_code")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching invitation:", error);
      }

      if (existingInvitation?.access_code) {
        // Code trouvé - l'afficher
        console.log("✅ Code d'accès trouvé:", existingInvitation.access_code);
        setAccessCode(existingInvitation.access_code);
      } else {
        // Aucun code trouvé - ce client n'a pas été créé avec le nouveau système
        console.warn("⚠️ Aucun code trouvé pour ce client - fiche créée avant l'implémentation des codes");
        setAccessCode("ERREUR");
      }
    } catch (error) {
      console.error("Error:", error);
      setAccessCode("ERREUR");
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Veuillez entrer une adresse email valide");
      return;
    }

    setSending(true);
    try {
      // Vérifier si une invitation existe déjà
      const { data: existing } = await supabase
        .from("client_invitations")
        .select("id, access_code")
        .eq("client_id", clientId)
        .eq("access_code", accessCode)
        .maybeSingle();

      let invitationToken = crypto.randomUUID();

      if (existing) {
        // Mettre à jour l'invitation existante avec le nouvel email
        const { error: updateError } = await supabase
          .from("client_invitations")
          .update({
            email: email,
            token: invitationToken,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error("Error updating invitation:", updateError);
          toast.error("Erreur lors de la mise à jour de l'invitation");
          return;
        }
      }
      // Si pas d'invitation existante, c'est qu'elle a déjà été créée par loadExistingAccessCode

      // Envoyer l'email via Edge Function
      const { error: emailError } = await supabase.functions.invoke(
        "send-client-invitation",
        {
          body: {
            email: email,
            clientName: clientName,
            token: invitationToken,
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
              🔑 Code d'accès client
            </Label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-3">
                  <code className="text-3xl font-bold text-blue-600 tracking-widest font-mono bg-white px-4 py-2 rounded border border-blue-300">
                    {accessCode || "------"}
                  </code>
                </div>
                <p className="text-xs text-gray-600 text-center mt-2">
                  {accessCode ? "Ce code est unique et permanent pour ce client. Il ne peut pas être modifié." : "Chargement du code..."}
                </p>
              </>
            )}
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
