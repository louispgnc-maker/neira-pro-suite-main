import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';

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
  role
}: BuySignaturesDialogProps) {
  const [selectedPackage, setSelectedPackage] = useState<SignaturePackage | null>(null);
  const [loading, setLoading] = useState(false);

  const packages = packagesConfig[subscriptionPlan] || [];

  // Calcul du prorata pour le mois en cours (basé sur les jours restants du mois)
  const calculateProrata = (monthlyAddon: number) => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - now.getDate() + 1;
    return Math.round((monthlyAddon * daysRemaining / daysInMonth) * 100) / 100;
  };

  const newMonthlyPrice = selectedPackage 
    ? currentMonthlyPrice + selectedPackage.price 
    : currentMonthlyPrice;
  
  const prorataAmount = selectedPackage 
    ? calculateProrata(selectedPackage.price)
    : 0;

  const handlePurchase = async () => {
    if (!selectedPackage) {
      toast.error('Veuillez sélectionner un forfait');
      return;
    }

    setLoading(true);
    
    try {
      // TODO: Implémenter l'API d'achat
      // 1. Créer une transaction Stripe pour le prorata
      // 2. Mettre à jour l'abonnement avec le nouveau forfait
      // 3. Enregistrer dans la base de données
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulation
      
      toast.success('Forfait signatures ajouté !', {
        description: `Votre nouvel abonnement mensuel est de ${newMonthlyPrice}€/mois`
      });
      
      onOpenChange(false);
      setSelectedPackage(null);
      
      // Recharger la page pour mettre à jour les limites
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Erreur lors de l\'achat:', error);
      toast.error('Erreur lors de l\'achat', {
        description: 'Veuillez réessayer ou contacter le support'
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
            Acheter des signatures supplémentaires
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
                      <p className="text-xs text-gray-600">Par mois, renouvelé automatiquement</p>
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
                  <span className="text-gray-600">Abonnement actuel</span>
                  <span className="font-medium">{currentMonthlyPrice}€/mois</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Forfait signatures</span>
                  <span className="font-medium">+{selectedPackage.price}€/mois</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Nouveau prix mensuel</span>
                  <span className={role === 'notaire' ? 'text-orange-600' : 'text-blue-600'}>
                    {newMonthlyPrice}€/mois
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-blue-900 text-sm">À payer aujourd'hui</p>
                    <p className="text-xs text-blue-700">Prorata pour le mois en cours</p>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {prorataAmount}€
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  À partir du mois prochain : {newMonthlyPrice}€/mois
                </p>
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
            Paiement sécurisé • Résiliation possible à tout moment • Les signatures seront ajoutées immédiatement
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
