import { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, ArrowLeft, CreditCard, Lock, Zap, Crown, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const planConfigs = {
  'essentiel': {
    name: 'Essentiel',
    monthlyPrice: 39,
    description: 'Pour indépendants & petits cabinets',
    icon: Zap,
    color: 'blue',
    features: [
      { title: 'Espace collaboratif complet', description: 'Travaillez en équipe efficacement' },
      { title: 'Gestion documentaire intelligente', description: 'Organisez vos documents facilement' },
      { title: 'Partage sécurisé + dépôt client', description: 'Échangez en toute sécurité' },
      { title: 'Planning + tâches + rappels', description: 'Ne manquez plus aucune échéance' },
      { title: 'Signature électronique (5/mois)', description: 'Signez vos documents rapidement' },
      { title: '20 Go de stockage', description: 'Espace suffisant pour démarrer' },
      { title: 'Suivi des dossiers / clients', description: 'Vue d\'ensemble de votre activité' },
      { title: 'Support email', description: 'Réponse sous 48h' },
    ]
  },
  'professionnel': {
    name: 'Professionnel',
    monthlyPrice: 59,
    description: 'Offre cœur de gamme',
    icon: Crown,
    color: 'purple',
    features: [
      { title: 'Tout ce qu\'il y a dans Essentiel', description: 'Toutes les fonctionnalités de base' },
      { title: 'Automatisations & workflows', description: 'Gagnez du temps sur les tâches répétitives' },
      { title: 'Génération automatique de documents', description: 'Créez vos documents en un clic' },
      { title: 'Modèles juridiques personnalisables', description: 'Bibliothèque de modèles prêts à l\'emploi' },
      { title: 'Signature électronique illimitée', description: 'Aucune limite mensuelle' },
      { title: '100 Go de stockage', description: 'Pour tous vos documents' },
      { title: 'Gestion des droits utilisateurs', description: 'Contrôlez les accès de votre équipe' },
      { title: 'Tableaux de bord & reporting', description: 'Suivez vos performances' },
      { title: 'Historique d\'activité avancé', description: 'Traçabilité complète' },
      { title: 'Support prioritaire', description: 'Réponse sous 24h' },
    ]
  },
  'cabinet-plus': {
    name: 'Cabinet+',
    monthlyPrice: 129,
    description: 'Pour cabinets structurés (5-50 personnes)',
    icon: Users,
    color: 'orange',
    features: [
      { title: 'Tout le Pro', description: 'Toutes les fonctionnalités Professionnel' },
      { title: 'Automatisations illimitées', description: 'Aucune limite sur vos workflows' },
      { title: 'Dossiers clients avancés', description: 'Gestion complète et détaillée' },
      { title: 'API + intégrations externes', description: 'Connectez vos outils existants' },
      { title: 'Stockage illimité', description: 'Aucune limite de stockage' },
      { title: 'Onboarding personnalisé', description: 'Formation dédiée à votre équipe' },
      { title: 'Support 7j/7 + SLA', description: 'Assistance prioritaire garantie' },
      { title: 'Formation de l\'équipe', description: 'Sessions de formation incluses' },
      { title: 'Accès anticipé aux futures features', description: 'Testez les nouveautés en avant-première' },
    ]
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

  const Icon = planConfig.icon;
  const monthlyPrice = planConfig.monthlyPrice;
  const yearlyPrice = Math.round(monthlyPrice * 12 * 0.9); // 10% de réduction
  const price = billingPeriod === 'monthly' ? monthlyPrice : yearlyPrice;
  const tva = Math.round(price * 0.2 * 100) / 100;
  const total = Math.round((price + tva) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simuler le traitement du paiement
    setTimeout(() => {
      toast.success("Changement d'abonnement en cours...", {
        description: "Votre nouvel abonnement sera actif dans quelques instants."
      });
      setLoading(false);
      navigate(`${prefix}/subscription`);
    }, 2000);
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-8 max-w-7xl">
        <button 
          onClick={() => navigate(`${prefix}/subscription`)} 
          className="flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'espace abonnement
        </button>

        {/* En-tête de l'offre */}
        <Card className={`bg-gradient-to-br from-${planConfig.color}-50 to-${planConfig.color}-100 border-2 border-${planConfig.color}-300 mb-8 bg-card`}>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Icon className={`h-10 w-10 text-${planConfig.color}-600`} />
                <h1 className="text-4xl font-bold text-black">Neira {planConfig.name}</h1>
              </div>
              <p className="text-black mb-6">{planConfig.description}</p>
              <div className="flex items-center justify-center gap-8">
                <div className="text-5xl font-bold text-black">{monthlyPrice}€</div>
                <div className="text-left">
                  <p className="text-sm text-black">par mois / utilisateur</p>
                  <p className="text-xs text-black/70">Facturation mensuelle</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layout 2 colonnes : Fonctionnalités à gauche, Paiement à droite */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Colonne gauche : Fonctionnalités détaillées */}
          <div className="space-y-6">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-2xl text-black">✨ Tout ce qui est inclus</CardTitle>
                <CardDescription className="text-black">Fonctionnalités complètes de l'offre {planConfig.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {planConfig.features.map((feature, idx) => (
                    <div key={idx} className={`flex items-start gap-3 p-3 bg-${planConfig.color}-50/50 rounded-lg border border-${planConfig.color}-200/50`}>
                      <div className={`w-10 h-10 rounded-full bg-${planConfig.color}-600 flex items-center justify-center flex-shrink-0`}>
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-black">{feature.title}</h4>
                        <p className="text-sm text-black/70 mt-1">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Garanties et sécurité */}
            <Card className="bg-card border border-green-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Lock className="w-8 h-8 text-green-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-black mb-2">Paiement 100% sécurisé</h4>
                    <ul className="text-sm text-black/70 space-y-1">
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
                <CardTitle className="text-2xl text-black flex items-center gap-2">
                  <CreditCard className="w-6 h-6" />
                  Finaliser le changement
                </CardTitle>
                <CardDescription className="text-black">
                  Passez à l'offre {planConfig.name} dès maintenant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Période de facturation */}
                  <div className="space-y-3">
                    <Label className="text-black">Période de facturation</Label>
                    <RadioGroup value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as 'monthly' | 'yearly')}>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                        <RadioGroupItem value="monthly" id="monthly" />
                        <Label htmlFor="monthly" className="flex-1 cursor-pointer text-black">
                          Mensuel - {monthlyPrice}€/mois
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                        <RadioGroupItem value="yearly" id="yearly" />
                        <Label htmlFor="yearly" className="flex-1 cursor-pointer text-black">
                          Annuel - {yearlyPrice}€/an
                          <span className="ml-2 text-green-600 font-semibold">(10% d'économie)</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Informations de carte */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber" className="text-black">Numéro de carte</Label>
                      <Input 
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        required
                        className="bg-background"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry" className="text-black">Date d'expiration</Label>
                        <Input 
                          id="expiry"
                          placeholder="MM/AA"
                          required
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvc" className="text-black">CVC</Label>
                        <Input 
                          id="cvc"
                          placeholder="123"
                          required
                          className="bg-background"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-black">Nom sur la carte</Label>
                      <Input 
                        id="name"
                        placeholder={`${profile?.first_name || ''} ${profile?.last_name || ''}`}
                        defaultValue={`${profile?.first_name || ''} ${profile?.last_name || ''}`}
                        required
                        className="bg-background"
                      />
                    </div>
                  </div>

                  {/* Récapitulatif */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm text-black">
                      <span>Abonnement {billingPeriod === 'monthly' ? 'mensuel' : 'annuel'}</span>
                      <span>{price}€</span>
                    </div>
                    <div className="flex justify-between text-sm text-black">
                      <span>TVA (20%)</span>
                      <span>{tva}€</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2 text-black">
                      <span>Total</span>
                      <span>{total}€</span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={loading}
                  >
                    {loading ? "Traitement en cours..." : `Confirmer le changement - ${total}€`}
                  </Button>

                  <p className="text-xs text-black/60 text-center">
                    En confirmant, vous acceptez nos conditions générales de vente.
                    Vous pouvez résilier à tout moment.
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
