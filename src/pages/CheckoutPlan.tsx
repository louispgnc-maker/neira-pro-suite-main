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
    description: 'Pour avocats & notaires indépendants travaillant seuls',
    icon: Zap,
    color: 'blue',
    limits: 'Clients actifs : 30 • Dossiers actifs : 100 • Stockage : 20 Go • Signatures : 5/mois • Collaborateurs : 1 (solo)',
    features: [
      { title: 'Gestion documentaire (30 clients, 100 dossiers)', description: 'Organisez tous vos documents juridiques' },
      { title: 'Partage sécurisé + dépôt client', description: 'Échangez en toute sécurité avec vos clients' },
      { title: 'Planning, tâches, rappels', description: 'Ne manquez plus aucune échéance' },
      { title: 'Workflows & automatisations illimités', description: 'Automatisez vos tâches répétitives' },
      { title: 'API illimitée', description: 'Accès complet à l\'API' },
      { title: '20 Go de stockage', description: 'Espace suffisant pour démarrer' },
      { title: '5 signatures électroniques/mois', description: 'Signez vos documents rapidement' },
      { title: 'Support email (48h)', description: 'Réponse sous 48h' },
    ],
    notIncluded: [
      'Espace collaboratif (travail solo)',
      'Gestion des droits utilisateurs',
      'Reporting avancé'
    ]
  },
  'professionnel': {
    name: 'Professionnel',
    monthlyPrice: 59,
    description: 'Pour petits cabinets 2–10 personnes',
    icon: Crown,
    color: 'purple',
    limits: 'Membres : 10 max • Clients actifs : 200 • Documents : ~20 000 • Dossiers actifs : 600 • Stockage : 100 Go',
    features: [
      { title: 'Espace collaboratif (10 membres max)', description: 'Travaillez en équipe efficacement' },
      { title: 'Gestion documentaire avancée (200 clients, 600 dossiers)', description: 'Pour tous vos documents' },
      { title: 'Partage sécurisé + dépôt client', description: 'Échangez avec de nombreux clients' },
      { title: 'Planning collaboratif + gestion d\'équipe', description: 'Coordination d\'équipe optimale' },
      { title: 'Workflows & automatisations illimités', description: 'Automatisez tout votre cabinet' },
      { title: 'API illimitée + intégrations', description: 'Connectez tous vos outils' },
      { title: '100 Go de stockage', description: 'Espace confortable pour votre cabinet' },
      { title: 'Signatures électroniques illimitées', description: 'Aucune limite mensuelle' },
      { title: 'Tableaux de bord & reporting', description: 'Suivez vos performances' },
      { title: 'Gestion des droits utilisateurs', description: 'Contrôlez les accès de votre équipe' },
      { title: 'Support prioritaire (24h)', description: 'Réponse sous 24h' },
    ],
    notIncluded: [
      'Stockage illimité',
      'Support 7j/7 avec SLA',
      'Formation équipe complète'
    ]
  },
  'cabinet-plus': {
    name: 'Cabinet+',
    monthlyPrice: 89,
    description: 'Pour cabinets structurés 10 à 50+ personnes',
    icon: Users,
    color: 'orange',
    limits: 'Aucune limite — tout est illimité',
    features: [
      { title: 'Espace collaboratif illimité', description: 'Aucune limite de membres' },
      { title: 'Gestion documentaire illimitée', description: 'Stockez autant de documents que nécessaire' },
      { title: 'Stockage illimité', description: 'Aucune limite de stockage' },
      { title: 'Membres & clients illimités', description: 'Toute votre équipe peut collaborer' },
      { title: 'Workflows illimités (priorité CPU)', description: 'Performance maximale garantie' },
      { title: 'API + intégrations (ERP, CRM, GED, Microsoft 365)', description: 'Connectez tous vos outils existants' },
      { title: 'Signatures électroniques illimitées', description: 'Aucune limite mensuelle' },
      { title: 'Reporting professionnel + exports Excel/PDF', description: 'Analytics avancés pour votre cabinet' },
      { title: 'Onboarding + formation complète équipe', description: 'Formation dédiée à votre équipe' },
      { title: 'Support 7j/7 + SLA garanti', description: 'Assistance prioritaire garantie' },
    ],
    notIncluded: []
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
        <div className="mb-6">
          <Button
            onClick={() => navigate(`${prefix}/subscription`)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'espace abonnement
          </Button>
        </div>

        {/* En-tête de l'offre */}
        <Card className={`bg-gradient-to-br from-${planConfig.color}-50 to-${planConfig.color}-100 border-2 border-${planConfig.color}-300 mb-8 bg-card`}>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Icon className={`h-10 w-10 text-${planConfig.color}-600`} />
                <h1 className="text-4xl font-bold text-black">Neira {planConfig.name}</h1>
              </div>
              <p className="text-black mb-4">{planConfig.description}</p>
              {planConfig.limits && (
                <div className="mb-6 p-3 bg-white/80 rounded-lg inline-block">
                  <p className="text-sm text-black font-medium">{planConfig.limits}</p>
                </div>
              )}
              <div className="flex items-center justify-center gap-8">
                <div className="text-5xl font-bold text-black">{monthlyPrice}€</div>
                <div className="text-left">
                  <p className="text-sm text-black">par mois / utilisateur</p>
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
                {planConfig.notIncluded && planConfig.notIncluded.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-semibold text-black mb-3">❌ Non inclus dans cette offre :</h4>
                    <div className="space-y-2">
                      {planConfig.notIncluded.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-red-500">•</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                      <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-orange-500/20 transition-colors">
                        <RadioGroupItem value="monthly" id="monthly" />
                        <Label htmlFor="monthly" className="flex-1 cursor-pointer text-black">
                          Mensuel - {monthlyPrice}€/mois
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-orange-500/20 transition-colors">
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
