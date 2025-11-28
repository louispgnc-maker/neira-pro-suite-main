import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type ResourceCounterProps = {
  current: number;
  max: number | null; // null = illimité
  label: string;
  type: 'storage' | 'count';
  subscriptionPlan: string;
  role: 'avocat' | 'notaire';
  className?: string;
};

export function ResourceCounter({ 
  current, 
  max, 
  label, 
  type, 
  subscriptionPlan,
  role,
  className = "" 
}: ResourceCounterProps) {
  const navigate = useNavigate();
  const isUnlimited = max === null || max === 0 || max > 10000;
  const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && current >= max;

  const formatStorage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} Go`;
  };

  const formatMax = (value: number | null) => {
    if (value === null || value === 0 || value > 10000) return '∞';
    if (type === 'storage') return `${value} Go`;
    return value.toString();
  };

  const displayCurrent = type === 'storage' ? formatStorage(current) : current;
  const displayMax = formatMax(max);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Badge 
          variant={isAtLimit ? "destructive" : isNearLimit ? "secondary" : "outline"}
          className="text-xs"
        >
          {displayCurrent} / {displayMax}
        </Badge>
      </div>
      
      {type === 'storage' && !isUnlimited && (
        <div className="space-y-1">
          <Progress 
            value={percentage} 
            className={`h-2 ${isAtLimit ? '[&>div]:bg-destructive' : isNearLimit ? '[&>div]:bg-orange-500' : ''}`}
          />
          {isNearLimit && (
            <div className="flex items-center gap-2 text-xs text-orange-600">
              <AlertCircle className="h-3 w-3" />
              <span>
                {isAtLimit ? 'Limite atteinte' : 'Vous approchez de la limite'}
                {subscriptionPlan !== 'cabinet-plus' && (
                  <>
                    {' - '}
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs underline text-orange-600"
                      onClick={() => navigate(`/${role === 'notaire' ? 'notaires' : 'avocats'}/subscription`)}
                    >
                      Passer à un abonnement supérieur
                    </Button>
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      )}
      
      {type === 'count' && isAtLimit && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span>
            Limite atteinte
            {subscriptionPlan !== 'cabinet-plus' && (
              <>
                {' - '}
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs underline text-destructive"
                  onClick={() => navigate(`/${role === 'notaire' ? 'notaires' : 'avocats'}/subscription`)}
                >
                  Passer à un abonnement supérieur
                </Button>
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
