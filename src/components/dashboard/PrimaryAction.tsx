import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PrimaryActionProps {
  role?: 'avocat' | 'notaire';
}

export function PrimaryAction({ role = 'avocat' }: PrimaryActionProps) {
  const navigate = useNavigate();

  const buttonColor = role === 'notaire' 
    ? 'bg-orange-600 hover:bg-orange-700' 
    : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className="w-full">
      <Button
        onClick={() => navigate(role === 'notaire' ? '/notaires/contrats' : '/avocats/contrats')}
        className={`w-full ${buttonColor} text-white text-lg font-semibold py-6 shadow-lg hover:shadow-xl transition-all`}
      >
        <Plus className="mr-2 h-6 w-6" />
        Créer un nouveau contrat
      </Button>
    </div>
  );
}
