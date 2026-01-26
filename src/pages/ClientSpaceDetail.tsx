import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Mail,
  Folder,
  User,
  FileSignature,
  Plus,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DocumentManager } from '@/components/client-space/DocumentManager';
import DossierManager from '@/components/client-space/DossierManager';
import ContratManager from '@/components/client-space/ContratManager';

interface ClientInfo {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  invitation_status: 'pending' | 'active' | null;
  access_code: string | null;
  user_id: string | null;
  // Informations complètes
  date_naissance: string | null;
  lieu_naissance: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  pays: string | null;
  nationalite: string | null;
  sexe: string | null;
  etat_civil: string | null;
  situation_matrimoniale: string | null;
  profession: string | null;
  employeur: string | null;
  kyc_status: string | null;
}

interface ProfileSuggestion {
  id: string;
  suggested_changes: any[];
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface DocumentFile {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
  description?: string | null;
}

interface Message {
  id: string;
  message: string;
  sender_id: string;
  sender_type: 'client' | 'professional';
  created_at: string;
  has_attachment?: boolean;
  attachment_name?: string;
  attachment_url?: string;
  attachment_type?: string;
  attachment_size?: number;
}

export default function ClientSpaceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [cabinetId, setCabinetId] = useState<string>('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerName, setViewerName] = useState('');
  const [viewerType, setViewerType] = useState('');

  const role = location.pathname.includes('/notaires') ? 'notaire' : 'avocat';
  const prefix = role === 'notaire' ? '/notaires' : '/avocats';

  useEffect(() => {
    if (id) {
      loadClientInfo();
      loadDocuments();
      loadMessages();
      loadSuggestions();
    }
  }, [id, user]);

  const loadClientInfo = async () => {
    if (!id || !user) return;

    try {
      setLoading(true);

      // Récupérer les cabinets de l'utilisateur
      const { data: cabinetsData } = await supabase.rpc('get_user_cabinets');
      const cabinets = Array.isArray(cabinetsData) ? cabinetsData : [];
      
      if (cabinets.length === 0) {
        toast.error('Aucun cabinet trouvé');
        navigate(`${prefix}/client-spaces`);
        return;
      }

      // Prendre le premier cabinet avec le bon rôle, ou le premier disponible
      const matchingCabinet = cabinets.find((c: any) => c.role === role) || cabinets[0];
      const cabinetId = matchingCabinet.id;

      console.log('Cabinet ID for documents:', cabinetId);

      const { data: clientData, error } = await supabase
        .from('clients')
        .select(`
          id,
          nom,
          prenom,
          email,
          telephone,
          user_id,
          date_naissance,
          lieu_naissance,
          adresse,
          code_postal,
          ville,
          pays,
          nationalite,
          sexe,
          etat_civil,
          situation_matrimoniale,
          profession,
          employeur,
          kyc_status,
          client_invitations (
            status,
            access_code
          )
        `)
        .eq('id', id)
        .eq('owner_id', cabinetId)
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
        user_id: clientData.user_id,
        date_naissance: clientData.date_naissance,
        lieu_naissance: clientData.lieu_naissance,
        adresse: clientData.adresse,
        code_postal: clientData.code_postal,
        ville: clientData.ville,
        pays: clientData.pays,
        nationalite: clientData.nationalite,
        sexe: clientData.sexe,
        etat_civil: clientData.etat_civil,
        situation_matrimoniale: clientData.situation_matrimoniale,
        profession: clientData.profession,
        employeur: clientData.employeur,
        kyc_status: clientData.kyc_status,
      });
      setCabinetId(cabinetId);
    } catch (error) {
      console.error('Erreur lors du chargement du client:', error);
      toast.error('Client introuvable');
      navigate(`${prefix}/client-spaces`);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('client_profile_suggestions')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des suggestions:', error);
    }
  };

  const handleSuggestionAction = async (suggestionId: string, action: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('client_profile_suggestions')
        .update({
          status: action,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', suggestionId);

      if (error) throw error;

      // Si approuvé, appliquer les changements au client
      if (action === 'approved') {
        const suggestion = suggestions.find(s => s.id === suggestionId);
        if (suggestion && client) {
          // Construire l'objet de mise à jour avec les nouvelles valeurs
          const updates: any = {};
          suggestion.suggested_changes.forEach((change: any) => {
            updates[change.field] = change.suggested_value;
          });

          // Mettre à jour la table clients
          // Cette modification se propagera automatiquement partout car :
          // 1. L'espace client partagé lit directement depuis `clients`
          // 2. La page /avocats/clients lit directement depuis `clients`
          // 3. L'espace collaboratif via `cabinet_clients` référence `clients.id` (foreign key)
          //    donc les données à jour sont toujours visibles
          const { error: updateError } = await supabase
            .from('clients')
            .update(updates)
            .eq('id', client.id);

          if (updateError) throw updateError;

          toast.success('Modifications appliquées avec succès', {
            description: 'Les informations du client ont été mises à jour partout dans l\'application',
          });
          loadClientInfo();
        }
      } else {
        toast.success('Suggestion rejetée');
      }

      loadSuggestions();
    } catch (error) {
      console.error('Erreur lors du traitement de la suggestion:', error);
      toast.error('Erreur lors du traitement de la suggestion');
    }
  };

  const loadDocuments = async () => {
    try {
      if (!id) return;

      const { data, error } = await supabase
        .from('client_shared_documents')
        .select('*')
        .eq('client_id', id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (err) {
      console.error('Erreur chargement documents:', err);
      toast.error('Erreur lors du chargement des documents');
    }
  };

  const loadMessages = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('client_messages')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if ((!messageContent.trim() && !attachedFile) || !client || !user) return;

    try {
      setSendingMessage(true);
      
      let attachmentData = {};
      
      // Upload file if attached
      if (attachedFile) {
        const fileExt = attachedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${cabinetId}/messages/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, attachedFile);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = await supabase.storage
          .from('documents')
          .createSignedUrl(filePath, 365 * 24 * 60 * 60); // 1 year
        
        attachmentData = {
          has_attachment: true,
          attachment_name: attachedFile.name,
          attachment_url: urlData?.signedUrl || filePath,
          attachment_type: attachedFile.type,
          attachment_size: attachedFile.size,
        };
      }
      
      const { error } = await supabase
        .from('client_messages')
        .insert({
          client_id: client.id,
          sender_id: user.id,
          sender_type: 'professional',
          message: messageContent.trim() || '📎 Fichier joint',
          ...attachmentData,
        });

      if (error) throw error;

      // Create notification for client
      await supabase.rpc('create_client_notification', {
        p_client_id: client.id,
        p_title: 'Nouveau message',
        p_message: 'Vous avez reçu un nouveau message de votre professionnel',
        p_type: 'new_message',
        p_reference_id: null,
      });

      toast.success('Message envoyé');
      setMessageContent('');
      setAttachedFile(null);
      await loadMessages();
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
    // Si le client a un user_id, il a créé son compte
    if (client.user_id) {
      return (
        <Badge variant="outline" className="gap-1 border-green-500 text-green-700">
          <UserCheck className="w-3 h-3" />
          Compte actif
        </Badge>
      );
    }
    // Sinon, vérifier le statut de l'invitation
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
              className="hover:bg-blue-50 hover:text-blue-700"
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
        <Tabs defaultValue="dossiers" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dossiers" className="gap-2">
              <Folder className="w-4 h-4" />
              Dossiers
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="contrats" className="gap-2">
              <FileSignature className="w-4 h-4" />
              Contrats
            </TabsTrigger>
            <TabsTrigger value="messagerie" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Messagerie
            </TabsTrigger>
            <TabsTrigger value="profil" className="gap-2">
              <User className="w-4 h-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="signatures" className="gap-2">
              <PenTool className="w-4 h-4" />
              Signatures
            </TabsTrigger>
          </TabsList>

          {/* Dossiers Tab */}
          <TabsContent value="dossiers" className="space-y-4">
            {!cabinetId ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Chargement...</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <DossierManager
                clientId={id!}
                cabinetId={cabinetId}
                userId={user?.id || ''}
                isProView={true}                role={role}                onRefresh={() => {}}
              />
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            {!cabinetId ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Chargement des informations du cabinet...
                  </p>
                </CardContent>
              </Card>
            ) : (
              <DocumentManager
                clientId={client.id}
                cabinetId={cabinetId}
                documents={documents}
                isProView={true}
                onRefresh={loadDocuments}
              />
            )}
          </TabsContent>

          {/* Contrats Tab */}
          <TabsContent value="contrats" className="space-y-4">
            {!cabinetId ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Chargement...</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ContratManager
                clientId={id!}
                cabinetId={cabinetId}
                isProView={true}
                role={role}
              />
            )}
          </TabsContent>

          {/* Messagerie Tab */}
          <TabsContent value="messagerie" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Discussion avec {client.prenom} {client.nom}
                </CardTitle>
                <CardDescription>
                  Échangez directement avec votre client
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Zone de messages */}
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Aucun message pour le moment</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Commencez une conversation avec votre client
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {messages.map((msg) => {
                        const isProfessional = msg.sender_type === 'professional';
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isProfessional ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                isProfessional
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <p className="text-sm">{msg.message}</p>
                              {msg.has_attachment && msg.attachment_url && (
                                <button
                                  onClick={() => {
                                    setViewerUrl(msg.attachment_url!);
                                    setViewerName(msg.attachment_name || 'Fichier');
                                    setViewerType(msg.attachment_type || '');
                                    setViewerOpen(true);
                                  }}
                                  className={`flex items-center gap-2 mt-2 px-3 py-1.5 rounded text-xs ${
                                    isProfessional ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                                  }`}
                                >
                                  <FileText className="w-4 h-4" />
                                  {msg.attachment_name}
                                </button>
                              )}
                              <p className={`text-xs mt-1 ${
                                isProfessional ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                {new Date(msg.created_at).toLocaleString('fr-FR')}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Formulaire d'envoi */}
                  <div className="border-t pt-4 mt-4">
                    {attachedFile && (
                      <div className="mb-3 flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-900 flex-1">{attachedFile.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAttachedFile(null)}
                          className="h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <div className="flex flex-col gap-2 flex-1">
                        <Textarea
                          placeholder="Écrivez votre message..."
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          className="flex-1"
                          rows={3}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setAttachedFile(file);
                            }}
                          />
                          <Button variant="outline" type="button" className="w-full bg-blue-600 hover:bg-blue-700 text-white" asChild>
                            <span>
                              <Upload className="w-4 h-4 mr-2" />
                              Joindre
                            </span>
                          </Button>
                        </label>
                        <Button
                          onClick={handleSendMessage}
                          disabled={(!messageContent.trim() && !attachedFile) || sendingMessage}
                          className="self-end"
                        >
                          {sendingMessage ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Envoyer
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Appuyez sur Entrée pour envoyer, Shift+Entrée pour un retour à la ligne
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profil Tab */}
          <TabsContent value="profil" className="space-y-4">
            {/* Suggestions en attente */}
            {suggestions.filter(s => s.status === 'pending').length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-orange-900 flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Suggestions de modifications en attente ({suggestions.filter(s => s.status === 'pending').length})
                  </CardTitle>
                  <CardDescription>
                    Le client a suggéré des modifications à son profil
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {suggestions
                    .filter(s => s.status === 'pending')
                    .map((suggestion) => (
                      <div key={suggestion.id} className="bg-white p-4 rounded-lg border border-orange-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Date:</span>{' '}
                              {new Date(suggestion.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            {suggestion.reason && (
                              <p className="text-sm mb-3">
                                <span className="font-medium">Raison:</span>{' '}
                                <span className="italic">{suggestion.reason}</span>
                              </p>
                            )}
                            <div className="space-y-2">
                              <p className="font-medium text-sm">Modifications proposées:</p>
                              {suggestion.suggested_changes.map((change: any, idx: number) => (
                                <div key={idx} className="bg-gray-50 p-3 rounded border">
                                  <p className="text-xs font-medium text-gray-600 uppercase mb-1">
                                    {change.field}
                                  </p>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-red-600 line-through">
                                      {change.current_value || '(vide)'}
                                    </span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-green-600 font-medium">
                                      {change.suggested_value}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-300"
                            onClick={() => handleSuggestionAction(suggestion.id, 'rejected')}
                          >
                            Rejeter
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleSuggestionAction(suggestion.id, 'approved')}
                          >
                            Approuver et appliquer
                          </Button>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Fiche client complète */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Fiche client complète
                </CardTitle>
                <CardDescription>
                  Informations détaillées du client
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Informations personnelles */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Informations personnelles
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Prénom</label>
                      <Input value={client.prenom} disabled className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Nom</label>
                      <Input value={client.nom} disabled className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Date de naissance</label>
                      <Input 
                        value={client.date_naissance ? new Date(client.date_naissance).toLocaleDateString('fr-FR') : 'Non renseigné'} 
                        disabled 
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Lieu de naissance</label>
                      <Input value={client.lieu_naissance || 'Non renseigné'} disabled className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Sexe</label>
                      <Input value={client.sexe || 'Non renseigné'} disabled className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Nationalité</label>
                      <Input value={client.nationalite || 'Non renseigné'} disabled className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">État civil</label>
                      <Input value={client.etat_civil || 'Non renseigné'} disabled className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Situation matrimoniale</label>
                      <Input value={client.situation_matrimoniale || 'Non renseigné'} disabled className="mt-1" />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    Coordonnées
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                      <Input value={client.email} disabled className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Téléphone</label>
                      <Input value={client.telephone || 'Non renseigné'} disabled className="mt-1" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase">Adresse</label>
                      <Input value={client.adresse || 'Non renseigné'} disabled className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Code postal</label>
                      <Input value={client.code_postal || 'Non renseigné'} disabled className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Ville</label>
                      <Input value={client.ville || 'Non renseigné'} disabled className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Pays</label>
                      <Input value={client.pays || 'Non renseigné'} disabled className="mt-1" />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Folder className="w-4 h-4 text-blue-600" />
                    Informations professionnelles
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Profession</label>
                      <Input value={client.profession || 'Non renseigné'} disabled className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Employeur</label>
                      <Input value={client.employeur || 'Non renseigné'} disabled className="mt-1" />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Statut du compte</h4>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Statut KYC</p>
                      <Badge variant={client.kyc_status === 'Complet' ? 'default' : 'secondary'} className="mt-1">
                        {client.kyc_status || 'Non défini'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Statut invitation</p>
                      <div className="mt-1">{getStatusBadge()}</div>
                    </div>
                    {client.access_code && (
                      <div>
                        <p className="text-sm text-gray-600">Code d'accès</p>
                        <p className="font-mono text-lg font-bold text-blue-600 mt-1 tracking-widest">
                          {client.access_code}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Historique des suggestions */}
            {suggestions.filter(s => s.status !== 'pending').length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Historique des suggestions</CardTitle>
                  <CardDescription>
                    Suggestions précédemment traitées
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {suggestions
                    .filter(s => s.status !== 'pending')
                    .map((suggestion) => (
                      <div key={suggestion.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-sm text-gray-600">
                            {new Date(suggestion.created_at).toLocaleDateString('fr-FR')}
                          </div>
                          <Badge variant={suggestion.status === 'approved' ? 'default' : 'destructive'}>
                            {suggestion.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                          </Badge>
                        </div>
                        {suggestion.reason && (
                          <p className="text-sm text-gray-600 italic mb-2">{suggestion.reason}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {suggestion.suggested_changes.length} modification(s)
                        </p>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
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

        {/* File Viewer Dialog */}
        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {viewerName}
                </DialogTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = viewerUrl;
                    link.download = viewerName;
                    link.click();
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
              </div>
            </DialogHeader>
            <div className="p-6 overflow-auto max-h-[calc(90vh-100px)]">
              {viewerType.startsWith('image/') ? (
                <img src={viewerUrl} alt={viewerName} className="w-full h-auto" />
              ) : viewerType === 'application/pdf' ? (
                <iframe
                  src={viewerUrl}
                  className="w-full h-[70vh]"
                  title={viewerName}
                />
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Aperçu non disponible pour ce type de fichier</p>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = viewerUrl;
                      link.download = viewerName;
                      link.click();
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger le fichier
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
