import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Send, UserPlus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import SendClientFormDialog from "./SendClientFormDialog";

interface FicheClientMenuProps {
  variant?: 'vertical' | 'horizontal';
  colorClass?: string; // ex: bg-orange-600 hover:bg-orange-700 text-white
  label?: string; // button text label, defaults to "Fiche client"
}

export function FicheClientMenu({ variant = 'vertical', colorClass = '', label = 'Fiche client' }: FicheClientMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [sendFormOpen, setSendFormOpen] = useState(false);
  const [cabinetId, setCabinetId] = useState<string>('');

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  // Get user's cabinet
  useEffect(() => {
    const getCabinet = async () => {
      if (!user) return;
      
      const { data } = await supabase.rpc('get_user_cabinets');
      if (data && Array.isArray(data) && data.length > 0) {
        const cabinet = data.find(c => c.role === role);
        if (cabinet) {
          setCabinetId(cabinet.id);
        }
      }
    };
    getCabinet();
  }, [user, role]);

  const handleSendForm = () => {
    if (!cabinetId) {
      toast.error('Aucun cabinet trouvé', {
        description: 'Vous devez être membre d\'un cabinet pour envoyer un formulaire.'
      });
      return;
    }
    setSendFormOpen(true);
  };

  // Base button style copied from buttonVariants root (without any color / hover so we can fully control)
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  // Role-based fallback color if no colorClass provided (ensures consistent hover color per space)
  // Bouton: on ne change pas la couleur ici (reste mappé par défaut)
  const fallback = role === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';
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
          className={
            `cursor-pointer ${role === 'notaire' 
              ? 'hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white' 
              : 'hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white'}`
          }
          onClick={() => navigate(role === 'notaire' ? '/notaires/clients/create' : '/avocats/clients/create')}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Remplir une fiche client
        </DropdownMenuItem>
        <DropdownMenuItem 
          className={
            `cursor-pointer ${role === 'notaire' 
              ? 'hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white' 
              : 'hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white'}`
          }
          onClick={handleSendForm}
        >
          <Send className="mr-2 h-4 w-4" />
          Fiche à compléter par le client
        </DropdownMenuItem>
      </DropdownMenuContent>
      
      {/* Send Client Form Dialog */}
      {user && cabinetId && (
        <SendClientFormDialog
          open={sendFormOpen}
          onOpenChange={setSendFormOpen}
          cabinetId={cabinetId}
          userId={user.id}
        />
      )}
    </DropdownMenu>
  );
}
