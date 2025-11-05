import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Send, UserPlus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface FicheClientMenuProps {
  variant?: 'vertical' | 'horizontal';
  colorClass?: string; // ex: bg-amber-600 hover:bg-amber-700 text-white
  label?: string; // button text label, defaults to "Fiche client"
}

export function FicheClientMenu({ variant = 'vertical', colorClass = '', label = 'Fiche client' }: FicheClientMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  // Base button style copied from buttonVariants root (without any color / hover so we can fully control)
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  // Fallback if no colorClass provided
  const fallback = 'bg-primary text-primary-foreground hover:bg-primary/90';
  const color = colorClass || fallback;

  const verticalClasses = `${base} ${color} h-auto flex-col gap-2 py-4 px-4`;
  const horizontalClasses = `${base} ${color} h-10 px-4 py-2`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'vertical' ? (
          <button type="button" className={verticalClasses}>
            <UserPlus className="h-5 w-5" />
            <span className="text-xs">{label}</span>
          </button>
        ) : (
          <button type="button" className={horizontalClasses}>
            {label}
            <ChevronDown className="ml-2 h-4 w-4" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => navigate(role === 'notaire' ? '/notaires/clients/create' : '/avocats/clients/create')}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Remplir une fiche client
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Send className="mr-2 h-4 w-4" />
          Fiche à compléter par le client
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
