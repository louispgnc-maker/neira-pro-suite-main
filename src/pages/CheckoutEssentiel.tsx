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

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Résumé de l'offre */}
          <Card className="bg-white/90 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl text-blue-600">Neira Essentiel</CardTitle>
              <CardDescription>Votre offre sélectionnée</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-2">39€</div>
                <p className="text-sm text-gray-600">par mois / utilisateur</p>
                <p className="text-sm text-gray-500 mt-1">Pour indépendants & petits cabinets</p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-gray-900">Fonctionnalités incluses :</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Espace collaboratif complet</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Gestion documentaire intelligente</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Partage sécurisé + dépôt client</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Planning + tâches + rappels</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Signature électronique (5/mois)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">20 Go de stockage</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Support email</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-700">
                  <strong>✨ Essai gratuit de 14 jours</strong><br />
                  Aucun engagement, annulation possible à tout moment
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Formulaire de paiement */}
          <Card className="bg-white/90 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Informations de paiement
              </CardTitle>
              <CardDescription>Paiement sécurisé par carte bancaire</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="cardName">Nom sur la carte</Label>
                  <Input id="cardName" placeholder="Jean Dupont" required />
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

                <div className="border-t pt-4">
                  <Label htmlFor="email">Email de facturation</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="votre@email.com" 
                    required 
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sous-total</span>
                    <span className="font-medium">39,00 €</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">TVA (20%)</span>
                    <span className="font-medium">7,80 €</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold text-blue-600">46,80 €</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Lock className="w-4 h-4" />
                  <span>Paiement 100% sécurisé SSL</span>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700"
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
  );
}
