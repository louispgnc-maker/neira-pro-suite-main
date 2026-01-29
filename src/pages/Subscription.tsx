import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Users, ArrowLeft, Calendar, HardDrive, CreditCard, Clock, X, CheckCircle2, Info } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { createStripeCheckoutSession } from '@/lib/stripeCheckout';
import { STRIPE_PRICE_IDS } from '@/lib/stripeConfig';

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
    price: '45€',
    period: '/mois',
    description: 'Idéal pour avocats et notaires indépendants',
    summary: 'Conçu pour un seul professionnel qui travaille en autonomie.',
    features: [
      'Idéal pour avocats et notaires indépendants',
      '20 Go de stockage',
      '100 dossiers actifs',
      '30 clients actifs',
      '15 signatures / mois',
      'Gestion documentaire',
      'Partage sécurisé client'
    ],
    limits: 'Idéal pour avocats et notaires indépendants • 20 Go • 100 dossiers • 30 clients • 15 signatures/mois',
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
    price: '69€',
    period: '/mois',
    description: 'Idéal pour cabinets de 2 à 10 utilisateurs',
    summary: 'Idéal pour les cabinets qui veulent structurer leurs workflows avec espace collaboratif complet.',
    features: [
      '100 Go de stockage',
      '600 dossiers actifs',
      '200 clients actifs',
      '80 signatures / mois',
      'Espace collaboratif complet',
      'Gestion documentaire avancée',
      'Tableaux de bord'
    ],
    limits: '100 Go • 600 dossiers • 200 clients • 80 signatures/mois',
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
    price: '99€',
    period: '/mois',
    description: 'Idéal pour cabinets de 10 à 50+ utilisateurs',
    summary: 'Pour les cabinets recherchant une solution sans limite, quelle que soit leur taille.',
    features: [
      'Idéal pour cabinets de 10 à 50+ utilisateurs',
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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeMembersCount, setActiveMembersCount] = useState<number>(0);
  const [cabinetId, setCabinetId] = useState<string | null>(null);

  const role: 'avocat' | 'notaire' = location.pathname.includes('/notaires') ? 'notaire' : 'avocat';
  const prefix = role === 'notaire' ? '/notaires' : '/avocats';

  // Listen for subscription changes
  useEffect(() => {
    const handleRefresh = () => setRefreshTrigger(prev => prev + 1);
    window.addEventListener('subscription-updated', handleRefresh);
    return () => window.removeEventListener('subscription-updated', handleRefresh);
  }, []);

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

        // TOUJOURS récupérer le membership (un seul possible grâce à la contrainte DB)
        // Le cabinet_id du profil peut être obsolète si l'utilisateur a changé de cabinet
        // IMPORTANT: Filtrer par rôle (notaire/avocat) car un user peut avoir 1 cabinet de chaque type
        const { data: memberData, error: memberError } = await supabase
          .from('cabinet_members')
          .select('cabinet_id, role_cabinet, cabinets!inner(role)')
          .eq('user_id', user.id)
          .eq('cabinets.role', role)
          .single();
        
        console.log('Active member data for role', role, ':', memberData, 'Error:', memberError);
        
        if (!memberData) {
          console.warn('⚠️ NO MEMBER DATA - User is not in any cabinet!');
          console.log('This user will not be able to manage subscriptions.');
        }
        
        let cabinetId = memberData?.cabinet_id;
        
        if (memberData) {
          console.log('🔍 DEBUGGING ROLE:');
          console.log('  - role_cabinet value:', memberData.role_cabinet);
          console.log('  - role_cabinet type:', typeof memberData.role_cabinet);
          console.log('  - Exact comparison:', memberData.role_cabinet === 'Fondateur');
          
          setUserRole(memberData.role_cabinet);
          const isFounder = memberData.role_cabinet === 'Fondateur';
          setIsManager(isFounder);
          setCabinetId(cabinetId);
          console.log('User role:', memberData.role_cabinet, 'isManager:', isFounder);
          
          // Si le cabinet_id du profil ne correspond pas au cabinet actif, le mettre à jour
          if (profileData?.cabinet_id !== cabinetId) {
            console.log('Updating profile cabinet_id from', profileData?.cabinet_id, 'to', cabinetId);
            await supabase
              .from('profiles')
              .update({ cabinet_id: cabinetId })
              .eq('id', user.id);
          }
        }

        if (cabinetId) {
          console.log('Found cabinet:', cabinetId);
          
          // Charger le nombre de membres
          const { data: membersData } = await supabase
            .from('cabinet_members')
            .select('id', { count: 'exact' })
            .eq('cabinet_id', cabinetId);
          
          const memberCount = membersData?.length || 0;
          setActiveMembersCount(memberCount);
          console.log('Active members count:', memberCount);
          
          const { data: cabinetData, error: cabinetError } = await supabase
            .from('cabinets')
            .select('subscription_plan, subscription_status, subscription_started_at, subscription_expires_at, storage_used, storage_limit, nom')
            .eq('id', cabinetId);

          console.log('Cabinet data (array):', cabinetData, 'Error:', cabinetError);

          const cabinet = cabinetData && cabinetData.length > 0 ? cabinetData[0] : null;

          if (cabinet) {
            console.log('Setting subscription from cabinet:', cabinet);
            console.log('Cabinet subscription_plan value:', cabinet.subscription_plan);
            console.log('Available plan IDs:', plans.map(p => p.id));
            
            const planValue = cabinet.subscription_plan || 'essentiel';
            setCurrentPlan(planValue);
            setSubscriptionData({
              tier: planValue,
              status: cabinet.subscription_status || 'active',
              started_at: cabinet.subscription_started_at || new Date().toISOString(),
              expires_at: cabinet.subscription_expires_at,
              storage_used: cabinet.storage_used || 0,
              storage_limit: cabinet.storage_limit || 21474836480,
              cabinet_name: cabinet.nom || 'Mon Cabinet'
            });
            console.log('subscriptionData set with tier:', planValue);
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
        console.log('Loading complete. subscriptionData:', subscriptionData, 'isManager:', isManager);
      }
    };

    loadSubscription();
  }, [user, refreshTrigger]);

  const handleUpgrade = async (planId: string) => {
    // Vérifier si le plan choisi peut accueillir le nombre actuel de membres
    const planLimits: { [key: string]: number } = {
      'essentiel': 1,
      'professionnel': 10,
      'cabinet-plus': 999
    };
    
    const maxMembers = planLimits[planId];
    
    if (maxMembers && activeMembersCount > maxMembers) {
      toast.error(
        `Impossible de passer à cette offre`,
        {
          description: `Votre cabinet compte actuellement ${activeMembersCount} membre${activeMembersCount > 1 ? 's' : ''} actif${activeMembersCount > 1 ? 's' : ''}. L'offre ${planId === 'essentiel' ? 'Essentiel' : 'Professionnel'} est limitée à ${maxMembers} membre${maxMembers > 1 ? 's' : ''}. Veuillez d'abord retirer des membres ou choisir une offre supérieure.`,
          duration: 6000,
        }
      );
      return;
    }
    
    // Redirect to checkout page with prefix
    navigate(`${prefix}/checkout/${planId}`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement de votre abonnement...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <AppLayout>
        <div className="container mx-auto p-8 max-w-6xl">
          {/* Bouton retour */}
          <div className="mb-8">
            <Button
              onClick={() => navigate(-1)}
              className={role === 'notaire' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
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
            console.log('Rendering subscription card with tier:', subscriptionData.tier);
            const plan = plans.find(p => p.id === subscriptionData.tier);
            console.log('Found plan:', plan);
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
                          Neira {plan?.name || subscriptionData.tier}
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
                              <span className="text-sm text-gray-600">{item}</span>
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

          {/* Section Gérer le nombre de membres (seulement pour Professionnel et Cabinet+) */}
          {isManager && (currentPlan === 'professionnel' || currentPlan === 'cabinet-plus') && (
            <Card className={`mb-12 border-2 ${role === 'notaire' ? 'border-orange-200 bg-orange-50/50' : 'border-blue-200 bg-blue-50/50'}`}>
              <CardHeader>
                <CardTitle className="text-xl text-black flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gérer le nombre de membres
                </CardTitle>
                <CardDescription className="text-black">
                  Augmentez ou réduisez le nombre de membres de votre abonnement {currentPlan === 'professionnel' ? 'Professionnel' : 'Cabinet+'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`bg-white rounded-lg p-4 border ${role === 'notaire' ? 'border-orange-200' : 'border-blue-200'}`}>
                  <p className="text-sm text-black mb-4">
                    Vous avez actuellement <strong>{activeMembersCount} membre{activeMembersCount > 1 ? 's' : ''} actif{activeMembersCount > 1 ? 's' : ''}</strong> dans votre cabinet.
                  </p>
                  <Button
                    onClick={() => navigate(`${prefix}/subscription/manage-members`)}
                    className={role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}
                  >
                    Modifier le nombre de membres
                  </Button>
                  <p className="text-xs text-gray-600 mt-2">
                    {currentPlan === 'professionnel' 
                      ? 'Prix : 69€/mois par membre (2 à 10 membres)'
                      : 'Prix : 99€/mois par membre (illimité)'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 3) Section "Changer d'abonnement" */}
          {isManager ? (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-black mb-2">
                Changer d'abonnement
              </h2>
              <p className="text-black mb-6">
                En tant que gérant du cabinet, vous pouvez modifier l'abonnement ci-dessous.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {plans.filter(p => p.id !== subscriptionData?.tier).map((plan) => {
                  const Icon = plan.icon;
                  const isProfessionnel = plan.id === 'professionnel';
                  const isEssentiel = plan.id === 'essentiel';
                  const isCabinetPlus = plan.id === 'cabinet-plus';
                  
                  return (
                    <Card 
                      key={plan.id} 
                      className={`p-6 bg-white/90 backdrop-blur transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                        isProfessionnel ? 'border-2 border-purple-500 relative' : 
                        isEssentiel ? 'hover:border-2 hover:border-blue-500' :
                        'hover:border-2 hover:border-orange-500'
                      }`}
                    >
                      {isProfessionnel && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-4 py-1 rounded-full text-xs font-semibold">
                          POPULAIRE
                        </div>
                      )}
                      
                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">NEIRA {plan.name.toUpperCase()}</h3>
                        <div className={`text-4xl font-bold mb-2 ${
                          isEssentiel ? 'text-blue-600' : isProfessionnel ? 'text-purple-600' : 'text-orange-600'
                        }`}>
                          {plan.price}
                        </div>
                        <p className="text-sm text-gray-600">par mois / utilisateur</p>
                      </div>
                      
                      <div className="mb-4">
                        <h4 className="font-semibold text-gray-900 mb-3 text-sm">Comprend :</h4>
                        <div className="space-y-2">
                          {plan.features.map((feature, idx) => {
                            const isSignatureFeature = feature.toLowerCase().includes('signature');
                            
                            return (
                              <div key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                {isSignatureFeature ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm text-gray-700">{feature}</span>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className={`w-3.5 h-3.5 text-gray-400 cursor-help transition-colors ${
                                          isEssentiel ? 'hover:text-blue-600' : isProfessionnel ? 'hover:text-purple-600' : 'hover:text-orange-600'
                                        }`} />
                                      </TooltipTrigger>
                                      <TooltipContent className={`max-w-xs bg-gradient-to-br ${
                                        isEssentiel ? 'from-blue-50 to-white border-blue-200' :
                                        isProfessionnel ? 'from-purple-50 to-white border-purple-200' :
                                        'from-orange-50 to-white border-orange-200'
                                      }`}>
                                        <div className="space-y-2">
                                          <p className={`text-xs font-bold ${
                                            isEssentiel ? 'text-blue-900' : isProfessionnel ? 'text-purple-900' : 'text-orange-900'
                                          }`}>
                                            1 signature = 1 enveloppe
                                          </p>
                                          <p className="text-xs text-gray-700">Nombre de signataires illimité par enveloppe</p>
                                          {!isCabinetPlus && (
                                            <>
                                              <p className="text-xs text-gray-700">Quota personnel non mutualisé</p>
                                              <div className={`pt-2 border-t mt-2 ${
                                                isEssentiel ? 'border-blue-200' : 'border-purple-200'
                                              }`}>
                                                <p className={`text-xs font-semibold mb-1.5 ${
                                                  isEssentiel ? 'text-blue-800' : 'text-purple-800'
                                                }`}>
                                                  📦 Packs optionnels :
                                                </p>
                                                <div className="space-y-1">
                                                  {isEssentiel ? (
                                                    <>
                                                      <div className="flex justify-between items-center">
                                                        <span className="text-xs text-gray-600">+10 signatures</span>
                                                        <span className="text-xs font-semibold text-blue-700">+7€/mois</span>
                                                      </div>
                                                      <div className="flex justify-between items-center">
                                                        <span className="text-xs text-gray-600">+25 signatures</span>
                                                        <span className="text-xs font-semibold text-blue-700">+15€/mois</span>
                                                      </div>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <div className="flex justify-between items-center">
                                                        <span className="text-xs text-gray-600">+40 signatures</span>
                                                        <span className="text-xs font-semibold text-purple-700">+15€/mois/utilisateur</span>
                                                      </div>
                                                      <div className="flex justify-between items-center">
                                                        <span className="text-xs text-gray-600">+100 signatures ⭐</span>
                                                        <span className="text-xs font-semibold text-purple-700">+29€/mois/utilisateur</span>
                                                      </div>
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                            </>
                                          )}
                                          {isCabinetPlus && (
                                            <div className="pt-1.5 border-t border-orange-200">
                                              <p className="text-xs text-orange-700 font-medium">✨ Aucune limite mensuelle</p>
                                            </div>
                                          )}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-700">{feature}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {plan.notIncluded && plan.notIncluded.length > 0 && (
                        <div className="mb-4 pt-4 border-t">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Ne comprend pas :</h4>
                          <div className="space-y-2">
                            {plan.notIncluded.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                </div>
                                <span className="text-sm text-gray-500">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {isProfessionnel && (
                        <div className="mb-4 pt-4 border-t">
                          <p className="text-sm text-green-700 font-semibold">⚡ Pensé pour les cabinets en croissance</p>
                        </div>
                      )}
                      
                      <Button 
                        className={`w-full ${
                          isEssentiel ? 'bg-blue-600 hover:bg-blue-700' :
                          isProfessionnel ? 'bg-purple-600 hover:bg-purple-700' :
                          'bg-orange-600 hover:bg-orange-700'
                        } text-white`}
                        onClick={() => handleUpgrade(plan.id)}
                      >
                        Passer à cette offre
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mb-12">
              <Card className="border-2 border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-xl text-black">Modification d'abonnement réservée au Fondateur</CardTitle>
                  <CardDescription className="text-black">
                    Seul le fondateur du cabinet peut changer l'abonnement. Contactez-le si vous souhaitez effectuer des modifications.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* 4) Section "Besoin d'aide ?" - Seulement visible pour le Fondateur */}
          {isManager && (
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
                  className={role === 'notaire' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}
                >
                  Nous contacter
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </AppLayout>
    </TooltipProvider>
  );
}
