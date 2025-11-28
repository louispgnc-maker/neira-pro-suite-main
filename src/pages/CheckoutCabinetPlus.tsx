import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ArrowLeft, CreditCard, Lock } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { toast } from "sonner";

export default function CheckoutCabinetPlus() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const monthlyPrice = 89;
  const yearlyPrice = Math.round(monthlyPrice * 12 * 0.9); // 10% de réduction
  const price = billingPeriod === 'monthly' ? monthlyPrice : yearlyPrice;
  const tva = Math.round(price * 0.2 * 100) / 100;
  const total = Math.round((price + tva) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simuler le traitement du paiement
    setTimeout(() => {
      toast.success("Paiement en cours de traitement...");
      setLoading(false);
      // Rediriger vers la page d'inscription après paiement
      navigate('/');
    }, 2000);
  };

  return (
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
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 mb-8">
            <CardContent className="p-8">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-orange-600 mb-2">Neira Cabinet+</h1>
                <p className="text-gray-600 mb-4">Pour cabinets structurés 10 à 50+ personnes</p>
                <div className="mb-6 p-3 bg-white/80 rounded-lg inline-block">
                  <p className="text-sm text-gray-900 font-medium">Aucune limite — tout est illimité</p>
                </div>
                <div className="flex items-center justify-center gap-8">
                  <div className="text-5xl font-bold text-orange-600">{monthlyPrice}€</div>
                  <div className="text-left">
                    <p className="text-sm text-gray-600">par mois / utilisateur</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Layout 2 colonnes : Fonctionnalités à gauche, Paiement à droite */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Colonne gauche : Fonctionnalités détaillées */}
            <div className="space-y-6">
              <Card className="bg-white/90 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-2xl">✨ Tout ce qui est inclus</CardTitle>
                  <CardDescription>Fonctionnalités complètes de l'offre Cabinet+</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Espace collaboratif illimité</h4>
                        <p className="text-sm text-gray-600 mt-1">Aucune limite de membres</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Workflows illimités (priorité CPU + files dédiées)</h4>
                        <p className="text-sm text-gray-600 mt-1">Performance maximale garantie</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Gestion documentaire illimitée</h4>
                        <p className="text-sm text-gray-600 mt-1">Stockez autant de documents que nécessaire</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">API + intégrations externes (ERP, CRM, GED, Septeo, Microsoft 365, Google)</h4>
                        <p className="text-sm text-gray-600 mt-1">Connectez tous vos outils existants</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Dossiers clients avancés (multi-collaborateurs, révisions)</h4>
                        <p className="text-sm text-gray-600 mt-1">Gestion complète et détaillée</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Stockage illimité</h4>
                        <p className="text-sm text-gray-600 mt-1">Aucune limite de stockage</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Membres illimités</h4>
                        <p className="text-sm text-gray-600 mt-1">Toute votre équipe peut collaborer</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Clients actifs illimités</h4>
                        <p className="text-sm text-gray-600 mt-1">Gérez autant de clients que nécessaire</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Reporting professionnel + exports Excel/PDF</h4>
                        <p className="text-sm text-gray-600 mt-1">Analytics avancés pour votre cabinet</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Onboarding + formation complète de l'équipe</h4>
                        <p className="text-sm text-gray-600 mt-1">Formation dédiée à votre équipe</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Support 7j/7 + SLA (temps de réponse prioritaire)</h4>
                        <p className="text-sm text-gray-600 mt-1">Assistance prioritaire garantie</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Accès anticipé aux nouvelles fonctionnalités</h4>
                        <p className="text-sm text-gray-600 mt-1">Testez les nouveautés en avant-première</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Colonne droite : Choix paiement + Formulaire */}
            <div className="space-y-6">
              {/* Choix du mode de paiement */}
              <Card className="bg-white/90 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-xl">Choisissez votre mode de paiement</CardTitle>
                </CardHeader>
                <CardContent>
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
                          <div className="font-semibold text-gray-900 text-lg">Mensuel</div>
                          <div className="text-2xl font-bold text-orange-600 mt-2">{monthlyPrice}€</div>
                          <div className="text-sm text-gray-600">par mois</div>
                        </div>
                        {billingPeriod === 'monthly' && (
                          <CheckCircle2 className="w-6 h-6 text-orange-600" />
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
                          <div className="font-semibold text-gray-900 text-lg">Annuel</div>
                          <div className="text-2xl font-bold text-orange-600 mt-2">{yearlyPrice}€</div>
                          <div className="text-sm text-gray-600">par an</div>
                        </div>
                        {billingPeriod === 'yearly' && (
                          <CheckCircle2 className="w-6 h-6 text-orange-600" />
                        )}
                      </div>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Formulaire de paiement compact */}
              <Card className="bg-white/90 backdrop-blur border-2 border-orange-300">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CreditCard className="w-5 h-5 text-orange-600" />
                    Finaliser le paiement
                  </CardTitle>
                  <CardDescription>Paiement 100% sécurisé</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="cardName">Nom sur la carte</Label>
                        <Input id="cardName" placeholder="Jean Dupont" required />
                      </div>
                      <div>
                        <Label htmlFor="email">Email de facturation</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="votre@email.com" 
                          required 
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="cardNumber">Numéro de carte</Label>
                      <Input 
                        id="cardNumber" 
                        placeholder="1234 5678 9012 3456" 
                        maxLength={19}
                        required 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiry">Date d'expiration</Label>
                        <Input 
                          id="expiry" 
                          placeholder="MM/AA" 
                          maxLength={5}
                          required 
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input 
                          id="cvv" 
                          type="password" 
                          placeholder="123" 
                          maxLength={3}
                          required 
                        />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 space-y-2 border border-orange-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 font-medium">Sous-total ({billingPeriod === 'monthly' ? 'Mensuel' : 'Annuel'})</span>
                        <span className="font-semibold text-gray-900">{price.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 font-medium">TVA (20%)</span>
                        <span className="font-semibold text-gray-900">{tva.toFixed(2)} €</span>
                      </div>
                      <div className="border-t border-orange-300 pt-2 flex justify-between">
                        <span className="font-bold text-gray-900">Total à payer</span>
                        <span className="text-2xl font-bold text-orange-600">{total.toFixed(2)} €</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                        <Lock className="w-4 h-4" />
                        <span>Paiement 100% sécurisé SSL</span>
                      </div>
                      <div className="flex items-center justify-center gap-4">
                        <img 
                          src="https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Image.jpeg" 
                          alt="Visa" 
                          className="h-8 object-contain"
                        />
                        <img 
                          src="https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Image%201.jpeg" 
                          alt="Mastercard" 
                          className="h-8 object-contain"
                        />
                        <img 
                          src="https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Image%202.jpeg" 
                          alt="Stripe" 
                          className="h-8 object-contain"
                        />
                        <img 
                          src="https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Image%203.jpeg" 
                          alt="PayPal" 
                          className="h-8 object-contain"
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-orange-600 hover:bg-orange-700 text-lg py-6"
                      disabled={loading}
                    >
                      {loading ? "Traitement..." : "Confirmer le paiement"}
                    </Button>

                    <p className="text-xs text-center text-gray-500">
                      En confirmant, vous acceptez nos conditions générales de vente
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
