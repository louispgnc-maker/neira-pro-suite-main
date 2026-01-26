import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useClientTheme } from '@/contexts/ClientThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Folder, FileText, Clock, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import ClientLayout from '@/components/client/ClientLayout';
import NotificationsCard from '@/components/client/NotificationsCard';

interface DossierStats {
  total: number;
  en_cours: number;
  termine: number;
  en_attente: number;
}

interface Dossier {
  id: string;
  titre: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface RecentDocument {
  id: string;
  name: string;
  created_at: string;
}

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { professionType } = useClientTheme();
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [dossierStats, setDossierStats] = useState<DossierStats>({
    total: 0,
    en_cours: 0,
    termine: 0,
    en_attente: 0,
  });
  const [recentDossiers, setRecentDossiers] = useState<Dossier[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Get client data
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (clientError) throw clientError;

      if (!client) {
        toast.error('Données client non trouvées');
        return;
      }

      setClientId(client.id);

      // Load dossiers
      const { data: dossiers, error: dossiersError } = await supabase
        .from('client_dossiers_new')
        .select('*')
        .eq('client_id', client.id)
        .order('updated_at', { ascending: false });

      if (!dossiersError && dossiers) {
        // Calculate stats
        const stats: DossierStats = {
          total: dossiers.length,
          en_cours: dossiers.filter((d) => d.status === 'en_cours').length,
          termine: dossiers.filter((d) => d.status === 'termine').length,
          en_attente: dossiers.filter((d) => d.status === 'en_attente').length,
        };
        setDossierStats(stats);
        setRecentDossiers(dossiers.slice(0, 3));
      }

      // Load recent documents from client_shared_documents table
      const { data: docsData, error: docsError } = await supabase
        .from('client_shared_documents')
        .select('id, title, file_name, uploaded_at')
        .eq('client_id', client.id)
        .order('uploaded_at', { ascending: false })
        .limit(5);

      if (!docsError && docsData) {
        setRecentDocuments(
          docsData.map((doc) => ({
            id: doc.id,
            name: doc.title || doc.file_name,
            created_at: doc.uploaded_at || '',
          }))
        );
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      toast.error('Erreur lors du chargement des données');
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { label: string; class: string; icon: any }
    > = {
      en_cours: {
        label: 'En cours',
        class: 'bg-blue-100 text-blue-800',
        icon: Clock,
      },
      termine: {
        label: 'Terminé',
        class: 'bg-green-100 text-green-800',
        icon: CheckCircle2,
      },
      en_attente: {
        label: 'En attente',
        class: 'bg-yellow-100 text-yellow-800',
        icon: AlertCircle,
      },
    };
    const config = statusConfig[status] || {
      label: status,
      class: 'bg-gray-100 text-gray-800',
      icon: AlertCircle,
    };
    const Icon = config.icon;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenue sur votre espace client
          </h1>
          <p className="mt-2 text-gray-600">
            Suivez l'avancement de vos dossiers et accédez à vos documents en temps réel
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total dossiers
              </CardTitle>
              <Folder className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {dossierStats.total}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                En cours
              </CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dossierStats.en_cours}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Terminés
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {dossierStats.termine}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                En attente
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {dossierStats.en_attente}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications Section */}
        {clientId && (
          <NotificationsCard clientId={clientId} professionType={professionType} />
        )}

        {/* Recent Dossiers & Documents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Dossiers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Dossiers récents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentDossiers.length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-8">
                  Aucun dossier pour le moment
                </p>
              ) : (
                <div className="space-y-3">
                  {recentDossiers.map((dossier) => (
                    <div
                      key={dossier.id}
                      className={`border rounded-lg p-4 transition-colors cursor-pointer ${professionType === 'avocat' ? 'hover:bg-blue-50' : 'hover:bg-orange-50'}`}
                      onClick={() =>
                        navigate(`/client-space/dossiers/${dossier.id}`)
                      }
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          {dossier.titre}
                        </h4>
                        {getStatusBadge(dossier.status)}
                      </div>
                      {dossier.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {dossier.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Mis à jour le{' '}
                        {new Date(dossier.updated_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Documents récents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentDocuments.length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-8">
                  Aucun document pour le moment
                </p>
              ) : (
                <div className="space-y-2">
                  {recentDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg transition-colors cursor-pointer ${professionType === 'avocat' ? 'hover:bg-blue-50' : 'hover:bg-orange-50'}`}
                      onClick={() => navigate('/client-space/documents')}
                    >
                      <FileText className={`h-5 w-5 flex-shrink-0 ${professionType === 'avocat' ? 'text-blue-600' : 'text-orange-600'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientLayout>
  );
}
