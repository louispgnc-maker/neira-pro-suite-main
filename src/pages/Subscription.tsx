import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Users, ArrowLeft } from 'lucide-react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

const plans = [
  {
    id: 'essentiel',
    name: 'Essentiel',
    price: '49€',
    period: '/mois',
    description: 'Pour les professionnels indépendants',
    features: [
      'Gestion de documents',
      'Signatures électroniques',
      'Jusqu\'à 50 clients',
      'Support par email',
      '5 Go de stockage'
    ],
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    buttonClass: 'bg-blue-600 hover:bg-blue-700'
  },
  {
    id: 'professionnel',
    name: 'Professionnel',
    price: '99€',
    period: '/mois',
    description: 'Pour les cabinets en croissance',
    features: [
      'Toutes les fonctionnalités Essentiel',
      'Gestion de dossiers avancée',
      'Jusqu\'à 200 clients',
      'Support prioritaire',
      '50 Go de stockage',
      'Rapports personnalisés'
    ],
    icon: Crown,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    buttonClass: 'bg-orange-600 hover:bg-orange-700',
    popular: true
  },
  {
    id: 'cabinet-plus',
    name: 'Cabinet+',
    price: '199€',
    period: '/mois',
    description: 'Pour les cabinets collaboratifs',
    features: [
      'Toutes les fonctionnalités Professionnel',
      'Collaboration multi-utilisateurs',
      'Clients illimités',
      'Support dédié 24/7',
      'Stockage illimité',
      'API et intégrations avancées',
      'Espace collaboratif complet'
    ],
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    buttonClass: 'bg-purple-600 hover:bg-purple-700'
  }
];

export default function Subscription() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  const role: 'avocat' | 'notaire' = location.pathname.includes('/notaires') ? 'notaire' : 'avocat';
  const prefix = role === 'notaire' ? '/notaires' : '/avocats';

  useEffect(() => {
    const loadSubscription = async () => {
      if (!user) {
        navigate(`${prefix}/auth`);
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
            .select('subscription_tier')
            .eq('id', cabinetData.cabinet_id)
            .single();

          if (cabinet) {
            setCurrentPlan(cabinet.subscription_tier || 'essentiel');
          }
        }
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, [user, navigate, prefix]);

  const handleUpgrade = (planId: string) => {
    // Redirect to checkout page
    navigate(`/checkout/${planId}`);
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <main className="flex-1 overflow-y-auto bg-sidebar">
            <div className="container mx-auto p-8">
              <p>Chargement...</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto bg-sidebar">
          <div className="container mx-auto p-8">
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => navigate(`${prefix}/espace-collaboratif`)}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à l'espace collaboratif
              </Button>
              <h1 className="text-3xl font-bold">Gérer votre abonnement</h1>
              <p className="text-muted-foreground mt-2">
                Choisissez l'offre qui correspond le mieux à vos besoins
              </p>
            </div>

            {currentPlan && (
              <Card className="mb-8 border-2 border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Votre abonnement actuel</CardTitle>
                      <CardDescription>
                        Vous êtes actuellement sur l'offre{' '}
                        <span className="font-semibold">
                          {plans.find(p => p.id === currentPlan)?.name || currentPlan}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge variant="default" className="text-lg px-4 py-2">
                      Actif
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            )}

            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const Icon = plan.icon;
                const isCurrentPlan = currentPlan === plan.id;
                
                return (
                  <Card
                    key={plan.id}
                    className={`relative ${isCurrentPlan ? 'border-2 border-primary shadow-lg' : ''} ${plan.popular ? 'border-2 border-orange-300' : ''}`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-orange-600 text-white">Populaire</Badge>
                      </div>
                    )}
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

            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Besoin d'aide ?</CardTitle>
                <CardDescription>
                  Notre équipe est là pour vous accompagner dans le choix de votre abonnement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => navigate('/contact')}>
                    Nous contacter
                  </Button>
                  <Button variant="outline">
                    Comparer les offres
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
