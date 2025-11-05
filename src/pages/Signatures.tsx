import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

type SignatureRow = {
  id: string;
  signer_name: string;
  document_name: string;
  status: string;
  last_reminder_at?: string | null;
};

export default function Signatures() {
  const { user } = useAuth();
  const location = useLocation();
  const [signatures, setSignatures] = useState<SignatureRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

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
        .select("id,signer_name,document_name,status,last_reminder_at")
        .eq("owner_id", user.id)
        .order("last_reminder_at", { ascending: false, nullsFirst: false });
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
  }, [user]);

  // Couleur du bouton principal
  const mainButtonColor = role === 'notaire'
    ? 'bg-amber-600 hover:bg-amber-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  // Couleur badge statut
  function getStatusClass(status: string) {
    if (status.toLowerCase() === 'en cours') {
      return role === 'notaire'
        ? 'bg-amber-100 text-amber-600 border-amber-200'
        : 'bg-blue-100 text-blue-600 border-blue-200';
    }
    if (status.toLowerCase() === 'signé' || status.toLowerCase() === 'signed' || status.toLowerCase() === 'completed') {
      return 'bg-success/10 text-success border-success/20';
    }
    if (status.toLowerCase() === 'en attente' || status.toLowerCase() === 'pending' || status.toLowerCase() === 'awaiting') {
      return 'bg-warning/10 text-warning border-warning/20';
    }
    if (status.toLowerCase() === 'brouillon') {
      return 'bg-muted text-muted-foreground border-border';
    }
    return 'bg-muted text-muted-foreground border-border';
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Signatures</h1>
            <p className="text-muted-foreground mt-1">
              Suivez vos demandes de signature électronique
            </p>
          </div>
          <Button className={mainButtonColor}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle signature
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">Chargement…</p>
          </div>
        ) : signatures.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <div className="text-center">
              <p className="text-muted-foreground">Aucunes signatures</p>
              <Button className={mainButtonColor + " mt-4"}>
                Ajoutez ici vos documents signés
              </Button>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Signataire</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernier rappel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signatures.map((sig) => (
                  <TableRow key={sig.id}>
                    <TableCell className="font-medium">{sig.signer_name}</TableCell>
                    <TableCell>{sig.document_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusClass(sig.status)}>
                        {sig.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {sig.last_reminder_at
                        ? new Date(sig.last_reminder_at).toLocaleDateString()
                        : "Jamais"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
