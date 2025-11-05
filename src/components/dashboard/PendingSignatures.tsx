import { Send, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type SignatureRow = {
  id: string;
  signer: string;
  document_name: string;
  status: string;
  last_reminder_at: string | null;
};

interface PendingSignaturesProps {
  role?: 'avocat' | 'notaire';
}

export function PendingSignatures({ role = 'avocat' }: PendingSignaturesProps = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [signatures, setSignatures] = useState<SignatureRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!user) {
        setSignatures([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("signatures")
        .select("id,signer,document_name,status,last_reminder_at")
        .eq("owner_id", user.id)
        .eq("role", role)
        .in("status", ["pending", "awaiting", "en_attente"]) // support several values
        .order("last_reminder_at", { ascending: false, nullsFirst: true })
        .limit(3);
      if (error) {
        console.error("Erreur chargement signatures:", error);
        if (isMounted) setSignatures([]);
      } else if (isMounted) {
        setSignatures(data as SignatureRow[]);
      }
      if (isMounted) setLoading(false);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [user, role]);

  const handleCopyLink = () => {
    toast.success("Lien copié dans le presse-papier");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Signatures en attente</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/signatures')}>
          Voir tout →
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-muted-foreground">Chargement…</p>
            ) : signatures.length === 0 ? (
              <p className="text-center text-muted-foreground">Aucunes signatures.</p>
          ) : (
            signatures.map((sig) => (
              <div
                key={sig.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{sig.signer}</p>
                  <p className="text-xs text-muted-foreground">{sig.document_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dernière relance: {sig.last_reminder_at ? new Date(sig.last_reminder_at).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleCopyLink}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copier
                  </Button>
                  <Button size="sm" variant="default">
                    <Send className="h-3 w-3 mr-1" />
                    Relancer
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
