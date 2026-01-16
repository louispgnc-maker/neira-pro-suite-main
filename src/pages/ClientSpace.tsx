import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { FileText, Download, User, Mail, Phone, MapPin, LogOut, Folder } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  cabinet_id: string;
  cabinet?: {
    nom: string;
  };
}

interface Document {
  id: string;
  name: string;
  url: string;
  created_at: string;
  size?: number;
}

interface Dossier {
  id: string;
  titre: string;
  description?: string;
  status: string;
  created_at: string;
}

export default function ClientSpace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadClientData();
  }, [user, navigate]);

  const loadClientData = async () => {
    try {
      // Get client data using user_id
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (clientError) throw clientError;

      if (!client) {
        toast.error('Données client non trouvées');
        return;
      }

      // Get cabinet info separately if owner_id exists
      let cabinetData = null;
      if (client.owner_id) {
        const { data: cabinet } = await supabase
          .from('cabinets')
          .select('nom')
          .eq('id', client.owner_id)
          .single();
        
        if (cabinet) {
          cabinetData = { nom: cabinet.nom };
        }
      }

      setClientData({
        ...client,
        cabinet: cabinetData
      } as ClientData);

      // Load documents - use owner_id instead of cabinet_id
      if (client.owner_id) {
        const { data: docs, error: docsError } = await supabase
          .storage
          .from('documents')
          .list(`${client.owner_id}/${client.id}`);

        if (!docsError && docs) {
          const documentsWithUrls = await Promise.all(
            docs.map(async (doc) => {
              const { data: urlData } = await supabase.storage
                .from('documents')
                .createSignedUrl(`${client.owner_id}/${client.id}/${doc.name}`, 3600);

              return {
                id: doc.id,
                name: doc.name,
                url: urlData?.signedUrl || '',
                created_at: doc.created_at || '',
                size: doc.metadata?.size,
              };
            })
          );
          setDocuments(documentsWithUrls);
        }
      }

      // Load dossiers
      const { data: dossiersList, error: dossiersError } = await supabase
        .from('dossiers')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (!dossiersError && dossiersList) {
        setDossiers(dossiersList);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error loading client data:', err);
      toast.error('Erreur lors du chargement des données');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Téléchargement réussi');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; class: string }> = {
      'en_cours': { label: 'En cours', class: 'bg-blue-100 text-blue-800' },
      'termine': { label: 'Terminé', class: 'bg-green-100 text-green-800' },
      'en_attente': { label: 'En attente', class: 'bg-yellow-100 text-yellow-800' },
    };
    const config = statusConfig[status] || { label: status, class: 'bg-gray-100 text-gray-800' };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}>{config.label}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mon Espace Client</h1>
              {clientData?.cabinet && (
                <p className="text-sm text-gray-600">Cabinet {clientData.cabinet.nom}</p>
              )}
            </div>
            <Button 
              onClick={handleSignOut} 
              variant="ghost" 
              size="sm"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Info Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Mes Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Nom</p>
                  <p className="font-medium text-gray-900">{clientData?.name}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{clientData?.email}</p>
                </div>
              </div>
              {clientData?.phone && (
                <div className="flex items-start space-x-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Téléphone</p>
                    <p className="font-medium text-gray-900">{clientData.phone}</p>
                  </div>
                </div>
              )}
              {clientData?.address && (
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Adresse</p>
                    <p className="font-medium text-gray-900">{clientData.address}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents and Dossiers */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dossiers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 flex items-center">
                  <Folder className="h-5 w-5 mr-2" />
                  Mes Dossiers ({dossiers.length})
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Suivez l'avancement de vos dossiers en temps réel
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dossiers.length === 0 ? (
                  <p className="text-sm text-gray-600 text-center py-8">Aucun dossier pour le moment</p>
                ) : (
                  <div className="space-y-3">
                    {dossiers.map((dossier) => (
                      <div key={dossier.id} className="border rounded-lg p-4 hover:bg-blue-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{dossier.titre}</h4>
                            {dossier.description && (
                              <p className="text-sm text-gray-600 mt-1">{dossier.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              Créé le {new Date(dossier.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <div>
                            {getStatusBadge(dossier.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Mes Documents ({documents.length})
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Accédez à tous vos documents en un seul endroit
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-sm text-gray-600 text-center py-8">Aucun document pour le moment</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(doc.size)} • {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleDownload(doc.url, doc.name)}
                          variant="ghost"
                          size="sm"
                          className="hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
