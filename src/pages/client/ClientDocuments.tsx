import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { FileText, Download, Search, Filter } from 'lucide-react';
import ClientLayout from '@/components/client/ClientLayout';

interface Document {
  id: string;
  name: string;
  url: string;
  created_at: string;
  size?: number;
  metadata?: any;
}

export default function ClientDocuments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadDocuments();
  }, [user, navigate]);

  useEffect(() => {
    if (searchQuery) {
      setFilteredDocuments(
        documents.filter((doc) =>
          doc.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredDocuments(documents);
    }
  }, [searchQuery, documents]);

  const loadDocuments = async () => {
    try {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (clientError) throw clientError;

      const { data: cabinetClient } = await supabase
        .from('cabinet_clients')
        .select('cabinet_id')
        .eq('client_id', client.id)
        .single();

      if (cabinetClient) {
        const { data: files, error: filesError } = await supabase.storage
          .from('documents')
          .list(`${cabinetClient.cabinet_id}/${client.id}`);

        if (filesError) throw filesError;

        if (files) {
          const documentsWithUrls = await Promise.all(
            files.map(async (file) => {
              const { data: urlData } = await supabase.storage
                .from('documents')
                .createSignedUrl(
                  `${cabinetClient.cabinet_id}/${client.id}/${file.name}`,
                  3600
                );

              return {
                id: file.id,
                name: file.name,
                url: urlData?.signedUrl || '',
                created_at: file.created_at || '',
                size: file.metadata?.size,
                metadata: file.metadata,
              };
            })
          );
          setDocuments(documentsWithUrls);
          setFilteredDocuments(documentsWithUrls);
        }
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      toast.error('Erreur lors du chargement des documents');
      setLoading(false);
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Mes documents</h1>
          <p className="mt-2 text-gray-600">
            Accédez à tous vos documents partagés par votre professionnel
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher un document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="sm:w-auto">
            <Filter className="h-4 w-4 mr-2" />
            Filtres
          </Button>
        </div>

        {/* Documents Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Tous les documents ({filteredDocuments.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchQuery
                    ? 'Aucun document trouvé pour cette recherche'
                    : 'Aucun document pour le moment'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(doc.size)} •{' '}
                          {new Date(doc.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDownload(doc.url, doc.name)}
                      variant="ghost"
                      size="sm"
                      className="ml-4"
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
    </ClientLayout>
  );
}
