import { MoreHorizontal, Eye, Download, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type DocRow = {
  id: string;
  name: string;
  client_name: string | null;
  status: "Signé" | "En cours" | "Brouillon" | "En attente" | string;
  updated_at: string | null;
  storage_path: string | null;
};

const statusColors: Record<string, string> = {
  "Signé": "bg-success/10 text-success border-success/20",
  "En cours": "bg-primary/10 text-primary border-primary/20",
  "Brouillon": "bg-muted text-muted-foreground border-border",
  "En attente": "bg-warning/10 text-warning border-warning/20",
};

interface RecentDocumentsProps {
  statusColorOverride?: Record<string, string>;
  role?: 'avocat' | 'notaire';
}

export function RecentDocuments({ statusColorOverride, role = 'avocat' }: RecentDocumentsProps = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Merge default colors with override
  const effectiveStatusColors = { ...statusColors, ...statusColorOverride };

  const viewOrDownload = async (doc: DocRow, mode: 'view' | 'download') => {
    if (!user) return;
    if (!doc.storage_path) {
      toast.error("Aucun fichier associé.");
      return;
    }
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Impossible de générer le lien");
      return;
    }
    if (mode === 'view') {
      window.open(data.signedUrl, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = doc.name || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  const handleView = (doc: DocRow) => viewOrDownload(doc, 'view');
  const handleDownload = (doc: DocRow) => viewOrDownload(doc, 'download');

  const handleDelete = async (doc: DocRow) => {
    if (!user) return;
    if (!confirm(`Supprimer "${doc.name}" ?`)) return;
    
    try {
      // Supprime le fichier du Storage si storage_path existe
      if (doc.storage_path) {
        const { error: storageErr } = await supabase.storage
          .from('documents')
          .remove([doc.storage_path]);
        if (storageErr) {
          console.error('Erreur suppression storage:', storageErr);
          // On continue même si le storage échoue (fichier peut-être déjà supprimé)
        }
      }
      
      // Supprime la ligne de la table documents
      const { error: dbErr } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)
        .eq('owner_id', user.id);
      
      if (dbErr) throw dbErr;
      
      // Met à jour l'état local pour retirer le document de la liste
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success('Document supprimé');
    } catch (err: any) {
      console.error('Erreur suppression document:', err);
      toast.error('Erreur lors de la suppression', { description: err?.message || String(err) });
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!user) {
        setDocuments([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("documents")
        .select("id,name,client_name,status,updated_at,storage_path")
        .eq("owner_id", user.id)
        .eq("role", role)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(5);
      if (error) {
        console.error("Erreur chargement documents:", error);
        if (isMounted) setDocuments([]);
      } else if (isMounted) {
        setDocuments(data as DocRow[]);
      }
      if (isMounted) setLoading(false);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [user, role]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Documents récents</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/documents')}>
          Voir tout →
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom du document</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Modifié</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Aucuns documents.
                  </TableCell>
                </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell className="text-muted-foreground">{doc.client_name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={effectiveStatusColors[doc.status] ?? "bg-muted text-muted-foreground border-border"}>
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(doc)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(doc)}>
                          <Download className="mr-2 h-4 w-4" />
                          Télécharger
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
