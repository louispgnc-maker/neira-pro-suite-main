import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { copyDocumentToShared } from '@/lib/sharedCopy';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { 
  FileText, 
  MessageSquare, 
  BarChart3, 
  CheckSquare, 
  Calendar, 
  FolderOpen,
  Plus,
  ArrowRight
} from 'lucide-react';
import { Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
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
  const navigate = useNavigate();
  const [cabinet, setCabinet] = useState<Cabinet | null>(null);
  const [members, setMembers] = useState<CabinetMember[]>([]);
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [dossiers, setDossiers] = useState<SharedDossier[]>([]);
  const [contrats, setContrats] = useState<SharedContrat[]>([]);
  const [isCabinetOwner, setIsCabinetOwner] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const cabinetRole = role;
  const colorClass = cabinetRole === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerDocName, setViewerDocName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingToCollab, setUploadingToCollab] = useState(false);
  // Task creation (collaborative tab)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [taskSaving, setTaskSaving] = useState(false);
  const [collabTasks, setCollabTasks] = useState<any[]>([]);
  const [collabLoading, setCollabLoading] = useState(true);
  // Load collaborative tasks (role/cabinet)
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user) return;
      setCollabLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('id,title,description,due_at,done')
        .eq('owner_id', user.id)
        .eq('role', cabinetRole)
        .order('due_at', { ascending: true, nullsFirst: false });
      if (!error && mounted) setCollabTasks((data || []) as any[]);
      setCollabLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [user, cabinetRole, taskDialogOpen]);

  useEffect(() => {
    if (user) {
      loadCabinetData();
    }
  }, [user, cabinetRole]);

  // If navigated here from a notification, open the related resource
  useEffect(() => {
    const notif = (location.state as any)?.notificationOpen;
    if (!notif) return;
    // Wait until data loaded
    if (loading) return;

    setTimeout(async () => {
      try {
        const type = notif.type;
        const id = notif.id;
        if (!type) return;

        if (type === 'cabinet_document' || type === 'document') {
          // try to find shared document entry
          const found = documents.find(d => d.id === id || d.document_id === id);
          if (found) {
            await handleViewDocument(found as SharedDocument);
            return;
          }
          // fallback: go to documents list
          const docTab = document.querySelector('[value="documents"]') as HTMLButtonElement;
          if (docTab) docTab.click();
        } else if (type === 'cabinet_dossier' || type === 'dossier') {
          const found = dossiers.find(d => d.id === id || d.dossier_id === id);
          if (found) {
            navigateToDossier(found as SharedDossier);
            return;
          }
          // open dossier tab and navigate to detail
          const dossierTab = document.querySelector('[value="dossiers"]') as HTMLButtonElement;
          if (dossierTab) dossierTab.click();
          navigate(`/${cabinetRole}s/dossiers/${id}`);
        } else if (type === 'cabinet_contrat' || type === 'contrat') {
          const found = contrats.find(c => c.id === id || c.contrat_id === id);
          if (found) {
            const docTab = document.querySelector('[value="documents"]') as HTMLButtonElement;
            if (docTab) docTab.click();
            return;
          }
          navigate(`/${cabinetRole}s/contrats`);
        } else if (type === 'task' || type === 'tasks') {
          const taskTab = document.querySelector('[value="taches"]') as HTMLButtonElement;
          if (taskTab) taskTab.click();
          // optionally scroll to the task if present
          const foundTask = collabTasks.find(t => t.id === id);
          if (foundTask) {
            setTimeout(() => {
              const el = document.querySelector(`[data-task-id=\"${id}\"]`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 200);
          }
        }
      } catch (e) {
        // ignore
      } finally {
        // clear navigation state so it doesn't trigger again
        try { navigate(location.pathname, { replace: true, state: {} }); } catch (e) { /* noop */ }
      }
    }, 200);
  }, [loading, location.state]);

  const loadCabinetData = async () => {
    setLoading(true);
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      // Charger le cabinet
      // NOTE: some Supabase setups don't allow chaining filters on RPC results reliably
      // so we call the RPC and filter client-side by role to avoid runtime errors.
      const { data: cabinetsData, error: cabinetError } = await supabase.rpc('get_user_cabinets');
      if (cabinetError) throw cabinetError;

      const cabinets = Array.isArray(cabinetsData) ? cabinetsData as any[] : [];
      const filtered = cabinets.filter((c: any) => c.role === cabinetRole);
      const userCabinet = filtered[0] || null;
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

        // Détecter si l'utilisateur est le propriétaire/fondateur du cabinet
        try {
          const { data: ownerData, error: ownerErr } = await supabase.rpc('is_cabinet_owner', { cabinet_id_param: userCabinet.id, user_id_param: user.id });
          if (!ownerErr) {
            let owner = false;
            if (typeof ownerData === 'boolean') owner = ownerData as boolean;
            else if (Array.isArray(ownerData) && ownerData.length > 0) owner = Boolean(ownerData[0]);
            else owner = Boolean(ownerData);
            setIsCabinetOwner(owner);
          }
        } catch (e) {
          // noop
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

  const triggerCollaboratifImport = () => {
    fileInputRef.current?.click();
  };

  const onCollaboratifFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user || !cabinet) return;
    setUploadingToCollab(true);
    try {
      for (const file of Array.from(files)) {
        if (file.type !== 'application/pdf') {
          toast({ title: 'Format non supporté', description: `${file.name} n'est pas un PDF`, variant: 'destructive' });
          continue;
        }
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from('documents').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf',
        });
        if (upErr) {
          toast({ title: 'Échec upload', description: upErr.message || String(upErr), variant: 'destructive' });
          continue;
        }

        const { data: inserted, error: dbErr } = await supabase.from('documents').insert({
          owner_id: user.id,
          name: file.name,
          client_name: null,
          status: 'En cours',
          role: cabinetRole,
          storage_path: path,
        }).select().single();
        if (dbErr || !inserted) {
          toast({ title: 'Erreur DB', description: dbErr?.message || 'Impossible de référencer le document', variant: 'destructive' });
          continue;
        }

        // Share to cabinet via RPC
        try {
          const { data: rpcData, error: rpcErr } = await supabase.rpc('share_document_to_cabinet', {
            cabinet_id_param: cabinet.id,
            document_id_param: inserted.id,
            title_param: inserted.name,
            description_param: null,
          });
          if (rpcErr) throw rpcErr;

          let sharedId: any = null;
          if (rpcData == null) sharedId = null;
          else if (Array.isArray(rpcData)) sharedId = rpcData[0];
          else sharedId = rpcData;

          // copy into shared bucket and update cabinet_documents.file_url
          await copyDocumentToShared({ cabinetId: cabinet.id, documentId: inserted.id, sharedId, itemName: inserted.name });
          toast({ title: 'Upload', description: `${file.name} ajouté à l'espace collaboratif` });
        } catch (e:any) {
          console.error('share to cabinet failed', e);
          toast({ title: 'Partage échoué', description: e?.message || String(e), variant: 'destructive' });
        }
      }

      // Refresh lists
      await loadCabinetData();
    } catch (e:any) {
      console.error('Collaboratif import error', e);
      toast({ title: 'Erreur', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setUploadingToCollab(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteSharedItem = async (table: 'cabinet_documents' | 'cabinet_dossiers' | 'cabinet_contrats', id: string) => {
    if (!id) return;
    if (!confirm('Confirmer la suppression de cet élément partagé ?')) return;
    try {
      // Prefer RPC for documents if available
      if (table === 'cabinet_documents') {
        // Try RPC first (delete_cabinet_document), fallback to direct delete
        const { error } = await supabase.rpc('delete_cabinet_document', { p_id: id });
        if (error) {
          const { error: delErr } = await supabase.from('cabinet_documents').delete().eq('id', id);
          if (delErr) throw delErr;
        }
        setDocuments(prev => prev.filter(d => d.id !== id));
      } else if (table === 'cabinet_dossiers') {
        // Use RPC to enforce server-side permission check
        const { error } = await supabase.rpc('delete_cabinet_dossier', { p_id: id });
        if (error) {
          // fallback to direct delete if RPC not present
          const { error: delErr } = await supabase.from('cabinet_dossiers').delete().eq('id', id);
          if (delErr) throw delErr;
        }
        setDossiers(prev => prev.filter(d => d.id !== id));
      } else if (table === 'cabinet_contrats') {
        const { error } = await supabase.rpc('delete_cabinet_contrat', { p_id: id });
        if (error) {
          const { error: delErr } = await supabase.from('cabinet_contrats').delete().eq('id', id);
          if (delErr) throw delErr;
        }
        setContrats(prev => prev.filter(c => c.id !== id));
      }
      toast({ title: 'Supprimé', description: 'L\'élément a été supprimé.' });
    } catch (e:any) {
      console.error('delete shared item error', e);
      toast({ title: 'Erreur', description: e.message || 'Suppression impossible', variant: 'destructive' });
    }
  };

  const handleViewDocument = async (doc: SharedDocument) => {
    if (!doc.file_url) {
      toast({
        title: 'Erreur',
        description: 'Aucun fichier associé',
        variant: 'destructive',
      });
      return;
    }

    try {
      const raw = (doc.file_url || '').trim();

      // If file_url already contains a full HTTP URL (public copy), open it directly
      if (/^https?:\/\//i.test(raw)) {
        setViewerUrl(raw);
        setViewerDocName(doc.title);
        setViewerOpen(true);
        return;
      }

      // Otherwise treat it as a storage path. Trim leading slashes.
      let storagePath = raw.replace(/^\/+/, '');

      // If the stored path includes an explicit bucket prefix like "shared_documents/...",
      // split bucket and path accordingly. Otherwise assume original 'documents' bucket.
      let bucket = 'documents';
      if (storagePath.startsWith('shared_documents/') || storagePath.startsWith('shared-documents/')) {
        bucket = storagePath.startsWith('shared-documents/') ? 'shared-documents' : 'shared_documents';
        storagePath = storagePath.replace(/^shared[-_]documents\//, '');
      } else if (storagePath.includes('/')) {
        // Heuristic: if path looks like '<bucket>/rest/of/path', and bucket exists, use it.
        const maybeBucket = storagePath.split('/')[0];
        // conservative: only switch if maybeBucket is 'documents' or 'shared_documents'
        if (maybeBucket === 'documents' || maybeBucket === 'shared_documents' || maybeBucket === 'shared-documents') {
          if (maybeBucket === 'shared_documents' || maybeBucket === 'shared-documents') bucket = maybeBucket;
          storagePath = storagePath.split('/').slice(1).join('/');
        }
      }

      // try signed url from chosen bucket
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 60);

      if (error || !data?.signedUrl) {
        console.error('createSignedUrl failed for', bucket, storagePath, error);
        // Try a public URL fallback if the bucket/object is public
        try {
          const pub = await supabase.storage.from(bucket).getPublicUrl(storagePath);
          const publicUrl = pub?.data?.publicUrl || (pub as any)?.publicUrl;
          if (publicUrl) {
            setViewerUrl(publicUrl);
            setViewerDocName(doc.title);
            setViewerOpen(true);
            return;
          }
        } catch (e) {
          console.error('getPublicUrl fallback failed', e);
        }

        toast({
          title: 'Erreur',
          description: 'Impossible de générer le lien',
          variant: 'destructive',
        });
        return;
      }

      setViewerUrl(data.signedUrl);
      setViewerDocName(doc.title);
      setViewerOpen(true);
    } catch (error) {
      console.error('Erreur ouverture document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ouvrir le document',
        variant: 'destructive',
      });
    }
  };

  const createCollaborativeTask = async () => {
    if (!user) return;
    const title = taskText.trim();
    if (!title) {
      toast({ title: 'Erreur', description: 'Veuillez saisir la tâche', variant: 'destructive' });
      return;
    }
    setTaskSaving(true);
    try {
      let due_at = null;
      if (taskDate) {
        due_at = taskTime ? `${taskDate}T${taskTime}` : `${taskDate}T00:00`;
      }
      const { error } = await supabase.from('tasks').insert({
        owner_id: user.id,
        role: cabinetRole,
        title,
        description: taskNotes || null,
        due_at
      });
      if (error) throw error;
      toast({ title: 'Tâche créée', description: 'La tâche a été ajoutée.' });
      setTaskText('');
      setTaskNotes('');
      setTaskDate('');
      setTaskTime('');
      setTaskDialogOpen(false);
    } catch (e:any) {
      console.error('Erreur création tâche collaborative:', e);
      toast({ title: 'Erreur', description: e.message || 'Création impossible', variant: 'destructive' });
    } finally {
      setTaskSaving(false);
    }
  };

  const navigateToDossier = (dossier: SharedDossier) => {
    const targetId = dossier.dossier_id || dossier.id;
    navigate(`/${cabinetRole}s/dossiers/${targetId}`, { state: { fromCollaboratif: true } });
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
                  {[...documents.map(d => ({ ...d, type: 'Document' as const })), 
                    ...dossiers.map(d => ({ ...d, type: 'Dossier' as const })), 
                    ...contrats.map(c => ({ ...c, type: 'Contrat' as const }))]
                    .sort((a, b) => new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime())
                    .slice(0, 5)
                    .map((item, idx) => (
                      <div 
                        key={`${item.type}-${idx}`} 
                        className={`flex items-center justify-between p-3 border rounded-lg transition-all cursor-pointer ${
                          cabinetRole === 'notaire' 
                            ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' 
                            : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                        }`}
                        onClick={() => {
                          if (item.type === 'Document' && 'file_url' in item) {
                            handleViewDocument(item as SharedDocument);
                          } else if (item.type === 'Dossier') {
                            const dossierTab = document.querySelector('[value="dossiers"]') as HTMLButtonElement;
                            if (dossierTab) dossierTab.click();
                          } else if (item.type === 'Contrat') {
                            const docTab = document.querySelector('[value="documents"]') as HTMLButtonElement;
                            if (docTab) docTab.click();
                          }
                        }}
                        onDoubleClick={() => {
                          if (item.type === 'Dossier') {
                            navigateToDossier(item as SharedDossier);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {item.type === 'Document' ? (
                            <FileText className={`h-5 w-5 ${
                              cabinetRole === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                            }`} />
                          ) : item.type === 'Dossier' ? (
                            <FolderOpen className={`h-5 w-5 ${
                              cabinetRole === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                            }`} />
                          ) : (
                            <FileText className={`h-5 w-5 ${
                              cabinetRole === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                            }`} />
                          )}
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.type} partagé le {new Date(item.shared_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline"
                          className={
                            cabinetRole === 'notaire'
                              ? 'bg-orange-100 text-orange-600 border-orange-200'
                              : 'bg-blue-100 text-blue-600 border-blue-200'
                          }
                        >
                          {item.type}
                        </Badge>
                        {(user && (item.shared_by === user.id || isCabinetOwner)) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteSharedItem(
                              item.type === 'Document' ? 'cabinet_documents' : item.type === 'Dossier' ? 'cabinet_dossiers' : 'cabinet_contrats',
                              item.id
                            ); }}
                            className="ml-3 p-1 rounded hover:bg-gray-100"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
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
                  <div className="flex items-center gap-2">
                    <input ref={fileInputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={onCollaboratifFilesSelected} />
                    <Button size="sm" className={colorClass} onClick={triggerCollaboratifImport} disabled={uploadingToCollab}>
                      {uploadingToCollab ? 'Import…' : 'Importer dans l\'espace'}
                    </Button>
                    <Button 
                      size="sm" 
                      className={colorClass}
                      onClick={() => navigate(`/${cabinetRole}s/documents`)}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Aller à mes documents
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Aucun document partagé</p>
                    <p className="text-xs mt-1">Utilisez le bouton de partage sur vos documents</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          cabinetRole === 'notaire' 
                            ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' 
                            : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                        }`}
                        onClick={() => handleViewDocument(doc)}
                      >
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
                          <FileText className={`h-5 w-5 flex-shrink-0 ml-2 ${
                            cabinetRole === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                          }`} />
                          {(user && (doc.shared_by === user.id || isCabinetOwner)) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteSharedItem('cabinet_documents', doc.id); }}
                              className="ml-3 p-1 rounded hover:bg-gray-100"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </button>
                          )}
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
                  <Button 
                    size="sm" 
                    className={colorClass}
                    onClick={() => navigate(`/${cabinetRole}s/contrats`)}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Aller à mes contrats
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {contrats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Aucun contrat partagé</p>
                    <p className="text-xs mt-1">Utilisez le bouton de partage sur vos contrats</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {contrats.map((contrat) => (
                      <div 
                        key={contrat.id} 
                        className={`p-3 border rounded-lg transition-all ${
                          cabinetRole === 'notaire' 
                            ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' 
                            : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{contrat.title}</p>
                              <Badge variant="outline" className={
                                cabinetRole === 'notaire'
                                  ? 'bg-orange-100 text-orange-600 border-orange-200'
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
                          <FileText className={`h-5 w-5 flex-shrink-0 ml-2 ${
                            cabinetRole === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                          }`} />
                        {(user && (contrat.shared_by === user.id || isCabinetOwner)) && (
                          <button
                            onClick={() => deleteSharedItem('cabinet_contrats', contrat.id)}
                            className="ml-3 p-1 rounded hover:bg-gray-100"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
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
                <Button 
                  className={colorClass}
                  onClick={() => navigate(`/${cabinetRole}s/dossiers`)}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Aller à mes dossiers
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dossiers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun dossier partagé</p>
                  <p className="text-sm mt-2">Utilisez le bouton de partage sur vos dossiers</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {dossiers.map((dossier) => (
                    <div 
                      key={dossier.id} 
                      className={`p-4 border rounded-lg transition-all cursor-pointer ${
                        cabinetRole === 'notaire' 
                          ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' 
                          : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                      }`}
                      onDoubleClick={() => navigateToDossier(dossier)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <FolderOpen className={`h-5 w-5 ${
                              cabinetRole === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                            }`} />
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
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground mt-3 ml-8">
                        Partagé le {new Date(dossier.shared_at).toLocaleDateString()}
                          </p>
                          {(user && (dossier.shared_by === user.id || isCabinetOwner)) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteSharedItem('cabinet_dossiers', dossier.id); }}
                              className="ml-3 p-1 rounded hover:bg-gray-100"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </button>
                          )}
                        </div>
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
                <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className={colorClass}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvelle tâche
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nouvelle tâche collaborative</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tâche</label>
                        <Textarea
                          rows={3}
                          placeholder="Décrivez la tâche à réaliser"
                          value={taskText}
                          onChange={(e) => setTaskText(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Notes (optionnel)</label>
                        <Textarea
                          rows={2}
                          placeholder="Notes complémentaires"
                          value={taskNotes}
                          onChange={(e) => setTaskNotes(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Date (optionnel)</label>
                          <input type="date" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Heure (optionnel)</label>
                          <input type="time" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Annuler</Button>
                        <Button className={colorClass} disabled={taskSaving} onClick={createCollaborativeTask}>
                          {taskSaving ? 'Enregistrement…' : 'Créer'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {collabLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Chargement…</p>
                </div>
              ) : collabTasks.filter(t => !t.done).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune tâche pour le moment</p>
                  <p className="text-sm mt-2">Créez votre première tâche collaborative</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collabTasks.filter(t => !t.done).map((task) => {
                    const overdue = !task.done && task.due_at && new Date(task.due_at) < new Date();
                    let dateStr = '';
                    if (task.due_at) {
                      const d = new Date(task.due_at);
                      dateStr = d.toLocaleDateString() + (d.getHours() || d.getMinutes() ? ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
                    }
                    return (
                      <div
                        key={task.id}
                        data-task-id={task.id}
                        className={`relative rounded-lg shadow p-4 bg-yellow-50 border border-yellow-200 flex flex-col min-h-[140px]`}
                      >
                        <button
                          className={`absolute top-2 right-2 p-1 rounded-full ${cabinetRole === 'notaire' ? 'text-orange-600 hover:bg-orange-100' : 'text-blue-600 hover:bg-blue-100'}`}
                          title="Éditer la tâche"
                          // onClick={() => ...}
                        >
                          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z" /></svg>
                        </button>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={task.done}
                            onChange={async () => {
                              await supabase.from('tasks').update({ done: true }).eq('id', task.id);
                              setCollabTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: true } : t));
                            }}
                            className={`accent-${cabinetRole === 'notaire' ? 'orange' : 'blue'}-600 h-5 w-5 rounded`}
                          />
                          <span className="font-medium text-lg">{task.title}</span>
                        </div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground mb-2 whitespace-pre-line">{task.description}</div>
                        )}
                        <div className="flex-1" />
                        <div className="flex items-center justify-between mt-2">
                          {task.due_at ? (
                            <Badge variant={overdue ? "destructive" : "outline"}>
                              {dateStr}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Pas d'échéance</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
    <DocumentViewer
      open={viewerOpen}
      onClose={() => setViewerOpen(false)}
      documentUrl={viewerUrl}
      documentName={viewerDocName}
      role={cabinetRole}
    />
    </AppLayout>
  );
}
