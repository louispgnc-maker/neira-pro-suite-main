import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FileSignature, Eye, Download } from 'lucide-react';
import ClientLayout from '@/components/client/ClientLayout';

interface Contrat {
  id: string;
  name: string;
  type: string;
  category: string;
  created_at: string;
  updated_at: string;
  content?: string;
  contenu_json?: any;
}

export default function ClientContrats() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [contrats, setContrats] = useState<Contrat[]>([]);
  const [selectedContrat, setSelectedContrat] = useState<Contrat | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadContrats();
  }, [user, navigate]);

  const loadContrats = async () => {
    try {
      setLoading(true);

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

      // Load contrats for this client
      const { data: contratsData, error: contratsError } = await supabase
        .from('contrats')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (contratsError) throw contratsError;

      setContrats(contratsData || []);
    } catch (error) {
      console.error('Erreur lors du chargement des contrats:', error);
      toast.error('Erreur lors du chargement des contrats');
    } finally {
      setLoading(false);
    }
  };

  const handleViewContrat = (contrat: Contrat) => {
    setSelectedContrat(contrat);
    setViewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      brouillon: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
      en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      valide: { label: 'Validé', color: 'bg-green-100 text-green-800' },
      signe: { label: 'Signé', color: 'bg-blue-100 text-blue-800' },
    };
    const config = statusConfig[status] || statusConfig.brouillon;
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <ClientLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mes contrats</h1>
          <p className="text-gray-600 mt-2">
            Consultez les contrats partagés avec vous par votre professionnel
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Chargement...</p>
          </div>
        ) : contrats.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileSignature className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Aucun contrat partagé</p>
              <p className="text-sm text-gray-400 mt-1">
                Vos contrats apparaîtront ici une fois qu'ils seront partagés par votre professionnel
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {contrats.map((contrat) => (
              <Card key={contrat.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileSignature className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {contrat.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Type:</span> {contrat.type}
                        </span>
                        {contrat.category && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {contrat.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Créé le {new Date(contrat.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewContrat(contrat)}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Voir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View Contract Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedContrat?.name}</DialogTitle>
              <DialogDescription>
                {selectedContrat?.type} • {selectedContrat?.category}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {selectedContrat?.contenu_json?.sections ? (
                <div className="space-y-6">
                  {selectedContrat.contenu_json.sections.map((section: any, index: number) => (
                    <div key={index} className="space-y-2">
                      <h3 className="font-semibold text-lg">{section.titre}</h3>
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: section.contenu }}
                      />
                    </div>
                  ))}
                </div>
              ) : selectedContrat?.content ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedContrat.content }}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Contenu du contrat non disponible
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientLayout>
  );
}
