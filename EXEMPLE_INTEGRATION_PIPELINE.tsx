/**
 * EXEMPLE D'INTÉGRATION du nouveau pipeline dans ContractCreationDialog
 * 
 * Ce fichier montre comment remplacer l'ancien flow one-shot par le nouveau pipeline multi-étapes
 */

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

// ✨ NOUVEAU: Import du composant pipeline
import { ContractPipelineFlow } from "@/components/contract/ContractPipelineFlow";

interface ContractCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: 'avocat' | 'notaire';
  preSelectedType?: string;
  preSelectedCategory?: string;
}

export function ContractCreationDialog({ 
  open, 
  onOpenChange, 
  role = 'avocat', 
  preSelectedType, 
  preSelectedCategory 
}: ContractCreationDialogProps) {
  const [contractType, setContractType] = useState(preSelectedType || "");
  const [description, setDescription] = useState("");
  
  // ✨ NOUVEAU: État pour le pipeline
  const [showPipeline, setShowPipeline] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  const detectedRole = location.pathname.includes('/notaires') ? 'notaire' : 
                       location.pathname.includes('/avocats') ? 'avocat' : role;

  useEffect(() => {
    if (preSelectedType) {
      setContractType(preSelectedType);
    }
  }, [preSelectedType]);

  const selectItemClass = detectedRole === 'notaire' 
    ? 'cursor-pointer hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white'
    : 'cursor-pointer hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white';

  // ✨ MODIFIÉ: Lancer le pipeline au lieu de rediriger directement
  const handleGenerate = () => {
    if (!contractType) {
      toast.error("Veuillez sélectionner un type de contrat");
      return;
    }

    // Fermer ce dialog
    onOpenChange(false);
    
    // Ouvrir le pipeline
    setShowPipeline(true);
  };

  // ✨ NOUVEAU: Callback quand le pipeline est terminé
  const handlePipelineComplete = (schema: any, brief: any) => {
    console.log('✅ Pipeline terminé!', { schema, brief });
    
    // Trouver la catégorie
    let categoryKey = preSelectedCategory || '';
    if (!categoryKey) {
      const categories = detectedRole === 'notaire' ? NOTAIRE_CONTRACT_CATEGORIES : AVOCAT_CONTRACT_CATEGORIES;
      for (const cat of categories) {
        if (cat.contracts.includes(contractType)) {
          categoryKey = cat.key;
          break;
        }
      }
    }

    // Rediriger vers la page contrats avec le schéma validé
    const basePath = detectedRole === 'notaire' ? '/notaires' : '/avocats';
    
    // Stocker le schéma dans sessionStorage pour le récupérer dans Contrats.tsx
    sessionStorage.setItem('pipelineSchema', JSON.stringify(schema));
    sessionStorage.setItem('pipelineBrief', JSON.stringify(brief));
    
    const params = new URLSearchParams({
      create: 'true',
      type: contractType,
      category: categoryKey,
      usePipeline: 'true'  // Flag pour indiquer qu'on vient du pipeline
    });
    
    if (description.trim()) {
      params.append('description', description);
    }

    navigate(`${basePath}/contrats?${params.toString()}`);
    
    // Réinitialiser
    setContractType("");
    setDescription("");
    setShowPipeline(false);
  };

  const handleClose = () => {
    setContractType("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <>
      {/* Dialog de sélection du type de contrat */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detectedRole === 'notaire' ? 'Créer un nouvel acte' : 'Créer un nouveau contrat'}
            </DialogTitle>
            <DialogDescription>
              {/* ✨ MODIFIÉ: Message mis à jour */}
              Sélectionnez le type de contrat et décrivez vos besoins. 
              Notre système de contrôle qualité vous guidera étape par étape.
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
                <SelectContent className="max-h-[400px] overflow-y-auto">
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
                Description de votre besoin *
              </Label>
              <Textarea
                id="contract-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez les spécificités de ce contrat, les points importants à inclure, le contexte particulier..."
                className="mt-2 min-h-[120px]"
              />
              <p className="text-sm text-gray-600 mt-2">
                {/* ✨ MODIFIÉ: Message mis à jour */}
                Plus vous donnez de détails, mieux notre système pourra vous guider 
                et générer un formulaire adapté à votre situation.
              </p>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!contractType || !description.trim()}
                className={`${detectedRole === 'notaire' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
              >
                {/* ✨ MODIFIÉ: Texte mis à jour */}
                Démarrer le processus guidé
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ✨ NOUVEAU: Dialog du pipeline */}
      <ContractPipelineFlow
        open={showPipeline}
        onOpenChange={setShowPipeline}
        contractType={contractType}
        description={description}
        role={detectedRole}
        onComplete={handlePipelineComplete}
      />
    </>
  );
}

/**
 * ✨ NOUVEAU: Dans Contrats.tsx, récupérer le schéma validé
 * 
 * Ajouter ce code dans le useEffect qui détecte les paramètres d'URL:
 */

/*
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const shouldCreate = params.get('create') === 'true';
  const usePipeline = params.get('usePipeline') === 'true';
  
  if (shouldCreate && usePipeline) {
    // Récupérer le schéma et le brief du pipeline
    const schemaJson = sessionStorage.getItem('pipelineSchema');
    const briefJson = sessionStorage.getItem('pipelineBrief');
    
    if (schemaJson && briefJson) {
      const schema = JSON.parse(schemaJson);
      const brief = JSON.parse(briefJson);
      
      console.log('📋 Schéma du pipeline récupéré:', schema);
      console.log('📄 Brief du pipeline récupéré:', brief);
      
      // Utiliser le schéma validé
      setGeneratedFormSchema(schema);
      
      // Pré-remplir les données avec les infos du brief
      setDynamicFormData(brief.providedInfo || {});
      
      // Nettoyer le sessionStorage
      sessionStorage.removeItem('pipelineSchema');
      sessionStorage.removeItem('pipelineBrief');
      
      // Ouvrir le dialog de création
      setShowQuestionDialog(true);
      setPendingContractType(params.get('type') || '');
    }
  }
}, [location.search]);
*/
