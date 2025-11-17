import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, Download, Trash2, Upload } from "lucide-react";
import { Plus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentViewer } from "@/components/ui/document-viewer";
import { ShareToCollaborativeDialog } from "@/components/cabinet/ShareToCollaborativeDialog";

type DocRow = {
  id: string;
  name: string;
  client_name: string | null;
  status: "Signé" | "En cours" | "Brouillon" | "En attente" | string;
  updated_at: string | null;
  storage_path: string | null;
};

const statusColorsAvocat: Record<string, string> = {
  "Signé": "bg-success/10 text-success border-success/20",
  "En cours": "bg-blue-100 text-blue-600 border-blue-200",
  "Brouillon": "bg-muted text-muted-foreground border-border",
  "En attente": "bg-warning/10 text-warning border-warning/20",
};
const statusColorsNotaire: Record<string, string> = {
  "Signé": "bg-success/10 text-success border-success/20",
  "En cours": "bg-orange-100 text-orange-600 border-orange-200",
  "Brouillon": "bg-muted text-muted-foreground border-border",
  "En attente": "bg-warning/10 text-warning border-warning/20",
};

export default function Documents() {
  const { user } = useAuth();
  const location = useLocation();
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const [viewerDocName, setViewerDocName] = useState("");

  // Debounce search
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
        setDocuments([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      let query = supabase
        .from("documents")
        .select("id,name,client_name,status,updated_at,storage_path")
        .eq("owner_id", user.id)
        .eq("role", role)
        .order("updated_at", { ascending: false, nullsFirst: false });
      if (debounced) {
        // Basic case-insensitive filtering using ilike on name OR client_name
        query = query.or(`name.ilike.%${debounced}%,client_name.ilike.%${debounced}%`);
      }
      const { data, error } = await query;
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
  }, [user, role, debounced]);

  // If navigated here with ?openImport=1, open the file picker automatically
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('openImport') === '1') {
          // small timeout to ensure input ref is ready
          setTimeout(() => fileInputRef.current?.click(), 150);
        }
    } catch (e) {
      // ignore
    }
  }, [location.search]);


  const viewOrDownload = async (doc: DocRow, mode: 'view' | 'download') => {
    if (!user || !doc.storage_path) {
      toast.error("Aucun fichier associé");
      return;
    }
    const raw = (doc.storage_path || '').trim();

    // If storage_path is already a full URL, open it directly
    if (/^https?:\/\//i.test(raw)) {
      if (mode === 'view') {
        setViewerUrl(raw);
        setViewerDocName(doc.name);
        setViewerOpen(true);
        return;
      } else {
        const a = document.createElement('a');
        a.href = raw;
        a.download = doc.name || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }
    }

    // Otherwise treat as storage path and detect bucket
    let storagePath = raw.replace(/^\/+/, '');
    let bucket = 'documents';
    if (storagePath.startsWith('shared_documents/') || storagePath.startsWith('shared-documents/')) {
      // normalize to canonical bucket
      bucket = 'shared-documents';
      storagePath = storagePath.replace(/^shared[-_]documents\//, '');
    } else if (storagePath.includes('/')) {
      const maybeBucket = storagePath.split('/')[0];
      if (maybeBucket === 'documents' || maybeBucket === 'shared_documents' || maybeBucket === 'shared-documents') {
        if (maybeBucket === 'shared_documents' || maybeBucket === 'shared-documents') bucket = 'shared-documents';
        storagePath = storagePath.split('/').slice(1).join('/');
      }
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 60);
    if (error || !data?.signedUrl) {
      console.error('createSignedUrl failed for', bucket, storagePath, error);
      try {
        const pub = await supabase.storage.from(bucket).getPublicUrl(storagePath);
        const publicUrl = (() => {
          const p = pub as unknown as Record<string, unknown> | null | undefined;
          if (!p) return undefined;
          const dataObj = p['data'] as Record<string, unknown> | undefined;
          if (dataObj && typeof dataObj['publicUrl'] === 'string') return dataObj['publicUrl'] as string;
          if (typeof p['publicUrl'] === 'string') return p['publicUrl'] as string;
          return undefined;
        })();
        if (publicUrl) {
          if (mode === 'view') {
            setViewerUrl(publicUrl);
            setViewerDocName(doc.name);
            setViewerOpen(true);
            return;
          } else {
            const a = document.createElement('a');
            a.href = publicUrl;
            a.download = doc.name || 'document.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            return;
          }
        }
      } catch (e) {
        console.error('getPublicUrl fallback failed', e);
      }

      // Provide an actionable message instead of a generic error to avoid confusing the user
      toast.error(
        'Partage désactivé / stockage partagé indisponible. Pour corriger (admin) : voir supabase/CONNECT_SHARED_BUCKET.md'
      );
      return;
    }
    if (mode === 'view') {
      setViewerUrl(data.signedUrl);
      setViewerDocName(doc.name);
      setViewerOpen(true);
    } else {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = doc.name || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  const handleDelete = async (doc: DocRow) => {
    if (!user) return;
    if (!confirm(`Supprimer "${doc.name}" ?`)) return;
    
    try {
      if (doc.storage_path) {
        const { error: storageErr } = await supabase.storage
          .from('documents')
          .remove([doc.storage_path]);
        if (storageErr) {
          console.error('Erreur suppression storage:', storageErr);
        }
      }
      
      const { error: dbErr } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)
        .eq('owner_id', user.id);
      
      if (dbErr) throw dbErr;
      
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success('Document supprimé');
    } catch (err: unknown) {
      console.error('Erreur suppression document:', err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error('Erreur lors de la suppression', { description: message });
    }
  };

  const triggerImport = () => {
    if (!user) {
      toast.error("Connexion requise");
      return;
    }
    fileInputRef.current?.click();
  };

  const onFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (file.type !== 'application/pdf') {
          toast.error(`Format non supporté: ${file.name}`, { description: "Seuls les PDF sont acceptés." });
          continue;
        }
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from('documents').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf',
        });
        if (upErr) {
          toast.error(`Échec import: ${file.name}`, { description: upErr.message });
          continue;
        }
        const { data: inserted, error: dbErr } = await supabase.from('documents').insert({
          owner_id: user.id,
          name: file.name,
          client_name: null,
          status: 'En cours',
          role: role,
          storage_path: path,
        }).select().single();
        if (dbErr) {
          toast.error(`Importé mais non référencé: ${file.name}`, { description: dbErr.message });
        } else {
          uploaded.push(file.name);
          // Ajouter à l'état local
          if (inserted) setDocuments((prev) => [inserted as DocRow, ...prev]);

        // Note: automatic sharing has been disabled. If you want to re-enable,
        // restore the logic that calls copyDocumentToShared and creates
        // cabinet_documents entries via secure RPCs.
        }
      }
      if (uploaded.length > 0) {
        toast.success(`Import terminé`, { description: `${uploaded.length} fichier(s) ajouté(s)` });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Erreur d'import", { description: message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Couleur des boutons principaux
  const mainButtonColor = role === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  const menuContentClass = role === 'notaire' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200';
  const menuItemClass = role === 'notaire' ? 'focus:bg-orange-600 focus:text-white hover:bg-orange-600 hover:text-white' : 'focus:bg-blue-600 focus:text-white hover:bg-blue-600 hover:text-white';

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-muted-foreground mt-1">Gérez tous vos documents juridiques</p>
          </div>
          <div className="flex gap-2 md:w-auto w-full">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={onFilesSelected}
            />
            <div className="flex items-center gap-3">
              <Button className={mainButtonColor + ""} onClick={triggerImport} disabled={uploading}>
                <Plus className="h-4 w-4 mr-2" />
                {uploading ? 'Import…' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </div>
        <div className="mb-4 bg-white p-4 rounded-lg border">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (nom ou client)…"
            className="w-full md:max-w-sm rounded-md border border-input bg-slate-100 px-3 py-2 text-sm"
          />
        </div>
        
        {/* Section heading above the table/list */}
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Liste des documents</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">Chargement…</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <div className="text-center">
              <p className="text-muted-foreground">Aucun document pour le moment</p>
              <div className="mt-4 flex justify-center">
                <Button className={mainButtonColor + ""} onClick={triggerImport}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg bg-white">
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
                {documents.map((doc) => (
                  <TableRow
                    key={doc.id}
                    onDoubleClick={() => viewOrDownload(doc, 'view')}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell className="text-muted-foreground">{doc.client_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={(role === 'notaire' ? statusColorsNotaire[doc.status] : statusColorsAvocat[doc.status]) ?? "bg-muted text-muted-foreground border-border"}>
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ShareToCollaborativeDialog
                          itemId={doc.id}
                          itemName={doc.name}
                          itemType="document"
                          role={role}
                          onSuccess={() => {
                            toast.success('Document partagé');
                          }}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className={role === 'notaire' ? 'hover:bg-orange-100 hover:text-orange-600' : 'hover:bg-blue-100 hover:text-blue-600'}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className={menuContentClass}>
                              <DropdownMenuItem className={menuItemClass} onClick={() => viewOrDownload(doc, 'view')}>
                                <Eye className="mr-2 h-4 w-4" />
                                Voir
                              </DropdownMenuItem>
                              <DropdownMenuItem className={menuItemClass} onClick={() => viewOrDownload(doc, 'download')}>
                                <Download className="mr-2 h-4 w-4" />
                                Télécharger
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className={`text-destructive ${menuItemClass}`}
                                onClick={() => handleDelete(doc)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <DocumentViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        documentUrl={viewerUrl}
        documentName={viewerDocName}
        role={role}
      />
    </AppLayout>
  );
}
