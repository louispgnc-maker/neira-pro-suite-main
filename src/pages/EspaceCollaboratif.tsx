import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { getSignedUrlForPath } from '@/lib/storageHelpers';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { 
  FileText, 
  MessageSquare, 
  BarChart3, 
  CheckSquare, 
  Calendar, 
  FolderOpen,
  Plus,
  ArrowRight,
  Settings
} from 'lucide-react';
import { Trash2, UploadCloud } from 'lucide-react';
import SharedCalendar from '@/components/collaborative/SharedCalendar';
import { CabinetChat } from '@/components/cabinet/CabinetChat';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
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
  sharer_profile?: {
    first_name?: string;
    last_name?: string;
  };
}

interface SharedDossier {
  id: string;
  title: string;
  description: string | null;
  status: string;
  shared_at: string;
  shared_by: string;
  dossier_id: string;
  sharer_profile?: {
    first_name?: string;
    last_name?: string;
  };
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
  sharer_profile?: {
    first_name?: string;
    last_name?: string;
  };
}

interface SharedClient {
  id: string;
  client_id: string;
  name: string;
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  kyc_status?: string;
  missing_info?: string;
  shared_at: string;
  shared_by: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  sharer_profile?: {
    first_name?: string;
    last_name?: string;
  };
}

interface CollabTask {
  id: string;
  title: string;
  description?: string | null;
  due_at?: string | null;
  done?: boolean;
  assigned_to?: string | null;
  shared_by?: string;
  cabinet_id?: string;
  creator_profile?: {
    first_name?: string;
    last_name?: string;
  };
}

type CombinedActivity = (SharedDocument & { type: 'Document' }) | (SharedDossier & { type: 'Dossier' }) | (SharedContrat & { type: 'Contrat' });

export default function EspaceCollaboratif() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [cabinet, setCabinet] = useState<Cabinet | null>(null);
  const [members, setMembers] = useState<CabinetMember[]>([]);
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [dossiers, setDossiers] = useState<SharedDossier[]>([]);
  const [contrats, setContrats] = useState<SharedContrat[]>([]);
  const [clientsShared, setClientsShared] = useState<SharedClient[]>([]);
  const [isCabinetOwner, setIsCabinetOwner] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  
  const { toast } = useToast();

  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const cabinetRole = role;
  const colorClass = cabinetRole === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  // Role-based menu styling (dropdown)
  const menuContentClass = cabinetRole === 'notaire'
    ? 'bg-orange-50 border-orange-200'
    : 'bg-blue-50 border-blue-200';
  const menuItemClass = cabinetRole === 'notaire'
    ? 'focus:bg-orange-600 focus:text-white'
    : 'focus:bg-blue-600 focus:text-white';

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
  // Edit task dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editTaskText, setEditTaskText] = useState('');
  const [editTaskNotes, setEditTaskNotes] = useState('');
  const [editTaskDate, setEditTaskDate] = useState('');
  const [editTaskTime, setEditTaskTime] = useState('');
  const [editTaskSaving, setEditTaskSaving] = useState(false);
  const [collabTasks, setCollabTasks] = useState<CollabTask[]>([]);
  const [collabLoading, setCollabLoading] = useState(true);
  // Load collaborative tasks from cabinet_tasks
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user || !cabinet) {
        console.log('Tasks load skipped - user:', !!user, 'cabinet:', !!cabinet);
        return;
      }
      console.log('Loading tasks for cabinet:', cabinet.id);
      setCollabLoading(true);
      
      // Charger les tâches
      const { data: tasksData, error } = await supabase
        .from('cabinet_tasks')
        .select('id, title, description, due_at, done, assigned_to, shared_by, cabinet_id')
        .eq('cabinet_id', cabinet.id)
        .order('due_at', { ascending: true, nullsFirst: false });
      
      console.log('Tasks loaded:', { count: tasksData?.length, error });
      
      if (error || !tasksData || !mounted) {
        setCollabLoading(false);
        return;
      }
      
      // Récupérer les user_ids uniques
      const userIds = [...new Set(tasksData.map(t => t.shared_by).filter(Boolean))];
      
      // Charger les profils
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
      
      console.log('Profiles loaded:', { count: profilesData?.length });
      
      // Mapper les profils
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, { first_name: p.first_name, last_name: p.last_name }])
      );
      
      // Ajouter les infos du créateur à chaque tâche
      const tasksWithCreator = tasksData.map(task => ({
        ...task,
        creator_profile: task.shared_by ? profilesMap.get(task.shared_by) : undefined
      }));
      
      console.log('Tasks with creator:', tasksWithCreator);
      
      if (mounted) setCollabTasks(tasksWithCreator as CollabTask[]);
      setCollabLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [user, cabinet, taskDialogOpen]);

  

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

        // Sharing subsystem removed: we keep the upload to the user's storage and documents table,
        // but we no longer call any client-side copy or RPCs to create cabinet_* share rows.
        toast({ title: 'Upload', description: `${file.name} ajouté à l'espace collaboratif` });
      }

      // Refresh lists
      await loadCabinetData();
    } catch (e: unknown) {
      console.error('Collaboratif import error', e);
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setUploadingToCollab(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteSharedItem = async (table: 'cabinet_documents' | 'cabinet_dossiers' | 'cabinet_contrats' | 'cabinet_clients', id: string) => {
    if (!id) return;
    if (!confirm('Confirmer la suppression de cet élément partagé ?')) return;
    try {
      // Prefer RPC for documents if available
      if (table === 'cabinet_documents') {
        // Try RPC first (delete_cabinet_document). Do not perform direct table delete to avoid RLS errors.
        const { error } = await supabase.rpc('delete_cabinet_document', { p_id: id });
        if (error) {
          // RPC failed — log and surface error to user. Avoid direct delete which may violate RLS.
          console.error('delete_cabinet_document RPC error', error);
          throw error;
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
      } else if (table === 'cabinet_clients') {
        // Try RPC first (delete_cabinet_client). Do not perform direct table delete to avoid RLS errors.
        const { error } = await supabase.rpc('delete_cabinet_client', { p_id: id });
        if (error) {
          console.error('delete_cabinet_client RPC error', error);
          throw error;
        }
        setClientsShared(prev => prev.filter(c => c.id !== id));
      }
      toast({ title: 'Supprimé', description: 'L\'élément a été supprimé.' });
    } catch (e: unknown) {
      console.error('delete shared item error', e);
      const msg = e instanceof Error ? e.message : 'Suppression impossible';
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    }
  };

  const handleViewDocument = useCallback(async (doc: SharedDocument) => {
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

      // If file_url already contains a full HTTP URL (public copy), open it in viewer
      if (/^https?:\/\//i.test(raw)) {
        console.log('Opening document with URL:', raw);
        setViewerUrl(raw);
        setViewerDocName(doc.title || 'Document');
        setViewerOpen(true);
        return;
      }

      // Otherwise treat it as a storage path. Trim leading slashes.
      let storagePath = raw.replace(/^\/+/, '');

      // If the stored path includes an explicit bucket prefix like "shared_documents/...",
      // split bucket and path accordingly. Otherwise assume 'shared-documents' bucket.
      let bucket = 'shared-documents';
      if (storagePath.startsWith('shared_documents/') || storagePath.startsWith('shared-documents/')) {
        // Normalize any historical variant to the canonical bucket name
        bucket = 'shared-documents';
        storagePath = storagePath.replace(/^shared[-_]documents\//, '');
      } else if (storagePath.startsWith('documents/')) {
        bucket = 'documents';
        storagePath = storagePath.replace(/^documents\//, '');
      } else if (storagePath.includes('/')) {
        const maybeBucket = storagePath.split('/')[0];
        if (maybeBucket === 'documents' || maybeBucket === 'shared_documents' || maybeBucket === 'shared-documents') {
          if (maybeBucket === 'shared_documents' || maybeBucket === 'shared-documents') bucket = 'shared-documents';
          else if (maybeBucket === 'documents') bucket = 'documents';
          storagePath = storagePath.split('/').slice(1).join('/');
        }
      }

      // Utiliser getPublicUrl pour éviter l'expiration des URLs (comme dans Documents.tsx)
      const { data: publicData } = supabase.storage
        .from(bucket)
        .getPublicUrl(storagePath);
      
      if (!publicData?.publicUrl) {
        console.error('getPublicUrl failed for', bucket, storagePath);
        toast({
          title: 'Erreur',
          description: 'Impossible d\'accéder au document',
          variant: 'destructive',
        });
        return;
      }

      setViewerUrl(publicData.publicUrl);
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
  }, [toast]);

  const createCollaborativeTask = async () => {
    if (!user) return;
    const title = taskText.trim();
    if (!title) {
      toast({ title: 'Erreur', description: 'Veuillez saisir la tâche', variant: 'destructive' });
      return;
    }
    setTaskSaving(true);
    try {
      if (!cabinet) {
        toast({ title: 'Cabinet introuvable', variant: 'destructive' });
        return;
      }
      let due_at = null;
      if (taskDate) {
        due_at = taskTime ? `${taskDate}T${taskTime}` : `${taskDate}T00:00`;
      }
      const { error } = await supabase.from('cabinet_tasks').insert({
        cabinet_id: cabinet.id,
        shared_by: user.id,
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
      
      // Recharger la liste des tâches
      const { data: tasksData } = await supabase
        .from('cabinet_tasks')
        .select('id, title, description, due_at, done, assigned_to, shared_by, cabinet_id')
        .eq('cabinet_id', cabinet.id)
        .order('due_at', { ascending: true, nullsFirst: false });
      
      if (tasksData) {
        // Récupérer les user_ids uniques
        const userIds = [...new Set(tasksData.map(t => t.shared_by).filter(Boolean))];
        
        // Charger les profils
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);
        
        // Mapper les profils
        const profilesMap = new Map(
          (profilesData || []).map(p => [p.id, { first_name: p.first_name, last_name: p.last_name }])
        );
        
        // Ajouter les infos du créateur à chaque tâche
        const tasksWithCreator = tasksData.map(task => ({
          ...task,
          creator_profile: task.shared_by ? profilesMap.get(task.shared_by) : undefined
        }));
        
        setCollabTasks(tasksWithCreator as CollabTask[]);
      }
    } catch (e: unknown) {
      console.error('Erreur création tâche collaborative:', e);
      const msg = e instanceof Error ? e.message : 'Création impossible';
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setTaskSaving(false);
    }
  };

  const updateCollaborativeTask = async () => {
    if (!user) return;
    if (!editTaskId) return;
    const title = editTaskText.trim();
    if (!title) {
      toast({ title: 'Erreur', description: 'Veuillez saisir la tâche', variant: 'destructive' });
      return;
    }
    setEditTaskSaving(true);
    try {
      let due_at = null as string | null;
      if (editTaskDate) {
        due_at = editTaskTime ? `${editTaskDate}T${editTaskTime}` : `${editTaskDate}T00:00`;
      }
      const { error } = await supabase.from('cabinet_tasks').update({ title, description: editTaskNotes || null, due_at }).eq('id', editTaskId);
      if (error) throw error;
      // update local state
      setCollabTasks(prev => prev.map(t => t.id === editTaskId ? { ...t, title, description: editTaskNotes || null, due_at } : t));
      toast({ title: 'Tâche modifiée', description: 'La tâche a été mise à jour.' });
      setEditDialogOpen(false);
    } catch (e: unknown) {
      console.error('Erreur mise à jour tâche collaborative:', e);
      const msg = e instanceof Error ? e.message : 'Mise à jour impossible';
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setEditTaskSaving(false);
    }
  };

  const navigateToDossier = useCallback(async (dossier: SharedDossier) => {
    try {
      // Utiliser dossier_id pour naviguer vers le dossier original
      const dossierId = dossier.dossier_id || dossier.id;
      if (dossierId) {
        navigate(`/${cabinetRole}s/dossiers/${dossierId}`, { state: { fromCollaboratif: true } });
        return;
      }

      // Fallback si pas d'ID
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ouvrir ce dossier',
        variant: 'destructive',
      });
    } catch (error) {
      console.error('Erreur navigation dossier:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ouvrir ce dossier',
        variant: 'destructive',
      });
    }
  }, [cabinetRole, navigate, toast]);

  const loadCabinetData = useCallback(async () => {
    setLoading(true);
    try {
      if (!user) return;

      // Fetch user's cabinets and pick one matching the current role
      const { data: cabinetsData, error: cabinetsError } = await supabase.rpc('get_user_cabinets');
      if (cabinetsError) throw cabinetsError;
  const cabinets = Array.isArray(cabinetsData) ? (cabinetsData as unknown[]) : [];
  const filtered = cabinets.filter((c) => ((c as unknown as { role?: string }).role) === cabinetRole);
  const userCabinet = (filtered[0] as unknown as Cabinet) || null;
      setCabinet(userCabinet as Cabinet | null);

      if (!userCabinet) {
        setMembers([]);
        setDocuments([]);
        setDossiers([]);
        setContrats([]);
        setClientsShared([]);
        setIsCabinetOwner(false);
        return;
      }

      // Members: try RPC then fallback to table
      try {
        const { data: membersData, error: membersError } = await supabase.rpc('get_cabinet_members_simple', { cabinet_id_param: userCabinet?.id });
        if (!membersError && Array.isArray(membersData)) {
          const arr = membersData as unknown[];
          setMembers(arr.map(m => {
            const mm = m as { id: string; email: string; nom?: string; role_cabinet: string; status: string };
            return { id: mm.id, email: mm.email, nom: mm.nom || undefined, role_cabinet: mm.role_cabinet, status: mm.status };
          }));
        } else {
          // fallback
          const { data: membersTable } = await supabase.from('cabinet_members').select('id,email,nom,role_cabinet,status').eq('cabinet_id', userCabinet?.id);
          if (Array.isArray(membersTable)) {
            const arr = membersTable as unknown[];
            setMembers(arr.map(m => {
              const mm = m as { id: string; email: string; nom?: string; role_cabinet: string; status: string };
              return { id: mm.id, email: mm.email, nom: mm.nom || undefined, role_cabinet: mm.role_cabinet, status: mm.status };
            }));
          } else {
            setMembers([]);
          }
        }
      } catch (e) {
        setMembers([]);
      }

      // Documents
      try {
  const { data: docsData, error: docsError } = await supabase.rpc('get_cabinet_documents', { cabinet_id_param: userCabinet?.id });
        if (!docsError && Array.isArray(docsData)) setDocuments(docsData as SharedDocument[]);
        else setDocuments([]);
      } catch (e) {
        setDocuments([]);
      }

      // Dossiers
      try {
  const { data: dossiersData, error: dossiersError } = await supabase.rpc('get_cabinet_dossiers', { cabinet_id_param: userCabinet?.id });
        if (!dossiersError && Array.isArray(dossiersData)) setDossiers(dossiersData as SharedDossier[]);
        else setDossiers([]);
      } catch (e) {
        setDossiers([]);
      }

      // Contrats
      try {
  const { data: contratsData, error: contratsError } = await supabase.rpc('get_cabinet_contrats', { cabinet_id_param: userCabinet?.id });
        if (!contratsError && Array.isArray(contratsData)) setContrats(contratsData as SharedContrat[]);
        else setContrats([]);
      } catch (e) {
        setContrats([]);
      }

      // Clients
      let clientsDataLoaded: SharedClient[] = [];
      try {
        const { data: clientsData, error: clientsError } = await supabase.rpc('get_cabinet_clients_with_names', { cabinet_id_param: userCabinet?.id });
        console.log('RPC get_cabinet_clients_with_names:', { 
          cabinet_id: userCabinet?.id,
          error: clientsError, 
          data: clientsData,
          count: Array.isArray(clientsData) ? clientsData.length : 0
        });
        if (!clientsError && Array.isArray(clientsData)) {
          clientsDataLoaded = clientsData as SharedClient[];
          setClientsShared(clientsDataLoaded);
        } else {
          console.error('Error fetching clients:', clientsError);
          setClientsShared([]);
        }
      } catch (e) {
        console.error('Exception fetching clients:', e);
        setClientsShared([]);
      }

      // Owner check
      try {
  const { data: ownerData, error: ownerErr } = await supabase.rpc('is_cabinet_owner', { cabinet_id_param: userCabinet?.id, user_id_param: user.id });
        if (!ownerErr) {
          if (typeof ownerData === 'boolean') setIsCabinetOwner(ownerData as boolean);
          else if (Array.isArray(ownerData) && ownerData.length > 0) setIsCabinetOwner(Boolean(ownerData[0]));
          else setIsCabinetOwner(Boolean(ownerData));
        }
      } catch (e) {
        setIsCabinetOwner(false);
      }

      // Load sharer profiles for all shared items AFTER data is loaded
      try {
        const allSharerIds = new Set<string>();
        
        // Get all documents that were just loaded
        const { data: docsDataForProfiles } = await supabase.rpc('get_cabinet_documents', { cabinet_id_param: userCabinet?.id });
        if (Array.isArray(docsDataForProfiles)) {
          (docsDataForProfiles as SharedDocument[]).forEach(d => d.shared_by && allSharerIds.add(d.shared_by));
        }
        
        // Get all dossiers that were just loaded
        const { data: dossiersDataForProfiles } = await supabase.rpc('get_cabinet_dossiers', { cabinet_id_param: userCabinet?.id });
        if (Array.isArray(dossiersDataForProfiles)) {
          (dossiersDataForProfiles as SharedDossier[]).forEach(d => d.shared_by && allSharerIds.add(d.shared_by));
        }
        
        // Get all contrats that were just loaded
        const { data: contratsDataForProfiles } = await supabase.rpc('get_cabinet_contrats', { cabinet_id_param: userCabinet?.id });
        if (Array.isArray(contratsDataForProfiles)) {
          (contratsDataForProfiles as SharedContrat[]).forEach(c => c.shared_by && allSharerIds.add(c.shared_by));
        }
        
        // Add clients
        clientsDataLoaded.forEach(c => c.shared_by && allSharerIds.add(c.shared_by));
        
        console.log('Loading sharer profiles for IDs:', Array.from(allSharerIds));
        
        if (allSharerIds.size > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', Array.from(allSharerIds));
          
          console.log('Sharer profiles loaded:', { count: profilesData?.length, error: profilesError, data: profilesData });
          
          const profilesMap = new Map(
            (profilesData || []).map(p => [p.id, { first_name: p.first_name, last_name: p.last_name }])
          );
          
          // Add profiles to documents
          if (Array.isArray(docsDataForProfiles)) {
            const docsWithProfiles = (docsDataForProfiles as SharedDocument[]).map(d => ({
              ...d,
              sharer_profile: d.shared_by ? profilesMap.get(d.shared_by) : undefined
            }));
            console.log('Documents with profiles:', docsWithProfiles);
            setDocuments(docsWithProfiles);
          }
          
          // Add profiles to dossiers
          if (Array.isArray(dossiersDataForProfiles)) {
            setDossiers((dossiersDataForProfiles as SharedDossier[]).map(d => ({
              ...d,
              sharer_profile: d.shared_by ? profilesMap.get(d.shared_by) : undefined
            })));
          }
          
          // Add profiles to contrats
          if (Array.isArray(contratsDataForProfiles)) {
            setContrats((contratsDataForProfiles as SharedContrat[]).map(c => ({
              ...c,
              sharer_profile: c.shared_by ? profilesMap.get(c.shared_by) : undefined
            })));
          }
          
          // Add profiles to clients
          setClientsShared(clientsDataLoaded.map(c => ({
            ...c,
            sharer_profile: c.shared_by ? profilesMap.get(c.shared_by) : undefined
          })));
        }
      } catch (e) {
        console.error('Error loading sharer profiles:', e);
      }

    } catch (e: unknown) {
      console.error('Erreur chargement espace collaboratif:', e);
      try { toast({ title: 'Erreur', description: String(e), variant: 'destructive' }); } catch (_) { /* noop */ }
    } finally {
      setLoading(false);
    }
  }, [user, cabinetRole, toast]);

  useEffect(() => {
    if (user) {
      loadCabinetData();
    }
  }, [user, cabinetRole, loadCabinetData]);

  // Search states for lists
  const [activitySearch, setActivitySearch] = useState('');
  const [documentsSearch, setDocumentsSearch] = useState('');
  const [contratsSearch, setContratsSearch] = useState('');
  const [dossiersSearch, setDossiersSearch] = useState('');
  const [clientsSearch, setClientsSearch] = useState('');

  // Persist active tab across refreshes: read from URL ?tab= or sessionStorage
  const [selectedTab, setSelectedTab] = useState<string>(() => {
    try {
      const params = new URLSearchParams(location.search);
      return params.get('tab') || (sessionStorage.getItem('collab_tab') ?? 'dashboard');
    } catch (e) {
      return sessionStorage.getItem('collab_tab') ?? 'dashboard';
    }
  });

  // Load total unread message count for all conversations
  useEffect(() => {
    if (!user || !cabinet) return;

    const loadUnreadCount = async () => {
      try {
        // Get all messages in the cabinet where user is not the sender
        const { data: allMessages, error } = await supabase
          .from('cabinet_messages')
          .select('id, conversation_id, recipient_id, sender_id, created_at')
          .eq('cabinet_id', cabinet.id)
          .neq('sender_id', user.id);

        if (error) {
          console.error('Error loading messages:', error);
          return;
        }

        if (!allMessages || allMessages.length === 0) {
          setTotalUnreadCount(0);
          return;
        }

        let totalUnread = 0;
        const conversationIds = new Set<string>();
        
        // Identify all conversations
        allMessages.forEach(msg => {
          if (!msg.conversation_id && !msg.recipient_id) {
            conversationIds.add('general');
          } else if (msg.conversation_id) {
            conversationIds.add(msg.conversation_id);
          } else if (msg.recipient_id === user.id) {
            // For direct messages to me, use sender_id to identify the conversation
            conversationIds.add(`direct-${msg.sender_id}`);
          }
        });

        // Count unread for each conversation
        for (const convId of conversationIds) {
          const lastViewedKey = `chat-last-viewed-${cabinet.id}-${convId}`;
          const lastViewed = sessionStorage.getItem(lastViewedKey);
          
          let convMessages = [];
          if (convId === 'general') {
            convMessages = allMessages.filter(m => !m.conversation_id && !m.recipient_id);
          } else if (convId.startsWith('direct-')) {
            const senderId = convId.replace('direct-', '');
            // For direct messages: messages from the specific sender to me
            convMessages = allMessages.filter(m => 
              m.sender_id === senderId && 
              m.recipient_id === user.id && 
              !m.conversation_id
            );
          } else {
            convMessages = allMessages.filter(m => m.conversation_id === convId);
          }

          if (lastViewed) {
            const unreadInConv = convMessages.filter(m => new Date(m.created_at) > new Date(lastViewed)).length;
            totalUnread += unreadInConv;
          } else {
            totalUnread += convMessages.length;
          }
        }

        setTotalUnreadCount(totalUnread);
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };

    loadUnreadCount();

    // Subscribe to new messages to update counter in real-time
    const channel = supabase
      .channel(`unread-messages-${cabinet.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cabinet_messages',
          filter: `cabinet_id=eq.${cabinet.id}`
        },
        (payload) => {
          const newMsg = payload.new as { sender_id: string };
          if (newMsg.sender_id !== user.id) {
            setTotalUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    // Listen for conversation read events from CabinetChat
    const handleConversationRead = () => {
      loadUnreadCount();
    };

    window.addEventListener('cabinet-conversation-read', handleConversationRead);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('cabinet-conversation-read', handleConversationRead);
    };
  }, [user, cabinet]);

  // Reset unread count when discussion tab is opened
  useEffect(() => {
    if (selectedTab === 'discussion' && totalUnreadCount > 0) {
      // Counter will be managed by CabinetChat component
      // We just need to track when user views the tab
    }
  }, [selectedTab, totalUnreadCount]);

  // Keep selectedTab in sync when location.search changes (back/forward/navigation)
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const tab = params.get('tab');
      if (tab && tab !== selectedTab) setSelectedTab(tab);
    } catch (e) {
      // ignore
    }
  }, [location.search, selectedTab]);

  const handleTabChange = useCallback((value: string) => {
    setSelectedTab(value);
    try {
      const params = new URLSearchParams(location.search);
      params.set('tab', value);
      navigate(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`, { replace: true });
    } catch (e) {
      // ignore
    }
    try { sessionStorage.setItem('collab_tab', value); } catch (e) { /* ignore */ }
  }, [location.pathname, location.search, navigate]);

  // If navigated here from a notification, open the related resource
  useEffect(() => {
    const notif = (location.state as { notificationOpen?: { type?: string; id?: string } | unknown })?.notificationOpen as { type?: string; id?: string } | undefined;
    if (!notif) return;
    // Wait until data loaded
    if (loading) return;

    const timer = setTimeout(() => {
      (async () => {
      try {
          const type = notif.type;
          const id = notif.id;
          if (!type) return;

          if (type === 'cabinet_document' || type === 'document') {
            const found = documents.find(d => d.id === id || d.document_id === id);
            if (found) {
              await handleViewDocument(found as SharedDocument);
              return;
            }
            handleTabChange('documents');
          } else if (type === 'cabinet_dossier' || type === 'dossier') {
            const found = dossiers.find(d => d.id === id || d.dossier_id === id);
            if (found) {
              navigateToDossier(found as SharedDossier);
              return;
            }
            handleTabChange('dossiers');
            navigate(`/${cabinetRole}s/dossiers/${id}`);
          } else if (type === 'cabinet_contrat' || type === 'contrat') {
            const found = contrats.find(c => c.id === id || c.contrat_id === id);
            if (found) {
              navigate(`/${cabinetRole}s/contrats/${found.id}`);
              return;
            }
            navigate(`/${cabinetRole}s/contrats`);
          } else if (type === 'task' || type === 'tasks') {
            handleTabChange('taches');
            const foundTask = collabTasks.find(t => t.id === id);
            if (foundTask) {
              setTimeout(() => {
                const el = document.querySelector(`[data-task-id="${id}"]`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 200);
            }
          }
        } catch (e: unknown) {
          // ignore
        } finally {
          try { navigate(location.pathname, { replace: true, state: {} }); } catch (e) { /* noop */ }
        }
      })();
    }, 200);

    return () => clearTimeout(timer);
  }, [loading, location.state, documents, dossiers, contrats, collabTasks, handleViewDocument, handleTabChange, navigateToDossier, cabinetRole, navigate, location.pathname]);

  // Prepare filtered & sorted lists
  const _combinedActivity: CombinedActivity[] = [
    ...documents.map(d => ({ ...d, type: 'Document' as const } as CombinedActivity)),
    ...dossiers.map(d => ({ ...d, type: 'Dossier' as const } as CombinedActivity)),
    ...contrats.map(c => ({ ...c, type: 'Contrat' as const } as CombinedActivity)),
  ];

  const combinedActivityFiltered = _combinedActivity.filter((item) => {
    const q = activitySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (item.title || '').toLowerCase().includes(q) ||
      ((item.description || '') as string).toLowerCase().includes(q) ||
      (item.type || '').toLowerCase().includes(q)
    );
  });

  const recentActivity = combinedActivityFiltered
    .sort((a, b) => new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime())
    .slice(0, 5);

  const documentsFiltered = documents
    .filter((d) => {
      const q = documentsSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        (d.title || '').toLowerCase().includes(q) ||
        ((d.description || '') as string).toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime());

  const contratsFiltered = contrats
    .filter((c) => {
      const q = contratsSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        (c.title || '').toLowerCase().includes(q) ||
        ((c.description || '') as string).toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q) ||
        (c.contrat_type || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime());

  const dossiersFiltered = dossiers
    .filter((d) => {
      const q = dossiersSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        (d.title || '').toLowerCase().includes(q) ||
        ((d.description || '') as string).toLowerCase().includes(q) ||
        (d.status || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime());

  const clientsFiltered = clientsShared
    .filter((c) => {
      const q = clientsSearch.trim().toLowerCase();
      if (!q) return true;
      return ((c.name || '') as string).toLowerCase().includes(q) || (c.client_id || '').toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime());

  // Debug: log clients lists to help diagnose missing UI
  useEffect(() => {
    try {
      console.debug('clientsShared (length):', clientsShared.length, clientsShared.slice(0,5));
      console.debug('clientsFiltered (length):', clientsFiltered.length, clientsFiltered.slice(0,5));
    } catch (e: unknown) { /* noop */ }
  }, [clientsShared, clientsSearch, clientsFiltered]);


  if (!cabinet && loading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-foreground">Chargement...</p>
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
              <p className="text-center text-foreground">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Espace Collaboratif</h1>
          <div className="flex items-center gap-2">
            <Badge className={colorClass}>{cabinet.nom}</Badge>
            <span className="text-sm text-foreground">
              {members.length} membre{members.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        {/* Management button for cabinet founder */}
        {isCabinetOwner && (
          <Button
            onClick={() => navigate(`/${cabinetRole}s/cabinet`)}
            className={colorClass}
          >
            <Settings className="h-4 w-4 mr-2" />
            Gérer le cabinet
          </Button>
        )}
      </div>

      {/* Onglets principaux */}
  <Tabs value={selectedTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
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
          <TabsTrigger value="clients">
            <Plus className="h-4 w-4 mr-2" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="calendrier">
            <Calendar className="h-4 w-4 mr-2" />
            Calendrier
          </TabsTrigger>
          <TabsTrigger value="taches">
            <CheckSquare className="h-4 w-4 mr-2" />
            Tâches
          </TabsTrigger>
          <TabsTrigger value="discussion" className="relative">
            <MessageSquare className="h-4 w-4 mr-2" />
            Discussion
            {totalUnreadCount > 0 && (
              <Badge 
                className={`ml-2 ${
                  cabinetRole === 'notaire' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-blue-600 text-white'
                }`}
              >
                {totalUnreadCount}
              </Badge>
            )}
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
                <p className="text-xs text-foreground">documents et contrats au total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Dossiers partagés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dossiers.length}</div>
                <p className="text-xs text-foreground">dossiers partagés</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Membres actifs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members.filter(m => m.status === 'active').length}</div>
                <p className="text-xs text-foreground">membres du cabinet</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
            </CardHeader>
            <CardContent>
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Rechercher activité..."
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-input bg-white text-sm text-foreground placeholder:text-foreground/50"
                    />
                  </div>

                  {documents.length === 0 && dossiers.length === 0 && contrats.length === 0 ? (
                <div className="text-center py-12 text-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune activité récente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((item, idx) => (
                      <div 
                        key={`${item.type}-${idx}`} 
                        className={`flex items-center justify-between p-3 border rounded-lg transition-all cursor-pointer bg-white hover:bg-gray-50`}
                        onClick={() => {
                          if (item.type === 'Document' && 'file_url' in item) {
                            handleViewDocument(item as SharedDocument);
                          } else if (item.type === 'Dossier') {
                            // switch to dossiers tab (controlled)
                            handleTabChange('dossiers');
                          } else if (item.type === 'Contrat') {
                            // switch to documents tab (controlled)
                            handleTabChange('documents');
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
                            <p className="text-xs text-foreground">
                              {item.type} partagé le {new Date(item.shared_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {/* Right side: date, delete (if allowed) then type badge aligned to the right */}
                        <div className="flex flex-col items-end gap-2 ml-4">
                          <p className="text-xs text-foreground">
                            {item.type} partagé le {new Date(item.shared_at).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-3">
                            {(user && (item.shared_by === user.id || isCabinetOwner)) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteSharedItem(
                                  item.type === 'Document' ? 'cabinet_documents' : item.type === 'Dossier' ? 'cabinet_dossiers' : 'cabinet_contrats',
                                  item.id
                                ); }}
                                className="p-1 rounded hover:bg-gray-100"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4 text-foreground" />
                              </button>
                            )}

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
                          </div>
                        </div>
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
                  <div className="flex items-center gap-2 self-start">
                    <input ref={fileInputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={onCollaboratifFilesSelected} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className={colorClass}>
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className={menuContentClass}>
                        <DropdownMenuItem className={menuItemClass} onClick={() => triggerCollaboratifImport()}>
                          <UploadCloud className="mr-2 h-4 w-4" />
                          Importer depuis mon appareil
                        </DropdownMenuItem>
                        <DropdownMenuItem className={menuItemClass} onClick={() => navigate(`/${cabinetRole}s/documents`)}>
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Aller à mes documents
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Aucun document partagé</p>
                    <p className="text-xs mt-1">Utilisez le bouton de partage sur vos documents</p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-3">
                      <input
                        type="text"
                        placeholder="Rechercher documents..."
                        value={documentsSearch}
                        onChange={(e) => setDocumentsSearch(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-input bg-white text-sm text-foreground placeholder:text-foreground/50"
                      />
                    </div>

                    <div className="space-y-2 max-h-[420px] overflow-y-auto">
                      {documentsFiltered.map((doc) => {
                        return (
                          <div
                            key={doc.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-all bg-white hover:bg-gray-50`}
                            onClick={() => handleViewDocument(doc)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium">{doc.title}</p>
                                {doc.description && (
                                  <p className="text-sm text-foreground mt-1">{doc.description}</p>
                                )}
                                {doc.sharer_profile && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Partagé par {doc.sharer_profile.first_name} {doc.sharer_profile.last_name}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-2 ml-4">
                                <p className="text-xs text-foreground">
                                  Partagé le {new Date(doc.shared_at).toLocaleDateString()}
                                </p>
                                <div className="flex items-center gap-3">
                                  {(user && (doc.shared_by === user.id || isCabinetOwner)) && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deleteSharedItem('cabinet_documents', doc.id); }}
                                      className="p-1 rounded hover:bg-gray-100"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="h-4 w-4 text-foreground" />
                                    </button>
                                  )}

                                  <Badge variant="outline" className={
                                    cabinetRole === 'notaire'
                                      ? 'bg-orange-100 text-orange-600 border-orange-200'
                                      : 'bg-blue-100 text-blue-600 border-blue-200'
                                  }>
                                    Document
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contrats */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="self-start">
                    <CardTitle className="text-lg">Contrats partagés</CardTitle>
                    <CardDescription className="text-sm">
                      {contrats.length} contrat{contrats.length > 1 ? 's' : ''} accessible{contrats.length > 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 self-start">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className={colorClass}>
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className={menuContentClass}>
                        <DropdownMenuItem className={menuItemClass} onClick={() => triggerCollaboratifImport()}>
                          <UploadCloud className="mr-2 h-4 w-4" />
                          Importer depuis mon appareil
                        </DropdownMenuItem>
                        <DropdownMenuItem className={menuItemClass} onClick={() => navigate(`/${cabinetRole}s/contrats`)}>
                          Aller à mes contrats
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {contrats.length === 0 ? (
                  <div className="text-center py-8 text-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Aucun contrat partagé</p>
                    <p className="text-xs mt-1">Utilisez le bouton de partage sur vos contrats</p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-3">
                      <input
                        type="text"
                        placeholder="Rechercher contrats..."
                        value={contratsSearch}
                        onChange={(e) => setContratsSearch(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-input bg-white text-sm text-foreground placeholder:text-foreground/50"
                      />
                    </div>

                    <div className="space-y-2 max-h-[420px] overflow-y-auto">
                      {contratsFiltered.map((contrat) => {
                        return (
                          <div
                            key={contrat.id}
                            className={`p-3 border rounded-lg transition-all bg-white hover:bg-gray-50`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{contrat.title}</p>
                                </div>
                                {contrat.description && (
                                  <p className="text-sm text-foreground mt-1">{contrat.description}</p>
                                )}
                                {contrat.sharer_profile && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Partagé par {contrat.sharer_profile.first_name} {contrat.sharer_profile.last_name}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-2 ml-4">
                                <p className="text-xs text-foreground">
                                  Type: {contrat.contrat_type} • Partagé le {new Date(contrat.shared_at).toLocaleDateString()}
                                </p>
                                <div className="flex items-center gap-3">
                                  {(user && (contrat.shared_by === user.id || isCabinetOwner)) && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deleteSharedItem('cabinet_contrats', contrat.id); }}
                                      className="p-1 rounded hover:bg-gray-100"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="h-4 w-4 text-foreground" />
                                    </button>
                                  )}

                                  <Badge variant="outline" className={
                                    cabinetRole === 'notaire'
                                      ? 'bg-orange-100 text-orange-600 border-orange-200'
                                      : 'bg-blue-100 text-blue-600 border-blue-200'
                                  }>
                                    Contrat
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                  className={`${colorClass} self-start`}
                  onClick={() => navigate(`/${cabinetRole}s/dossiers`)}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Aller à mes dossiers
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dossiers.length === 0 ? (
                <div className="text-center py-12 text-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun dossier partagé</p>
                  <p className="text-sm mt-2">Utilisez le bouton de partage sur vos dossiers</p>
                </div>
              ) : (
                <div>
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Rechercher dossiers..."
                      value={dossiersSearch}
                      onChange={(e) => setDossiersSearch(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-input bg-white text-sm text-foreground placeholder:text-foreground/50"
                    />
                  </div>

                  <div className="grid gap-3 max-h-[320px] overflow-y-auto">
                    {dossiersFiltered.map((dossier) => {
                      return (
                        <div
                          key={dossier.id}
                          className={`p-4 border rounded-lg transition-all cursor-pointer bg-white hover:bg-gray-50`}
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
                                    <p className="text-sm text-foreground mt-1">{dossier.description}</p>
                                  )}
                                  {dossier.sharer_profile && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Partagé par {dossier.sharer_profile.first_name} {dossier.sharer_profile.last_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 ml-4">
                              <p className="text-xs text-foreground">{dossier.status}</p>
                              <p className="text-xs text-foreground">
                                Partagé le {new Date(dossier.shared_at).toLocaleDateString()}
                              </p>

                              <div className="flex items-center gap-3">
                                {(user && (dossier.shared_by === user.id || isCabinetOwner)) && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteSharedItem('cabinet_dossiers', dossier.id); }}
                                    className="p-1 rounded hover:bg-gray-100"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="h-4 w-4 text-foreground" />
                                  </button>
                                )}

                                <Badge variant="outline" className={
                                  cabinetRole === 'notaire'
                                    ? 'bg-orange-100 text-orange-600 border-orange-200'
                                    : 'bg-blue-100 text-blue-600 border-blue-200'
                                }>
                                  Dossier
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients partagés */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Clients partagés</CardTitle>
                  <CardDescription>
                    {clientsShared.length} client{clientsShared.length > 1 ? 's' : ''} accessible{clientsShared.length > 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <Button 
                  className={`${colorClass} self-start`}
                  onClick={() => navigate(`/${cabinetRole}s/clients`)}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Aller à mes clients
                </Button>
              </div>
            </CardHeader>
            <CardContent>
                {clientsShared.length === 0 ? (
                <div className="text-center py-12 text-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun client partagé</p>
                  <p className="text-sm mt-2">Utilisez le bouton de partage sur vos dossiers/clients</p>
                </div>
              ) : (
                <div>
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Rechercher clients..."
                      value={clientsSearch}
                      onChange={(e) => setClientsSearch(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-input bg-white text-sm text-foreground placeholder:text-foreground/50"
                    />
                  </div>

                  <div className="space-y-2 max-h-[420px] overflow-y-auto">
                    {clientsFiltered.map((client) => (
                      <div
                        key={client.id}
                        className={`p-3 border rounded-lg transition-all cursor-pointer bg-white hover:bg-gray-50`}
                        onClick={() => navigate(`/${cabinetRole}s/clients/${client.client_id}?fromCollaboratif=1&cabinetClientId=${client.id}`, { state: { fromCollaboratif: true, cabinetClientId: client.id } })}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{client.name || client.client_id}</p>
                            {client.sharer_profile && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Partagé par {client.sharer_profile.first_name} {client.sharer_profile.last_name}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2 ml-4">
                            <p className="text-xs text-foreground">
                              Partagé le {new Date(client.shared_at).toLocaleDateString()}
                            </p>
                            <div className="flex items-center gap-3">
                              {(user && (client.shared_by === user.id || isCabinetOwner)) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteSharedItem('cabinet_clients', client.id); }}
                                  className="p-1 rounded hover:bg-gray-100"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4 text-foreground" />
                                </button>
                              )}

                              <Badge variant="outline" className={
                                cabinetRole === 'notaire'
                                  ? 'bg-orange-100 text-orange-600 border-orange-200'
                                  : 'bg-blue-100 text-blue-600 border-blue-200'
                              }>
                                Client
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendrier */}
        <TabsContent value="calendrier" className="space-y-4">
          <SharedCalendar role={cabinetRole} members={members} isCabinetOwner={isCabinetOwner} />
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
                  <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Modifier la tâche</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Tâche</label>
                          <Textarea
                            rows={3}
                            placeholder="Décrivez la tâche à réaliser"
                            value={editTaskText}
                            onChange={(e) => setEditTaskText(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Notes (optionnel)</label>
                          <Textarea
                            rows={2}
                            placeholder="Notes complémentaires"
                            value={editTaskNotes}
                            onChange={(e) => setEditTaskNotes(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Date (optionnel)</label>
                            <input type="date" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editTaskDate} onChange={(e) => setEditTaskDate(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Heure (optionnel)</label>
                            <input type="time" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editTaskTime} onChange={(e) => setEditTaskTime(e.target.value)} />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Annuler</Button>
                          <Button className={colorClass} disabled={editTaskSaving} onClick={updateCollaborativeTask}>
                            {editTaskSaving ? 'Enregistrement…' : 'Enregistrer'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {collabLoading ? (
                <div className="text-center py-12 text-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Chargement…</p>
                </div>
              ) : collabTasks.filter(t => !t.done).length === 0 ? (
                <div className="text-center py-12 text-foreground">
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
                        className={`relative rounded-lg shadow p-4 bg-white border border-gray-100 flex flex-col min-h-[140px]`}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation();
                            // open edit dialog with task values
                            setEditTaskId(task.id);
                            setEditTaskText(task.title || '');
                            setEditTaskNotes(task.description || '');
                            if (task.due_at) {
                              try {
                                const d = new Date(task.due_at);
                                // format yyyy-mm-dd and time hh:mm
                                const yyyy = d.getFullYear();
                                const mm = String(d.getMonth() + 1).padStart(2, '0');
                                const dd = String(d.getDate()).padStart(2, '0');
                                setEditTaskDate(`${yyyy}-${mm}-${dd}`);
                                const hh = String(d.getHours()).padStart(2, '0');
                                const mi = String(d.getMinutes()).padStart(2, '0');
                                setEditTaskTime(`${hh}:${mi}`);
                              } catch (e) {
                                setEditTaskDate('');
                                setEditTaskTime('');
                              }
                            } else {
                              setEditTaskDate('');
                              setEditTaskTime('');
                            }
                            setEditDialogOpen(true);
                          }}
                          className={`absolute top-2 right-2 p-1 rounded-full ${cabinetRole === 'notaire' ? 'text-orange-600 hover:bg-orange-100' : 'text-blue-600 hover:bg-blue-100'}`}
                          title="Éditer la tâche"
                        >
                          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z" /></svg>
                        </button>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={task.done}
                            onChange={async () => {
                              await supabase.from('cabinet_tasks').update({ done: true }).eq('id', task.id);
                              setCollabTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: true } : t));
                            }}
                            className={`accent-${cabinetRole === 'notaire' ? 'orange' : 'blue'}-600 h-5 w-5 rounded`}
                          />
                          <span className="font-medium text-lg">{task.title}</span>
                        </div>
                        {task.description && (
                          <div className="text-sm text-foreground mb-2 whitespace-pre-line">{task.description}</div>
                        )}
                        <div className="flex-1" />
                        {task.creator_profile && (
                          <div className="text-xs text-muted-foreground mb-2">
                            Créé par {task.creator_profile.first_name} {task.creator_profile.last_name}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          {task.due_at ? (
                            <Badge variant={overdue ? "destructive" : "outline"}>
                              {dateStr}
                            </Badge>
                          ) : (
                            <span className="text-foreground text-xs">Pas d'échéance</span>
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
          <CabinetChat cabinetId={cabinet.id} role={cabinetRole} />
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
