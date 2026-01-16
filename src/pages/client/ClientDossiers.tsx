import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Folder, ArrowLeft, Clock, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import ClientLayout from '@/components/client/ClientLayout';

interface Dossier {
  id: string;
  titre: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ClientDossiers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadDossiers();
  }, [user, navigate]);

  const loadDossiers = async () => {
    try {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (clientError) throw clientError;

      const { data: dossiersList, error: dossiersError } = await supabase
        .from('dossiers')
        .select('*')
        .eq('client_id', client.id)
        .order('updated_at', { ascending: false });

      if (dossiersError) throw dossiersError;

      setDossiers(dossiersList || []);
      setLoading(false);
    } catch (err: any) {
      console.error('Error loading dossiers:', err);
      toast.error('Erreur lors du chargement des dossiers');
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const statusConfig: Record<
      string,
      { label: string; class: string; icon: any }
    > = {
      en_cours: {
        label: 'En cours',
        class: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Clock,
      },
      termine: {
        label: 'Terminé',
        class: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle2,
      },
      en_attente: {
        label: 'En attente',
        class: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: AlertCircle,
      },
    };
    return (
      statusConfig[status] || {
        label: status,
        class: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: AlertCircle,
      }
    );
  };

  const filteredDossiers =
    filterStatus === 'all'
      ? dossiers
      : dossiers.filter((d) => d.status === filterStatus);

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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes dossiers</h1>
          <p className="mt-2 text-gray-600">
            Suivez l'avancement de tous vos dossiers en cours
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
            size="sm"
            className={filterStatus !== 'all' ? 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-700' : ''}
          >
            Tous ({dossiers.length})
          </Button>
          <Button
            variant={filterStatus === 'en_cours' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('en_cours')}
            size="sm"
            className={filterStatus !== 'en_cours' ? 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-700' : ''}
          >
            <Clock className="h-4 w-4 mr-2" />
            En cours ({dossiers.filter((d) => d.status === 'en_cours').length})
          </Button>
          <Button
            variant={filterStatus === 'en_attente' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('en_attente')}
            size="sm"
            className={filterStatus !== 'en_attente' ? 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-700' : ''}
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            En attente ({dossiers.filter((d) => d.status === 'en_attente').length})
          </Button>
          <Button
            variant={filterStatus === 'termine' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('termine')}
            size="sm"
            className={filterStatus !== 'termine' ? 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-700' : ''}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Terminés ({dossiers.filter((d) => d.status === 'termine').length})
          </Button>
        </div>

        {/* Dossiers List */}
        {filteredDossiers.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Aucun dossier {filterStatus !== 'all' && `"${getStatusInfo(filterStatus).label}"`}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredDossiers.map((dossier) => {
              const statusInfo = getStatusInfo(dossier.status);
              const StatusIcon = statusInfo.icon;

              return (
                <Card
                  key={dossier.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/client-space/dossiers/${dossier.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Folder className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl text-gray-900">
                            {dossier.titre}
                          </CardTitle>
                          {dossier.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {dossier.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${statusInfo.class}`}
                      >
                        <StatusIcon className="h-4 w-4" />
                        {statusInfo.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        Créé le {new Date(dossier.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      <span>•</span>
                      <span>
                        Mis à jour le {new Date(dossier.updated_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
