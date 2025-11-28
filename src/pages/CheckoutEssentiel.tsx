import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ArrowLeft, CreditCard, Lock } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { toast } from "sonner";

export default function CheckoutEssentiel() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const monthlyPrice = 39;
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-white" style={{ 
      backgroundImage: 'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Mix%20deux%20couleurs.png)', 
      backgroundSize: 'cover', 
      backgroundPosition: 'center', 
      backgroundAttachment: 'fixed' 
    }}>
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-24">
        <button 
          onClick={() => navigate('/solution')} 
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
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
                <h1 className="text-2xl font-bold text-blue-600 mb-2">Neira Essentiel</h1>
                <p className="text-sm text-gray-600">Idéal pour avocats et notaires indépendants</p>
              </CardContent>
            </Card>

            {/* Limites et specs */}
            <Card className="lg:col-span-2 bg-white/90 backdrop-blur">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Caractéristiques</h3>
                <p className="text-sm text-gray-700">1 utilisateur • 20 Go • 100 dossiers • 30 clients • 15 signatures/mois</p>
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
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Gestion documentaire</h4>
                        <p className="text-xs text-gray-600 mt-0.5">Organisez tous vos documents</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Partage sécurisé client</h4>
                        <p className="text-xs text-gray-600 mt-0.5">Échangez en toute sécurité</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-semibold text-gray-900 mb-3 text-sm">Non inclus :</h4>
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
                              <div className="text-xs text-gray-600">par mois</div>
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
                              <div className="text-xs text-gray-600">par an</div>
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
  );
}
