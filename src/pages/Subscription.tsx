import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Users, ArrowLeft, Calendar, HardDrive, CreditCard, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

type SubscriptionData = {
  tier: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  storage_used: number;
  storage_limit: number;
  cabinet_name: string;
};

const plans = [
  {
    id: 'essentiel',
    name: 'Essentiel',
    price: '39€',
    period: '/mois',
    description: 'Pour indépendants & petits cabinets',
    summary: 'L\'offre Essentiel vous donne accès à tous les outils essentiels pour gérer efficacement votre activité : espace collaboratif, gestion documentaire, partage sécurisé avec vos clients, et signature électronique. Parfait pour démarrer avec 20 Go de stockage et un support dédié.',
    features: [
      'Espace collaboratif complet',
      'Gestion documentaire intelligente',
      'Partage sécurisé + dépôt client',
      'Planning + tâches + rappels',
      'Signature électronique (5/mois)',
      '20 Go de stockage',
      'Suivi des dossiers / clients',
      'Support email'
    ],
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    buttonClass: 'bg-blue-600 hover:bg-blue-700'
  },
  {
    id: 'professionnel',
    name: 'Professionnel',
    price: '59€',
    period: '/mois',
    description: 'Offre cœur de gamme',
    summary: 'L\'offre Professionnel ajoute des fonctionnalités avancées pour automatiser votre cabinet : workflows personnalisés, génération automatique de documents, modèles juridiques, signature illimitée et 100 Go de stockage. Idéal pour les cabinets en croissance qui cherchent à optimiser leur productivité avec un reporting détaillé et un support prioritaire.',
    features: [
      'Tout ce qu\'il y a dans Essentiel',
      'Automatisations & workflows',
      'Génération automatique de documents',
      'Modèles juridiques personnalisables',
      'Signature électronique illimitée',
      '100 Go de stockage',
      'Gestion des droits utilisateurs',
      'Tableaux de bord & reporting',
      'Historique d\'activité avancé',
      'Support prioritaire'
    ],
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    buttonClass: 'bg-purple-600 hover:bg-purple-700',
    popular: true
  },
  {
    id: 'cabinet-plus',
    name: 'Cabinet+',
    price: '129€',
    period: '/mois',
    description: 'Pour cabinets structurés (5-50 personnes)',
    summary: 'L\'offre Cabinet+ est la solution premium pour les cabinets structurés : automatisations illimitées, dossiers clients avancés, intégrations API, stockage illimité. Bénéficiez d\'un accompagnement personnalisé avec onboarding dédié, formation de votre équipe, support 7j/7 avec SLA garanti et accès anticipé aux nouvelles fonctionnalités.',
    features: [
      'Tout le Pro',
      'Automatisations illimitées',
      'Dossiers clients avancés',
      'API + intégrations externes',
      'Stockage illimité',
      'Onboarding personnalisé',
      'Support 7j/7 + SLA',
      'Formation de l\'équipe',
      'Accès anticipé aux futures features'
    ],
    icon: Users,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    buttonClass: 'bg-orange-600 hover:bg-orange-700'
  }
];

export default function Subscription() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);

  const role: 'avocat' | 'notaire' = location.pathname.includes('/notaires') ? 'notaire' : 'avocat';
  const prefix = role === 'notaire' ? '/notaires' : '/avocats';

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Go';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} Go`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
      active: { label: 'Actif', variant: 'default' },
      trial: { label: 'Essai', variant: 'secondary' },
      cancelled: { label: 'Annulé', variant: 'destructive' },
      expired: { label: 'Expiré', variant: 'outline' }
    };
    const config = statusMap[status] || statusMap.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  useEffect(() => {
    const loadSubscription = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Load current subscription from cabinet
        const { data: cabinetData } = await supabase
          .from('cabinet_members')
          .select('cabinet_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (cabinetData) {
          const { data: cabinet } = await supabase
            .from('cabinets')
            .select('subscription_tier, subscription_status, subscription_started_at, subscription_expires_at, storage_used, storage_limit, nom')
            .eq('id', cabinetData.cabinet_id)
            .single();

          if (cabinet) {
            console.log('Loaded subscription:', cabinet);
            setCurrentPlan(cabinet.subscription_tier || 'essentiel');
            setSubscriptionData({
              tier: cabinet.subscription_tier || 'essentiel',
              status: cabinet.subscription_status || 'active',
              started_at: cabinet.subscription_started_at,
              expires_at: cabinet.subscription_expires_at,
              storage_used: cabinet.storage_used || 0,
              storage_limit: cabinet.storage_limit || 21474836480,
              cabinet_name: cabinet.nom
            });
          }
        }
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, [user]);

  const handleUpgrade = (planId: string) => {
    // Redirect to checkout page
    navigate(`/checkout/${planId}`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-8">
          <p>Chargement...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-8">
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => navigate('/espace-collaboratif')}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à l'espace collaboratif
              </Button>
            </div>
            
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {profile?.first_name || 'Utilisateur'}, voici l'abonnement actuel
            </h2>

            {currentPlan && subscriptionData && (
              <div className="mb-8">
                {/* Case avec le nom de l'abonnement */}
                <Card className="border-4 border-primary bg-gradient-to-br from-primary/10 to-primary/20 shadow-xl mb-6">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        {(() => {
                          const plan = plans.find(p => p.id === subscriptionData.tier);
                          const Icon = plan?.icon || Zap;
                          return (
                            <>
                              <div className={`w-20 h-20 rounded-xl ${plan?.bgColor} flex items-center justify-center shadow-lg`}>
                                <Icon className={`h-10 w-10 ${plan?.color}`} />
                              </div>
                              <div>
                                <h3 className="text-4xl font-bold text-foreground">
                                  Neira {plan?.name}
                                </h3>
                                <p className="text-muted-foreground mt-2 text-lg">
                                  {plan?.description}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="text-right">
                        <div className="text-5xl font-bold text-foreground">
                          {plans.find(p => p.id === subscriptionData.tier)?.price}
                        </div>
                        <div className="text-muted-foreground text-lg">/mois</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div id="all-plans">
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const Icon = plan.icon;
                const isCurrentPlan = currentPlan === plan.id;
                
                return (
                  <Card
                    key={plan.id}
                    className={`relative ${isCurrentPlan ? 'border-2 border-primary shadow-lg' : ''}`}
                  >
                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-primary text-white">Actuel</Badge>
                      </div>
                    )}
                    
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-lg ${plan.bgColor} flex items-center justify-center mb-4`}>
                        <Icon className={`h-6 w-6 ${plan.color}`} />
                      </div>
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                      <div className="mt-4">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        <span className="text-muted-foreground">{plan.period}</span>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {isCurrentPlan ? (
                        <Button className="w-full" variant="outline" disabled>
                          Abonnement actuel
                        </Button>
                      ) : (
                        <Button
                          className={`w-full ${plan.buttonClass} text-white`}
                          onClick={() => handleUpgrade(plan.id)}
                        >
                          {currentPlan && plans.findIndex(p => p.id === plan.id) > plans.findIndex(p => p.id === currentPlan)
                            ? 'Passer à cette offre'
                            : currentPlan
                            ? 'Rétrograder'
                            : 'Choisir cette offre'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-8 flex justify-end">
              <Card className="w-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Besoin d'aide ?</CardTitle>
                  <CardDescription className="text-xs">
                    Notre équipe est là pour vous accompagner dans le choix de votre abonnement
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => navigate('/contact')}>
                    Nous contacter
                  </Button>
                </CardContent>
              </Card>
            </div>
      </div>
    </AppLayout>
  );
}
