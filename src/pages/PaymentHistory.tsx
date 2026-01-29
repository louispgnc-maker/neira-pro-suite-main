import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Receipt, 
  Download, 
  Calendar,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/stripeConfig';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed';
  description: string;
  created_at: string;
  payment_method?: {
    type: string;
    brand?: string;
    last4?: string;
  };
  invoice_url?: string;
  receipt_url?: string;
}

export default function PaymentHistory() {
  const { user, profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const role = profile?.role as 'avocat' | 'notaire';

  useEffect(() => {
    if (user) {
      loadPaymentHistory();
    }
  }, [user]);

  useEffect(() => {
    filterPayments();
  }, [payments, statusFilter, searchQuery]);

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);

      // Récupérer le cabinet de l'utilisateur
      const { data: profileData } = await supabase
        .from('profiles')
        .select('cabinet_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.cabinet_id) {
        toast.error('Aucun cabinet trouvé');
        return;
      }

      // Récupérer les informations du cabinet pour obtenir le customer_id Stripe
      const { data: cabinetData } = await supabase
        .from('cabinets')
        .select('stripe_customer_id')
        .eq('id', profileData.cabinet_id)
        .single();

      if (!cabinetData?.stripe_customer_id) {
        toast.info('Aucun historique de paiement disponible');
        setPayments([]);
        return;
      }

      // Appeler une edge function pour récupérer l'historique depuis Stripe
      const { data, error } = await supabase.functions.invoke('get-payment-history', {
        body: { customerId: cabinetData.stripe_customer_id }
      });

      if (error) throw error;

      setPayments(data.payments || []);
    } catch (error: any) {
      console.error('Erreur chargement historique:', error);
      toast.error('Impossible de charger l\'historique des paiements');
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Filtre par recherche
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPayments(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return (
          <Badge className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Réussi
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-600 hover:bg-yellow-700">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Échoué
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (payment: Payment) => {
    if (!payment.payment_method) return <CreditCard className="w-4 h-4" />;

    return <CreditCard className="w-4 h-4" />;
  };

  const downloadInvoice = (invoiceUrl: string) => {
    window.open(invoiceUrl, '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement de l'historique...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className={`text-3xl font-bold mb-2 ${
            role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
          }`}>
            Historique des paiements
          </h1>
          <p className="text-gray-600">
            Consultez et téléchargez vos factures et reçus
          </p>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Rechercher</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="ID, description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Statut</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="succeeded">Réussi</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="failed">Échoué</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="w-full"
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des paiements */}
        {filteredPayments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucun paiement trouvé
              </h3>
              <p className="text-gray-600">
                {searchQuery || statusFilter !== 'all'
                  ? 'Essayez de modifier vos filtres'
                  : 'Votre historique de paiements apparaîtra ici'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <Card key={payment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${
                          role === 'notaire' ? 'bg-orange-100' : 'bg-blue-100'
                        }`}>
                          <Receipt className={`w-5 h-5 ${
                            role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {payment.description || 'Paiement Neira'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            ID: {payment.id}
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            {formatDate(payment.created_at)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          {getPaymentMethodIcon(payment)}
                          <span className="text-gray-600">
                            {payment.payment_method?.brand || 'Carte'} 
                            {payment.payment_method?.last4 && ` •••• ${payment.payment_method.last4}`}
                          </span>
                        </div>

                        <div>
                          {getStatusBadge(payment.status)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right ml-6">
                      <div className={`text-2xl font-bold mb-2 ${
                        role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                      }`}>
                        {formatPrice(payment.amount / 100)}
                      </div>

                      {payment.invoice_url && payment.status === 'succeeded' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadInvoice(payment.invoice_url!)}
                          className="gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Facture
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Résumé */}
        {filteredPayments.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Résumé</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Paiements réussis</p>
                  <p className="text-2xl font-bold text-green-600">
                    {filteredPayments.filter(p => p.status === 'succeeded').length}
                  </p>
                </div>

                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">En attente</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {filteredPayments.filter(p => p.status === 'pending').length}
                  </p>
                </div>

                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Échoués</p>
                  <p className="text-2xl font-bold text-red-600">
                    {filteredPayments.filter(p => p.status === 'failed').length}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t text-center">
                <p className="text-sm text-gray-600 mb-1">Total payé</p>
                <p className={`text-3xl font-bold ${
                  role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                }`}>
                  {formatPrice(
                    filteredPayments
                      .filter(p => p.status === 'succeeded')
                      .reduce((sum, p) => sum + p.amount, 0) / 100
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
