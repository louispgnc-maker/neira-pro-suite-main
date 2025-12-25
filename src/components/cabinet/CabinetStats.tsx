import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { BarChart3, FileText, Users as UsersIcon, FileSignature, HardDrive, AlertTriangle, TrendingUp, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';

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
  documents: number;
}

interface CabinetStatsProps {
  cabinetId: string;
  subscriptionPlan: string;
  role: 'avocat' | 'notaire';
  members: CabinetMember[];
}

const PLAN_LIMITS: Record<string, { dossiers: number; clients: number; signatures: number; storage: number }> = {
  'essentiel': { dossiers: 100, clients: 30, signatures: 15, storage: 20 },
  'professionnel': { dossiers: 600, clients: 200, signatures: 80, storage: 100 },
  'cabinet-plus': { dossiers: 999999, clients: 999999, signatures: 999999, storage: 999999 }
};

export function CabinetStats({ cabinetId, subscriptionPlan, role, members }: CabinetStatsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MemberStats[]>([]);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  const limits = PLAN_LIMITS[subscriptionPlan] || PLAN_LIMITS['essentiel'];
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
      const memberStats: MemberStats[] = [];

      for (const member of members) {
        if (!member.user_id) continue; // Skip invitations pending

        // Compter les dossiers
        const { count: dossiersCount } = await supabase
          .from('dossiers')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', member.user_id)
          .eq('role', role);

        // Compter les clients
        const { count: clientsCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', member.user_id)
          .eq('role', role);

        // Récupérer les signatures utilisées
        const { data: memberData } = await supabase
          .from('cabinet_members')
          .select('signatures_used')
          .eq('user_id', member.user_id)
          .eq('cabinet_id', cabinetId)
          .single();

        // Compter les documents
        const { count: documentsCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', member.user_id)
          .eq('role', role);

        memberStats.push({
          user_id: member.user_id,
          email: member.email,
          nom: member.nom,
          dossiers: dossiersCount || 0,
          clients: clientsCount || 0,
          signatures: memberData?.signatures_used || 0,
          documents: documentsCount || 0
        });
      }

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

  const totalStorageGB = (totalStats.documents * 0.5) / 1024;

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
          <p className="text-sm text-muted-foreground">Chargement des statistiques...</p>
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
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Dossiers</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${colorClass}`}>{totalStats.dossiers}</span>
              <span className="text-xs text-muted-foreground">/ {limits.dossiers >= 999999 ? '∞' : limits.dossiers}</span>
            </div>
            {limits.dossiers < 999999 && (
              <Progress value={getUsagePercentage(totalStats.dossiers, limits.dossiers)} className="h-1 mt-2" />
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Clients</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${colorClass}`}>{totalStats.clients}</span>
              <span className="text-xs text-muted-foreground">/ {limits.clients >= 999999 ? '∞' : limits.clients}</span>
            </div>
            {limits.clients < 999999 && (
              <Progress value={getUsagePercentage(totalStats.clients, limits.clients)} className="h-1 mt-2" />
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileSignature className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Signatures</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${colorClass}`}>{totalStats.signatures}</span>
              <span className="text-xs text-muted-foreground">ce mois</span>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Stockage</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${colorClass}`}>{totalStorageGB.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">Go</span>
            </div>
            {limits.storage < 999999 && (
              <Progress value={getUsagePercentage(totalStorageGB, limits.storage)} className="h-1 mt-2" />
            )}
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
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-4 text-xs">
                        <div className="text-center">
                          <p className="font-semibold">{member.dossiers}</p>
                          <p className="text-muted-foreground">dossiers</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">{member.clients}</p>
                          <p className="text-muted-foreground">clients</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">{member.signatures}</p>
                          <p className="text-muted-foreground">signatures</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">{member.documents}</p>
                          <p className="text-muted-foreground">docs</p>
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
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Dossiers</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${getUsageColor(getUsagePercentage(member.dossiers, limits.dossiers))}`}>
                              {member.dossiers}
                            </span>
                            <span className="text-xs text-muted-foreground">
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
                            <UsersIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Clients</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${getUsageColor(getUsagePercentage(member.clients, limits.clients))}`}>
                              {member.clients}
                            </span>
                            <span className="text-xs text-muted-foreground">
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
                            <FileSignature className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Signatures (ce mois)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${getUsageColor(getUsagePercentage(member.signatures, limits.signatures))}`}>
                              {member.signatures}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              / {limits.signatures >= 999999 ? '∞' : limits.signatures}
                            </span>
                          </div>
                        </div>
                        {limits.signatures < 999999 && (
                          <Progress 
                            value={getUsagePercentage(member.signatures, limits.signatures)} 
                            className="h-2"
                          />
                        )}
                      </div>

                      {/* Stockage */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Stockage</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${getUsageColor(getUsagePercentage(memberStorageGB, limits.storage))}`}>
                              {memberStorageGB.toFixed(2)} Go
                            </span>
                            <span className="text-xs text-muted-foreground">
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

                      {/* Section d'achat de crédits pour plan professionnel */}
                      {subscriptionPlan === 'professionnel' && (
                        <div className="border-t pt-4 space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            Acheter des signatures supplémentaires
                          </h4>
                          <div className="grid gap-2">
                            <Button
                              variant="outline"
                              className={`justify-between ${
                                role === 'notaire' 
                                  ? 'hover:bg-orange-50 hover:border-orange-600' 
                                  : 'hover:bg-blue-50 hover:border-blue-600'
                              }`}
                            >
                              <span className="text-sm">+20 Signatures</span>
                              <span className="font-semibold">19€</span>
                            </Button>
                            <Button
                              variant="outline"
                              className={`justify-between ${
                                role === 'notaire' 
                                  ? 'hover:bg-orange-50 hover:border-orange-600' 
                                  : 'hover:bg-blue-50 hover:border-blue-600'
                              }`}
                            >
                              <span className="text-sm">+50 Signatures</span>
                              <span className="font-semibold">39€</span>
                            </Button>
                            <Button
                              variant="outline"
                              className={`justify-between ${
                                role === 'notaire' 
                                  ? 'hover:bg-orange-50 hover:border-orange-600' 
                                  : 'hover:bg-blue-50 hover:border-blue-600'
                              }`}
                            >
                              <span className="text-sm">+100 Signatures</span>
                              <span className="font-semibold">69€</span>
                            </Button>
                          </div>
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
          getUsagePercentage(totalStats.clients, limits.clients) >= 80 ||
          getUsagePercentage(totalStorageGB, limits.storage) >= 80) && (
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
    </Card>
  );
}
