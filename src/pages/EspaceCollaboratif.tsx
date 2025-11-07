import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
  FolderOpen,
  Upload,
  Plus
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

export default function EspaceCollaboratif() {
  const { role } = useParams<{ role: 'notaires' | 'avocats' }>();
  const [cabinet, setCabinet] = useState<Cabinet | null>(null);
  const [members, setMembers] = useState<CabinetMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const cabinetRole = role === 'notaires' ? 'notaire' : 'avocat';
  const colorClass = cabinetRole === 'notaire'
    ? 'bg-amber-600 hover:bg-amber-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  useEffect(() => {
    loadCabinetData();
  }, []);

  const loadCabinetData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Chargement...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!cabinet) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Vous devez rejoindre un cabinet pour accéder à l'espace collaboratif.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
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
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="discussion">
            <MessageSquare className="h-4 w-4 mr-2" />
            Discussion
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Tableau de bord
          </TabsTrigger>
          <TabsTrigger value="taches">
            <CheckSquare className="h-4 w-4 mr-2" />
            Tâches
          </TabsTrigger>
          <TabsTrigger value="calendrier">
            <Calendar className="h-4 w-4 mr-2" />
            Calendrier
          </TabsTrigger>
          <TabsTrigger value="dossiers">
            <FolderOpen className="h-4 w-4 mr-2" />
            Dossiers
          </TabsTrigger>
        </TabsList>

        {/* Documents partagés */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documents partagés</CardTitle>
                  <CardDescription>
                    Tous les documents accessibles par les membres du cabinet
                  </CardDescription>
                </div>
                <Button className={colorClass}>
                  <Upload className="h-4 w-4 mr-2" />
                  Ajouter un document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun document partagé pour le moment</p>
                <p className="text-sm mt-2">Ajoutez votre premier document pour commencer</p>
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

        {/* Tableau de bord */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Documents partagés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">documents au total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Tâches en cours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">tâches actives</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Événements à venir</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">cette semaine</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune activité récente</p>
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

        {/* Dossiers clients */}
        <TabsContent value="dossiers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Dossiers clients partagés</CardTitle>
                  <CardDescription>
                    Accédez aux dossiers clients du cabinet
                  </CardDescription>
                </div>
                <Button className={colorClass}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau dossier
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun dossier partagé</p>
                <p className="text-sm mt-2">Créez votre premier dossier client partagé</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
