import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ArrowLeft, CreditCard, Lock, Zap, Crown, Users, Building2 } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { toast } from "sonner";
import { createStripeCheckoutSession } from "@/lib/stripeCheckout";
import { STRIPE_PRICE_IDS } from "@/lib/stripeConfig";

const planConfigs = {
  'essentiel': {
    name: 'Essentiel',
    monthlyPrice: 45,
    description: 'Idéal pour avocats et notaires indépendants',
    icon: Zap,
    color: 'blue',
    limits: 'Idéal pour avocats et notaires indépendants • 20 Go • 100 dossiers • 30 clients • 15 signatures/mois',
    features: [
      { title: 'Idéal pour avocats et notaires indépendants', description: 'Pour un professionnel indépendant' },
      { title: '20 Go de stockage', description: 'Espace pour vos documents' },
      { title: '100 dossiers actifs', description: 'Gérez vos dossiers en cours' },
      { title: '30 clients actifs', description: 'Jusqu\'à 30 clients simultanés' },
      { title: '15 signatures / mois', description: 'Signatures électroniques' },
      { title: 'Gestion documentaire', description: 'Organisez tous vos documents' },
      { title: 'Partage sécurisé client', description: 'Échangez en toute sécurité' },
    ],
    notIncluded: [
      'Espace collaboratif',
      'Données analysées'
    ]
  },
  'professionnel': {
    name: 'Professionnel',
    monthlyPrice: 69,
    description: 'Idéal pour cabinets de 2 à 10 utilisateurs',
    icon: Crown,
    color: 'purple',
    limits: '100 Go • 600 dossiers • 200 clients • 80 signatures/mois',
    features: [
      { title: '100 Go de stockage', description: 'Espace confortable' },
      { title: '600 dossiers actifs', description: 'Gérez plus de dossiers' },
      { title: '200 clients actifs', description: 'Portefeuille client étendu' },
      { title: '80 signatures / mois', description: 'Plus de signatures' },
      { title: 'Espace collaboratif complet', description: 'Travaillez en équipe' },
      { title: 'Gestion documentaire avancée', description: 'Fonctionnalités avancées' },
      { title: 'Tableaux de bord', description: 'Suivez votre activité' },
    ],
    notIncluded: []
  },
  'cabinet-plus': {
    name: 'Cabinet+',
    monthlyPrice: 99,
    description: 'Solution premium pour cabinets structurés',
    icon: Building2,
    color: 'orange',
    limits: 'Stockage illimité • Dossiers illimités • Clients illimités • Signatures illimitées',
    features: [
      { title: 'Pour les cabinets recherchant une solution sans limite, quelle que soit leur taille', description: 'Évolutivité maximale' },
      { title: 'Stockage illimité', description: 'Sans limite de capacité' },
      { title: 'Dossiers illimités', description: 'Aucune restriction' },
      { title: 'Clients illimités', description: 'Gérez tous vos clients' },
      { title: 'Signatures illimitées / utilisateur', description: 'Sans quota' },
      { title: 'Collaboration sans limite', description: 'Toute l\'équipe connectée' },
      { title: 'Tableaux de bord avancés', description: 'Analytics poussés' },
      { title: 'Onboarding & formation de l\'équipe', description: 'Accompagnement premium' },
      { title: 'Accès anticipé aux nouveautés', description: 'Soyez les premiers' },
    ],
    notIncluded: []
  }
};

export default function CheckoutPublic() {
  const navigate = useNavigate();
  const { planId } = useParams<{ planId: string }>();
  const [loading, setLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const planConfig = planConfigs[planId as keyof typeof planConfigs];
  
  if (!planConfig) {
    navigate('/solution');
    return null;
  }

  // Initialisation du nombre d'utilisateurs selon le plan
  const initialUsers = planId === 'essentiel' ? 1 : planId === 'professionnel' ? 2 : 1;
  const [numberOfUsers, setNumberOfUsers] = useState<number>(initialUsers);

  const Icon = planConfig.icon;
  const monthlyPrice = planConfig.monthlyPrice * numberOfUsers;
  const yearlyPrice = Math.round(monthlyPrice * 12 * 0.9); // 10% de réduction
  const price = billingPeriod === 'monthly' ? monthlyPrice : yearlyPrice;
  const total = Math.round(price * 100) / 100;

  // Détermine si on affiche le sélecteur de membres
  const showUserSelector = planId === 'professionnel' || planId === 'cabinet-plus';
  const maxUsers = planId === 'professionnel' ? 10 : 50;
  const minUsers = planId === 'professionnel' ? 2 : 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get price ID for the selected plan
      const priceId = STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS];
      if (!priceId) {
        toast.error("Plan invalide");
        setLoading(false);
        return;
      }

      // Store plan info for after payment
      sessionStorage.setItem('pendingSubscription', JSON.stringify({
        plan: planId,
        quantity: numberOfUsers,
        billingPeriod
      }));

      // Create Stripe checkout session without cabinetId (for new users)
      const checkoutUrl = await createStripeCheckoutSession({
        priceId,
        quantity: numberOfUsers,
        successUrl: `${window.location.origin}/signup?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/checkout/${planId}`
      });

      // Redirect to Stripe
      window.location.href = checkoutUrl;
      
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error("Erreur lors de la création de la session de paiement", {
        description: error.message || "Une erreur est survenue."
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-accent/10 to-background">
      <PublicHeader />
      
      <div className="container mx-auto p-8 max-w-7xl">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/solution')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux offres
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Plan Summary */}
          <Card className="bg-white/90 backdrop-blur">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-3 rounded-lg bg-gradient-to-br from-${planConfig.color}-500 to-${planConfig.color}-600`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">NEIRA {planConfig.name.toUpperCase()}</CardTitle>
                  <CardDescription>{planConfig.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-3">Fonctionnalités incluses</h3>
                <div className="space-y-2">
                  {planConfig.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{feature.title}</p>
                        <p className="text-xs text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {planConfig.notIncluded && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-sm mb-3">Ne comprend pas :</h4>
                  <div className="space-y-2">
                    {planConfig.notIncluded.map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        </div>
                        <span className="text-sm text-gray-500">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column - Configuration Form */}
          <div className="space-y-6">
            <Card className="bg-white/90 backdrop-blur">
              <CardHeader>
                <CardTitle>Configuration de votre abonnement</CardTitle>
                <CardDescription>
                  Configurez les paramètres de votre abonnement avant de créer votre compte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Billing Period Selector */}
                  <div className="space-y-3">
                    <Label>Période de facturation</Label>
                    <RadioGroup value={billingPeriod} onValueChange={(value: any) => setBillingPeriod(value)}>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <RadioGroupItem value="monthly" id="monthly" />
                        <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                          <div className="font-medium">Mensuel</div>
                          <div className="text-sm text-gray-600">{monthlyPrice}€ / mois</div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <RadioGroupItem value="yearly" id="yearly" />
                        <Label htmlFor="yearly" className="flex-1 cursor-pointer">
                          <div className="font-medium flex items-center gap-2">
                            Annuel
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">-10%</span>
                          </div>
                          <div className="text-sm text-gray-600">{yearlyPrice}€ / an</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Number of Users Selector */}
                  {showUserSelector && (
                    <div className="space-y-3">
                      <Label htmlFor="users" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Nombre de membres
                      </Label>
                      <Select
                        value={numberOfUsers.toString()}
                        onValueChange={(value) => setNumberOfUsers(parseInt(value))}
                      >
                        <SelectTrigger id="users">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: maxUsers - minUsers + 1 }, (_, i) => minUsers + i).map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} membre{num > 1 ? 's' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-600">
                        {planConfig.monthlyPrice}€/mois par membre
                      </p>
                    </div>
                  )}

                  {/* Price Summary */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg space-y-2">
                    <div className="pt-2">
                      <div className="flex justify-between">
                        <span className="font-bold text-lg">Total</span>
                        <span className="font-bold text-2xl text-primary">{total}€</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        par {billingPeriod === 'monthly' ? 'mois' : 'an'}
                      </p>
                    </div>
                  </div>

                  {/* Security Info */}
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                    <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 mb-1">Paiement 100% sécurisé</p>
                      <p className="text-blue-700 text-xs">
                        Après avoir créé votre compte, vous serez redirigé vers notre processus de paiement sécurisé Stripe.
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    className="w-full text-lg py-6"
                    disabled={loading}
                  >
                    {loading ? (
                      "Redirection vers le paiement..."
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5 mr-2" />
                        Procéder au paiement - {total}€{billingPeriod === 'yearly' ? '/an' : '/mois'}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-gray-500">
                    Après le paiement, vous pourrez créer votre compte et accéder à votre abonnement.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
