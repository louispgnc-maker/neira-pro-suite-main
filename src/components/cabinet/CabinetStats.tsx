import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { BarChart3, FileText, Users as UsersIcon, FileSignature, HardDrive, AlertTriangle, TrendingUp, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';
import { BuySignaturesDialog } from './BuySignaturesDialog';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';

interface CabinetMember {
  id: string;
  user_id?: string;
  email: string;
  nom?: string;
  role_cabinet: string;
}

interface MemberStats {
  user_id: string;
  email: string;
  nom?: string;
  dossiers: number;
  clients: number;
  signatures: number;
  signature_limit: number; // Limite personnelle (base + addon)
  documents: number;
}

interface CabinetStatsProps {
  cabinetId: string;
  subscriptionPlan: string;
  role: 'avocat' | 'notaire';
  members: CabinetMember[];
}

export function CabinetStats({ cabinetId, subscriptionPlan, role, members }: CabinetStatsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MemberStats[]>([]);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [selectedMemberForPurchase, setSelectedMemberForPurchase] = useState<{ userId: string; name: string } | null>(null);

  // Utiliser le hook pour récupérer les vraies limites depuis la DB (incluant les add-ons)
  const subscriptionLimits = useSubscriptionLimits(role);
  
  // Convertir les limites pour l'utilisation locale
  const limits = {
    dossiers: subscriptionLimits.max_dossiers || 999999,
    clients: subscriptionLimits.max_clients || 999999,
    signatures: subscriptionLimits.max_signatures_per_month || 999999,
    storage: subscriptionLimits.max_storage_bytes ? Math.round(subscriptionLimits.max_storage_bytes / (1024 * 1024 * 1024)) : 999999
  };

  const colorClass = role === 'notaire' ? 'text-orange-600' : 'text-blue-600';
  const bgClass = role === 'notaire' ? 'bg-orange-600' : 'bg-blue-600';
  const borderClass = role === 'notaire' ? 'border-orange-200' : 'border-blue-200';

  const toggleMemberExpanded = (userId: string) => {
    setExpandedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    loadAllStats();
  }, [members, cabinetId, role]);

  const loadAllStats = async () => {
    setLoading(true);
    try {
      console.log('🔍 Loading stats for cabinet:', cabinetId, 'with', members.length, 'members');
      
      const memberStats: MemberStats[] = [];

      for (const member of members) {
        console.log('👤 Processing member:', member.email, 'user_id:', member.user_id);
        
        if (!member.user_id) {
          console.warn('⚠️ Skipping member without user_id:', member.email);
          continue;
        }

        // Récupérer le prénom et nom du profil utilisateur
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', member.user_id)
          .single();

        const displayName = profileData?.first_name && profileData?.last_name
          ? `${profileData.first_name} ${profileData.last_name}`
          : member.email;

        // Compter UNIQUEMENT l'espace personnel (owner_id = user_id)
        const { count: dossiersCount } = await supabase
          .from('dossiers')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', member.user_id)
          .eq('role', role);

        const { count: clientsCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', member.user_id)
          .eq('role', role);
        
        console.log(`📊 Clients for ${member.email}:`, clientsCount, 'with owner_id:', member.user_id, 'and role:', role);

        const { count: documentsCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', member.user_id)
          .eq('role', role);

        // Récupérer les signatures utilisées et l'addon personnel + date d'expiration
        const { data: memberData } = await supabase
          .from('cabinet_members')
          .select('signatures_used, signature_addon_quantity, signature_addon_expires_at')
          .eq('user_id', member.user_id)
          .eq('cabinet_id', cabinetId)
          .single();

        // Récupérer le plan de base du cabinet pour ce membre
        const { data: cabinetData } = await supabase
          .from('cabinets')
          .select('max_signatures_per_month')
          .eq('id', cabinetId)
          .single();

        // Vérifier si l'addon est toujours valide (pas expiré)
        let addonSignatures = 0;
        if (memberData?.signature_addon_quantity && memberData?.signature_addon_expires_at) {
          const expiresAt = new Date(memberData.signature_addon_expires_at);
          const now = new Date();
          if (expiresAt > now) {
            addonSignatures = memberData.signature_addon_quantity;
          }
        } else if (memberData?.signature_addon_quantity && !memberData?.signature_addon_expires_at) {
          // Ancien addon sans date d'expiration (backward compatibility)
          addonSignatures = memberData.signature_addon_quantity;
        }

        // Calculer la limite totale de signatures pour ce membre
        const baseSignatures = cabinetData?.max_signatures_per_month ?? limits.signatures;
        const memberSignatureLimit = baseSignatures !== null ? baseSignatures + addonSignatures : 999999;

        // Stats PERSONNELLES de chaque membre (depuis tables personnelles)
        memberStats.push({
          user_id: member.user_id,
          email: member.email,
          nom: displayName,
          dossiers: dossiersCount || 0,
          clients: clientsCount || 0,
          signatures: memberData?.signatures_used || 0,
          signature_limit: memberSignatureLimit,
          documents: documentsCount || 0
        });
      }

      console.log('✅ Stats loaded:', memberStats);
      setStats(memberStats);
    } catch (error) {
      console.error('Error loading cabinet stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalStats = stats.reduce((acc, member) => ({
    dossiers: acc.dossiers + member.dossiers,
    clients: acc.clients + member.clients,
    signatures: acc.signatures + member.signatures,
    documents: acc.documents + member.documents
  }), { dossiers: 0, clients: 0, signatures: 0, documents: 0 });

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit >= 999999) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 70) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  if (loading) {
    return (
      <Card className={`border-2 ${borderClass}`}>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Chargement des statistiques...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 ${borderClass}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Statistiques globales du cabinet
        </CardTitle>
        <CardDescription>
          Vue d'ensemble de l'utilisation par tous les membres (plan {subscriptionPlan})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Résumé global */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">Dossiers</span>
            </div>
            <span className={`text-2xl font-bold ${colorClass}`}>{totalStats.dossiers}</span>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <UsersIcon className="h-4 w-4 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">Clients</span>
            </div>
            <span className={`text-2xl font-bold ${colorClass}`}>{totalStats.clients}</span>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileSignature className="h-4 w-4 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">Signatures</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${colorClass}`}>{totalStats.signatures}</span>
              <span className="text-xs text-gray-600">ce mois</span>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="h-4 w-4 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">Documents</span>
            </div>
            <span className={`text-2xl font-bold ${colorClass}`}>{totalStats.documents}</span>
          </div>
        </div>

        {/* Détail par membre */}
        <div>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Détail par membre
          </h4>
          <div className="space-y-3">
            {stats.map((member) => {
              const isExpanded = expandedMembers.has(member.user_id);
              const memberStorageGB = (member.documents * 0.5) / 1024;
              
              return (
                <div key={member.user_id} className="border rounded-lg overflow-hidden">
                  {/* En-tête du membre - toujours visible */}
                  <div 
                    className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleMemberExpanded(member.user_id)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{member.nom || member.email}</p>
                      <p className="text-xs text-gray-600">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-4 text-xs">
                        <div className="text-center">
                          <p className="font-semibold">{member.dossiers}</p>
                          <p className="text-gray-600">dossiers</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">{member.clients}</p>
                          <p className="text-gray-600">clients</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">{member.signatures}</p>
                          <p className="text-gray-600">signatures</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">{member.documents}</p>
                          <p className="text-gray-600">docs</p>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                    </div>
                  </div>

                  {/* Détails expandables */}
                  {isExpanded && (
                    <div className="p-4 bg-background space-y-4 border-t">
                      {/* Dossiers */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium">Dossiers</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${getUsageColor(getUsagePercentage(member.dossiers, limits.dossiers))}`}>
                              {member.dossiers}
                            </span>
                            <span className="text-xs text-gray-600">
                              / {limits.dossiers >= 999999 ? '∞' : limits.dossiers}
                            </span>
                          </div>
                        </div>
                        {limits.dossiers < 999999 && (
                          <Progress 
                            value={getUsagePercentage(member.dossiers, limits.dossiers)} 
                            className="h-2"
                          />
                        )}
                      </div>

                      {/* Clients */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UsersIcon className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium">Clients</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${getUsageColor(getUsagePercentage(member.clients, limits.clients))}`}>
                              {member.clients}
                            </span>
                            <span className="text-xs text-gray-600">
                              / {limits.clients >= 999999 ? '∞' : limits.clients}
                            </span>
                          </div>
                        </div>
                        {limits.clients < 999999 && (
                          <Progress 
                            value={getUsagePercentage(member.clients, limits.clients)} 
                            className="h-2"
                          />
                        )}
                      </div>

                      {/* Signatures */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileSignature className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium">Signatures (ce mois)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${getUsageColor(getUsagePercentage(member.signatures, member.signature_limit))}`}>
                              {member.signatures}
                            </span>
                            <span className="text-xs text-gray-600">
                              / {member.signature_limit >= 999999 ? '∞' : member.signature_limit}
                            </span>
                          </div>
                        </div>
                        {member.signature_limit < 999999 && (
                          <Progress 
                            value={getUsagePercentage(member.signatures, member.signature_limit)} 
                            className="h-2"
                          />
                        )}
                      </div>

                      {/* Stockage */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium">Stockage</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${getUsageColor(getUsagePercentage(memberStorageGB, limits.storage))}`}>
                              {memberStorageGB.toFixed(2)} Go
                            </span>
                            <span className="text-xs text-gray-600">
                              / {limits.storage >= 999999 ? '∞' : `${limits.storage} Go`}
                            </span>
                          </div>
                        </div>
                        {limits.storage < 999999 && (
                          <Progress 
                            value={getUsagePercentage(memberStorageGB, limits.storage)} 
                            className="h-2"
                          />
                        )}
                      </div>

                      {/* Section d'achat de forfaits signatures pour plan essentiel ou professionnel */}
                      {(subscriptionPlan === 'essentiel' || subscriptionPlan === 'professionnel' || subscriptionPlan === 'cabinet-plus') && (
                        <div className="border-t pt-4">
                          <Button
                            onClick={() => {
                              setSelectedMemberForPurchase({
                                userId: member.user_id,
                                name: member.nom || member.email
                              });
                              setBuyDialogOpen(true);
                            }}
                            className={`w-full justify-between ${
                              role === 'notaire' 
                                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <ShoppingCart className="h-4 w-4" />
                              Acheter des signatures supplémentaires
                            </span>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Alertes */}
        {(getUsagePercentage(totalStats.dossiers, limits.dossiers) >= 80 ||
          getUsagePercentage(totalStats.clients, limits.clients) >= 80) && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-orange-900 mb-1">Attention : Limites du cabinet</p>
                <p className="text-xs text-orange-800">
                  Votre cabinet approche des limites du plan {subscriptionPlan}. Envisagez une mise à niveau pour éviter toute interruption.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <BuySignaturesDialog
        open={buyDialogOpen}
        onOpenChange={setBuyDialogOpen}
        subscriptionPlan={subscriptionPlan as 'essentiel' | 'professionnel' | 'cabinet-plus'}
        currentMonthlyPrice={subscriptionPlan === 'essentiel' ? 45 : subscriptionPlan === 'professionnel' ? 69 : 99}
        role={role}
        targetUserId={selectedMemberForPurchase?.userId}
        targetUserName={selectedMemberForPurchase?.name}
      />
    </Card>
  );
}
