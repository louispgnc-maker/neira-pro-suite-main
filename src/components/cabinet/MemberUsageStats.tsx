import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabaseClient';
import { BarChart3, FileText, Users, FileSignature, HardDrive, AlertTriangle, ShoppingCart } from 'lucide-react';
import { BuySignaturesDialog } from './BuySignaturesDialog';

interface MemberUsageStatsProps {
  userId: string;
  cabinetId: string;
  subscriptionPlan: string;
  role: 'avocat' | 'notaire';
}

interface UsageData {
  dossiers: number;
  clients: number;
  signatures: number;
  storage: number;
}

const PLAN_LIMITS: Record<string, { dossiers: number; clients: number; signatures: number; storage: number }> = {
  'essentiel': { dossiers: 100, clients: 30, signatures: 15, storage: 20 },
  'professionnel': { dossiers: 600, clients: 200, signatures: 80, storage: 100 },
  'cabinet-plus': { dossiers: 999999, clients: 999999, signatures: 999999, storage: 999999 }
};

export function MemberUsageStats({ userId, cabinetId, subscriptionPlan, role }: MemberUsageStatsProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [usage, setUsage] = useState<UsageData>({
    dossiers: 0,
    clients: 0,
    signatures: 0,
    storage: 0
  });

  const limits = PLAN_LIMITS[subscriptionPlan] || PLAN_LIMITS['essentiel'];
  const colorClass = role === 'notaire' ? 'text-orange-600' : 'text-blue-600';
  const bgClass = role === 'notaire' ? 'bg-orange-600' : 'bg-blue-600';

  useEffect(() => {
    if (open) {
      loadUsageData();
    }
  }, [open, userId, cabinetId, role]);

  const loadUsageData = async () => {
    setLoading(true);
    try {
      console.log('🔍 Chargement stats pour:', { userId, role, cabinetId });

      // Compter les dossiers créés par cet utilisateur pour ce rôle (notaire/avocat)
      const { count: dossiersCount, error: dossiersError } = await supabase
        .from('dossiers')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('role', role);

      console.log('📁 Dossiers count:', dossiersCount, dossiersError);

      // Compter les clients créés par cet utilisateur pour ce rôle
      const { count: clientsCount, error: clientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('role', role);

      console.log('👥 Clients count:', clientsCount, clientsError);

      // Récupérer les signatures utilisées depuis cabinet_members
      const { data: memberData, error: sigError } = await supabase
        .from('cabinet_members')
        .select('signatures_used')
        .eq('user_id', userId)
        .eq('cabinet_id', cabinetId)
        .single();

      console.log('✍️ Signatures:', memberData?.signatures_used, sigError);

      // Pour le stockage, on va compter les documents pour ce rôle
      const { count: documentsCount, error: docsError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('role', role);

      console.log('📄 Documents count:', documentsCount, docsError);

      // Approximation: 1 document = ~500 KB en moyenne
      const storageGB = ((documentsCount || 0) * 0.5) / 1024;

      const newUsage = {
        dossiers: dossiersCount || 0,
        clients: clientsCount || 0,
        signatures: memberData?.signatures_used || 0,
        storage: Math.round(storageGB * 100) / 100
      };

      console.log('📊 Usage final:', newUsage);
      setUsage(newUsage);
    } catch (error) {
      console.error('❌ Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit >= 999999) return 0; // Illimité
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-orange-600';
    return 'text-green-600';
  };

  const hasWarning = 
    getUsagePercentage(usage.dossiers, limits.dossiers) >= 80 ||
    getUsagePercentage(usage.clients, limits.clients) >= 80 ||
    getUsagePercentage(usage.signatures, limits.signatures) >= 80;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-2 ${
            role === 'notaire' 
              ? 'border-orange-600 text-orange-600 hover:bg-orange-50 hover:text-orange-700' 
              : 'border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Voir limites
          {hasWarning && <AlertTriangle className="h-3 w-3 text-orange-500" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Utilisation des ressources</DialogTitle>
          <DialogDescription>
            Statistiques d'utilisation par rapport aux limites du plan {subscriptionPlan}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-gray-600">Chargement...</div>
        ) : (
          <div className="space-y-6">
            {/* Dossiers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Dossiers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${getUsageColor(getUsagePercentage(usage.dossiers, limits.dossiers))}`}>
                    {usage.dossiers}
                  </span>
                  <span className="text-xs text-gray-600">
                    / {limits.dossiers >= 999999 ? '∞' : limits.dossiers}
                  </span>
                </div>
              </div>
              {limits.dossiers < 999999 && (
                <Progress 
                  value={getUsagePercentage(usage.dossiers, limits.dossiers)} 
                  className="h-2"
                />
              )}
            </div>

            {/* Clients */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Clients</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${getUsageColor(getUsagePercentage(usage.clients, limits.clients))}`}>
                    {usage.clients}
                  </span>
                  <span className="text-xs text-gray-600">
                    / {limits.clients >= 999999 ? '∞' : limits.clients}
                  </span>
                </div>
              </div>
              {limits.clients < 999999 && (
                <Progress 
                  value={getUsagePercentage(usage.clients, limits.clients)} 
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
                  <span className={`text-sm font-bold ${getUsageColor(getUsagePercentage(usage.signatures, limits.signatures))}`}>
                    {usage.signatures}
                  </span>
                  <span className="text-xs text-gray-600">
                    / {limits.signatures >= 999999 ? '∞' : limits.signatures}
                  </span>
                </div>
              </div>
              {limits.signatures < 999999 && (
                <Progress 
                  value={getUsagePercentage(usage.signatures, limits.signatures)} 
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
                  <span className={`text-sm font-bold ${getUsageColor(getUsagePercentage(usage.storage, limits.storage))}`}>
                    {usage.storage} Go
                  </span>
                  <span className="text-xs text-gray-600">
                    / {limits.storage >= 999999 ? '∞' : `${limits.storage} Go`}
                  </span>
                </div>
              </div>
              {limits.storage < 999999 && (
                <Progress 
                  value={getUsagePercentage(usage.storage, limits.storage)} 
                  className="h-2"
                />
              )}
            </div>

            {/* Alertes */}
            {hasWarning && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="text-xs text-orange-800">
                    <p className="font-semibold mb-1">Attention aux limites</p>
                    <p>Cet utilisateur approche les limites du plan. Envisagez une mise à niveau.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Légende */}
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-gray-600">
              <p><strong>Note :</strong> Les statistiques sont calculées individuellement pour chaque membre du cabinet.</p>
            </div>

            {/* Section d'achat de forfaits signatures pour plans essentiel et professionnel seulement */}
            {/* Cabinet+ a déjà signatures illimitées */}
            {(subscriptionPlan === 'essentiel' || subscriptionPlan === 'professionnel') && (
              <div className="border-t pt-4">
                <Button
                  onClick={() => setBuyDialogOpen(true)}
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
            {subscriptionPlan === 'cabinet-plus' && (
              <div className="border-t pt-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  <p className="font-semibold">✓ Signatures illimitées incluses</p>
                  <p className="text-xs mt-1">Votre plan Cabinet+ inclut déjà des signatures illimitées pour tous les membres.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>

      <BuySignaturesDialog
        open={buyDialogOpen}
        onOpenChange={setBuyDialogOpen}
        subscriptionPlan={subscriptionPlan as 'essentiel' | 'professionnel' | 'cabinet-plus'}
        currentMonthlyPrice={subscriptionPlan === 'essentiel' ? 39 : subscriptionPlan === 'professionnel' ? 59 : 89}
        role={role}
      />
    </Dialog>
  );
}
