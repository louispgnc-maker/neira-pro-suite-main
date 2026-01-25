import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Folder, Plus, Trash2, Eye, FileText, Clock, CheckCircle2, FileSignature } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import DossierDocumentsManager from './DossierDocumentsManager';
import MultiSourceDocumentSelector from './MultiSourceDocumentSelector';

interface DossierManagerProps {
  clientId: string;
  cabinetId: string;
  userId: string;
  isProView: boolean;
  role?: 'avocat' | 'notaire';
  onRefresh?: () => void;
}

interface Dossier {
  id: string;
  titre: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function DossierManager({ clientId, cabinetId, userId, isProView, role: propRole, onRefresh }: DossierManagerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = propRole || (location.pathname.includes('/notaires') ? 'notaire' : 'avocat');
  
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<string | null>(null);
  const [documentSelectorOpen, setDocumentSelectorOpen] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);
  const [selectedContracts, setSelectedContracts] = useState<any[]>([]);
  const [availableContracts, setAvailableContracts] = useState<any[]>([]);
  const [newDossier, setNewDossier] = useState({
    titre: '',
    description: '',
    status: 'en_cours',
  });

  useEffect(() => {
    loadDossiers();
    loadContracts();
  }, [clientId]);

  const loadDossiers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_dossiers_new')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDossiers(data || []);
    } catch (error) {
      console.error('Erreur chargement dossiers:', error);
      toast.error('Erreur lors du chargement des dossiers');
    } finally {
      setLoading(false);
    }
  };

  const loadContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contrats')
        .select('id, name, type, category, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableContracts(data || []);
    } catch (error) {
      console.error('Erreur chargement contrats:', error);
    }
  };

  const handleCreateDossier = async () => {
    if (!newDossier.titre.trim()) {
      toast.error('Le titre est requis');
      return;
    }

    try {
      // Créer le dossier
      const { data: dossierData, error: dossierError } = await supabase
        .from('client_dossiers_new')
        .insert({
          client_id: clientId,
          cabinet_id: cabinetId,
          titre: newDossier.titre,
          description: newDossier.description,
          status: newDossier.status,
        })
        .select()
        .single();

      if (dossierError) throw dossierError;

      // Ajouter les documents sélectionnés
      if (selectedDocuments.length > 0) {
        const documentsToAdd = selectedDocuments.map(doc => ({
          dossier_id: dossierData.id,
          document_id: doc.id,
          document_nom: doc.nom,
          document_type: doc.type,
          document_taille: doc.taille,
          source: doc.source
        }));

        const { error: docsError } = await supabase
          .from('client_dossier_documents')
          .insert(documentsToAdd);

        if (docsError) throw docsError;
      }

      toast.success('Dossier créé avec succès');
      setCreateDialogOpen(false);
      setNewDossier({ titre: '', description: '', status: 'en_cours' });
      setSelectedDocuments([]);
      setSelectedContracts([]);
      loadDossiers();
      onRefresh?.();
    } catch (error) {
      console.error('Erreur création dossier:', error);
      toast.error('Erreur lors de la création');
    }
  };

  const handleSelectDocuments = (docs: any[]) => {
    setSelectedDocuments(docs);
    setDocumentSelectorOpen(false);
  };

  const handleToggleContract = (contractId: string) => {
    setSelectedContracts(prev => 
      prev.includes(contractId)
        ? prev.filter(id => id !== contractId)
        : [...prev, contractId]
    );
  };

  const handleDeleteDossier = async (dossierId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce dossier ?')) return;

    try {
      const { error } = await supabase
        .from('client_dossiers_new')
        .delete()
        .eq('id', dossierId);

      if (error) throw error;

      toast.success('Dossier supprimé');
      loadDossiers();
      onRefresh?.();
    } catch (error) {
      console.error('Erreur suppression dossier:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      en_cours: { label: 'En cours', color: 'bg-blue-100 text-blue-800', icon: Clock },
      termine: { label: 'Terminé', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    };
    const config = statusConfig[status] || statusConfig.en_cours;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
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
              <CardTitle>Dossiers du client</CardTitle>
              <CardDescription>
                Organisez les documents et informations par dossier
              </CardDescription>
            </div>
            {isProView && (
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Créer un dossier
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : dossiers.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun dossier</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isProView
                  ? 'Créez un dossier pour organiser les documents du client'
                  : 'Aucun dossier n\'a été créé pour le moment'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dossiers.map((dossier) => (
                <div
                  key={dossier.id}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-colors cursor-pointer ${
                    role === 'notaire'
                      ? 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                      : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                  }`}
                  onDoubleClick={() => navigate(`/${role}s/dossiers/${dossier.id}`)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Folder className={`w-5 h-5 ${role === 'notaire' ? 'text-orange-600' : 'text-blue-600'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{dossier.titre}</h4>
                        {getStatusBadge(dossier.status)}
                      </div>
                      {dossier.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {dossier.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Créé le {new Date(dossier.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={role === 'notaire' ? 'hover:bg-orange-100 hover:text-orange-700' : 'hover:bg-blue-100 hover:text-blue-700'}
                      onClick={() => navigate(`/${role}s/dossiers/${dossier.id}`)}
                      title="Voir le détail du dossier"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {isProView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDossier(dossier.id)}
                        className="hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dossier Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un nouveau dossier</DialogTitle>
            <DialogDescription>
              Organisez les documents et informations du client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="titre">Titre du dossier *</Label>
              <Input
                id="titre"
                placeholder="Ex: Succession Dupont"
                value={newDossier.titre}
                onChange={(e) => setNewDossier({ ...newDossier, titre: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Description du dossier..."
                value={newDossier.description}
                onChange={(e) => setNewDossier({ ...newDossier, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={newDossier.status}
                onValueChange={(value) => setNewDossier({ ...newDossier, status: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionnez un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_cours">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>En cours</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="en_attente">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      <span>En attente</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="termine">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span>Terminé</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Documents Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Documents ({selectedDocuments.length})</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDocumentSelectorOpen(true)}
                  className="gap-2 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border-blue-200"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter des documents
                </Button>
              </div>
              {selectedDocuments.length > 0 && (
                <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                  {selectedDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="truncate">{doc.nom}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDocuments(prev => prev.filter(d => d.id !== doc.id))}
                        className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contrats Selection */}
            <div className="space-y-2">
              <Label>Contrats liés ({selectedContracts.length})</Label>
              {availableContracts.length > 0 ? (
                <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                  {availableContracts.map((contrat) => (
                    <div
                      key={contrat.id}
                      className="flex items-center gap-3 p-2 hover:bg-accent/50 rounded cursor-pointer"
                      onClick={() => handleToggleContract(contrat.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedContracts.includes(contrat.id)}
                        onChange={() => {}}
                        className="cursor-pointer"
                      />
                      <FileSignature className="w-4 h-4 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{contrat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {contrat.type} • {new Date(contrat.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun contrat disponible</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
              setCreateDialogOpen(false);
              setSelectedDocuments([]);
              setSelectedContracts([]);
            }}
              className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleCreateDossier}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Créer le dossier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Selector */}
      <MultiSourceDocumentSelector
        open={documentSelectorOpen}
        onClose={() => setDocumentSelectorOpen(false)}
        onSelect={handleSelectDocuments}
        cabinetId={cabinetId}
        userId={userId}
        clientId={clientId}
      />

      {/* Dossier Documents Manager */}
      {selectedDossier && (
        <DossierDocumentsManager
          dossierId={selectedDossier}
          open={!!selectedDossier}
          onClose={() => setSelectedDossier(null)}
          cabinetId={cabinetId}
          userId={userId}
          clientId={clientId}
          isProView={isProView}
        />
      )}
    </>
  );
}
