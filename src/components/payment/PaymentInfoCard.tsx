import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Receipt,
  Shield
} from 'lucide-react';
import { formatPrice } from '@/lib/stripeConfig';
import { createPortalSession } from '@/lib/stripeCheckout';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface PaymentInfoCardProps {
  role: 'avocat' | 'notaire';
  subscriptionPlan: string;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  paymentMethod?: {
    type: string;
    brand?: string;
    last4?: string;
  };
  monthlyAmount: number;
  activeMembersCount: number;
}

export function PaymentInfoCard({
  role,
  subscriptionPlan,
  subscriptionStatus,
  currentPeriodEnd,
  stripeCustomerId,
  paymentMethod,
  monthlyAmount,
  activeMembersCount
}: PaymentInfoCardProps) {
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Actif
          </Badge>
        );
      case 'past_due':
        return (
          <Badge className="bg-yellow-600 hover:bg-yellow-700">
            <AlertCircle className="w-3 h-3 mr-1" />
            Paiement en retard
          </Badge>
        );
      case 'canceled':
      case 'cancelled':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Annulé
          </Badge>
        );
      case 'trialing':
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700">
            <Clock className="w-3 h-3 mr-1" />
            Période d'essai
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'essentiel':
        return 'Neira Essentiel';
      case 'professionnel':
        return 'Neira Professionnel';
      case 'cabinet-plus':
        return 'Neira Cabinet+';
      default:
        return plan;
    }
  };

  const handleOpenBillingPortal = async () => {
    if (!stripeCustomerId) {
      toast.error('Aucun moyen de paiement configuré', {
        description: 'Veuillez d\'abord souscrire à un abonnement'
      });
      return;
    }

    if (portalLoading) return; // Éviter les double-clics

    setPortalLoading(true);
    try {
      toast.info('Ouverture du portail Stripe...');
      const { url } = await createPortalSession(
        stripeCustomerId,
        window.location.href
      );
      toast.success('Redirection...');
      window.location.href = url;
    } catch (error) {
      console.error('Erreur ouverture portal:', error);
      toast.error('Erreur lors de l\'ouverture du portail de paiement', {
        description: 'Veuillez réessayer dans quelques instants'
      });
      setPortalLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Carte principale - Résumé abonnement */}
      <Card className="border-2 shadow-lg">
        <CardHeader className={`${
          role === 'notaire' ? 'bg-orange-50' : 'bg-blue-50'
        } border-b`}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {getPlanLabel(subscriptionPlan)}
              </CardTitle>
              <CardDescription>
                {activeMembersCount} membre{activeMembersCount > 1 ? 's' : ''} actif{activeMembersCount > 1 ? 's' : ''}
              </CardDescription>
            </div>
            {getStatusBadge(subscriptionStatus)}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Montant mensuel */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="w-4 h-4" />
                <span>Montant mensuel</span>
              </div>
              <div className={`text-4xl font-bold ${
                role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
              }`}>
                {formatPrice(monthlyAmount)}
              </div>
              <p className="text-xs text-gray-500">
                {formatPrice(monthlyAmount / activeMembersCount)}/membre
              </p>
            </div>

            {/* Prochaine facturation */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Prochaine facturation</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900">
                {formatDate(currentPeriodEnd)}
              </div>
              <p className="text-xs text-gray-500">
                Renouvellement automatique
              </p>
            </div>
          </div>

          {/* Moyen de paiement */}
          {paymentMethod && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <CreditCard className="w-4 h-4" />
                <span className="font-medium">Moyen de paiement</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${
                    role === 'notaire' ? 'bg-orange-100' : 'bg-blue-100'
                  }`}>
                    <CreditCard className={`w-5 h-5 ${
                      role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {paymentMethod.brand || 'Carte'} se terminant par ••••{' '}
                      {paymentMethod.last4}
                    </p>
                    <p className="text-xs text-gray-500">
                      {paymentMethod.type === 'sepa_debit' 
                        ? 'Prélèvement SEPA' 
                        : 'Paiement par carte'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 pt-6 border-t grid md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleOpenBillingPortal}
              disabled={portalLoading}
              className={`w-full ${
                role === 'notaire' 
                  ? 'border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white' 
                  : 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {portalLoading ? 'Ouverture...' : 'Gérer le paiement'}
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate('/payment-history')}
              className="w-full"
            >
              <Receipt className="w-4 h-4 mr-2" />
              Historique
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Carte sécurité */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">
                Paiements 100% sécurisés
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Vos paiements sont traités par Stripe, leader mondial de la sécurité des paiements en ligne.
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>✓ Cryptage SSL de bout en bout</li>
                <li>✓ Aucune donnée bancaire stockée sur nos serveurs</li>
                <li>✓ Conformité PCI DSS Level 1</li>
                <li>✓ Protection contre la fraude</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lien vers Stripe */}
      {subscriptionStatus === 'active' && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenBillingPortal}
            disabled={portalLoading}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {portalLoading ? 'Ouverture...' : 'Géré par Stripe'}
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
