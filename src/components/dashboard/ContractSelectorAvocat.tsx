/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { ContractCreationDialog } from "./ContractCreationDialog";
import { useLocation } from "react-router-dom";

// Catégories spécifiques espace avocat (exportées pour réutilisation)
export const AVOCAT_CONTRACT_CATEGORIES = [
  {
    label: "💼 Droit des affaires / Commercial",
    key: "Droit des affaires / Commercial",
    contracts: [
      "Contrat de prestation de services",
      "Contrat de vente B2B / distribution",
      "Conditions Générales de Vente (CGV)",
      "Conditions Générales d’Utilisation (CGU) — SaaS / site web",
      "Contrat d’agence commerciale",
      "Contrat de franchise",
      "Contrat de partenariat / coopération",
      "Contrat de sous-traitance",
      "NDA (Accord de confidentialité)",
      "Cession de marque / cession de droits de propriété intellectuelle",
    ],
  },
  {
    label: "👔 Droit du travail",
    key: "Droit du travail",
    contracts: [
      "Contrat de travail (CDD/CDI)",
      "Convention de stage",
      "Rupture conventionnelle",
      "Avenants au contrat de travail",
      "Accords de confidentialité employé",
      "Politique RGPD interne (annexes)",
    ],
  },
  {
    label: "🏠 Droit immobilier (version avocat)",
    key: "Droit immobilier",
    contracts: [
      "Bail d'habitation vide",
      "Bail d'habitation meublé",
      "Bail commercial / professionnel",
      "État des lieux (annexe)",
      "Mise en demeure de payer le loyer / autres obligations",
    ],
  },
  {
    label: "👪 Droit civil / Vie privée",
    key: "Droit civil / Vie privée",
    contracts: [
      "Pacte de concubinage",
      "Convention parentale",
      "Reconnaissance de dettes",
      "Mandat de protection future sous seing privé",
      "Testament olographe + accompagnement au dépôt",
    ],
  },
  {
    label: "🧠 Propriété intellectuelle & Numérique",
    key: "Propriété intellectuelle & Numérique",
    contracts: [
      "Contrat de cession de droits d'auteur",
      "Licence logicielle",
      "Contrat de développement web / application",
      "Politique de confidentialité / mentions légales / RGPD",
    ],
  },
];

interface ContractSelectorAvocatProps {
  variant?: 'vertical' | 'horizontal';
  label?: string; // default: "Créer un contrat"
  colorClass?: string; // default: blue styling
  onContractCreated?: () => void; // Callback après création
}

export function ContractSelectorAvocat({ variant = 'vertical', label = 'Créer un contrat', colorClass, onContractCreated }: ContractSelectorAvocatProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const location = useLocation();

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  const color = colorClass || 'bg-blue-600 hover:bg-blue-700 text-white';
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
