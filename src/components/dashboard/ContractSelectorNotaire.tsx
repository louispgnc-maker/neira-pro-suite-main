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
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { Search } from "lucide-react";

const categories = [
  {
    label: "🏠 Immobilier",
    contracts: [
      "Compromis de vente / Promesse unilatérale de vente",
      "Acte de vente immobilière",
      "Bail d’habitation (vide, meublé)",
      "Bail commercial / professionnel",
      "Convention d’indivision",
      "Acte de mainlevée d’hypothèque",
    ],
  },
  {
    label: "👪 Famille & Patrimoine",
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
    label: "🕊️ Succession / Transmission",
    contracts: [
      "Déclaration de succession",
      "Acte de notoriété",
      "Partage successoral",
      "Procuration notariée liée à la succession",
    ],
  },
  {
    label: "📑 Procurations & Actes divers",
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
}

export function ContractSelectorNotaire({ variant = 'vertical' }: ContractSelectorNotaireProps) {
  const [search, setSearch] = useState("");

  // Filtrer les contrats selon la recherche
  const filteredCategories = categories.map((cat) => ({
    ...cat,
    contracts: cat.contracts.filter((c) =>
      c.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.contracts.length > 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'vertical' ? (
          <Button className="bg-amber-600 hover:bg-amber-700 text-white h-auto flex-col gap-2 py-4">
            <FileText className="h-5 w-5" />
            <span className="text-xs">Créer un contrat</span>
          </Button>
        ) : (
          <Button className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 h-auto flex items-center">
            Créer un contrat
          </Button>
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
            <DropdownMenuSub key={cat.label}>
              <DropdownMenuSubTrigger className="font-semibold">
                {cat.label}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {cat.contracts.map((contract) => (
                  <DropdownMenuItem key={contract} className="cursor-pointer">
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
