import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { 
  FileText, 
  MessageSquare, 
  BarChart3, 
  CheckSquare, 
  Calendar, 
  FolderOpen
} from 'lucide-react';

interface Cabinet {
  id: string;
  nom: string;
  role: string;
}

interface CabinetMember {
  id: string;
  email: string;
  nom?: string;
  role_cabinet: string;
  status: string;
}

interface SharedDocument {
  id: string;
  title: string;
  description: string | null;
  shared_at: string;
  shared_by: string;
  document_id: string;
}

interface SharedDossier {
  id: string;
  title: string;
  description: string | null;
  status: string;
  shared_at: string;
  shared_by: string;
  dossier_id: string;
}

interface SharedContrat {
  id: string;
  title: string;
  description: string | null;
  category: string;
  contrat_type: string;
  shared_at: string;
  shared_by: string;
  contrat_id: string;
}

export default function EspaceCollaboratif() {
  const { user } = useAuth();
  const location = useLocation();
  const [cabinet, setCabinet] = useState<Cabinet | null>(null);
  const [members, setMembers] = useState<CabinetMember[]>([]);
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [dossiers, setDossiers] = useState<SharedDossier[]>([]);
  const [contrats, setContrats] = useState<SharedContrat[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const cabinetRole = role;
  const colorClass = cabinetRole === 'notaire'
    ? 'bg-amber-600 hover:bg-amber-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  useEffect(() => {
    loadCabinetData();
  }, []);

  const loadCabinetData = async () => {
    setLoading(true);
    try {
      if (!user) return;

      // Charger le cabinet
      const { data: cabinets, error: cabinetError } = await supabase
        .rpc('get_user_cabinets')
        .eq('role', cabinetRole);

      if (cabinetError) throw cabinetError;

      const userCabinet = cabinets?.[0] || null;
      setCabinet(userCabinet);

      if (userCabinet) {
        // Charger les membres
        const { data: membersData, error: membersError } = await supabase
          .rpc('get_cabinet_members', { cabinet_id_param: userCabinet.id });

        if (membersError) throw membersError;
        setMembers(membersData || []);

        // Charger les documents partagés
        const { data: docsData, error: docsError } = await supabase
          .rpc('get_cabinet_documents', { cabinet_id_param: userCabinet.id });

        if (docsError) {
          console.error('Erreur chargement documents:', docsError);
        } else {
          setDocuments(docsData || []);
        }

        // Charger les dossiers partagés
        const { data: dossiersData, error: dossiersError } = await supabase
          .rpc('get_cabinet_dossiers', { cabinet_id_param: userCabinet.id });

        if (dossiersError) {
          console.error('Erreur chargement dossiers:', dossiersError);
        } else {
          setDossiers(dossiersData || []);
        }

        // Charger les contrats partagés
        const { data: contratsData, error: contratsError } = await supabase
          .rpc('get_cabinet_contrats', { cabinet_id_param: userCabinet.id });

        if (contratsError) {
          console.error('Erreur chargement contrats:', contratsError);
        } else {
          setContrats(contratsData || []);
        }
      }
    } catch (error: any) {
      console.error('Erreur chargement espace collaboratif:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger l\'espace collaboratif',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Chargement...</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!cabinet) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                Vous devez rejoindre un cabinet pour accéder à l'espace collaboratif.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Espace Collaboratif</h1>
        <div className="flex items-center gap-2">
          <Badge className={colorClass}>{cabinet.nom}</Badge>
          <span className="text-sm text-muted-foreground">
            {members.length} membre{members.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Onglets principaux */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Tableau de bord
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents & Contrats
          </TabsTrigger>
          <TabsTrigger value="dossiers">
            <FolderOpen className="h-4 w-4 mr-2" />
            Dossiers
          </TabsTrigger>
          <TabsTrigger value="calendrier">
            <Calendar className="h-4 w-4 mr-2" />
            Calendrier
          </TabsTrigger>
          <TabsTrigger value="taches">
            <CheckSquare className="h-4 w-4 mr-2" />
            Tâches
          </TabsTrigger>
          <TabsTrigger value="discussion">
            <MessageSquare className="h-4 w-4 mr-2" />
            Discussion
          </TabsTrigger>
        </TabsList>

        {/* Tableau de bord */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Documents partagés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{documents.length + contrats.length}</div>
                <p className="text-xs text-muted-foreground">documents et contrats au total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Dossiers partagés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dossiers.length}</div>
                <p className="text-xs text-muted-foreground">dossiers partagés</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Membres actifs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members.filter(m => m.status === 'active').length}</div>
                <p className="text-xs text-muted-foreground">membres du cabinet</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 && dossiers.length === 0 && contrats.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune activité récente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...documents.map(d => ({ ...d, type: 'Document' })), 
                    ...dossiers.map(d => ({ ...d, type: 'Dossier' })), 
                    ...contrats.map(c => ({ ...c, type: 'Contrat' }))]
                    .sort((a, b) => new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime())
                    .slice(0, 5)
                    .map((item, idx) => (
                      <div key={`${item.type}-${idx}`} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.type} partagé le {new Date(item.shared_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{item.type}</Badge>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents & Contrats */}
        <TabsContent value="documents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Documents */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Documents partagés</CardTitle>
                    <CardDescription className="text-sm">
                      {documents.length} document{documents.length > 1 ? 's' : ''} accessible{documents.length > 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Aucun document partagé</p>
                    <p className="text-xs mt-1">Partagez des documents depuis votre espace</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-3 border rounded-lg hover:bg-accent transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{doc.title}</p>
                            {doc.description && (
                              <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Partagé le {new Date(doc.shared_at).toLocaleDateString()}
                            </p>
                          </div>
                          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contrats */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Contrats partagés</CardTitle>
                    <CardDescription className="text-sm">
                      {contrats.length} contrat{contrats.length > 1 ? 's' : ''} accessible{contrats.length > 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {contrats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Aucun contrat partagé</p>
                    <p className="text-xs mt-1">Partagez des contrats depuis votre espace</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {contrats.map((contrat) => (
                      <div key={contrat.id} className="p-3 border rounded-lg hover:bg-accent transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{contrat.title}</p>
                              <Badge variant="outline" className={
                                cabinetRole === 'notaire'
                                  ? 'bg-amber-100 text-amber-600 border-amber-200'
                                  : 'bg-blue-100 text-blue-600 border-blue-200'
                              }>
                                {contrat.category}
                              </Badge>
                            </div>
                            {contrat.description && (
                              <p className="text-sm text-muted-foreground mt-1">{contrat.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Type: {contrat.contrat_type} • Partagé le {new Date(contrat.shared_at).toLocaleDateString()}
                            </p>
                          </div>
                          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dossiers clients */}
        <TabsContent value="dossiers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Dossiers clients partagés</CardTitle>
                  <CardDescription>
                    {dossiers.length} dossier{dossiers.length > 1 ? 's' : ''} accessible{dossiers.length > 1 ? 's' : ''}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {dossiers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun dossier partagé</p>
                  <p className="text-sm mt-2">Partagez des dossiers depuis votre espace</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {dossiers.map((dossier) => (
                    <div key={dossier.id} className="p-4 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <FolderOpen className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{dossier.title}</p>
                              {dossier.description && (
                                <p className="text-sm text-muted-foreground mt-1">{dossier.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className={
                          dossier.status === 'Ouvert' 
                            ? 'bg-green-100 text-green-700 border-green-300'
                            : dossier.status === 'En cours'
                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                            : dossier.status === 'Clos'
                            ? 'bg-gray-100 text-gray-700 border-gray-300'
                            : 'bg-yellow-100 text-yellow-700 border-yellow-300'
                        }>
                          {dossier.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 ml-8">
                        Partagé le {new Date(dossier.shared_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendrier */}
        <TabsContent value="calendrier" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendrier partagé</CardTitle>
              <CardDescription>
                Planifiez et coordonnez les événements du cabinet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Calendrier partagé</p>
                <p className="text-sm mt-2">Fonctionnalité en cours de développement</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tâches */}
        <TabsContent value="taches" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tâches partagées</CardTitle>
                  <CardDescription>
                    Gérez les tâches collaboratives du cabinet
                  </CardDescription>
                </div>
                <Button className={colorClass}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle tâche
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune tâche pour le moment</p>
                <p className="text-sm mt-2">Créez votre première tâche collaborative</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discussion */}
        <TabsContent value="discussion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Discussion d'équipe</CardTitle>
              <CardDescription>
                Communiquez avec les membres de votre cabinet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune conversation pour le moment</p>
                <p className="text-sm mt-2">Fonctionnalité en cours de développement</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </AppLayout>
  );
}
