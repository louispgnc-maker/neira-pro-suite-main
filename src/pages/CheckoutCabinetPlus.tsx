import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ArrowLeft, CreditCard, Lock, Info } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { createStripeCheckoutSession } from "@/lib/stripeCheckout";
import { STRIPE_PRICE_IDS } from "@/lib/stripeConfig";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CheckoutCabinetPlus() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [userCount, setUserCount] = useState(1);
  const [minMembers, setMinMembers] = useState(1);
  const [customUserCount, setCustomUserCount] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  console.log('CheckoutCabinetPlus component mounted, user:', user);

  // Charger le nombre de membres actifs du cabinet
  useEffect(() => {
    console.log('CheckoutCabinetPlus useEffect triggered, user:', user);
    
    const loadActiveMembersCount = async () => {
      if (!user) {
        console.log('CheckoutCabinetPlus: No user available yet');
        // Essayer de charger l'utilisateur directement depuis Supabase
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        console.log('CheckoutCabinetPlus: Loaded user from Supabase:', currentUser);
        
        if (!currentUser) {
          console.log('CheckoutCabinetPlus: Still no user, setting defaults');
          return;
        }
        
        // Utiliser currentUser au lieu de user
        await loadMembersForUser(currentUser.id);
        return;
      }
      
      await loadMembersForUser(user.id);
    };
    
    const loadMembersForUser = async (userId: string) => {
      console.log('CheckoutCabinetPlus: Loading members count for user', userId);
      
      try {
        // Récupérer le cabinet de l'utilisateur
        const { data: memberData, error: memberError } = await supabase
          .from('cabinet_members')
          .select('cabinet_id')
          .eq('user_id', userId)
          .single();
        
        console.log('CheckoutCabinetPlus: Member data:', memberData, 'Error:', memberError);
        
        if (memberData?.cabinet_id) {
          // Compter les membres
          const { data: membersData, error: membersError } = await supabase
            .from('cabinet_members')
            .select('id', { count: 'exact' })
            .eq('cabinet_id', memberData.cabinet_id);
          
          console.log('CheckoutCabinetPlus: Members data:', membersData, 'Count:', membersData?.length, 'Error:', membersError);
          
          const count = membersData?.length || 1;
          console.log('CheckoutCabinetPlus: Setting minMembers to', count);
          setMinMembers(count);
          setUserCount(count); // Définir le nombre initial au minimum
        } else {
          console.log('CheckoutCabinetPlus: No cabinet found for user');
        }
      } catch (error) {
        console.error('CheckoutCabinetPlus: Error loading members count:', error);
      }
    };
    
    loadActiveMembersCount();
  }, [user]);

  const monthlyPrice = 99;
  const yearlyPrice = Math.round(monthlyPrice * 12 * 0.9); // 10% de réduction
  const basePrice = billingPeriod === 'monthly' ? monthlyPrice : yearlyPrice;
  const price = basePrice * userCount;
  const total = Math.round(price * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation immédiate avant de définir loading
    if (!user) {
      toast.error("Erreur", {
        description: "Vous devez être connecté pour souscrire"
      });
      return;
    }

    setLoading(true);
    toast.info("Préparation du paiement...");
    
    try {
      // Obtenir le price ID Stripe (validation rapide)
      const priceId = STRIPE_PRICE_IDS['cabinet-plus'][billingPeriod];
      if (!priceId) {
        throw new Error("Configuration du plan invalide");
      }

      // Récupérer le cabinet en parallèle
      const [memberResult] = await Promise.all([
        supabase
          .from('cabinet_members')
          .select('cabinet_id')
          .eq('user_id', user.id)
          .single()
      ]);

      if (memberResult.error || !memberResult.data?.cabinet_id) {
        throw new Error("Cabinet non trouvé. Veuillez contacter le support.");
      }

      // Créer la session de paiement Stripe
      toast.info("Connexion à Stripe...");
      const checkoutUrl = await createStripeCheckoutSession({
        priceId,
        quantity: userCount,
        cabinetId: memberResult.data.cabinet_id,
        successUrl: `${window.location.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/checkout/cabinet-plus`
      });

      // Rediriger immédiatement
      toast.success("Redirection vers Stripe...");
      window.location.href = checkoutUrl;
      
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 relative overflow-hidden">
      {/* Effets de fond décoratifs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-24 relative z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-orange-700 hover:text-orange-800 mb-8 font-medium transition-all hover:gap-3"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        <div className="max-w-7xl mx-auto">
          {/* En-tête de l'offre moderne */}
          <div className="mb-10">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-orange-100 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider">
                    Premium
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-semibold">
                    10-50+ utilisateurs
                  </div>
                </div>
                <h1 className="text-4xl font-bold mb-2">Neira Cabinet+</h1>
                <p className="text-orange-50 text-lg">La solution complète pour les cabinets structurés</p>
              </div>
              <div className="p-8 bg-white/60 backdrop-blur-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">∞</div>
                    <div className="text-xs text-gray-600 mt-1">Stockage</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">∞</div>
                    <div className="text-xs text-gray-600 mt-1">Dossiers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">∞</div>
                    <div className="text-xs text-gray-600 mt-1">Clients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">100</div>
                    <div className="text-xs text-gray-600 mt-1">Signatures/mois</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Layout 2 colonnes : Fonctionnalités à gauche, Paiement à droite */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Colonne gauche : Atouts */}
            <div className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-xl shadow-xl border-orange-100 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                  <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-orange-600" />
                    Tout inclus
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-orange-50 transition-colors">
                      <div className="bg-orange-100 p-2 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Espace collaboratif illimité</h4>
                        <p className="text-sm text-gray-600 mt-1">Aucune limite de membres</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-orange-50 transition-colors">
                      <div className="bg-orange-100 p-2 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">100 signatures / mois / utilisateur</h4>
                        <p className="text-sm text-gray-600 mt-1">Volume professionnel généreux</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-orange-50 transition-colors">
                      <div className="bg-orange-100 p-2 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Workflows illimités</h4>
                        <p className="text-sm text-gray-600 mt-1">Priorité CPU + files dédiées</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-orange-50 transition-colors">
                      <div className="bg-orange-100 p-2 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">API + intégrations externes</h4>
                        <p className="text-sm text-gray-600 mt-1">ERP, CRM, GED, Septeo, Microsoft 365, Google</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-orange-50 transition-colors">
                      <div className="bg-orange-100 p-2 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Support prioritaire + Account Manager</h4>
                        <p className="text-sm text-gray-600 mt-1">Réponse garantie sous 2h</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Garanties et sécurité */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 backdrop-blur-xl shadow-xl border-green-200 rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-green-100 p-3 rounded-xl">
                      <Lock className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm">Paiement 100% sécurisé</h4>
                      <ul className="text-xs text-gray-600 space-y-1">
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
              <div className="sticky top-24">
                <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border-2 border-orange-200 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                    <CardTitle className="text-2xl flex items-center gap-3">
                      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      Finalisez votre abonnement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Sélecteur nombre d'utilisateurs */}
                    <div className="space-y-3">
                        <Label className="text-gray-900 font-semibold text-base">Nombre d'utilisateurs</Label>
                        <>
                          <Select 
                            value={userCount <= 50 ? userCount.toString() : '51+'} 
                            onValueChange={(value) => {
                              if (value === '51+') {
                                setShowCustomInput(true);
                                setUserCount(51);
                                setCustomUserCount('51');
                              } else {
                                setUserCount(parseInt(value));
                              }
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => (
                                <SelectItem key={num} value={num.toString()} disabled={num < minMembers}>
                                  {num} utilisateur{num > 1 ? 's' : ''}
                                  {num < minMembers && ' (minimum requis: ' + minMembers + ')'}
                                </SelectItem>
                              ))}
                              <SelectItem value="51+">
                                51+ utilisateurs (saisie personnalisée)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      ) : (
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Input
                              type="number"
                              min={Math.max(51, minMembers)}
                              value={customUserCount}
                              onChange={(e) => {
                                const value = e.target.value;
                                setCustomUserCount(value);
                                const num = parseInt(value);
                                if (!isNaN(num) && num >= Math.max(51, minMembers)) {
                                  setUserCount(num);
                                }
                              }}
                              placeholder="Nombre d'utilisateurs (51+)"
                              className="bg-background"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowCustomInput(false);
                              setUserCount(Math.min(50, Math.max(minMembers, userCount)));
                              setCustomUserCount('');
                            }}
                          >
                            Retour
                          </Button>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-600">
                        {minMembers > 1 && `Votre cabinet compte actuellement ${minMembers} membres actifs. `}
                        {showCustomInput ? (
                          <>Pour plus de 100 utilisateurs, <a href="/contact" className="text-orange-600 hover:text-orange-700 underline">contactez-nous</a> pour un devis personnalisé.</>
                        ) : (
                          <>Prix : {monthlyPrice}€/utilisateur/mois (ou {yearlyPrice}€/utilisateur/an)</>
                        )}
                      </p>
                    </div>

                    {/* Info 100 signatures */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">✨</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-orange-900 text-sm">100 signatures / mois / utilisateur</h4>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-orange-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs"><strong>1 signature = 1 enveloppe</strong></p>
                                <p className="text-xs mt-1">Nombre de signataires illimité par enveloppe</p>
                                <p className="text-xs mt-2 text-green-700 font-semibold">✅ Limite de 100 signatures/mois prise en charge</p>
                                <p className="text-xs mt-1 text-orange-600">📦 Suppléments facturables si besoin</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-orange-700">1 signature = 1 enveloppe (signataires illimités) • 100 signatures/mois incluses • Suppléments disponibles si besoin</p>
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
                              ? 'border-orange-600 bg-orange-50'
                              : 'border-gray-200 bg-white hover:border-orange-300'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">Mensuel</div>
                              <div className="text-xl font-bold text-orange-600 mt-1">{monthlyPrice}€</div>
                              <div className="text-xs text-gray-600">par utilisateur/mois</div>
                            </div>
                            {billingPeriod === 'monthly' && (
                              <CheckCircle2 className="w-5 h-5 text-orange-600" />
                            )}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingPeriod('yearly')}
                          className={`p-4 rounded-lg border-2 text-left transition-all relative ${
                            billingPeriod === 'yearly'
                              ? 'border-orange-600 bg-orange-50'
                              : 'border-gray-200 bg-white hover:border-orange-300'
                          }`}
                        >
                          <div className="absolute -top-2 right-4 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                            -10%
                          </div>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">Annuel</div>
                              <div className="text-xl font-bold text-orange-600 mt-1">{yearlyPrice}€</div>
                              <div className="text-xs text-gray-600">par utilisateur/an</div>
                            </div>
                            {billingPeriod === 'yearly' && (
                              <CheckCircle2 className="w-5 h-5 text-orange-600" />
                            )}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Informations de paiement */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-inner">
                        <div className="flex items-start gap-4">
                          <div className="bg-blue-100 p-2.5 rounded-lg">
                            <Lock className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-blue-900 mb-1.5">Paiement 100% sécurisé</h4>
                            <p className="text-sm text-blue-800">
                              Vous serez redirigé vers notre processus de paiement sécurisé Stripe pour finaliser votre abonnement.
                            </p>
                      </div>
                    </div>

                    {/* Récapitulatif */}
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200">
                        <div className="space-y-3">
                          <div className="flex justify-between text-gray-700">
                            <span className="font-medium">Prix unitaire</span>
                            <span className="font-semibold">{basePrice}€ / membre</span>
                          </div>
                          <div className="flex justify-between text-gray-700">
                            <span className="font-medium">Nombre de membres</span>
                            <span className="font-semibold">{userCount}</span>
                          </div>
                          <div className="border-t-2 border-dashed border-gray-300 pt-3 mt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xl font-bold text-gray-900">Total</span>
                              <div className="text-right">
                                <div className="text-3xl font-bold text-orange-600">{total}€</div>
                                <div className="text-xs text-gray-600 mt-1">
                                  Facturation {billingPeriod === 'monthly' ? 'mensuelle' : 'annuelle'}
                                </div>
                              </div>
                            </div>
                          </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
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
