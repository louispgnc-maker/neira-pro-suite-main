import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

      // Obtenir le price ID Stripe pour le plan Cabinet+ selon la période
      const priceId = STRIPE_PRICE_IDS['cabinet-plus'][billingPeriod];
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
        quantity: userCount, // Nombre d'utilisateurs sélectionnés (1 à 50)
        cabinetId: memberData.cabinet_id,
        successUrl: `${window.location.origin}/${role === 'notaire' ? 'notaires' : 'avocats'}/subscription?payment=success`,
        cancelUrl: `${window.location.origin}/checkout-cabinet-plus`
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
          onClick={() => navigate('/#pricing')} 
          className="flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6"
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
                <h1 className="text-2xl font-bold text-orange-600 mb-2">Neira Cabinet+</h1>
                <p className="text-sm text-gray-600">Idéal pour cabinets structurés 10 à 50+ personnes</p>
              </CardContent>
            </Card>

            {/* Limites et specs */}
            <Card className="lg:col-span-2 bg-white/90 backdrop-blur">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Caractéristiques</h3>
                <p className="text-sm text-gray-700">Idéal pour cabinets de 10 à 50+ utilisateurs • Stockage illimité • Dossiers illimités • Clients illimités • 70 signatures/mois/utilisateur</p>
              </CardContent>
            </Card>
          </div>

          {/* Layout 2 colonnes : Fonctionnalités à gauche, Paiement à droite */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Colonne gauche : Atouts */}
            <div className="space-y-6">
              <Card className="bg-white/90 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-xl">Ce qui est inclus</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Espace collaboratif illimité</h4>
                        <p className="text-xs text-gray-600 mt-0.5">Aucune limite de membres</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">70 signatures / mois / utilisateur</h4>
                        <p className="text-xs text-gray-600 mt-0.5">Aucune limite mensuelle</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Workflows illimités</h4>
                        <p className="text-xs text-gray-600 mt-0.5">Priorité CPU + files dédiées</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">API + intégrations externes</h4>
                        <p className="text-xs text-gray-600 mt-0.5">ERP, CRM, GED, Septeo, Microsoft 365, Google</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Support prioritaire + Account Manager dédié</h4>
                        <p className="text-xs text-gray-600 mt-0.5">Réponse sous 2h</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Garanties et sécurité */}
              <Card className="bg-white/90 backdrop-blur border border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Lock className="w-6 h-6 text-green-600 flex-shrink-0" />
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
              <Card className="bg-white/90 backdrop-blur border-2 border-primary">
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
                                <p className="text-xs"><strong>1 signature = 1 signataire</strong></p>
                                <p className="text-xs mt-1">70 signatures simples incluses/mois par utilisateur</p>
                                <p className="text-xs mt-2 text-orange-700 font-semibold">🔒 Signatures avancées et qualifiées facturables en supplément</p>
                                <p className="text-xs mt-1 text-orange-600">📦 Besoin de plus ? Suppléments disponibles</p>
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

                    {/* Informations de paiement */}
                    <div className="space-y-4">
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
                    </div>

                    {/* Récapitulatif */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm text-gray-900">
                        <span>Prix unitaire</span>
                        <span>{basePrice}€ / membre</span>
                      </div>
                      <div className="flex justify-between font-bold text-base border-t pt-2 text-gray-900">
                        <span>Total ({userCount} membre{userCount > 1 ? 's' : ''})</span>
                        <span>{total}€</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Facturation {billingPeriod === 'monthly' ? 'mensuelle' : 'annuelle'}
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
