import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Users, 
  Search, 
  UserCheck, 
  UserX, 
  Eye,
  Mail,
  FileText,
  MessageSquare,
  PenTool,
  Loader2
} from 'lucide-react';

interface ClientWithInvitation {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  user_id: string | null;
  invitation_status: 'pending' | 'active' | null;
  invitation_email: string | null;
  access_code: string | null;
  created_at: string;
}

export default function ClientSpaces() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientWithInvitation[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientWithInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Déterminer le rôle depuis l'URL
  const role = location.pathname.includes('/notaires') ? 'notaire' : 'avocat';
  const prefix = role === 'notaire' ? '/notaires' : '/avocats';

  useEffect(() => {
    loadClients();
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredClients(clients);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredClients(
        clients.filter(
          (client) =>
            client.nom.toLowerCase().includes(query) ||
            client.prenom.toLowerCase().includes(query) ||
            client.email.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, clients]);

  const loadClients = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Récupérer les cabinets de l'utilisateur
      const { data: cabinetsData } = await supabase.rpc('get_user_cabinets');
      const cabinets = Array.isArray(cabinetsData) ? cabinetsData : [];
      
      if (cabinets.length === 0) {
        setClients([]);
        setFilteredClients([]);
        setLoading(false);
        return;
      }

      // Prendre le premier cabinet avec le bon rôle, ou le premier disponible
      const matchingCabinet = cabinets.find((c: any) => c.role === role) || cabinets[0];
      const cabinetId = matchingCabinet.id;

      // Récupérer tous les clients avec leurs invitations
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          id,
          nom,
          prenom,
          email,
          telephone,
          created_at,
          client_invitations (
            status,
            email,
            access_code,
            created_at
          )
        `)
        .eq('owner_id', cabinetId)
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Mapper les données pour inclure les informations de la dernière invitation
      const mappedClients: ClientWithInvitation[] = (clientsData || []).map((client: any) => {
        // Prendre la dernière invitation (la plus récente)
        const invitations = client.client_invitations || [];
        const invitation = invitations.length > 0
          ? invitations.sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]
          : null;
        return {
          id: client.id,
          nom: client.nom,
          prenom: client.prenom,
          email: client.email,
          telephone: client.telephone,
          user_id: client.user_id,
          invitation_status: invitation?.status || null,
          invitation_email: invitation?.email || null,
          access_code: invitation?.access_code || null,
          created_at: client.created_at,
        };
      });

      setClients(mappedClients);
      setFilteredClients(mappedClients);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const handleViewClientSpace = (clientId: string) => {
    navigate(`${prefix}/client-spaces/${clientId}`);
  };

  const getStatusBadge = (status: 'pending' | 'active' | null, hasUserId?: boolean) => {
    if (!status) {
      return (
        <Badge variant="outline" className="gap-1">
          <UserX className="w-3 h-3" />
          Non invité
        </Badge>
      );
    }
    if (status === 'pending' && !hasUserId) {
      return (
        <div className="text-right">
          <Badge variant="outline" className="gap-1 border-orange-500 text-orange-700">
            <Mail className="w-3 h-3" />
            Invitation envoyée
          </Badge>
          <div className="text-xs text-muted-foreground mt-1">En attente de l'activation</div>
        </div>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 border-green-500 text-green-700">
        <UserCheck className="w-3 h-3" />
        Client actif dans l'espace
      </Badge>
    );
  };

  const stats = {
    total: clients.length,
    active: clients.filter((c) => c.invitation_status === 'active').length,
    pending: clients.filter((c) => c.invitation_status === 'pending').length,
    notInvited: clients.filter((c) => !c.invitation_status).length,
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8" />
            Espace Client
          </h1>
          <p className="text-muted-foreground mt-2">
            Accédez aux espaces clients pour partager des documents, échanger et gérer les signatures
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Comptes actifs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Invitations en attente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Non invités</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-400">{stats.notInvited}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un client par nom, prénom ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
        </Card>

        {/* Clients List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredClients.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'Aucun client trouvé' : 'Aucun client enregistré'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">
                        {client.prenom} {client.nom}
                      </CardTitle>
                      <div className="mt-1 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3" />
                          {client.email}
                        </div>
                        {client.telephone && (
                          <div className="flex items-center gap-2">
                            📞 {client.telephone}
                          </div>
                        )}
                        {client.access_code && (
                          <div className="flex items-center gap-2 text-xs font-mono bg-blue-50 px-2 py-1 rounded inline-block mt-2">
                            🔑 Code d'accès: <span className="font-bold tracking-wider">{client.access_code}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>{getStatusBadge(client.invitation_status, !!client.user_id)}</div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        Documents
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        Messages
                      </span>
                      <span className="flex items-center gap-1">
                        <PenTool className="w-4 h-4" />
                        Signatures
                      </span>
                    </div>
                    <Button
                      onClick={() => handleViewClientSpace(client.id)}
                      variant={client.invitation_status === 'active' || client.user_id ? 'default' : 'outline'}
                      className="gap-2 hover:bg-blue-700"
                    >
                      <Eye className="w-4 h-4" />
                      Accéder à l'espace
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
