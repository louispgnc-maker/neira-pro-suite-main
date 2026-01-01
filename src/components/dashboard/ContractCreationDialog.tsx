import { useState } from "react";
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

interface ContractCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: 'avocat' | 'notaire';
}

export function ContractCreationDialog({ open, onOpenChange, role = 'avocat' }: ContractCreationDialogProps) {
  const [contractType, setContractType] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Détecter le rôle depuis l'URL si non fourni
  const detectedRole = location.pathname.includes('/notaires') ? 'notaire' : location.pathname.includes('/avocats') ? 'avocat' : role;

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

    // Trouver la catégorie du contrat sélectionné
    const categories = detectedRole === 'notaire' ? NOTAIRE_CONTRACT_CATEGORIES : AVOCAT_CONTRACT_CATEGORIES;
    let categoryKey = '';
    
    for (const cat of categories) {
      if (cat.contracts.includes(contractType)) {
        categoryKey = cat.key;
        break;
      }
    }

    // Rediriger vers la page contrats avec les paramètres
    const basePath = detectedRole === 'notaire' ? '/notaires' : '/avocats';
    const params = new URLSearchParams({
      create: 'true',
      type: contractType,
      category: categoryKey,
    });
    
    if (description.trim()) {
      params.append('description', description);
    }

    navigate(`${basePath}/contrats?${params.toString()}`);
    
    // Réinitialiser et fermer
    setContractType("");
    setDescription("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setContractType("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {detectedRole === 'notaire' ? 'Créer un nouvel acte' : 'Créer un nouveau contrat'}
          </DialogTitle>
          <DialogDescription>
            Sélectionnez le type de contrat et décrivez vos besoins. L'IA générera un formulaire adapté.
          </DialogDescription>
        </DialogHeader>

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
            <p className="text-sm text-muted-foreground mt-2">
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
              Générer le formulaire
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
