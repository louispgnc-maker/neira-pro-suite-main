import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ArrowLeft, CreditCard, Lock, Info, Calendar } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { createStripeCheckoutSession } from "@/lib/stripeCheckout";
import { STRIPE_PRICE_IDS } from "@/lib/stripeConfig";
import { useCleanStripeHistory } from "@/hooks/useCleanStripeHistory";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CheckoutEssentiel() {
  useCleanStripeHistory(); // Nettoyer l'historique si on vient de Stripe
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  
  const role: 'avocat' | 'notaire' = location.pathname.includes('/notaires') ? 'notaire' : 'avocat';

  const monthlyPrice = 45;
  const yearlyPrice = Math.round(monthlyPrice * 12 * 0.9); // 10% de réduction
  const price = billingPeriod === 'monthly' ? monthlyPrice : yearlyPrice;
  const total = Math.round(price * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Vérifier que l'utilisateur est connecté
      if (!user) {
        toast.error("Erreur", {
          description: "Vous devez être connecté pour souscrire"
        });
        setLoading(false);
        return;
      }

      // Récupérer le cabinet de l'utilisateur
      const { data: memberData, error: memberError } = await supabase
        .from('cabinet_members')
        .select('cabinet_id')
        .eq('user_id', user.id)
        .single();

      if (memberError || !memberData?.cabinet_id) {
        toast.error("Erreur", {
          description: "Cabinet non trouvé. Veuillez contacter le support."
        });
        setLoading(false);
        return;
      }

      // Obtenir le price ID Stripe pour le plan Essentiel selon la période
      const priceId = STRIPE_PRICE_IDS.essentiel[billingPeriod];
      if (!priceId) {
        toast.error("Erreur de configuration", {
          description: "Plan non trouvé"
        });
        setLoading(false);
        return;
      }

      // Créer la session de paiement Stripe
      const checkoutUrl = await createStripeCheckoutSession({
        priceId,
        quantity: 1, // Plan Essentiel = 1 utilisateur
        cabinetId: memberData.cabinet_id,
        successUrl: `${window.location.origin}/${role === 'notaire' ? 'notaires' : 'avocats'}/subscription?payment=success`,
        cancelUrl: `${window.location.origin}/checkout/essentiel`
      });

      // Rediriger vers Stripe
      // Utiliser replace() pour ne pas ajouter Stripe dans l'historique
      window.location.replace(checkoutUrl);
      
    } catch (error) {
      console.error('Erreur lors de la création de la session Stripe:', error);
      toast.error("Erreur", {
        description: error instanceof Error ? error.message : "Veuillez réessayer"
      });
      setLoading(false);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-blue-100" style={{ 
      backgroundImage: 'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Mix%20deux%20couleurs.png)', 
      backgroundSize: 'cover', 
      backgroundPosition: 'center', 
      backgroundAttachment: 'fixed' 
    }}>
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-24">
        <button 
          onClick={() => navigate(-1)} 
          className={`flex items-center gap-2 mb-6 ${
            role === 'notaire' 
              ? 'text-orange-600 hover:text-orange-700' 
              : 'text-blue-600 hover:text-blue-700'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <div className="max-w-7xl mx-auto">
          {/* En-tête de l'offre */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Nom de la formule */}
            <Card className="bg-white/90 backdrop-blur">
              <CardContent className="p-6">
                <h1 className={`text-2xl font-bold mb-2 ${
                  role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                }`}>Neira Essentiel</h1>
                <p className="text-sm text-gray-600">Idéal pour avocats et notaires indépendants</p>
              </CardContent>
            </Card>

            {/* Limites et specs */}
            <Card className="lg:col-span-2 bg-white/90 backdrop-blur">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Caractéristiques</h3>
                <p className="text-sm text-gray-700">Idéal pour avocats et notaires indépendants • 20 Go • 100 dossiers • 30 clients • 15 signatures/mois</p>
              </CardContent>
            </Card>
          </div>

          {/* Layout 2 colonnes : Récap à gauche, Paiement à droite */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Colonne gauche : Récapitulatif */}
            <div className="space-y-6">
              <Card className="bg-white/90 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-xl">Récapitulatif</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Ce qui est inclus */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Ce qui est inclus</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                        }`} />
                        <div>
                          <h5 className="font-medium text-gray-900 text-sm">Gestion documentaire</h5>
                          <p className="text-xs text-gray-600 mt-0.5">Organisez tous vos documents</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                        }`} />
                        <div>
                          <h5 className="font-medium text-gray-900 text-sm">Partage sécurisé client</h5>
                          <p className="text-xs text-gray-600 mt-0.5">Échangez en toute sécurité</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Non inclus */}
                  <div className="pt-6 border-t">
                    <h4 className="font-semibold text-gray-900 mb-3">Non inclus :</h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-red-500">•</span>
                        <span>Espace collaboratif</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-red-500">•</span>
                        <span>Données analysées</span>
                      </div>
                    </div>
                  </div>

                  {/* Prix */}
                  <div className="pt-6 border-t">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-gray-700">Prix {billingPeriod === 'monthly' ? 'mensuel' : 'annuel'}</span>
                      <span className={`text-3xl font-bold ${
                        role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                      }`}>{price}€</span>
                    </div>
                    {billingPeriod === 'yearly' && (
                      <p className="text-xs text-green-600 font-medium">Économisez 10% avec le paiement annuel</p>
                    )}
                  </div>

                  {/* Garanties */}
                  <div className="pt-6 border-t bg-green-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                    <div className="flex items-start gap-3">
                      <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-semibold text-gray-900 text-sm mb-2">Garanties</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li>• Cryptage SSL de bout en bout</li>
                          <li>• Aucune donnée bancaire stockée</li>
                          <li>• 30 jours satisfait ou remboursé</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Colonne droite : Paiement */}
            <div>
              <Card className="bg-white/90 backdrop-blur sticky top-6">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Espace de paiement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ⚠️ ENCADRÉ ENGAGEMENT - EN HAUT */}
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-bold text-blue-900 text-base mb-2">⚠️ Engagement de 12 mois</h4>
                          <p className="text-sm text-blue-800 mb-2">
                            Tous les abonnements Neira impliquent un <strong>engagement ferme de 12 mois</strong>. 
                            Le paiement mensuel est une facilité de paiement, mais l'engagement reste d'un an.
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs text-blue-900">
                            <span className="bg-blue-200 px-2 py-1 rounded">🔒 Downgrade impossible pendant 12 mois</span>
                            <span className="bg-green-200 px-2 py-1 rounded">✅ Upgrade autorisé à tout moment</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Période de facturation */}
                    <div className="space-y-3">
                      <Label className="text-gray-900">Période de facturation</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setBillingPeriod('monthly')}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            billingPeriod === 'monthly'
                              ? role === 'notaire' 
                                ? 'border-orange-600 bg-orange-50' 
                                : 'border-blue-600 bg-blue-50'
                              : role === 'notaire'
                                ? 'border-gray-200 bg-white hover:border-orange-300'
                                : 'border-gray-200 bg-white hover:border-blue-300'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">Mensuel</div>
                              <div className={`text-xl font-bold mt-1 ${
                                role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                              }`}>{monthlyPrice}€</div>
                              <div className="text-xs text-gray-600">par mois</div>
                            </div>
                            {billingPeriod === 'monthly' && (
                              <CheckCircle2 className={`w-5 h-5 ${
                                role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                              }`} />
                            )}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingPeriod('yearly')}
                          className={`p-4 rounded-lg border-2 text-left transition-all relative ${
                            billingPeriod === 'yearly'
                              ? role === 'notaire'
                                ? 'border-orange-600 bg-orange-50'
                                : 'border-blue-600 bg-blue-50'
                              : role === 'notaire'
                                ? 'border-gray-200 bg-white hover:border-orange-300'
                                : 'border-gray-200 bg-white hover:border-blue-300'
                          }`}
                        >
                          <div className="absolute -top-2 right-4 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                            -10%
                          </div>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">Annuel</div>
                              <div className={`text-xl font-bold mt-1 ${
                                role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                              }`}>{yearlyPrice}€</div>
                              <div className="text-xs text-gray-600">par an</div>
                            </div>
                            {billingPeriod === 'yearly' && (
                              <CheckCircle2 className={`w-5 h-5 ${
                                role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                              }`} />
                            )}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Informations de paiement */}
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-blue-900 text-sm mb-1">Paiement 100% sécurisé</h4>
                            <p className="text-xs text-blue-700">
                              Vous serez redirigé vers notre page de paiement sécurisée Stripe pour finaliser votre abonnement.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Récapitulatif */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between font-bold text-base text-gray-900">
                        <span>Total</span>
                        <span>{total}€</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Abonnement {billingPeriod === 'monthly' ? 'mensuel' : 'annuel'}
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

                    <p className="text-xs text-gray-600 text-center">
                      En confirmant, vous acceptez nos CGV. Résiliation possible à tout moment.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
