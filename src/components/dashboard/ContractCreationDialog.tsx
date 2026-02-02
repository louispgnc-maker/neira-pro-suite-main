import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { NOTAIRE_CONTRACT_CATEGORIES } from "./ContractSelectorNotaire";
import { AVOCAT_CONTRACT_CATEGORIES } from "./ContractSelectorAvocat";
import { ContractPipelineFlow } from "@/components/contract/ContractPipelineFlow";
import type { ContractFormSchema } from "@/types/contractPipeline";

interface ContractCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: 'avocat' | 'notaire';
  preSelectedType?: string; // Type pré-sélectionné depuis le menu
  preSelectedCategory?: string; // Catégorie pré-sélectionnée
}

export function ContractCreationDialog({ open, onOpenChange, role = 'avocat', preSelectedType, preSelectedCategory }: ContractCreationDialogProps) {
  const [contractType, setContractType] = useState(preSelectedType || "");
  const [description, setDescription] = useState("");
  const [showPipeline, setShowPipeline] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Détecter le rôle depuis l'URL si non fourni
  const detectedRole = location.pathname.includes('/notaires') ? 'notaire' : location.pathname.includes('/avocats') ? 'avocat' : role;

  // Mettre à jour le type si preSelectedType change
  useEffect(() => {
    if (preSelectedType) {
      setContractType(preSelectedType);
    }
  }, [preSelectedType]);

  const selectItemClass = detectedRole === 'notaire' 
    ? 'cursor-pointer hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white'
    : 'cursor-pointer hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white';

  const selectContentClass = detectedRole === 'notaire'
    ? 'max-h-[400px] overflow-y-auto'
    : 'max-h-[400px] overflow-y-auto';

  const handleGenerate = () => {
    if (!contractType) {
      toast.error("Veuillez sélectionner un type de contrat");
      return;
    }
    // Lancer le pipeline au lieu de naviguer
    setShowPipeline(true);
  };

  const handlePipelineComplete = (schema: ContractFormSchema) => {
    // Pipeline terminé avec succès - naviguer vers le contrat avec le schéma
    const categoryKey = preSelectedCategory || '';
    const basePath = detectedRole === 'notaire' ? '/notaires' : '/avocats';
    
    toast.success("Formulaire généré avec succès !");
    
    // Stocker le schéma dans sessionStorage pour le récupérer après navigation
    sessionStorage.setItem('contractFormSchema', JSON.stringify(schema));
    sessionStorage.setItem('contractType', contractType);
    sessionStorage.setItem('contractCategory', categoryKey);
    
    navigate(`${basePath}/contrats?create=true&type=${contractType}&category=${categoryKey}`);
    
    // Réinitialiser et fermer
    setContractType("");
    setDescription("");
    setShowPipeline(false);
    onOpenChange(false);
  };

  const handlePipelineError = (error: Error) => {
    toast.error(`Erreur: ${error.message}`);
    // Rester dans le dialog, permettre de réessayer
  };

  const handlePipelineCancel = () => {
    setShowPipeline(false);
    // Retourner au formulaire de sélection
    onOpenChange(false);
  };

  const handleClose = () => {
    setShowPipeline(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {detectedRole === 'notaire' ? 'Créer un nouvel acte' : 'Créer un nouveau contrat'}
          </DialogTitle>
          <DialogDescription>
            {showPipeline 
              ? "Suivez les étapes pour générer un formulaire de qualité"
              : "Sélectionnez le type de contrat et décrivez vos besoins. L'IA générera un formulaire adapté."
            }
          </DialogDescription>
        </DialogHeader>

        {showPipeline ? (
          // Mode pipeline - Afficher le flow complet avec les 6 étapes
          <div className="mt-4">
            <ContractPipelineFlow
              contractType={contractType}
              initialRequest={description || `Créer un ${contractType}`}
              onComplete={handlePipelineComplete}
              onError={handlePipelineError}
              onCancel={handlePipelineCancel}
            />
          </div>
        ) : (
          // Mode sélection - Formulaire initial
          <div className="space-y-6 mt-4">
          {/* Sélection du type de contrat */}
          <div>
            <Label htmlFor="contract-type">Type de contrat *</Label>
            <Select value={contractType} onValueChange={setContractType}>
              <SelectTrigger id="contract-type" className="mt-2">
                <SelectValue placeholder="Choisissez un type de contrat..." />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                {(detectedRole === 'notaire' ? NOTAIRE_CONTRACT_CATEGORIES : AVOCAT_CONTRACT_CATEGORIES)?.map((cat) => (
                  <optgroup key={cat.key} label={cat.label}>
                    {cat.contracts?.map((contract) => (
                      <SelectItem key={contract} value={contract} className={selectItemClass}>
                        {contract}
                      </SelectItem>
                    ))}
                  </optgroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description/Besoins spécifiques */}
          <div>
            <Label htmlFor="contract-description">
              Description de votre besoin (optionnel)
            </Label>
            <Textarea
              id="contract-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez les spécificités de ce contrat, les points importants à inclure, le contexte particulier..."
              className="mt-2 min-h-[120px]"
            />
            <p className="text-sm text-gray-600 mt-2">
              Plus vous donnez de détails, plus le formulaire sera adapté à votre situation.
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={handleClose}
            >
              Annuler
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!contractType}
              className={`${detectedRole === 'notaire' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
            >
              Lancer la création
            </Button>
          </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
