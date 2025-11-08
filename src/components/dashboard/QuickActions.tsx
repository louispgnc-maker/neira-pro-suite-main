import { FileText, Upload, PenTool, Users } from "lucide-react";
import { ContractSelectorNotaire } from "@/components/dashboard/ContractSelectorNotaire";
import { ContractSelectorAvocat } from "@/components/dashboard/ContractSelectorAvocat";
import { FicheClientMenu } from "@/components/dashboard/FicheClientMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRef, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const actions = [
  { key: "create", label: "Créer un contrat", icon: FileText, variant: "default" as const },
  { key: "import", label: "Importer PDF", icon: Upload, variant: "secondary" as const },
  { key: "sign", label: "Lancer signature", icon: PenTool, variant: "secondary" as const },
  // { key: "collect", label: "Lien de collecte", icon: Link2, variant: "secondary" as const },
];

interface QuickActionsProps {
  primaryButtonColor?: string;
  role?: 'avocat' | 'notaire';
}

export function QuickActions({ primaryButtonColor, role = 'avocat' }: QuickActionsProps = {}) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [checkingCabinet, setCheckingCabinet] = useState(false);
  const [hasCabinet, setHasCabinet] = useState(false);

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
          role: role,
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

  // Check cabinet membership (only relevant for notaire role per requirement)
  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!user || role !== 'notaire') return;
      setCheckingCabinet(true);
      try {
        const { data, error } = await supabase
          .rpc('get_user_cabinets')
          .eq('role', role);
        if (!active) return;
        if (error) {
          console.error('Erreur vérification cabinet:', error.message);
          setHasCabinet(false);
        } else {
          setHasCabinet(Array.isArray(data) && data.length > 0);
        }
      } catch (err) {
        console.error('Exception vérification cabinet:', err);
        if (active) setHasCabinet(false);
      } finally {
        if (active) setCheckingCabinet(false);
      }
    };
    check();
    return () => { active = false; };
  }, [user, role]);

  const handleCollaborative = () => {
    if (role !== 'notaire') return; // Only for notaires as specified
    // If still checking, block navigation briefly
    if (checkingCabinet) {
      toast.info('Vérification en cours…');
      return;
    }
    if (!hasCabinet) {
      // Redirect to cabinet setup page
      window.location.href = 'https://www.neira.fr/notaires/cabinet';
      return;
    }
    // Redirect to collaborative space
    window.location.href = 'https://www.neira.fr/notaires/espace-collaboratif';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Actions rapides</CardTitle>
      </CardHeader>
  <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Hidden file input for PDF import */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={onFilesSelected}
        />

        {/** If collaborative button is absent (notaire only), expand the first selector to fill 2 grid columns so the remaining buttons occupy full width. */}
        {(() => {
          const hasCollaborative = role === 'notaire';
          const selectorSpanClass = hasCollaborative ? '' : 'md:col-span-2';
          return hasCollaborative ? (
            <ContractSelectorNotaire />
          ) : (
            <div className={selectorSpanClass}><ContractSelectorAvocat /></div>
          );
        })()}

        {/* Espace collaboratif (only for notaire). Placed after first selector to appear near middle visually */}
        {role === 'notaire' && (
          <Button
            onClick={handleCollaborative}
            disabled={checkingCabinet}
            className={`${primaryButtonColor || 'bg-orange-600 hover:bg-orange-700 text-white'} h-auto flex-col gap-2 py-4`}
          >
            <Users className="h-5 w-5" />
            <span className="text-xs">
              {checkingCabinet ? 'Chargement…' : 'Espace collaboratif'}
            </span>
          </Button>
        )}
        {actions.slice(1).filter(a => a.key !== 'collect').map((action) => {
          const onClick = () => {
            if (action.key === 'import') return triggerImport();
            // TODO: wire other actions
          };
          const colorClass = primaryButtonColor || (role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white');
          const buttonClass = `${colorClass} h-auto flex-col gap-2 py-4`;
          return (
            <Button
              key={action.key}
              variant={primaryButtonColor ? undefined : action.variant}
              className={buttonClass}
              onClick={onClick}
              disabled={uploading && action.key === 'import'}
            >
              <action.icon className="h-5 w-5" />
              <span className="text-xs">{action.key === 'import' && uploading ? 'Import…' : action.label}</span>
            </Button>
          );
        })}
        {/* Remplace 'Lien de collecte' par menu Fiche client avec même contenu */}
        <FicheClientMenu
          variant="vertical"
          colorClass={primaryButtonColor || (role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')}
        />
      </CardContent>
    </Card>
  );
}
