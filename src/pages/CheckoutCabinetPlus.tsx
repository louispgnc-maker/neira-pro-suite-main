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
          .eq('status', 'active')
          .single();
        
        console.log('CheckoutCabinetPlus: Member data:', memberData, 'Error:', memberError);
        
        if (memberData?.cabinet_id) {
          // Compter les membres actifs
          const { data: membersData, error: membersError } = await supabase
            .from('cabinet_members')
            .select('id', { count: 'exact' })
            .eq('cabinet_id', memberData.cabinet_id)
            .eq('status', 'active');
          
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

  const monthlyPrice = 89;
  const yearlyPrice = Math.round(monthlyPrice * 12 * 0.9); // 10% de réduction
  const basePrice = billingPeriod === 'monthly' ? monthlyPrice : yearlyPrice;
  const price = basePrice * userCount;
  const tva = Math.round(price * 0.2 * 100) / 100;
  const total = Math.round((price + tva) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Stocker les infos du plan dans sessionStorage
    sessionStorage.setItem('pendingSubscription', JSON.stringify({
      plan: 'cabinet-plus',
      billingPeriod: billingPeriod,
      members: userCount,
      price: total
    }));
    
    toast.info("Étape suivante : Création de compte", {
      description: "Veuillez créer votre compte pour finaliser votre abonnement."
    });
    
    // Rediriger vers la page de remerciement
    setTimeout(() => {
      navigate('/test-subscription/thanks');
    }, 1500);
  };

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white" style={{ 
      backgroundImage: 'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Mix%20deux%20couleurs.png)', 
      backgroundSize: 'cover', 
      backgroundPosition: 'center', 
      backgroundAttachment: 'fixed' 
    }}>
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-24">
        <button 
          onClick={() => navigate('/solution')} 
          className="flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux offres
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
                <p className="text-sm text-gray-700">Idéal pour cabinets de 10 à 50+ utilisateurs • Stockage illimité • Dossiers illimités • Clients illimités • Signatures illimitées</p>
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
                        <h4 className="font-medium text-gray-900 text-sm">Signatures illimitées</h4>
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

                    {/* Info signatures illimitées */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">✨</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-orange-900 text-sm">Signatures illimitées par utilisateur</h4>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-orange-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs"><strong>1 signature = 1 enveloppe</strong></p>
                                <p className="text-xs mt-1">Nombre de signataires illimité par enveloppe</p>
                                <p className="text-xs mt-1 text-orange-300">✨ Aucune limite mensuelle</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-orange-700">1 signature = 1 enveloppe (signataires illimités) • Aucun pack nécessaire • Aucune limite mensuelle</p>
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

                    {/* Informations de carte */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber" className="text-gray-900 text-sm">Numéro de carte</Label>
                        <Input 
                          id="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          required
                          className="bg-background"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry" className="text-gray-900 text-sm">Date d'expiration</Label>
                          <Input 
                            id="expiry"
                            placeholder="MM/AA"
                            required
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvc" className="text-gray-900 text-sm">CVC</Label>
                          <Input 
                            id="cvc"
                            placeholder="123"
                            required
                            className="bg-background"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-gray-900 text-sm">Nom sur la carte</Label>
                        <Input 
                          id="name"
                          placeholder="Jean Dupont"
                          required
                          className="bg-background"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-900 text-sm">Email de facturation</Label>
                        <Input 
                          id="email"
                          type="email"
                          placeholder="votre@email.com"
                          required
                          className="bg-background"
                        />
                      </div>
                    </div>

                    {/* Récapitulatif */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm text-gray-900">
                        <span>Abonnement {billingPeriod === 'monthly' ? 'mensuel' : 'annuel'}</span>
                        <span>{basePrice}€ × {userCount}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-900">
                        <span>Sous-total</span>
                        <span>{price}€</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-900">
                        <span>TVA (20%)</span>
                        <span>{tva}€</span>
                      </div>
                      <div className="flex justify-between font-bold text-base border-t pt-2 text-gray-900">
                        <span>Total</span>
                        <span>{total}€</span>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={loading}
                    >
                      {loading ? "Traitement en cours..." : `Confirmer - ${total}€`}
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
