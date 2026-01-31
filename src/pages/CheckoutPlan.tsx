import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ArrowLeft, CreditCard, Lock, Zap, Crown, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
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
    limits: '100 Go • 600 dossiers • 200 clients • 40 signatures/mois',
    features: [
      { title: '100 Go de stockage', description: 'Espace confortable' },
      { title: '600 dossiers actifs', description: 'Gérez plus de dossiers' },
      { title: '200 clients actifs', description: 'Portefeuille client étendu' },
      { title: '40 signatures / mois', description: 'Plus de signatures' },
      { title: 'Espace collaboratif complet', description: 'Travaillez en équipe' },
      { title: 'Gestion documentaire avancée', description: 'Fonctionnalités avancées' },
      { title: 'Tableaux de bord', description: 'Suivez vos performances' },
    ],
    notIncluded: []
  },
  'cabinet-plus': {
    name: 'Cabinet+',
    monthlyPrice: 99,
    description: 'Idéal pour cabinets de 10 à 50+ utilisateurs',
    icon: Users,
    color: 'orange',
    limits: 'Tout illimité — aucune restriction',
    features: [
      { title: 'Pour les cabinets recherchant une solution sans limite, quelle que soit leur taille', description: 'Aucune limite d\'équipe' },
      { title: 'Stockage illimité', description: 'Espace sans limite' },
      { title: 'Dossiers illimités', description: 'Gérez autant de dossiers que nécessaire' },
      { title: 'Clients illimités', description: 'Portefeuille client sans limite' },
      { title: '100 signatures / mois / utilisateur', description: 'Généreux quota' },
      { title: 'Collaboration sans limite', description: 'Toute votre équipe connectée' },
      { title: 'Tableaux de bord avancés', description: 'Analytics complets' },
      { title: 'Onboarding & formation de l\'équipe', description: 'Accompagnement dédié' },
      { title: 'Accès anticipé aux nouveautés', description: 'En avant-première' },
    ],
    notIncluded: []
  }
};

export default function CheckoutPlan() {
  const navigate = useNavigate();
  const location = useLocation();
  const { planId } = useParams<{ planId: string }>();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  
  const role: 'avocat' | 'notaire' = location.pathname.includes('/notaires') ? 'notaire' : 'avocat';
  const prefix = role === 'notaire' ? '/notaires' : '/avocats';

  const planConfig = planConfigs[planId as keyof typeof planConfigs];
  
  if (!planConfig) {
    navigate(`${prefix}/subscription`);
    return null;
  }

  // Initialisation du nombre d'utilisateurs selon la formule
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
    
    if (!user) {
      toast.error("Utilisateur non connecté");
      return;
    }

    setLoading(true);
    try {
      // Vérifier si l'utilisateur a déjà un cabinet
      const { data: existingCabinets } = await supabase
        .from('cabinets')
        .select('id')
        .eq('owner_id', user?.id)
        .eq('role', role)
        .single();

      if (!existingCabinets) {
        toast.error("Cabinet non trouvé", {
          description: "Vous devez créer un cabinet avant de souscrire à un abonnement."
        });
        setLoading(false);
        return;
      }

      const cabinetId = existingCabinets.id;

      // Get price ID for the selected plan and billing period
      const priceId = STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS][billingPeriod];
      if (!priceId) {
        toast.error("Plan invalide");
        setLoading(false);
        return;
      }

      // Create Stripe checkout session
      const checkoutUrl = await createStripeCheckoutSession({
        priceId,
        cabinetId,
        quantity: numberOfUsers,
        customerEmail: user.email || undefined,
        successUrl: `${window.location.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}${prefix}/subscription?canceled=true`
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
    <AppLayout>
      <div className="container mx-auto p-8 max-w-7xl">
        <div className="mb-6">
          <Button
            onClick={() => navigate(-1)}
            className={`text-white ${
              role === 'notaire'
                ? 'bg-orange-500 hover:bg-orange-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>

        {/* En-tête de l'offre */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Nom de la formule */}
          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Icon className={`h-8 w-8 text-${planConfig.color}-600`} />
                <h1 className="text-2xl font-bold text-black">Neira {planConfig.name}</h1>
              </div>
              <p className="text-sm text-black/70">{planConfig.description}</p>
            </CardContent>
          </Card>

          {/* Limites et specs */}
          <Card className="lg:col-span-2 bg-card">
            <CardContent className="p-6">
              <h3 className="font-semibold text-black mb-3">Caractéristiques</h3>
              <p className="text-sm text-black">{planConfig.limits}</p>
            </CardContent>
          </Card>
        </div>

        {/* Layout 2 colonnes : Fonctionnalités à gauche, Paiement à droite */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Colonne gauche : Atouts */}
          <div className="space-y-6">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-xl text-black">Ce qui est inclus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {planConfig.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className={`w-5 h-5 text-${planConfig.color}-600 flex-shrink-0 mt-0.5`} />
                      <div>
                        <h4 className="font-medium text-black text-sm">{feature.title}</h4>
                        <p className="text-xs text-black/60 mt-0.5">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {planConfig.notIncluded && planConfig.notIncluded.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-semibold text-black mb-3 text-sm">Non inclus :</h4>
                    <div className="space-y-2">
                      {planConfig.notIncluded.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-black/60">
                          <span className="text-red-500">•</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Garanties et sécurité */}
            <Card className="bg-card border border-green-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Lock className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-black mb-2 text-sm">Paiement 100% sécurisé</h4>
                    <ul className="text-xs text-black/70 space-y-1">
                      <li>• Cryptage SSL de bout en bout</li>
                      <li>• Aucune donnée bancaire stockée</li>
                      <li>• Résiliation possible à tout moment</li>
                      <li>• 30 jours satisfait ou remboursé</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite : Formulaire de paiement */}
          <div className="space-y-6">
            <Card className="bg-card border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-xl text-black flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Espace de paiement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Sélecteur de nombre d'utilisateurs */}
                  {showUserSelector && (
                    <div className="space-y-2">
                      <Label className="text-black">Nombre de membres</Label>
                      <Select value={numberOfUsers.toString()} onValueChange={(v) => setNumberOfUsers(parseInt(v))}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Sélectionnez le nombre de membres" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: maxUsers - minUsers + 1 }, (_, i) => i + minUsers).map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} {num === 1 ? 'membre' : 'membres'} - {planConfig.monthlyPrice * num}€/mois
                            </SelectItem>
                          ))}
                          {planId === 'cabinet-plus' && (
                            <SelectItem value="contact" disabled>
                              Plus de 50 ? Contactez-nous
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-black/60">
                        {planId === 'cabinet-plus' && numberOfUsers >= 50 ? (
                          <>
                            Plus de 50 membres ?{' '}
                            <a href="/contact" className={`underline ${
                              role === 'notaire'
                                ? 'text-orange-600 hover:text-orange-700'
                                : 'text-blue-600 hover:text-blue-700'
                            }`}>
                              Contactez-nous
                            </a>
                          </>
                        ) : (
                          `Prix unitaire : ${planConfig.monthlyPrice}€/mois par membre`
                        )}
                      </p>
                    </div>
                  )}

                  {/* Période de facturation */}
                  <div className="space-y-3">
                    <Label className="text-black">Période de facturation</Label>
                    <RadioGroup value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as 'monthly' | 'yearly')}>
                      <div className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        role === 'notaire'
                          ? 'hover:bg-orange-500/20'
                          : 'hover:bg-blue-500/20'
                      }`}>
                        <RadioGroupItem value="monthly" id="monthly" />
                        <Label htmlFor="monthly" className="flex-1 cursor-pointer text-black text-sm">
                          Mensuel - {monthlyPrice}€/mois
                        </Label>
                      </div>
                      <div className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        role === 'notaire'
                          ? 'hover:bg-orange-500/20'
                          : 'hover:bg-blue-500/20'
                      }`}>
                        <RadioGroupItem value="yearly" id="yearly" />
                        <Label htmlFor="yearly" className="flex-1 cursor-pointer text-black text-sm">
                          Annuel - {yearlyPrice}€/an
                          <span className="ml-2 text-green-600 font-semibold text-xs">(10% d'économie)</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Message paiement sécurisé */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-900 text-sm mb-1">Paiement sécurisé par Stripe</h4>
                        <p className="text-xs text-blue-700">
                          Vous serez redirigé vers notre page de paiement sécurisée Stripe pour finaliser votre abonnement.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Récapitulatif */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm text-black">
                      <span>Abonnement {billingPeriod === 'monthly' ? 'mensuel' : 'annuel'}</span>
                      <span>{price}€</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t pt-2 text-black">
                      <span>Total</span>
                      <span>{total}€</span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className={`w-full text-white ${
                      role === 'notaire'
                        ? 'bg-orange-500 hover:bg-orange-600'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                    disabled={loading}
                  >
                    {loading ? "Redirection vers Stripe..." : `Procéder au paiement - ${total}€`}
                  </Button>

                  <p className="text-xs text-black/60 text-center">
                    En confirmant, vous acceptez nos CGV. Résiliation possible à tout moment.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
