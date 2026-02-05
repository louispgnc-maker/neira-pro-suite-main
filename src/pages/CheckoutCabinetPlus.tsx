import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function CheckoutCabinetPlus() {
  useCleanStripeHistory(); // Nettoyer l'historique si on vient de Stripe
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
    setLoading(true);
    
    try {
      // Détecter le role depuis l'URL (notaire ou avocat)
      const role: 'avocat' | 'notaire' = window.location.pathname.includes('/notaires') ? 'notaire' : 'avocat';
      
      // Obtenir le price ID Stripe pour le plan Cabinet+ selon la période
      const priceId = STRIPE_PRICE_IDS['cabinet-plus'][billingPeriod];
      if (!priceId) {
        toast.error("Erreur de configuration", {
          description: "Plan non trouvé"
        });
        setLoading(false);
        return;
      }

      // Si l'utilisateur est connecté, récupérer le cabinet_id
      let cabinetId = null;
      if (user) {
        const { data: memberData } = await supabase
          .from('cabinet_members')
          .select('cabinet_id')
          .eq('user_id', user.id)
          .single();
        cabinetId = memberData?.cabinet_id || null;
      }

      // Créer la session de paiement Stripe
      // Si pas connecté: redirige vers /create-account après paiement
      // Si connecté: redirige vers le dashboard
      const successUrl = user 
        ? `${window.location.origin}/${role === 'notaire' ? 'notaires' : 'avocats'}/subscription?payment=success`
        : `${window.location.origin}/create-account?session_id={CHECKOUT_SESSION_ID}&role=${role}&plan=cabinet-plus&billing=${billingPeriod}&users=${userCount}`;
      
      const checkoutUrl = await createStripeCheckoutSession({
        priceId,
        quantity: userCount, // Nombre d'utilisateurs sélectionnés (1 à 50)
        cabinetId: cabinetId,
        successUrl,
        cancelUrl: `${window.location.origin}/checkout/cabinet-plus`
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
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-accent/10 to-background">
      <PublicHeader />
      
      <div className="container mx-auto px-4 pt-32 pb-24">
        <div className="mb-8">
          <Button 
            variant="outline"
            onClick={() => navigate(-1)} 
            className="border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Titre centré */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-orange-600 mb-2">Neira Cabinet+</h1>
            <p className="text-gray-600">Idéal pour cabinets structurés 10 à 50+ personnes</p>
          </div>

          {/* Layout 2 colonnes : Récap à gauche, Paiement à droite */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Colonne gauche : Engagement + Fonctionnalités */}
            <div className="space-y-6">
              {/* Encadré essai gratuit */}
              <Card className="bg-green-50 border-2 border-green-300">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">🎁</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-green-900 text-base mb-2">🎁 7 jours d'essai gratuit</h4>
                      <p className="text-sm text-green-800 mb-2">
                        Profitez de <strong>7 jours gratuits</strong> pour tester toutes les fonctionnalités. 
                        Aucun prélèvement avant la fin de la période d'essai.
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-green-900">
                        <span className="bg-green-200 px-2 py-1 rounded">✅ Accès complet immédiat</span>
                        <span className="bg-green-200 px-2 py-1 rounded">✅ Sans engagement pendant l'essai</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Encadré engagement */}
              <Card className="bg-orange-50 border-2 border-orange-300">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-bold text-orange-900 text-base mb-2">⚠️ Après l'essai : Engagement de 12 mois</h4>
                      <p className="text-sm text-orange-800 mb-2">
                        Tous les abonnements Neira impliquent un <strong>engagement ferme de 12 mois</strong>. 
                        Le paiement mensuel est une facilité de paiement, mais l'engagement reste d'un an.
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-orange-900">
                        <span className="bg-orange-200 px-2 py-1 rounded">🔒 Downgrade impossible pendant 12 mois</span>
                        <span className="bg-green-200 px-2 py-1 rounded">✅ Upgrade autorisé à tout moment</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fonctionnalités */}
              <Card className="bg-white/90 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-xl">Comprend :</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-900">Idéal pour cabinets de 10 à 50+ utilisateurs</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-900">Stockage illimité</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-900">Dossiers illimités</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-900">Clients illimités</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-900">70 signatures / mois / utilisateur</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-900">Collaboration sans limite</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-900">Tableaux de bord avancés</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-900">Onboarding & formation de l'équipe</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-900">Accès anticipé aux nouveautés</span>
                  </div>

                  <div className="pt-6 mt-6 border-t">
                    <p className="text-sm text-gray-700 italic">
                      🚀 Pour les cabinets recherchant une solution sans limite, quelle que soit leur taille
                    </p>
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
                    {/* Sélecteur nombre d'utilisateurs */}
                    <div className="space-y-3">
                      <Label className="text-gray-900">Nombre d'utilisateurs</Label>
                      
                      {!showCustomInput ? (
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
                            <h4 className="font-semibold text-orange-900 text-sm">70 signatures / mois / utilisateur</h4>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-orange-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs font-bold text-orange-900">1 signature = 1 signataire</p>
                                <p className="text-xs text-gray-700 mt-1">Signatures simples incluses</p>
                                <p className="text-xs text-gray-700 mt-1">Quota personnel non mutualisé</p>
                                <div className="pt-2 border-t border-orange-200 mt-2">
                                  <p className="text-xs font-semibold text-orange-700 mb-1.5">🔒 Signatures avancées et qualifiées facturables en supplément</p>
                                  <p className="text-xs font-semibold text-orange-800 mb-1.5">📦 Besoin de plus ? Suppléments disponibles</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-orange-700">70 signatures simples incluses/mois • Signatures avancées/qualifiées facturables • Suppléments disponibles</p>
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

                    {/* Total */}
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-gray-700 font-medium">Total</span>
                        <div className="text-right">
                          {billingPeriod === 'yearly' && (
                            <div className="text-sm text-gray-500 line-through">{Math.round(basePrice * userCount * 12)}€</div>
                          )}
                          <span className="text-3xl font-bold text-orange-600">{total}€</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">
                        {userCount} utilisateur{userCount > 1 ? 's' : ''} × {billingPeriod === 'monthly' ? monthlyPrice : yearlyPrice}€ ({billingPeriod === 'monthly' ? 'mensuel' : 'annuel'})
                        {billingPeriod === 'yearly' && (
                          <span className="text-green-600 font-medium ml-1">(Économie de {Math.round(basePrice * userCount * 12) - total}€)</span>
                        )}
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={loading}
                    >
                      {loading ? "Redirection vers Stripe..." : `Procéder au paiement - ${total}€`}
                    </Button>

                    {/* Garanties */}
                    <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Paiement sécurisé
                      </span>
                      <span>•</span>
                      <span>30 jours satisfait ou remboursé</span>
                    </div>

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
