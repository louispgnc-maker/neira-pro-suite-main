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
  
  const role: 'avocat' | 'notaire' = location.pathname.includes('/notaires') ? 'notaire' : 'avocat';
  const prefix = role === 'notaire' ? '/notaires' : '/avocats';

  const planPrices = {
    'professionnel': 59,
    'cabinet-plus': 89
  };

  const pricePerMember = planPrices[currentPlan];
  const currentMonthlyPrice = pricePerMember * currentMembers;
  const newMonthlyPrice = pricePerMember * newMembersCount;
  const currentPrice = billingPeriod === 'monthly' ? currentMonthlyPrice : Math.round(currentMonthlyPrice * 12 * 0.9);
  const newPrice = billingPeriod === 'monthly' ? newMonthlyPrice : Math.round(newMonthlyPrice * 12 * 0.9);
  const currentTTC = Math.round((currentPrice + currentPrice * 0.2) * 100) / 100;
  const newTTC = Math.round((newPrice + newPrice * 0.2) * 100) / 100;

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
          .eq('status', 'active')
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
            // Compter les membres actifs d'abord
            const { data: tempMembersData } = await supabase
              .rpc('get_cabinet_members_simple', { cabinet_id_param: cabinet.cabinet_id });
            const tempActiveCount = tempMembersData?.filter((m: any) => m.status === 'active').length || 0;
            maxMembers = Math.max(tempActiveCount, plan === 'professionnel' ? 2 : 1);
            console.log('max_members was null, using:', maxMembers);
          }
          
          console.log('Final maxMembers to display:', maxMembers);
          setCurrentMembers(maxMembers);
          setNewMembersCount(maxMembers);
          setBillingPeriod(cabinet.billing_period || 'monthly');

          // Compter les membres actifs
          const { data: membersData } = await supabase
            .rpc('get_cabinet_members_simple', { cabinet_id_param: cabinet.cabinet_id });

          console.log('Members data:', membersData);
          const activeCount = membersData?.filter((m: any) => m.status === 'active').length || 0;
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

      // Récupérer le cabinet_id pour le rôle actuel
      const { data: memberData } = await supabase
        .from('cabinet_members')
        .select('cabinet_id, cabinets!inner(role)')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .eq('cabinets.role', role);

      if (!memberData || memberData.length === 0) {
        toast.error('Cabinet introuvable pour cet espace');
        setLoading(false);
        return;
      }

      const cabinetId = memberData[0].cabinet_id;

      // Mettre à jour le nombre de membres
      const { error } = await supabase
        .from('cabinets')
        .update({
          max_members: newMembersCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', cabinetId);

      if (error) throw error;

      toast.success('Abonnement mis à jour !', {
        description: `Votre abonnement comprend maintenant ${newMembersCount} membre${newMembersCount > 1 ? 's' : ''}.`
      });

      setTimeout(() => {
        navigate(`${prefix}/subscription`);
      }, 1500);
    } catch (error: any) {
      console.error('Error updating members:', error);
      toast.error('Erreur', {
        description: 'Une erreur est survenue lors de la mise à jour.'
      });
      setLoading(false);
    }
  };

  const memberDiff = newMembersCount - currentMembers;
  const isAdding = memberDiff > 0;
  const isRemoving = memberDiff < 0;
  const priceDiff = newTTC - currentTTC;

  return (
    <AppLayout>
      <div className="container mx-auto p-8 max-w-4xl">
        <Button
          onClick={() => navigate(`${prefix}/subscription`)}
          className="mb-6 bg-orange-600 hover:bg-orange-700 text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à l'abonnement
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
                    Prix total actuel : <span className="text-orange-600">{currentTTC}€ TTC / {billingPeriod === 'monthly' ? 'mois' : 'an'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Ajuster le nombre de membres */}
            <div>
              <Label className="text-base font-semibold mb-4 block">Modifier le nombre de membres</Label>
              
              <div className="flex items-center gap-4 mb-4">
                <Button
                  type="button"
                  size="icon"
                  className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    const minAllowed = currentPlan === 'professionnel' ? 2 : 1;
                    setNewMembersCount(Math.max(minAllowed, newMembersCount - 1));
                  }}
                  disabled={newMembersCount <= (currentPlan === 'professionnel' ? 2 : 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                
                <div className="text-center">
                  <div className="text-3xl font-bold">{newMembersCount}</div>
                  <div className="text-sm text-gray-600">membre{newMembersCount > 1 ? 's' : ''}</div>
                </div>
                
                <Button
                  type="button"
                  size="icon"
                  className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
              </div>

              <p className="text-xs text-gray-500">
                {currentPlan === 'professionnel' 
                  ? `Le plan Professionnel accepte entre 2 et 10 membres (${pricePerMember}€/mois par membre)`
                  : `Prix : ${pricePerMember}€/mois par membre`}
              </p>
              
              {/* Avertissement si en dessous du nombre de membres actifs */}
              {newMembersCount < activeMembersCount && (
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800">
                    ⚠️ Attention : Vous avez actuellement <strong>{activeMembersCount} membre{activeMembersCount > 1 ? 's' : ''} actif{activeMembersCount > 1 ? 's' : ''}</strong> dans votre cabinet.
                    Vous devrez retirer {activeMembersCount - newMembersCount} membre{(activeMembersCount - newMembersCount) > 1 ? 's' : ''} avant de valider cette modification.
                  </p>
                </div>
              )}
            </div>

            {/* Résumé */}
            {memberDiff !== 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-blue-900">Résumé de la modification</h3>
                <div className="space-y-2">
                  <p className="text-sm text-blue-800">
                    En {isAdding ? 'ajoutant' : 'supprimant'}{' '}
                    <span className="font-semibold">{Math.abs(memberDiff)} membre{Math.abs(memberDiff) > 1 ? 's' : ''}</span>
                    {isAdding ? ' supplémentaire' : ''}{Math.abs(memberDiff) > 1 ? 's' : ''} :
                  </p>
                  <p className="text-lg font-semibold text-blue-900 mt-2">
                    Nouveau total : {newTTC}€ TTC/{billingPeriod === 'monthly' ? 'mois' : 'an'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Différence : {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(2)}€ TTC/{billingPeriod === 'monthly' ? 'mois' : 'an'}
                  </p>
                </div>
              </div>
            )}

            {/* Bouton de validation */}
            <div className="flex gap-4">
              <Button
                onClick={() => navigate(`${prefix}/subscription`)}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
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
