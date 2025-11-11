import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

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
      let query = supabase
        .from("signatures")
        .select("id,signer_name,document_name,status,last_reminder_at")
        .eq("owner_id", user.id)
        .eq("role", role)
        .order("last_reminder_at", { ascending: false, nullsFirst: false });
      if (debounced) {
        query = query.or(`signer_name.ilike.%${debounced}%,document_name.ilike.%${debounced}%`);
      }
      const { data, error } = await query;
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
  }, [user, role, debounced]);

  // Couleur du bouton principal
  const mainButtonColor = role === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  // Couleur badge statut
  function getStatusClass(status: string) {
    if (status.toLowerCase() === 'en cours') {
      return role === 'notaire'
        ? 'bg-orange-100 text-orange-600 border-orange-200'
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
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Signatures</h1>
            <p className="text-muted-foreground mt-1">Suivez vos demandes de signature électronique</p>
          </div>
          <Button className={mainButtonColor}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle signature
          </Button>
        </div>

        <div className="mb-4 bg-white p-4 rounded-lg border">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (signataire ou document)…"
            className="w-full md:max-w-sm rounded-md border border-input bg-slate-100 px-3 py-2 text-sm"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Liste des signatures</CardTitle>
          </CardHeader>
          <CardContent>
            {/* search moved above the title */}
          </CardContent>
        </Card>

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
          <div className="border rounded-lg bg-white p-4">
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
