import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

type SignaturePackage = {
  quantity: number;
  price: number;
  label: string;
};

type BuySignaturesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionPlan: 'essentiel' | 'professionnel' | 'cabinet-plus';
  currentMonthlyPrice: number; // Prix actuel de l'abonnement par mois
  role: 'avocat' | 'notaire';
  targetUserId?: string; // ID de l'utilisateur pour qui acheter (si différent de l'utilisateur connecté)
  targetUserName?: string; // Nom de l'utilisateur pour affichage
};

const packagesConfig = {
  essentiel: [
    { quantity: 10, price: 7, label: '+10 Signatures' },
    { quantity: 25, price: 15, label: '+25 Signatures' }
  ],
  professionnel: [
    { quantity: 40, price: 15, label: '+40 Signatures' },
    { quantity: 100, price: 29, label: '+100 Signatures ⭐' }
  ],
  'cabinet-plus': []
};

export function BuySignaturesDialog({
  open,
  onOpenChange,
  subscriptionPlan,
  currentMonthlyPrice,
  role,
  targetUserId,
  targetUserName
}: BuySignaturesDialogProps) {
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<SignaturePackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);

  const packages = packagesConfig[subscriptionPlan] || [];

  // Calculer la date d'expiration et le prorata dès l'ouverture du dialogue
  useEffect(() => {
    if (!open) return;
    
    const calculateExpiration = async () => {
      try {
        const { data: cabinetsData } = await supabase.rpc('get_user_cabinets');
        if (!cabinetsData || !Array.isArray(cabinetsData)) return;
        
        const cabinet = cabinetsData.find((c: any) => String(c.role) === role);
        if (!cabinet) return;
        
        const { data: cabinetDetails } = await supabase
          .from('cabinets')
          .select('subscription_started_at')
          .eq('id', cabinet.id)
          .single();
        
        let expires = new Date();
        if (cabinetDetails?.subscription_started_at) {
          const startDate = new Date(cabinetDetails.subscription_started_at);
          const now = new Date();
          let monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
          if (now.getDate() < startDate.getDate()) monthsDiff--;
          expires = new Date(startDate);
          expires.setMonth(expires.getMonth() + monthsDiff + 1);
        } else {
          expires.setMonth(expires.getMonth() + 1);
        }
        
        setExpirationDate(expires);
      } catch (error) {
        console.error('Error calculating expiration:', error);
      }
    };
    
    calculateExpiration();
  }, [open, role]);

  // Calcul du prorata basé sur le cycle d'abonnement (pas le mois calendaire)
  const prorataAmount = selectedPackage && expirationDate 
    ? (() => {
        const now = new Date();
        const totalDaysInCycle = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculer le début du cycle actuel (expirationDate - 1 mois)
        const cycleStart = new Date(expirationDate);
        cycleStart.setMonth(cycleStart.getMonth() - 1);
        
        const totalCycleDays = Math.ceil((expirationDate.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(1, totalDaysInCycle);
        
        return Math.round((selectedPackage.price * daysRemaining / totalCycleDays) * 100) / 100;
      })()
    : 0;

  const handlePurchase = async () => {
    if (!selectedPackage) {
      toast.error('Veuillez sélectionner un forfait');
      return;
    }

    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    setLoading(true);
    
    try {
      // 1. Récupérer le cabinet de l'utilisateur pour le rôle actuel
      const { data: cabinetsData } = await supabase.rpc('get_user_cabinets');
      
      if (!cabinetsData || !Array.isArray(cabinetsData)) {
        throw new Error('Cabinet introuvable');
      }

      const cabinet = cabinetsData.find((c: any) => String(c.role) === role);
      
      if (!cabinet) {
        throw new Error(`Aucun cabinet ${role} trouvé`);
      }

      // Récupérer la date de début du cycle d'abonnement pour calculer l'expiration
      const { data: cabinetDetails } = await supabase
        .from('cabinets')
        .select('subscription_started_at')
        .eq('id', cabinet.id)
        .single();

      // Calculer la date d'expiration = prochain renouvellement (fin du cycle actuel)
      let expiresAt = new Date();
      if (cabinetDetails?.subscription_started_at) {
        const startDate = new Date(cabinetDetails.subscription_started_at);
        const now = new Date();
        
        // Calculer le nombre de mois écoulés depuis le début
        let monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
        
        // Si on est avant le jour de renouvellement ce mois-ci, on est toujours dans le cycle précédent
        if (now.getDate() < startDate.getDate()) {
          monthsDiff--;
        }
        
        // La date d'expiration = début + (mois écoulés + 1) mois
        expiresAt = new Date(startDate);
        expiresAt.setMonth(expiresAt.getMonth() + monthsDiff + 1);
      } else {
        // Fallback: expiration dans 1 mois si pas de date de début
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      // 2. Mettre à jour le membre du cabinet avec le nouveau forfait de signatures (PAR UTILISATEUR)
      const userIdToUpdate = targetUserId || user.id;
      const { error: updateError } = await supabase
        .from('cabinet_members')
        .update({
          signature_addon_quantity: selectedPackage.quantity,
          signature_addon_price: selectedPackage.price,
          signature_addon_purchased_at: new Date().toISOString(),
          signature_addon_expires_at: expiresAt.toISOString()
        })
        .eq('cabinet_id', cabinet.id)
        .eq('user_id', userIdToUpdate);

      if (updateError) {
        console.error('Erreur mise à jour membre:', updateError);
        throw new Error('Erreur lors de la mise à jour du forfait');
      }

      // TODO: Implémenter le paiement Stripe pour le prorata
      // const prorataPayment = await createStripePayment({
      //   amount: prorataAmount,
      //   description: `Forfait ${selectedPackage.label} - Prorata mois en cours`
      // });

      console.log('✅ Forfait signatures ajouté pour l\'utilisateur:', {
        cabinet_id: cabinet.id,
        user_id: user.id,
        quantity: selectedPackage.quantity,
        price: selectedPackage.price,
        new_monthly_price: newMonthlyPrice,
        prorata_paid: prorataAmount
      });
      
      toast.success('Forfait signatures ajouté !', {
        description: `${selectedPackage.quantity} signatures supplémentaires ajoutées jusqu'au ${expiresAt.toLocaleDateString('fr-FR')}`
      });
      
      // Déclencher un événement pour rafraîchir les limites
      window.dispatchEvent(new Event('subscription-updated'));
      
      onOpenChange(false);
      setSelectedPackage(null);
      
      // Recharger la page pour mettre à jour les limites partout
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error('Erreur lors de l\'achat:', error);
      toast.error('Erreur lors de l\'achat', {
        description: error.message || 'Veuillez réessayer ou contacter le support'
      });
    } finally {
      setLoading(false);
    }
  };

  if (subscriptionPlan === 'cabinet-plus') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Signatures illimitées</DialogTitle>
            <DialogDescription>
              Votre plan Cabinet+ inclut déjà des signatures illimitées.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-8">
            <div className="text-6xl">✨</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Acheter des signatures supplémentaires{targetUserName ? ` pour ${targetUserName}` : ''}
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un forfait pour augmenter votre quota mensuel de signatures
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sélection du forfait */}
          <div className="grid gap-3">
            {packages.map((pkg) => (
              <Card
                key={pkg.quantity}
                className={`p-4 cursor-pointer transition-all border-2 ${
                  selectedPackage?.quantity === pkg.quantity
                    ? role === 'notaire'
                      ? 'border-orange-600 bg-orange-50'
                      : 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPackage(pkg)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPackage?.quantity === pkg.quantity
                        ? role === 'notaire'
                          ? 'border-orange-600 bg-orange-600'
                          : 'border-blue-600 bg-blue-600'
                        : 'border-gray-300'
                    }`}>
                      {selectedPackage?.quantity === pkg.quantity && (
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{pkg.label}</p>
                      <p className="text-xs text-gray-600">
                        Valable uniquement pour le cycle en cours
                        {expirationDate && ` • Expire le ${expirationDate.toLocaleDateString('fr-FR')}`}
                      </p>
                    </div>
                  </div>
                  <div className={`text-xl font-bold ${
                    selectedPackage?.quantity === pkg.quantity
                      ? role === 'notaire'
                        ? 'text-orange-600'
                        : 'text-blue-600'
                      : 'text-gray-900'
                  }`}>
                    +{pkg.price}€
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Récapitulatif */}
          {selectedPackage && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-semibold text-gray-900">Récapitulatif</h4>
              
              <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Forfait {selectedPackage.label}</span>
                  <span className="font-medium">{selectedPackage.price}€</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Prorata (jours restants)</span>
                  <span className="font-medium">-{(selectedPackage.price - prorataAmount).toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total à payer aujourd'hui</span>
                  <span className={role === 'notaire' ? 'text-orange-600' : 'text-blue-600'}>
                    {prorataAmount}€
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-amber-600 mt-0.5">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900 text-sm">Achat ponctuel - Cycle en cours uniquement</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Ces crédits expireront le {expirationDate?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                      Pour continuer à bénéficier de signatures supplémentaires au prochain cycle, vous devrez effectuer un nouvel achat.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setSelectedPackage(null);
              }}
              className="flex-1"
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={!selectedPackage || loading}
              className={`flex-1 text-white ${
                role === 'notaire'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Traitement...' : `Confirmer l'achat`}
            </Button>
          </div>

          {/* Note */}
          <p className="text-xs text-gray-500 text-center">
            Paiement sécurisé • Achat unique pour le cycle actuel • Les signatures seront ajoutées immédiatement
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
