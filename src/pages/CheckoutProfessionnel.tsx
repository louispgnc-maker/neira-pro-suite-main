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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CheckoutProfessionnel() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [userCount, setUserCount] = useState(2);
  const [minMembers, setMinMembers] = useState(2);
  
  const role: 'avocat' | 'notaire' = location.pathname.includes('/notaires') ? 'notaire' : 'avocat';

  console.log('CheckoutProfessionnel component mounted, user:', user);

  // Charger le nombre de membres actifs du cabinet
  useEffect(() => {
    console.log('CheckoutProfessionnel useEffect triggered, user:', user);
    
    const loadActiveMembersCount = async () => {
      if (!user) {
        console.log('CheckoutProfessionnel: No user available yet');
        // Essayer de charger l'utilisateur directement depuis Supabase
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        console.log('CheckoutProfessionnel: Loaded user from Supabase:', currentUser);
        
        if (!currentUser) {
          console.log('CheckoutProfessionnel: Still no user, setting defaults');
          return;
        }
        
        // Utiliser currentUser au lieu de user
        await loadMembersForUser(currentUser.id);
        return;
      }
      
      await loadMembersForUser(user.id);
    };
    
    const loadMembersForUser = async (userId: string) => {
      console.log('CheckoutProfessionnel: Loading members count for user', userId);
      
      try {
        const { data: memberData, error: memberError } = await supabase
          .from('cabinet_members')
          .select('cabinet_id')
          .eq('user_id', userId)
          .single();
        
        console.log('CheckoutProfessionnel: Member data:', memberData, 'Error:', memberError);
        
        if (memberData?.cabinet_id) {
          const { data: membersData, error: membersError } = await supabase
            .from('cabinet_members')
            .select('id', { count: 'exact' })
            .eq('cabinet_id', memberData.cabinet_id);
          
          console.log('CheckoutProfessionnel: Members data:', membersData, 'Count:', membersData?.length, 'Error:', membersError);
          
          const count = membersData?.length || 2;
          const minCount = Math.min(Math.max(count, 2), 10); // Entre 2 et 10
          console.log('CheckoutProfessionnel: Setting minMembers to', minCount);
          setMinMembers(minCount);
          setUserCount(minCount);
        } else {
          console.log('CheckoutProfessionnel: No cabinet found for user');
        }
      } catch (error) {
        console.error('CheckoutProfessionnel: Error loading members count:', error);
      }
    };
    
    loadActiveMembersCount();
  }, [user]);

  const monthlyPrice = 59;
  const yearlyPrice = Math.round(monthlyPrice * 12 * 0.9); // 10% de réduction
  const basePrice = billingPeriod === 'monthly' ? monthlyPrice : yearlyPrice;
  const price = basePrice * userCount;
  const total = Math.round(price * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log('🚀 Bypass Stripe - Redirection directe vers confirmation');
      
      // Simuler un délai de paiement
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Rediriger directement vers la page de succès
      window.location.href = `${window.location.origin}/subscription/success?session_id=temp_bypass`;
      
    } catch (error) {
      console.error('Erreur:', error);
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
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6"
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
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-purple-600">Neira Professionnel</h1>
                  <span className="bg-purple-500 text-white px-2 py-1 rounded text-xs font-semibold">RECOMMANDÉ</span>
                </div>
                <p className="text-sm text-gray-600">Idéal pour petits cabinets 2–10 personnes</p>
              </CardContent>
            </Card>

            {/* Limites et specs */}
            <Card className="lg:col-span-2 bg-white/90 backdrop-blur">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Caractéristiques</h3>
                <p className="text-sm text-gray-700">100 Go • 600 dossiers • 200 clients • 80 signatures/mois/utilisateur</p>
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
                      <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Espace collaboratif complet</h4>
                        <p className="text-xs text-gray-600 mt-0.5">Équipes, rôles, permissions</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Gestion documentaire avancée</h4>
                        <p className="text-xs text-gray-600 mt-0.5">Jusqu'à 20 000 documents</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Partage sécurisé</h4>
                        <p className="text-xs text-gray-600 mt-0.5">Jusqu'à 200 clients actifs</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">80 signatures / mois / utilisateur</h4>
                        <p className="text-xs text-gray-600 mt-0.5">Packs optionnels disponibles</p>
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
                      <Select value={userCount.toString()} onValueChange={(value) => setUserCount(parseInt(value))}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 9 }, (_, i) => i + 2).map((num) => (
                            <SelectItem key={num} value={num.toString()} disabled={num < minMembers}>
                              {num} utilisateur{num > 1 ? 's' : ''}
                              {num < minMembers && ' (minimum requis: ' + minMembers + ')'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-600">
                        {minMembers > 2 && `Votre cabinet compte actuellement ${minMembers} membres actifs. `}
                        Prix par utilisateur
                      </p>
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
                              <div className="text-xs text-gray-600">par utilisateur/mois</div>
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
                              <div className="text-xs text-gray-600">par utilisateur/an</div>
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
