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
import { FileText } from "lucide-react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

const categories = [
  {
    label: "🏠 Immobilier",
    key: "Immobilier",
    contracts: [
      "Compromis de vente / Promesse unilatérale de vente",
      "Acte de vente immobilière",
      "Bail d'habitation (vide, meublé)",
      "Bail commercial / professionnel",
      "Convention d'indivision",
      "Acte de mainlevée d'hypothèque",
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
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const location = useLocation();

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  // Base button style (no color) to allow full control via colorClass
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  const color = colorClass || 'bg-amber-600 hover:bg-amber-700 text-white';
  const verticalBtn = `${base} ${color} h-auto flex-col py-4`;
  const horizontalBtn = `${base} ${color} text-sm px-4 py-2 h-auto flex items-center`;

  // Filtrer les contrats selon la recherche
  const filteredCategories = categories.map((cat) => ({
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
      
      // Callback pour rafraîchir la liste
      if (onContractCreated) {
        onContractCreated();
      }
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
      <DropdownMenuContent className="min-w-[320px] max-h-[400px] overflow-y-auto" align="end">
        <div className="px-2 py-2 border-b border-muted flex items-center gap-2 sticky top-0 bg-background z-10">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un contrat..."
            className="w-full bg-transparent outline-none text-sm px-2 py-1"
            autoFocus
          />
        </div>
        <DropdownMenuSeparator />
        {filteredCategories.length === 0 ? (
          <DropdownMenuLabel className="text-muted-foreground text-center py-4">Aucun contrat trouvé</DropdownMenuLabel>
        ) : (
          filteredCategories.map((cat) => (
            <DropdownMenuSub key={cat.key}>
              <DropdownMenuSubTrigger className="font-semibold">
                {cat.label}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {cat.contracts.map((contract) => (
                  <DropdownMenuItem 
                    key={contract} 
                    className="cursor-pointer"
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
