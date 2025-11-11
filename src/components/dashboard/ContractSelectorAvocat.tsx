import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { FileText, Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
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
      "Bail d’habitation (vide, meublé)",
      "Bail commercial",
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
      "Contrat de cession de droits d’auteur",
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
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const location = useLocation();

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  const color = colorClass || 'bg-blue-600 hover:bg-blue-700 text-white';
  const verticalBtn = `${base} ${color} h-auto flex-col py-4`;
  const horizontalBtn = `${base} ${color} text-sm px-4 py-2 h-auto flex items-center`;

  const filteredCategories = AVOCAT_CONTRACT_CATEGORIES.map((cat) => ({
    ...cat,
    contracts: cat.contracts.filter((c) =>
      c.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.contracts.length > 0);

  const handleContractSelect = async (contractType: string, categoryKey: string) => {
    if (!user) {
      toast.error("Connexion requise");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('contrats')
        .insert({
          owner_id: user.id,
          name: contractType,
          type: contractType,
          category: categoryKey,
          role: role,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Contrat créé', { description: contractType });
      if (onContractCreated) onContractCreated();
    } catch (err: any) {
      console.error('Erreur création contrat:', err);
      toast.error('Erreur lors de la création', { description: err?.message || String(err) });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'vertical' ? (
          <button type="button" className={verticalBtn}>
            <FileText className="h-5 w-5" />
            <span className="text-xs">{label}</span>
          </button>
        ) : (
          <button type="button" className={horizontalBtn}>
            {label}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[360px] max-h-[420px] overflow-y-auto" align="end">
        <div className="px-2 py-2 border-b border-muted flex items-center gap-2 sticky top-0 bg-background z-10">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un contrat..."
            className="w-full bg-background outline-none text-sm px-2 py-1"
            autoFocus
          />
        </div>
        <DropdownMenuSeparator />
        {filteredCategories.length === 0 ? (
          <DropdownMenuLabel className="text-muted-foreground text-center py-4">Aucun contrat trouvé</DropdownMenuLabel>
        ) : (
          filteredCategories.map((cat) => (
            <DropdownMenuSub key={cat.key}>
              <DropdownMenuSubTrigger className="font-semibold hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white data-[state=open]:bg-blue-600 data-[state=open]:text-white">
                {cat.label}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {cat.contracts.map((contract) => (
                  <DropdownMenuItem
                    key={contract}
                    className="cursor-pointer hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white"
                    onClick={() => handleContractSelect(contract, cat.key)}
                  >
                    {contract}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
