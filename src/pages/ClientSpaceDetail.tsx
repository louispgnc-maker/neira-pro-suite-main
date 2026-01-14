import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  FileText,
  MessageSquare,
  PenTool,
  Upload,
  Send,
  Loader2,
  Download,
  Eye,
  UserCheck,
  Mail
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ClientInfo {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  invitation_status: 'pending' | 'active' | null;
  access_code: string | null;
}

interface Document {
  id: string;
  name: string;
  size: number;
  created_at: string;
  shared_by: string;
}

interface Message {
  id: string;
  content: string;
  sender_name: string;
  created_at: string;
  is_from_client: boolean;
}

export default function ClientSpaceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const role = location.pathname.includes('/notaires') ? 'notaire' : 'avocat';
  const prefix = role === 'notaire' ? '/notaires' : '/avocats';

  useEffect(() => {
    if (id) {
      loadClientInfo();
      loadDocuments();
      loadMessages();
    }
  }, [id, user]);

  const loadClientInfo = async () => {
    if (!id || !user) return;

    try {
      setLoading(true);

      const { data: clientData, error } = await supabase
        .from('clients')
        .select(`
          id,
          nom,
          prenom,
          email,
          telephone,
          client_invitations (
            status,
            access_code
          )
        `)
        .eq('id', id)
        .eq('owner_id', user.id)
        .single();

      if (error) throw error;

      const invitation = clientData.client_invitations?.[0];
      setClient({
        id: clientData.id,
        nom: clientData.nom,
        prenom: clientData.prenom,
        email: clientData.email,
        telephone: clientData.telephone,
        invitation_status: invitation?.status || null,
        access_code: invitation?.access_code || null,
      });
    } catch (error) {
      console.error('Erreur lors du chargement du client:', error);
      toast.error('Client introuvable');
      navigate(`${prefix}/client-spaces`);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    // TODO: Implémenter le chargement des documents partagés avec ce client
    // Pour l'instant, liste vide
    setDocuments([]);
  };

  const loadMessages = async () => {
    // TODO: Implémenter le chargement des messages avec ce client
    // Pour l'instant, liste vide
    setMessages([]);
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !client) return;

    try {
      setSendingMessage(true);
      // TODO: Implémenter l'envoi de message
      toast.success('Message envoyé');
      setMessageContent('');
      loadMessages();
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setSendingMessage(false);
    }
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

  if (!client) {
    return null;
  }

  const getStatusBadge = () => {
    if (!client.invitation_status) {
      return (
        <Badge variant="outline" className="gap-1">
          Non invité
        </Badge>
      );
    }
    if (client.invitation_status === 'pending') {
      return (
        <Badge variant="outline" className="gap-1 border-orange-500 text-orange-700">
          <Mail className="w-3 h-3" />
          Invitation envoyée
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 border-green-500 text-green-700">
        <UserCheck className="w-3 h-3" />
        Compte actif
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`${prefix}/client-spaces`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {client.prenom} {client.nom}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-muted-foreground">{client.email}</p>
                {getStatusBadge()}
              </div>
            </div>
          </div>
          {client.access_code && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Code d'accès client</div>
              <div className="text-2xl font-bold font-mono tracking-widest text-blue-600">
                {client.access_code}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="signatures" className="gap-2">
              <PenTool className="w-4 h-4" />
              Signatures
            </TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Documents partagés</CardTitle>
                  <Button className="gap-2">
                    <Upload className="w-4 h-4" />
                    Partager un document
                  </Button>
                </div>
                <CardDescription>
                  Documents partagés avec ce client
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun document partagé</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Partagez des documents avec votre client pour commencer
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div>
                            <div className="font-medium">{doc.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Partagé par {doc.shared_by}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Conversation</CardTitle>
                <CardDescription>
                  Échangez avec votre client en temps réel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Messages list */}
                <div className="space-y-3 min-h-[400px] max-h-[400px] overflow-y-auto border rounded-lg p-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Aucun message</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Commencez la conversation avec votre client
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.is_from_client ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            message.is_from_client
                              ? 'bg-gray-100'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          <div className="text-sm font-medium mb-1">
                            {message.sender_name}
                          </div>
                          <div>{message.content}</div>
                          <div className="text-xs mt-1 opacity-70">
                            {new Date(message.created_at).toLocaleString('fr-FR')}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message input */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Écrivez votre message..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    className="flex-1"
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageContent.trim() || sendingMessage}
                    className="gap-2"
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Envoyer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Signatures Tab */}
          <TabsContent value="signatures" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Documents à signer</CardTitle>
                  <Button className="gap-2">
                    <PenTool className="w-4 h-4" />
                    Demander une signature
                  </Button>
                </div>
                <CardDescription>
                  Gérez les signatures électroniques avec ce client
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <PenTool className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun document en attente de signature</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Envoyez des documents à signer à votre client
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
