import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { STRIPE_PRICE_IDS } from '@/lib/stripeConfig';
import { supabase } from '@/lib/supabaseClient';
import { createStripeCheckoutSession } from '@/lib/stripeCheckout';
import { Crown, Zap, Users } from 'lucide-react';

interface ChangePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: 'essentiel' | 'professionnel' | 'cabinet-plus';
  planName: string;
  role: 'avocat' | 'notaire';
  cabinetId: string;
  currentMembersCount: number;
  hasStripeSubscription: boolean;
}

export function ChangePlanModal({
  open,
  onOpenChange,
  planId,
  planName,
  role,
  cabinetId,
  currentMembersCount,
  hasStripeSubscription
}: ChangePlanModalProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  
  // Limites par plan
  const planLimits: Record<string, { min: number; max: number }> = {
    'essentiel': { min: 1, max: 1 },
    'professionnel': { min: 2, max: 10 },
    'cabinet-plus': { min: 1, max: 50 }
  };
  
  // Initialiser avec le maximum entre currentMembersCount et le minimum requis pour le plan
  const initialMembers = Math.max(currentMembersCount, planLimits[planId].min);
  const [numberOfMembers, setNumberOfMembers] = useState<number>(initialMembers);
  const [loading, setLoading] = useState(false);

  // Configuration des prix par plan
  const planPrices: Record<string, number> = {
    'essentiel': 45,
    'professionnel': 69,
    'cabinet-plus': 99
  };

  const basePrice = planPrices[planId];
  const monthlyPrice = basePrice * numberOfMembers;
  const yearlyPrice = Math.round(monthlyPrice * 12 * 0.9); // 10% de réduction
  const total = billingPeriod === 'monthly' ? monthlyPrice : yearlyPrice;

  const showMembersSelector = planId === 'professionnel' || planId === 'cabinet-plus';
  const limits = planLimits[planId];

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Obtenir le price ID Stripe
      const priceId = STRIPE_PRICE_IDS[planId][billingPeriod];
      if (!priceId) {
        toast.error('Configuration invalide', {
          description: 'Prix non trouvé pour ce plan'
        });
        setLoading(false);
        return;
      }

      // Si l'utilisateur a déjà un abonnement Stripe, on le met à jour
      if (hasStripeSubscription) {
        const { data, error } = await supabase.functions.invoke('update-subscription-plan', {
          body: {
            cabinetId,
            newPriceId: priceId,
            quantity: numberOfMembers,
          },
        });

        if (error) throw error;

        toast.success('Abonnement mis à jour !', {
          description: 'Votre changement de plan a été appliqué avec succès'
        });

        // Recharger la page pour afficher les nouvelles données
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        // Sinon, on crée une nouvelle session de checkout
        const url = await createStripeCheckoutSession({
          priceId,
          quantity: numberOfMembers,
          cabinetId,
          successUrl: `${window.location.origin}/${role}s/subscription?upgrade=success`,
          cancelUrl: `${window.location.origin}/${role}s/subscription`,
          metadata: {
            billing_period: billingPeriod,
            plan_id: planId,
          }
        });

        if (url) {
          window.location.href = url;
        }
      }
    } catch (error) {
      console.error('Erreur changement d\'abonnement:', error);
      toast.error('Erreur', {
        description: error instanceof Error ? error.message : 'Impossible de modifier l\'abonnement'
      });
      setLoading(false);
    }
  };

  const getPlanIcon = () => {
    switch (planId) {
      case 'essentiel':
        return <Zap className="w-6 h-6 text-blue-600" />;
      case 'professionnel':
        return <Crown className="w-6 h-6 text-purple-600" />;
      case 'cabinet-plus':
        return <Users className="w-6 h-6 text-orange-600" />;
    }
  };

  const getPlanColor = () => {
    switch (planId) {
      case 'essentiel':
        return {
          border: 'border-blue-600',
          bg: 'bg-blue-50',
          text: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700'
        };
      case 'professionnel':
        return {
          border: 'border-purple-600',
          bg: 'bg-purple-50',
          text: 'text-purple-600',
          button: 'bg-purple-600 hover:bg-purple-700'
        };
      case 'cabinet-plus':
        return {
          border: 'border-orange-600',
          bg: 'bg-orange-50',
          text: 'text-orange-600',
          button: 'bg-orange-600 hover:bg-orange-700'
        };
    }
  };

  const colors = getPlanColor();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {getPlanIcon()}
            <DialogTitle className="text-2xl">
              Passer à Neira {planName}
            </DialogTitle>
          </div>
          <DialogDescription>
            Configurez votre nouvel abonnement et procédez au paiement sécurisé via Stripe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sélecteur de nombre de membres */}
          {showMembersSelector && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Nombre de membres</Label>
              <Select 
                value={numberOfMembers.toString()} 
                onValueChange={(v) => setNumberOfMembers(parseInt(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: limits.max - limits.min + 1 }, (_, i) => i + limits.min).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} membre{num > 1 ? 's' : ''} — {(basePrice * num)}€/mois
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600">
                Prix unitaire : {basePrice}€/mois par membre
              </p>
            </div>
          )}

          {/* Période de facturation */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Période de facturation</Label>
            <RadioGroup value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as 'monthly' | 'yearly')}>
              <div className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                billingPeriod === 'monthly' 
                  ? `${colors.border} ${colors.bg}` 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Mensuel</span>
                    <span className={`text-lg font-bold ${colors.text}`}>
                      {monthlyPrice}€/mois
                    </span>
                  </div>
                </Label>
              </div>
              
              <div className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                billingPeriod === 'yearly' 
                  ? `${colors.border} ${colors.bg}` 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
                <RadioGroupItem value="yearly" id="yearly" />
                <Label htmlFor="yearly" className="flex-1 cursor-pointer">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">Annuel</span>
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                        -10%
                      </span>
                    </div>
                    <span className={`text-lg font-bold ${colors.text}`}>
                      {yearlyPrice}€/an
                    </span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Récapitulatif */}
          <div className={`${colors.bg} border-2 ${colors.border} rounded-lg p-4`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-700">
                {showMembersSelector ? `${numberOfMembers} membre${numberOfMembers > 1 ? 's' : ''}` : 'Abonnement'} × {basePrice}€
              </span>
              <span className="font-semibold">{monthlyPrice}€</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-700">Période</span>
              <span className="font-semibold">
                {billingPeriod === 'monthly' ? 'Mensuel' : 'Annuel (-10%)'}
              </span>
            </div>
            <div className="border-t border-gray-300 mt-3 pt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Total</span>
                <span className={`font-bold text-2xl ${colors.text}`}>
                  {total}€{billingPeriod === 'yearly' ? '/an' : '/mois'}
                </span>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className={`flex-1 ${colors.border} ${colors.text} hover:text-black hover:${colors.bg}`}
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              className={`flex-1 ${colors.button} text-white`}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? 'Redirection...' : 'Continuer vers le paiement'}
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Vous serez redirigé vers Stripe pour finaliser le paiement de manière sécurisée.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
