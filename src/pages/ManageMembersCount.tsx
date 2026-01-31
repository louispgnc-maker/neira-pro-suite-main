import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Users, Plus, Minus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { toast } from 'sonner';

export default function ManageMembersCount() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentMembers, setCurrentMembers] = useState(0);
  const [activeMembersCount, setActiveMembersCount] = useState(0);
  const [newMembersCount, setNewMembersCount] = useState(0);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [currentPlan, setCurrentPlan] = useState<'professionnel' | 'cabinet-plus'>('cabinet-plus');
  const [nextBillingDate, setNextBillingDate] = useState<Date | null>(null);
  
  const role: 'avocat' | 'notaire' = location.pathname.includes('/notaires') ? 'notaire' : 'avocat';
  const prefix = role === 'notaire' ? '/notaires' : '/avocats';

  const planPrices = {
    'professionnel': 69,
    'cabinet-plus': 99
  };

  const pricePerMember = planPrices[currentPlan];
  const currentMonthlyPrice = pricePerMember * currentMembers;
  const newMonthlyPrice = pricePerMember * newMembersCount;
  const currentPrice = billingPeriod === 'monthly' ? currentMonthlyPrice : Math.round(currentMonthlyPrice * 12 * 0.9);
  const newPrice = billingPeriod === 'monthly' ? newMonthlyPrice : Math.round(newMonthlyPrice * 12 * 0.9);

  // Calcul du prorata
  const memberDiff = newMembersCount - currentMembers;
  const isAdding = memberDiff > 0;
  const isRemoving = memberDiff < 0;
  const priceDiff = newPrice - currentPrice;

  // Calcul du prorata pour affichage (seulement pour les ajouts, pas de remboursement pour les suppressions)
  let prorataAmount = 0;
  let remainingDays = 0;
  
  if (memberDiff !== 0 && isAdding) {
    const now = new Date();
    
    // Calculer les jours restants et totaux de la période de facturation
    let totalDays;
    if (nextBillingDate) {
      const diffTime = nextBillingDate.getTime() - now.getTime();
      remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Calculer le nombre de jours total de la période de facturation actuelle
      // en remontant d'un cycle en arrière depuis nextBillingDate
      const periodStart = new Date(nextBillingDate);
      if (billingPeriod === 'monthly') {
        periodStart.setMonth(periodStart.getMonth() - 1);
      } else {
        periodStart.setFullYear(periodStart.getFullYear() - 1);
      }
      
      // Nombre de jours entre le début et la fin de la période
      const periodDiffTime = nextBillingDate.getTime() - periodStart.getTime();
      totalDays = Math.ceil(periodDiffTime / (1000 * 60 * 60 * 24));
    } else {
      // Estimation : 15 jours restants sur 30 jours par défaut
      remainingDays = 15;
      totalDays = 30;
    }
    
    // Prorata = différence de prix × (jours restants / jours totaux)
    // Mais ne doit jamais dépasser le prix mensuel complet
    const memberPriceDiff = Math.abs(memberDiff) * pricePerMember;
    const prorataCalc = memberPriceDiff * Math.min(1, remainingDays / totalDays);
    
    // Arrondir à l'euro supérieur
    prorataAmount = Math.ceil(prorataCalc);
  }

  useEffect(() => {
    const loadCabinetData = async () => {
      if (!user) return;

      try {
        console.log('Current user ID:', user.id);
        console.log('Current role/space:', role);
        
        // Récupérer le cabinet_id pour le rôle actuel (notaire ou avocat)
        const { data: memberData } = await supabase
          .from('cabinet_members')
          .select('cabinet_id, cabinets!inner(role)')
          .eq('user_id', user.id)
          .eq('cabinets.role', role);

        console.log('Member data for role', role, ':', memberData);

        if (!memberData || memberData.length === 0) {
          console.error('No cabinet found for user in role:', role);
          return;
        }

        const cabinetId = memberData[0].cabinet_id;
        console.log('Cabinet ID for role', role, ':', cabinetId);

        // Récupérer les infos du cabinet via RPC (bypass RLS)
        const { data: cabinetData, error: cabinetError } = await supabase
          .rpc('get_cabinet_subscription_info', { user_id_param: user.id });

        console.log('Cabinet data from RPC:', cabinetData);
        console.log('Cabinet error:', cabinetError);

        if (cabinetData && cabinetData.length > 0) {
          // Find the cabinet that matches the cabinetId for current role
          const cabinet = cabinetData.find((c: any) => c.cabinet_id === cabinetId);
          
          if (!cabinet) {
            console.error('Cabinet not found in RPC results for cabinet_id:', cabinetId);
            return;
          }
          
          console.log('Selected cabinet details:', {
            cabinet_id: cabinet.cabinet_id,
            plan: cabinet.subscription_plan,
            max_members: cabinet.max_members,
            billing_period: cabinet.billing_period
          });
          
          const plan = cabinet.subscription_plan as 'professionnel' | 'cabinet-plus';
          setCurrentPlan(plan);
          
          // Pour Cabinet+, max_members peut être null (illimité)
          // On utilise le nombre de membres actifs comme référence si max_members est null
          let maxMembers = cabinet.max_members;
          console.log('max_members from DB:', maxMembers, 'type:', typeof maxMembers);
          
          if (maxMembers === null || maxMembers === undefined) {
            // Compter les membres d'abord
            const { data: tempMembersData } = await supabase
              .rpc('get_cabinet_members_simple', { cabinet_id_param: cabinet.cabinet_id });
            const tempActiveCount = tempMembersData?.length || 0;
            maxMembers = Math.max(tempActiveCount, plan === 'professionnel' ? 2 : 1);
            console.log('max_members was null, using:', maxMembers);
          }
          
          console.log('Final maxMembers to display:', maxMembers);
          setCurrentMembers(maxMembers);
          setNewMembersCount(maxMembers);
          setBillingPeriod(cabinet.billing_period || 'monthly');

          // Calculer la prochaine date de facturation
          if (cabinet.subscription_started_at) {
            const startDate = new Date(cabinet.subscription_started_at);
            const now = new Date();
            let monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
            if (now.getDate() < startDate.getDate()) monthsDiff--;
            
            const nextBilling = new Date(startDate);
            nextBilling.setMonth(nextBilling.getMonth() + monthsDiff + 1);
            setNextBillingDate(nextBilling);
            console.log('Next billing date:', nextBilling);
          }

          // Compter les membres
          const { data: membersData } = await supabase
            .rpc('get_cabinet_members_simple', { cabinet_id_param: cabinet.cabinet_id });

          console.log('Members data:', membersData);
          const activeCount = membersData?.length || 0;
          console.log('Active members count:', activeCount);
          setActiveMembersCount(activeCount);
        }
      } catch (error) {
        console.error('Error loading cabinet data:', error);
      }
    };

    loadCabinetData();
  }, [user, role]);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Vérifier qu'on ne descend pas en dessous du nombre de membres actifs
      if (newMembersCount < activeMembersCount) {
        toast.error('Nombre de membres insuffisant', {
          description: `Votre cabinet compte actuellement ${activeMembersCount} membre${activeMembersCount > 1 ? 's' : ''} actif${activeMembersCount > 1 ? 's' : ''}. Vous devez retirer des membres avant de réduire votre abonnement.`,
          duration: 6000
        });
        setLoading(false);
        return;
      }

      // Vérifier les limites du plan
      if (currentPlan === 'professionnel' && (newMembersCount < 2 || newMembersCount > 10)) {
        toast.error('Limite du plan', {
          description: 'Le plan Professionnel accepte entre 2 et 10 membres.',
          duration: 4000
        });
        setLoading(false);
        return;
      }

      // Récupérer le cabinet_id et le stripe_subscription_item_id pour le rôle actuel
      const { data: memberData } = await supabase
        .from('cabinet_members')
        .select('cabinet_id, cabinets!inner(role, stripe_subscription_item_id)')
        .eq('user_id', user?.id)
        .eq('cabinets.role', role);

      if (!memberData || memberData.length === 0) {
        toast.error('Cabinet introuvable pour cet espace');
        setLoading(false);
        return;
      }

      const cabinetId = memberData[0].cabinet_id;
      const stripeSubscriptionItemId = (memberData[0].cabinets as any).stripe_subscription_item_id;

      if (!stripeSubscriptionItemId) {
        toast.error('Erreur de configuration', {
          description: 'Abonnement Stripe non trouvé. Veuillez contacter le support.'
        });
        setLoading(false);
        return;
      }

      // Mettre à jour la quantité via Stripe (avec proratisation automatique)
      const { data: stripeData, error: stripeError } = await supabase.functions.invoke(
        'update-subscription-quantity',
        {
          body: {
            subscriptionItemId: stripeSubscriptionItemId,
            quantity: newMembersCount
          }
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message || 'Erreur lors de la mise à jour de l\'abonnement Stripe');
      }

      // Mettre à jour le nombre de membres dans la base de données
      const { error: dbError } = await supabase
        .from('cabinets')
        .update({
          max_members: newMembersCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', cabinetId);

      if (dbError) throw dbError;

      // Message avec détails du prorata
      const prorataInfo = stripeData?.prorata;
      let description = `Votre abonnement comprend maintenant ${newMembersCount} membre${newMembersCount > 1 ? 's' : ''}.`;
      
      if (prorataInfo) {
        if (prorataInfo.isAdding) {
          description += ` Une facture prorata de ${prorataInfo.amount}€ a été générée pour les ${prorataInfo.remainingDays} jours restants jusqu'à votre prochaine facturation.`;
        } else {
          description += ` Un crédit prorata de ${prorataInfo.amount}€ sera appliqué.`;
        }
      }

      toast.success('Abonnement mis à jour !', {
        description,
        duration: 6000
      });

      setTimeout(() => {
        navigate(`${prefix}/subscription`);
      }, 2000);
    } catch (error: any) {
      console.error('Error updating members:', error);
      toast.error('Erreur', {
        description: error.message || 'Une erreur est survenue lors de la mise à jour.'
      });
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-8 max-w-4xl">
        <Button
          onClick={() => navigate(-1)}
          className={`mb-6 text-white ${
            role === 'notaire' 
              ? 'bg-orange-600 hover:bg-orange-700' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-6 w-6" />
              Gérer le nombre de membres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Abonnement actuel */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Abonnement actuel</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Plan : <span className="font-medium text-black">{currentPlan === 'professionnel' ? 'Professionnel' : 'Cabinet+'}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Nombre de membres (abonnements payés) : <span className="font-medium text-black">{currentMembers} membre{currentMembers > 1 ? 's' : ''}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Membres actifs dans le cabinet : <span className="font-medium text-black">{activeMembersCount} membre{activeMembersCount > 1 ? 's' : ''} actif{activeMembersCount > 1 ? 's' : ''}</span>
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-base font-semibold text-black">
                    Prix total actuel : <span className={role === 'notaire' ? 'text-orange-600' : 'text-blue-600'}>{currentPrice}€ / {billingPeriod === 'monthly' ? 'mois' : 'an'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Ajuster le nombre de membres */}
            <div>
              <Label className="text-base font-semibold mb-4 block">Modifier le nombre de membres</Label>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex flex-col items-center">
                  <Button
                    type="button"
                    size="icon"
                    className={`text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                      role === 'notaire'
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    onClick={() => {
                      const minAllowed = currentPlan === 'professionnel' ? 2 : 1;
                      setNewMembersCount(Math.max(minAllowed, newMembersCount - 1));
                    }}
                    disabled={newMembersCount <= (currentPlan === 'professionnel' ? 2 : 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  {memberDiff < 0 && (
                    <span className="text-xs mt-1 font-medium text-red-600">{memberDiff}</span>
                  )}
                </div>
                
                <div className="text-center flex-1">
                  <div className="text-3xl font-bold">{newMembersCount}</div>
                  <div className="text-sm text-gray-600">membre{newMembersCount > 1 ? 's' : ''}</div>
                </div>
                
                <div className="flex flex-col items-center">
                  <Button
                    type="button"
                    size="icon"
                    className={`text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                      role === 'notaire'
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    onClick={() => {
                      if (currentPlan === 'professionnel' && newMembersCount >= 10) {
                        toast.error('Le plan Professionnel est limité à 10 membres');
                        return;
                      }
                      setNewMembersCount(newMembersCount + 1);
                    }}
                    disabled={currentPlan === 'professionnel' && newMembersCount >= 10}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  {memberDiff > 0 && (
                    <span className="text-xs mt-1 font-medium text-green-600">+{memberDiff}</span>
                  )}
                </div>
              </div>
              
              {/* Avertissement si en dessous du nombre de membres actifs */}
              {newMembersCount < activeMembersCount && (
                <div className={`mt-3 rounded-lg p-3 ${
                  role === 'notaire'
                    ? 'bg-orange-50 border border-orange-200'
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <p className={`text-sm ${
                    role === 'notaire' ? 'text-orange-800' : 'text-blue-800'
                  }`}>
                    ⚠️ Attention : Vous avez actuellement <strong>{activeMembersCount} membre{activeMembersCount > 1 ? 's' : ''} actif{activeMembersCount > 1 ? 's' : ''}</strong> dans votre cabinet.
                    Vous devrez retirer {activeMembersCount - newMembersCount} membre{(activeMembersCount - newMembersCount) > 1 ? 's' : ''} avant de valider cette modification.
                  </p>
                </div>
              )}
            </div>

            {/* Résumé */}
            {memberDiff !== 0 && (
              <div className={`rounded-lg p-4 ${
                role === 'notaire'
                  ? 'bg-orange-50 border border-orange-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <h3 className={`font-semibold mb-3 ${
                  role === 'notaire' ? 'text-orange-900' : 'text-blue-900'
                }`}>Résumé de la modification</h3>
                <div className="space-y-3">
                  <p className={`text-sm ${
                    role === 'notaire' ? 'text-orange-800' : 'text-blue-800'
                  }`}>
                    En {isAdding ? 'ajoutant' : 'supprimant'}{' '}
                    <span className="font-semibold">{Math.abs(memberDiff)} membre{Math.abs(memberDiff) > 1 ? 's' : ''}</span>
                    {isAdding ? ' supplémentaire' : ''}{Math.abs(memberDiff) > 1 ? 's' : ''} :
                  </p>
                  
                  {/* Prix à payer maintenant (prorata) */}
                  {isAdding && prorataAmount > 0 && (
                    <div className={`p-3 rounded ${
                      role === 'notaire' 
                        ? 'bg-orange-100 border border-orange-300' 
                        : 'bg-blue-100 border border-blue-300'
                    }`}>
                      <p className={`text-xs font-medium mb-1 ${
                        role === 'notaire' ? 'text-orange-700' : 'text-blue-700'
                      }`}>
                        💳 À payer maintenant (prorata)
                      </p>
                      <p className={`text-2xl font-bold ${
                        role === 'notaire' ? 'text-orange-900' : 'text-blue-900'
                      }`}>
                        {prorataAmount}€
                      </p>
                      <p className={`text-xs mt-1 ${
                        role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                      }`}>
                        Pour {Math.abs(memberDiff)} membre{Math.abs(memberDiff) > 1 ? 's' : ''} × {remainingDays} jour{remainingDays > 1 ? 's' : ''}{!nextBillingDate ? ' (estimation)' : ''}
                      </p>
                    </div>
                  )}
                  
                  {/* Nouveau prix mensuel à partir de la prochaine facturation */}
                  <div className={`p-3 rounded ${
                    role === 'notaire' 
                      ? 'bg-orange-100 border border-orange-300' 
                      : 'bg-blue-100 border border-blue-300'
                  }`}>
                    <p className={`text-xs font-medium mb-1 ${
                      role === 'notaire' ? 'text-orange-700' : 'text-blue-700'
                    }`}>
                      📅 À partir de la prochaine facturation{nextBillingDate ? ` (${nextBillingDate.toLocaleDateString('fr-FR')})` : ''}
                    </p>
                    <p className={`text-2xl font-bold ${
                      role === 'notaire' ? 'text-orange-900' : 'text-blue-900'
                    }`}>
                      {newPrice}€/{billingPeriod === 'monthly' ? 'mois' : 'an'}
                    </p>
                    <p className={`text-xs mt-1 ${
                      role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                    }`}>
                      Différence : {(newPrice - currentPrice) > 0 ? '+' : ''}{newPrice - currentPrice}€/{billingPeriod === 'monthly' ? 'mois' : 'an'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bouton de validation */}
            <div className="flex gap-4">
              <Button
                onClick={() => navigate(`${prefix}/subscription`)}
                className={`flex-1 text-white ${
                  role === 'notaire'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                className={`flex-1 ${
                  role === 'notaire'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={loading || memberDiff === 0}
              >
                {loading ? 'Mise à jour...' : 'Valider la modification'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
