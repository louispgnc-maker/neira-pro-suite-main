import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileSignature, Plus, Upload, Eye, Edit, Trash2, Download } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ContratManagerProps {
  clientId: string;
  cabinetId: string;
  isProView: boolean;
  role: 'avocat' | 'notaire';
}

interface Contrat {
  id: string;
  titre: string;
  type_contrat: string;
  status: string;
  contenu: any;
  created_at: string;
  updated_at: string;
}

export default function ContratManager({ clientId, cabinetId, isProView, role }: ContratManagerProps) {
  const navigate = useNavigate();
  const [contrats, setContrats] = useState<Contrat[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContrat, setSelectedContrat] = useState<Contrat | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const prefix = role === 'notaire' ? '/notaires' : '/avocats';

  useEffect(() => {
    loadContrats();
  }, [clientId]);

  const loadContrats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contrats')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContrats(data || []);
    } catch (error) {
      console.error('Erreur chargement contrats:', error);
      toast.error('Erreur lors du chargement des contrats');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContrat = () => {
    // Rediriger vers la page des contrats où l'utilisateur peut créer un contrat
    // Le client_id sera disponible dans l'état de navigation pour pré-sélection
    navigate(`${prefix}/contrats`, { state: { preselectedClientId: clientId } });
  };

  const handleViewContrat = (contrat: Contrat) => {
    setSelectedContrat(contrat);
    setViewDialogOpen(true);
  };

  const handleEditContrat = (contratId: string) => {
    if (isProView) {
      navigate(`${prefix}/contrats/${contratId}/edit`);
    }
  };

  const handleDeleteContrat = async (contratId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contrat ?')) return;

    try {
      const { error } = await supabase
        .from('contrats')
        .delete()
        .eq('id', contratId);

      if (error) throw error;

      toast.success('Contrat supprimé');
      loadContrats();
    } catch (error) {
      console.error('Erreur suppression contrat:', error);
      toast.error('Erreur lors de la suppression');
    }
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contrats partagés</CardTitle>
              <CardDescription>
                {isProView
                  ? 'Gérez les contrats avec ce client'
                  : 'Consultez vos contrats'}
              </CardDescription>
            </div>
            {isProView && (
              <div className="flex gap-2">
                <Button onClick={handleCreateContrat} className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4" />
                  Créer un contrat
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : contrats.length === 0 ? (
            <div className="text-center py-12">
              <FileSignature className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun contrat</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isProView
                  ? 'Créez un contrat pour le partager avec votre client'
                  : 'Aucun contrat n\'a été partagé avec vous'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {contrats.map((contrat) => (
                <div
                  key={contrat.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileSignature className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{contrat.titre}</h4>
                        {getStatusBadge(contrat.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {contrat.type_contrat}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Créé le {new Date(contrat.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewContrat(contrat)}
                      className="hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {isProView && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditContrat(contrat.id)}
                          className="hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContrat(contrat.id)}
                          className="hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Contrat Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedContrat?.titre}</DialogTitle>
            <DialogDescription>
              {selectedContrat?.type_contrat} • {getStatusBadge(selectedContrat?.status || '')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedContrat?.contenu?.sections ? (
              <div className="space-y-6">
                {selectedContrat.contenu.sections.map((section: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <h3 className="font-semibold text-lg">{section.titre}</h3>
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: section.contenu }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Contenu du contrat non disponible
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fermer
            </Button>
            {isProView && selectedContrat && (
              <Button onClick={() => handleEditContrat(selectedContrat.id)}>
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
