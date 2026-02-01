import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

type SignaturePackage = {
  quantity: number;
  price: number;
  label: string;
  isEmergency?: boolean;
};

type BuySignaturesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionPlan: 'essentiel' | 'professionnel' | 'cabinet-plus';
  currentMonthlyPrice: number;
  role: 'avocat' | 'notaire';
  targetUserId?: string;
  targetUserName?: string;
};

const packagesConfig = {
  essentiel: [
    { quantity: 10, price: 20, label: 'Mini - 10 Signatures' },
    { quantity: 20, price: 30, label: 'Starter - 20 Signatures' },
    { quantity: 50, price: 45, label: 'Pro ⭐ - 50 Signatures' },
    { quantity: 100, price: 70, label: 'Business - 100 Signatures' },
    { quantity: 250, price: 140, label: 'Enterprise - 250 Signatures' }
  ],
  professionnel: [
    { quantity: 10, price: 20, label: 'Mini - 10 Signatures' },
    { quantity: 20, price: 30, label: 'Starter - 20 Signatures' },
    { quantity: 50, price: 45, label: 'Pro ⭐ - 50 Signatures' },
    { quantity: 100, price: 70, label: 'Business - 100 Signatures' },
    { quantity: 250, price: 140, label: 'Enterprise - 250 Signatures' }
  ],
  'cabinet-plus': [
    { quantity: 10, price: 20, label: 'Mini - 10 Signatures' },
    { quantity: 20, price: 30, label: 'Starter - 20 Signatures' },
    { quantity: 50, price: 45, label: 'Pro ⭐ - 50 Signatures' },
    { quantity: 100, price: 70, label: 'Business - 100 Signatures' },
    { quantity: 250, price: 140, label: 'Enterprise - 250 Signatures' }
  ]
};

const emergencyPackage: SignaturePackage = {
  quantity: 1,
  price: 3,
  label: '🆘 Urgence - 1 Signature',
  isEmergency: true
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
  const [daysUntilExpiration, setDaysUntilExpiration] = useState<number>(0);

  const packages = packagesConfig[subscriptionPlan] || [];

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
          .select('current_period_end')
          .eq('id', cabinet.id)
          .single();
        
        // Utiliser la date de fin de période actuelle (prochaine facturation)
        let expires = new Date();
        if (cabinetDetails?.current_period_end) {
          expires = new Date(cabinetDetails.current_period_end);
        } else {
          // Fallback : 1 mois à partir d'aujourd'hui si pas de période définie
          expires.setMonth(expires.getMonth() + 1);
        }
        
        setExpirationDate(expires);
        
        const now = new Date();
        const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        setDaysUntilExpiration(daysLeft);
      } catch (error) {
        console.error('Error calculating expiration:', error);
      }
    };
    
    calculateExpiration();
  }, [open, role]);

  const showEmergencyPack = daysUntilExpiration > 0 && daysUntilExpiration <= 10;

  const allPackages = showEmergencyPack 
    ? [emergencyPackage, ...packages]
    : packages;

  const handlePurchase = async () => {
    // Validations immédiates
    if (!selectedPackage) {
      toast.error('Veuillez sélectionner un forfait');
      return;
    }

    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    // PAS DE PRORATA pour les crédits de signatures : ce sont des achats one-time
    // L'utilisateur achète X signatures au prix affiché, point final
    const prorataAmount = selectedPackage.price;

    setLoading(true);
    toast.info('Préparation de votre commande...');
    
    try {
      // Récupérer les données du cabinet et les détails en parallèle pour gagner du temps
      const [cabinetsResult] = await Promise.all([
        supabase.rpc('get_user_cabinets')
      ]);
      
      if (!cabinetsResult.data || !Array.isArray(cabinetsResult.data)) {
        throw new Error('Cabinet introuvable');
      }

      const cabinet = cabinetsResult.data.find((c: any) => String(c.role) === role);
      
      if (!cabinet) {
        throw new Error(`Aucun cabinet ${role} trouvé`);
      }

      // Récupérer la date de fin de période actuelle (prochaine facturation)
      const { data: cabinetDetails } = await supabase
        .from('cabinets')
        .select('current_period_end')
        .eq('id', cabinet.id)
        .single();

      // Utiliser la date de fin de période actuelle pour l'expiration
      let expiresAt = new Date();
      if (cabinetDetails?.current_period_end) {
        expiresAt = new Date(cabinetDetails.current_period_end);
      } else {
        // Fallback : 1 mois à partir d'aujourd'hui si pas de période définie
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      // Créer la session Stripe
      toast.info('Connexion à Stripe...');
      
      const requestBody = {
        quantity: selectedPackage.quantity,
        price: selectedPackage.price,
        prorataAmount,
        cabinetId: cabinet.id,
        targetUserId: targetUserId || user.id,
        expiresAt: expiresAt.toISOString(),
        role,
        userId: user.id
      };
      
      console.log('📦 Envoi à create-signature-checkout:', requestBody);
      
      // Récupérer le token d'authentification pour l'envoyer à l'edge function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔑 Session récupérée:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        tokenLength: session?.access_token?.length,
        userId: session?.user?.id,
        sessionError: sessionError
      });
      
      if (!session?.access_token) {
        throw new Error('Session expirée, veuillez vous reconnecter');
      }
      
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        'create-signature-checkout',
        { 
          body: requestBody
        }
      );

      console.log('📡 Réponse de create-signature-checkout:', {
        hasData: !!checkoutData,
        hasUrl: !!checkoutData?.url,
        error: checkoutError
      });

      if (checkoutError || !checkoutData?.url) {
        throw new Error(checkoutError?.message || 'Erreur lors de la création de la session de paiement');
      }

      // Redirection vers Stripe (le webhook gérera l'application des crédits)
      toast.success('Redirection vers le paiement...');
      window.location.href = checkoutData.url;
    } catch (error: any) {
      console.error('Erreur lors de l\'achat:', error);
      toast.error('Erreur lors de l\'achat', {
        description: error.message || 'Veuillez réessayer ou contacter le support'
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Acheter des signatures{targetUserName ? ` pour ${targetUserName}` : ''}
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un forfait pour augmenter votre quota de signatures
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3">
            {allPackages.map((pkg) => (
              <Card
                key={`${pkg.quantity}-${pkg.price}`}
                className={`p-4 cursor-pointer transition-all border-2 ${
                  pkg.isEmergency
                    ? selectedPackage?.quantity === pkg.quantity && selectedPackage?.price === pkg.price
                      ? 'border-red-600 bg-red-50'
                      : 'border-red-300 hover:border-red-400 bg-red-50/50'
                    : selectedPackage?.quantity === pkg.quantity && selectedPackage?.price === pkg.price
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
                      selectedPackage?.quantity === pkg.quantity && selectedPackage?.price === pkg.price
                        ? pkg.isEmergency
                          ? 'border-red-600 bg-red-600'
                          : role === 'notaire'
                            ? 'border-orange-600 bg-orange-600'
                            : 'border-blue-600 bg-blue-600'
                        : 'border-gray-300'
                    }`}>
                      {selectedPackage?.quantity === pkg.quantity && selectedPackage?.price === pkg.price && (
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold ${pkg.isEmergency ? 'text-red-900' : 'text-gray-900'}`}>
                          {pkg.label}
                        </p>
                        {pkg.isEmergency && (
                          <Badge variant="destructive" className="text-xs">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      {expirationDate && (
                        <p className="text-xs text-gray-600">
                          Expire le {expirationDate.toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${
                    pkg.isEmergency
                      ? 'text-red-600'
                      : selectedPackage?.quantity === pkg.quantity && selectedPackage?.price === pkg.price
                        ? role === 'notaire'
                          ? 'text-orange-600'
                          : 'text-blue-600'
                        : 'text-gray-900'
                  }`}>
                    {pkg.price}€
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {selectedPackage && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-semibold text-gray-900">Récapitulatif</h4>
              
              <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Prix du forfait</span>
                  <span className="font-medium">{selectedPackage.price}€</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>À payer aujourd'hui</span>
                  <span className={
                    selectedPackage.isEmergency
                      ? 'text-red-600'
                      : role === 'notaire' 
                        ? 'text-orange-600' 
                        : 'text-blue-600'
                  }>
                    {selectedPackage.price}€
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setSelectedPackage(null);
              }}
              className={`flex-1 ${
                selectedPackage?.isEmergency
                  ? 'bg-red-100 border-red-600 text-red-700 hover:bg-red-200'
                  : role === 'notaire'
                    ? 'bg-orange-100 border-orange-600 text-orange-700 hover:bg-orange-200'
                    : 'bg-blue-100 border-blue-600 text-blue-700 hover:bg-blue-200'
              }`}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={!selectedPackage || loading}
              className={`flex-1 text-white ${
                selectedPackage?.isEmergency
                  ? 'bg-red-600 hover:bg-red-700'
                  : role === 'notaire'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Traitement...' : `Confirmer l'achat`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
