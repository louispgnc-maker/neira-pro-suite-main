import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Users, ArrowLeft, Calendar, HardDrive, CreditCard, Clock, X } from 'lucide-react';
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
    description: 'Idéal pour avocats et notaires indépendants',
    summary: 'Conçu pour un seul professionnel qui travaille en autonomie.',
    features: [
      '1 utilisateur',
      '20 Go de stockage',
      '100 dossiers actifs',
      '30 clients actifs',
      '15 signatures / mois',
      'Gestion documentaire',
      'Partage sécurisé client'
    ],
    limits: '1 utilisateur • 20 Go • 100 dossiers • 30 clients • 15 signatures/mois',
    notIncluded: [
      'Espace collaboratif',
      'Données analysées'
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
    description: 'Idéal pour cabinets de 2 à 10 utilisateurs',
    summary: 'Idéal pour les cabinets qui veulent structurer leurs workflows avec espace collaboratif complet.',
    features: [
      'Jusqu\'à 10 utilisateurs',
      '100 Go de stockage',
      '600 dossiers actifs',
      '200 clients actifs',
      '80 signatures / mois',
      'Espace collaboratif complet',
      'Gestion documentaire avancée',
      'Tableaux de bord'
    ],
    limits: 'Jusqu\'à 10 utilisateurs • 100 Go • 600 dossiers • 200 clients • 80 signatures/mois',
    notIncluded: [],
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    buttonClass: 'bg-purple-600 hover:bg-purple-700',
    popular: true
  },
  {
    id: 'cabinet-plus',
    name: 'Cabinet+',
    price: '89€',
    period: '/mois',
    description: 'Idéal pour cabinets de 10 à 50+ utilisateurs',
    summary: 'Solution premium pour cabinets structurés avec tout illimité.',
    features: [
      'Utilisateurs illimités',
      'Stockage illimité',
      'Dossiers illimités',
      'Clients illimités',
      'Signatures illimitées',
      'Collaboration sans limite',
      'Tableaux de bord avancés',
      'Onboarding & formation de l\'équipe',
      'Accès anticipé aux nouveautés'
    ],
    limits: 'Tout illimité — aucune restriction',
    notIncluded: [],
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
  const [currentPlan, setCurrentPlan] = useState<string>('essentiel');
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
        console.log('No user found');
        setLoading(false);
        return;
      }

      try {
        console.log('Loading subscription for user:', user.id);
        
        // First, check if user has a cabinet_id in their profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('cabinet_id')
          .eq('id', user.id)
          .single();

        console.log('Profile data:', profileData, 'Error:', profileError);

        let cabinetId = profileData?.cabinet_id;

        // If no cabinet in profile, check cabinet_members
        if (!cabinetId) {
          const { data: memberData, error: memberError } = await supabase
            .from('cabinet_members')
            .select('cabinet_id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();
          
          console.log('Member data:', memberData, 'Error:', memberError);
          cabinetId = memberData?.cabinet_id;
        }

        if (cabinetId) {
          console.log('Found cabinet:', cabinetId);
          const { data: cabinetData, error: cabinetError } = await supabase
            .from('cabinets')
            .select('subscription_tier, subscription_status, subscription_started_at, subscription_expires_at, storage_used, storage_limit, nom')
            .eq('id', cabinetId);

          console.log('Cabinet data (array):', cabinetData, 'Error:', cabinetError);

          const cabinet = cabinetData && cabinetData.length > 0 ? cabinetData[0] : null;

          if (cabinet) {
            console.log('Setting subscription from cabinet:', cabinet);
            setCurrentPlan(cabinet.subscription_tier || 'essentiel');
            setSubscriptionData({
              tier: cabinet.subscription_tier || 'essentiel',
              status: cabinet.subscription_status || 'active',
              started_at: cabinet.subscription_started_at || new Date().toISOString(),
              expires_at: cabinet.subscription_expires_at,
              storage_used: cabinet.storage_used || 0,
              storage_limit: cabinet.storage_limit || 21474836480,
              cabinet_name: cabinet.nom || 'Mon Cabinet'
            });
          } else {
            console.log('Cabinet found but no data returned - possible RLS issue');
          }
        } else {
          console.log('No cabinet found, keeping default subscription');
        }
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoading(false);
        console.log('Loading complete. subscriptionData:', subscriptionData);
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
        <div className="container mx-auto p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement de votre abonnement...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      <AppLayout>
        <div className="container mx-auto p-8 max-w-6xl">
          {/* Bouton retour */}
          <div className="mb-8">
            <Button
              onClick={() => navigate(`${prefix}/dashboard`)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'espace collaboratif
            </Button>
          </div>

          {/* 1) En-tête */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">
              Mon abonnement actuel
            </h1>
            <p className="text-black text-lg">
              Vous utilisez actuellement l'offre ci-dessous. Vous pouvez consulter les détails de votre abonnement ou choisir une autre offre si nécessaire.
            </p>
          </div>

          {/* 2) Carte "Abonnement actuel" */}
          {subscriptionData && (() => {
            const plan = plans.find(p => p.id === subscriptionData.tier);
            const Icon = plan?.icon || Zap;
            return (
              <Card className="mb-12 border-2 border-primary shadow-xl bg-card">
                <CardHeader className="border-b border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-xl ${plan?.bgColor} bg-opacity-20 flex items-center justify-center`}>
                        <Icon className={`h-8 w-8 ${plan?.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-2xl mb-1 text-black">
                          Neira {plan?.name}
                        </CardTitle>
                        <CardDescription className="text-base text-black">
                          {plan?.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-600 text-white border-green-700 px-4 py-1.5 text-base">
                      Actif
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-black">Prix mensuel</p>
                        <p className="text-2xl font-bold text-primary">{plan?.price}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-black">Statut d'abonnement</p>
                        <p className="text-sm text-black">
                          {subscriptionData.expires_at 
                            ? `Expire le ${new Date(subscriptionData.expires_at).toLocaleDateString('fr-FR')}`
                            : 'Renouvellement automatique'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <HardDrive className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-black">Stockage</p>
                        <p className="text-sm text-black">
                          {subscriptionData.storage_limit === 0 || subscriptionData.storage_limit > 1000000000000
                            ? 'Illimité' 
                            : `${Math.round(subscriptionData.storage_limit / (1024 * 1024 * 1024))} Go`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-black">Date de début</p>
                        <p className="text-sm text-black">
                          {new Date(subscriptionData.started_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-primary/20">
                    <h4 className="font-semibold text-black mb-3">Ce qui est inclus :</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                      {plan?.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 shrink-0" />
                          <span className="text-sm text-black">{feature}</span>
                        </div>
                      ))}
                    </div>
                    {plan?.notIncluded && plan.notIncluded.length > 0 && (
                      <div className="pt-4 border-t border-primary/20">
                        <h4 className="font-semibold text-black mb-3">Ce qui n'est pas inclus :</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {plan.notIncluded.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <X className="h-4 w-4 text-red-500 shrink-0" />
                              <span className="text-sm text-muted-foreground">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* 3) Section "Changer d'abonnement" */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-black mb-2">
              Changer d'abonnement
            </h2>
            <p className="text-black mb-6">
              Besoin d'une offre différente ? Découvrez ci-dessous les autres abonnements disponibles.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.filter(p => p.id !== subscriptionData?.tier).map((plan) => {
                const Icon = plan.icon;
                return (
                  <Card key={plan.id} className="border-2 border-primary/30 hover:border-primary transition-all hover:shadow-lg bg-card">
                    <CardHeader className="pb-3">
                      <div className={`w-12 h-12 rounded-lg ${plan.bgColor} bg-opacity-20 flex items-center justify-center mb-3`}>
                        <Icon className={`h-6 w-6 ${plan.color}`} />
                      </div>
                      {plan.popular && (
                        <Badge className="mb-2 w-fit bg-purple-600 text-white">Populaire</Badge>
                      )}
                      <CardTitle className="text-xl text-black">Neira {plan.name}</CardTitle>
                      <CardDescription className="text-black">{plan.description}</CardDescription>
                      <div className="mt-4">
                        <span className="text-3xl font-bold text-black">{plan.price}</span>
                        <span className="text-black">/mois</span>
                      </div>
                      {plan.limits && (
                        <div className="mt-3 p-2 bg-muted/50 rounded-md">
                          <p className="text-xs text-black font-medium">{plan.limits}</p>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <h4 className="font-semibold text-black mb-3 text-sm">Inclus :</h4>
                        <ul className="space-y-2">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                              <span className="text-black">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {plan.notIncluded && plan.notIncluded.length > 0 && (
                        <div className="mb-4 pt-4 border-t">
                          <h4 className="font-semibold text-black mb-3 text-sm">Non inclus :</h4>
                          <ul className="space-y-2">
                            {plan.notIncluded.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <X className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <Button 
                        className={`w-full ${plan.buttonClass}`}
                        onClick={() => navigate(`${prefix}/checkout/${plan.id}`)}
                      >
                        Passer à cette offre
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* 4) Section "Besoin d'aide ?" - Version statique en bas de page */}
          <Card className="bg-card border-2 border-primary/30">
            <CardHeader>
              <CardTitle className="text-xl text-black">Besoin d'aide pour choisir ?</CardTitle>
              <CardDescription className="text-black">
                Notre équipe est disponible pour vous accompagner dans le choix de votre abonnement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate(`${prefix}/contact-support`)}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Nous contacter
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </>
  );
}
