/* eslint-disable react-refresh/only-export-components */
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
import { useLocation, useNavigate } from "react-router-dom";

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
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  // Base button style (no color) to allow full control via colorClass
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  const color = colorClass || 'bg-orange-600 hover:bg-orange-700 text-white';
  const verticalBtn = `${base} ${color} h-auto flex-col py-4`;
  const horizontalBtn = `${base} ${color} text-sm px-4 py-2 h-auto flex items-center`;

  // Filtrer les contrats selon la recherche
  const filteredCategories = NOTAIRE_CONTRACT_CATEGORIES.map((cat) => ({
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

    // Si c'est un "Compromis de vente", rediriger vers la page Contrats avec paramètres
    if (contractType === "Compromis de vente / Promesse unilatérale de vente") {
      const basePath = role === 'notaire' ? '/notaires' : '/avocats';
      navigate(`${basePath}/contrats?create=true&type=${encodeURIComponent(contractType)}&category=${encodeURIComponent(categoryKey)}`);
      return;
    }

    // Si c'est un "Acte de vente immobilière", rediriger vers la page Contrats avec paramètres
    if (contractType === "Acte de vente immobilière") {
      const basePath = role === 'notaire' ? '/notaires' : '/avocats';
      navigate(`${basePath}/contrats?create=true&type=${encodeURIComponent(contractType)}&category=${encodeURIComponent(categoryKey)}`);
      return;
    }

    // Si c'est un "Bail d'habitation", rediriger vers la page Contrats avec paramètres
    if (contractType === "Bail d'habitation vide" || contractType === "Bail d'habitation meublé") {
      const basePath = role === 'notaire' ? '/notaires' : '/avocats';
      navigate(`${basePath}/contrats?create=true&type=${encodeURIComponent(contractType)}&category=${encodeURIComponent(categoryKey)}`);
      return;
    }

    // Si c'est un "Bail commercial / professionnel", rediriger vers la page Contrats avec paramètres
    if (contractType === "Bail commercial / professionnel") {
      const basePath = role === 'notaire' ? '/notaires' : '/avocats';
      navigate(`${basePath}/contrats?create=true&type=${encodeURIComponent(contractType)}&category=${encodeURIComponent(categoryKey)}`);
      return;
    }

    // Si c'est une "Convention d'indivision", rediriger vers la page Contrats avec paramètres
    if (contractType === "Convention d'indivision") {
      const basePath = role === 'notaire' ? '/notaires' : '/avocats';
      navigate(`${basePath}/contrats?create=true&type=${encodeURIComponent(contractType)}&category=${encodeURIComponent(categoryKey)}`);
      return;
    }

    // Si c'est une "Mainlevée d'hypothèque", rediriger vers la page Contrats avec paramètres
    if (contractType === "Mainlevée d'hypothèque") {
      const basePath = role === 'notaire' ? '/notaires' : '/avocats';
      navigate(`${basePath}/contrats?create=true&type=${encodeURIComponent(contractType)}&category=${encodeURIComponent(categoryKey)}`);
      return;
    }

    // Si c'est un "Contrat de mariage", rediriger vers la page Contrats avec paramètres
    if (contractType === "Contrat de mariage (régimes matrimoniaux)") {
      const basePath = role === 'notaire' ? '/notaires' : '/avocats';
      navigate(`${basePath}/contrats?create=true&type=${encodeURIComponent(contractType)}&category=${encodeURIComponent(categoryKey)}`);
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
    } catch (err: unknown) {
      console.error('Erreur création contrat:', err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error('Erreur lors de la création', { description: message });
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
              <DropdownMenuSubTrigger className="font-semibold hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white data-[state=open]:bg-orange-600 data-[state=open]:text-white">
                {cat.label}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {cat.contracts.map((contract) => (
                  <DropdownMenuItem 
                    key={contract} 
                    className="cursor-pointer hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white"
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
