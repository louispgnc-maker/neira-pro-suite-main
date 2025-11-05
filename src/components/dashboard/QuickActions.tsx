import { FileText, Upload, PenTool, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const actions = [
  { key: "create", label: "Créer un contrat", icon: FileText, variant: "default" as const },
  { key: "import", label: "Importer PDF", icon: Upload, variant: "secondary" as const },
  { key: "sign", label: "Lancer signature", icon: PenTool, variant: "secondary" as const },
  { key: "collect", label: "Lien de collecte", icon: Link2, variant: "secondary" as const },
];

export function QuickActions() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const triggerImport = () => {
    if (!user) {
      toast.error("Connexion requise", { description: "Veuillez vous connecter pour importer des fichiers." });
      return;
    }
    fileInputRef.current?.click();
  };

  const onFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;
    setUploading(true);
    try {
      // Assure-toi d'avoir créé le bucket "documents" dans Supabase Storage (private de préférence)
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
        // Insère une ligne dans la table documents
        const { error: dbErr } = await supabase.from('documents').insert({
          owner_id: user.id,
          name: file.name,
          client_name: null,
          status: 'En cours',
          storage_path: path,
        });
        if (dbErr) {
          toast.error(`Importé mais non référencé: ${file.name}`, { description: dbErr.message });
        } else {
          uploaded.push(file.name);
        }
      }
      if (uploaded.length > 0) {
        toast.success(`Import terminé`, { description: `${uploaded.length} fichier(s) ajouté(s)` });
      }
    } catch (err: any) {
      toast.error("Erreur d'import", { description: err?.message || String(err) });
    } finally {
      setUploading(false);
      // Reset input to allow re-selecting the same file
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Actions rapides</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Hidden file input for PDF import */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={onFilesSelected}
        />

        {actions.map((action) => {
          const onClick = () => {
            if (action.key === 'import') return triggerImport();
            // TODO: wire other actions
          };
          return (
            <Button
              key={action.key}
              variant={action.variant}
              className="h-auto flex-col gap-2 py-4"
              onClick={onClick}
              disabled={uploading && action.key === 'import'}
            >
              <action.icon className="h-5 w-5" />
              <span className="text-xs">{action.key === 'import' && uploading ? 'Import…' : action.label}</span>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
