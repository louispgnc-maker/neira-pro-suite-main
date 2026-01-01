/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { ContractCreationDialog } from "./ContractCreationDialog";
import { useLocation } from "react-router-dom";

export const NOTAIRE_CONTRACT_CATEGORIES = [
  {
    label: "🏠 Immobilier",
    key: "Immobilier",
    contracts: [
      "Compromis de vente / Promesse unilatérale de vente",
      "Acte de vente immobilière",
      "Bail d'habitation vide",
      "Bail d'habitation meublé",
      "Bail commercial / professionnel",
      "Convention d'indivision",
      "Mainlevée d'hypothèque",
    ],
  },
  {
    label: "👪 Famille & Patrimoine",
    key: "Famille & Patrimoine",
    contracts: [
      "Contrat de mariage (régimes matrimoniaux)",
      "PACS (convention + enregistrement)",
      "Donation entre époux",
      "Donation simple (parent → enfant, etc.)",
      "Testament authentique ou mystique",
      "Changement de régime matrimonial",
    ],
  },
  {
    label: "🕊️ Succession",
    key: "Succession",
    contracts: [
      "Déclaration de succession",
      "Acte de notoriété",
      "Partage successoral",
      "Procuration notariée liée à la succession",
    ],
  },
  {
    label: "📑 Procurations & Actes divers",
    key: "Procurations & Actes divers",
    contracts: [
      "Procuration authentique",
      "Mandat de protection future",
      "Attestation de propriété immobilière",
      "Quitus / reconnaissance de dette",
      "Acte de cession de parts sociales",
    ],
  },
];

interface ContractSelectorNotaireProps {
  variant?: 'vertical' | 'horizontal';
  label?: string; // default: "Créer un contrat"
  colorClass?: string; // default: amber styling
  onContractCreated?: () => void; // Callback après création
}

export function ContractSelectorNotaire({ variant = 'vertical', label = 'Créer un contrat', colorClass, onContractCreated }: ContractSelectorNotaireProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const location = useLocation();

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  // Base button style (no color) to allow full control via colorClass
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  const color = colorClass || 'bg-orange-600 hover:bg-orange-700 text-white';
  const verticalBtn = `${base} ${color} h-auto flex-col py-4`;
  const horizontalBtn = `${base} ${color} text-sm px-4 py-2 h-auto flex items-center`;

  return (
    <>
      {variant === 'vertical' ? (
        <button type="button" className={verticalBtn} onClick={() => setDialogOpen(true)}>
          <FileText className="h-5 w-5" />
          <span className="text-xs">{label}</span>
        </button>
      ) : (
        <button type="button" className={horizontalBtn} onClick={() => setDialogOpen(true)}>
          {label}
        </button>
      )}

      <ContractCreationDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        role={role}
      />
    </>
  );
}
