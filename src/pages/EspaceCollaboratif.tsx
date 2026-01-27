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
import { sanitizeFileName } from '@/lib/fileHelpers';
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
  Settings,
  Crown,
  User
} from 'lucide-react';
import { Trash2, UploadCloud, Share2, Building2 } from 'lucide-react';
import SharedCalendar from '@/components/collaborative/SharedCalendar';
import { CabinetChat } from '@/components/cabinet/CabinetChat';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Cabinet {
  id: string;
  nom: string;
  role: string;
  subscription_plan?: string;
}

interface CabinetMember {
  id: string;
  user_id?: string;
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
  assigned_to?: string[] | null;
  shared_by?: string;
  cabinet_id?: string;
  creator_profile?: {
    first_name?: string;
    last_name?: string;
  };
}

interface Client {
  id: string;
  nom: string;
  prenom: string;
  email?: string;
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
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  
  // Compteurs de notifications par type
  const [notifDocumentsCount, setNotifDocumentsCount] = useState(0);
  const [notifDossiersCount, setNotifDossiersCount] = useState(0);
  const [notifClientsCount, setNotifClientsCount] = useState(0);
  
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
  const [taskAssignedTo, setTaskAssignedTo] = useState<string[]>([]);
  const [taskMemberSearch, setTaskMemberSearch] = useState('');
  const [taskSaving, setTaskSaving] = useState(false);
  // Edit task dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editTaskText, setEditTaskText] = useState('');
  const [editTaskNotes, setEditTaskNotes] = useState('');
  const [editTaskDate, setEditTaskDate] = useState('');
  const [editTaskTime, setEditTaskTime] = useState('');
  const [editTaskAssignedTo, setEditTaskAssignedTo] = useState<string[]>([]);
  const [editTaskMemberSearch, setEditTaskMemberSearch] = useState('');
  const [editTaskSaving, setEditTaskSaving] = useState(false);
  const [collabTasks, setCollabTasks] = useState<CollabTask[]>([]);
  const [collabLoading, setCollabLoading] = useState(true);
  // Share to client states
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareStep, setShareStep] = useState<'choice' | 'select-client'>('choice');
  const [documentToShare, setDocumentToShare] = useState<SharedDocument | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [sharingToClient, setSharingToClient] = useState(false);
  
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

        // Check quota BEFORE upload
        const { data: quotaCheck, error: quotaError } = await supabase.rpc('check_storage_quota', {
          p_cabinet_id: cabinet.id,
          p_file_size: file.size
        });

        if (quotaError || !quotaCheck?.allowed) {
          toast({ 
            title: 'Limite de stockage atteinte', 
            description: quotaCheck?.error || 'Passez à un abonnement supérieur',
            variant: 'destructive' 
          });
          continue;
        }

        const path = `${user.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
        const { error: upErr } = await supabase.storage.from('documents').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf',
        });
        if (upErr) {
          toast({ title: 'Échec upload', description: upErr.message || String(upErr), variant: 'destructive' });
          continue;
        }

        // Use secure RPC to create document with audit logging
        const { data: result, error: rpcErr } = await supabase.rpc('upload_cabinet_document', {
          p_cabinet_id: cabinet.id,
          p_file_name: file.name,
          p_file_size: file.size,
          p_file_type: file.type,
          p_storage_path: path,
          p_client_name: null
        });

        if (rpcErr || !result?.success) {
          toast({ title: 'Erreur', description: result?.error || rpcErr?.message || 'Impossible de référencer le document', variant: 'destructive' });
          // Cleanup uploaded file
          await supabase.storage.from('documents').remove([path]);
          continue;
        }

        toast({ title: 'Upload réussi', description: `${file.name} ajouté à l'espace collaboratif` });
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

  const shareDocumentToClient = async (clientId: string) => {
    if (!documentToShare || !user || !cabinet) return;
    setSharingToClient(true);
    try {
      // Use file_url from cabinet_documents (which is the storage_path)
      const storagePath = documentToShare.file_url;
      const fileName = documentToShare.file_name || 'document.pdf';
      const fileType = documentToShare.file_type || 'application/pdf';

      if (!storagePath) {
        throw new Error('Chemin du document introuvable');
      }

      // Download from documents bucket
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(storagePath);
      
      if (downloadError) {
        console.error('Download error:', downloadError);
        throw new Error('Impossible de télécharger le document');
      }

      // Upload to shared-documents with proper path
      const newPath = `${cabinet.id}/${clientId}/${Date.now()}-${sanitizeFileName(fileName)}`;
      const { error: uploadError } = await supabase.storage
        .from('shared-documents')
        .upload(newPath, fileData, {
          cacheControl: '3600',
          upsert: false,
          contentType: fileType,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Impossible d\'uploader le document partagé');
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('shared-documents')
        .getPublicUrl(newPath);

      // Insert directly into client_shared_documents
      const { error: insertError } = await supabase
        .from('client_shared_documents')
        .insert({
          client_id: clientId,
          file_name: fileName,
          file_url: publicUrlData.publicUrl,
          file_size: documentToShare.file_size || fileData.size,
          file_type: fileType,
          uploaded_by: user?.id,
          title: documentToShare.title || fileName,
          description: documentToShare.description,
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        await supabase.storage.from('shared-documents').remove([newPath]);
        throw new Error(insertError.message || 'Erreur lors du partage');
      }

      toast({ title: 'Document partagé', description: 'Le document a été ajouté à l\'espace client' });
      setShareDialogOpen(false);
      setDocumentToShare(null);
      setClientSearch('');
    } catch (e: unknown) {
      console.error('Share to client error', e);
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setSharingToClient(false);
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

      // Determine bucket based on path structure
      let bucket: string;
      
      // Check if path has explicit bucket prefix
      if (storagePath.startsWith('shared_documents/') || storagePath.startsWith('shared-documents/')) {
        bucket = 'shared-documents';
        storagePath = storagePath.replace(/^shared[-_]documents\//, '');
      } else if (storagePath.startsWith('documents/')) {
        bucket = 'documents';
        storagePath = storagePath.replace(/^documents\//, '');
      } else {
        // No prefix - determine by path structure
        // Cabinet documents: userId/timestamp-filename.pdf (UUID/...)
        // Shared documents: cabinetId/clientId/timestamp-filename.pdf (UUID/UUID/...)
        const parts = storagePath.split('/');
        
        // If path has 3+ parts (cabinetId/clientId/file), it's shared-documents
        // If path has 2 parts (userId/file), it's documents
        if (parts.length >= 3) {
          bucket = 'shared-documents';
        } else {
          bucket = 'documents';
        }
      }

      console.log('Opening document:', { bucket, storagePath, raw });

      // Create signed URL for private buckets
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 3600); // 1 hour expiry
      
      if (signedError || !signedData?.signedUrl) {
        console.error('createSignedUrl failed for', bucket, storagePath, signedError);
        toast({
          title: 'Erreur',
          description: 'Impossible d\'accéder au document',
          variant: 'destructive',
        });
        return;
      }

      setViewerUrl(signedData.signedUrl);
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
        due_at,
        assigned_to: taskAssignedTo.length > 0 ? taskAssignedTo : null
      });
      if (error) throw error;
      toast({ title: 'Tâche créée', description: 'La tâche a été ajoutée.' });
      setTaskText('');
      setTaskNotes('');
      setTaskDate('');
      setTaskTime('');
      setTaskAssignedTo([]);
      setTaskMemberSearch('');
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
      const { error } = await supabase.from('cabinet_tasks').update({ 
        title, 
        description: editTaskNotes || null, 
        due_at,
        assigned_to: editTaskAssignedTo.length > 0 ? editTaskAssignedTo : null
      }).eq('id', editTaskId);
      if (error) throw error;
      // update local state
      setCollabTasks(prev => prev.map(t => t.id === editTaskId ? { 
        ...t, 
        title, 
        description: editTaskNotes || null, 
        due_at,
        assigned_to: editTaskAssignedTo.length > 0 ? editTaskAssignedTo : null
      } : t));
      toast({ title: 'Tâche modifiée', description: 'La tâche a été mise à jour.' });
      setEditTaskMemberSearch('');
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

  const navigateToContrat = useCallback(async (contrat: SharedContrat) => {
    try {
      // Utiliser contrat_id pour naviguer vers le contrat original
      const contratId = contrat.contrat_id || contrat.id;
      if (contratId) {
        navigate(`/${cabinetRole}s/contrats/${contratId}`, { state: { fromCollaboratif: true } });
        return;
      }

      // Fallback si pas d'ID
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ouvrir ce contrat',
        variant: 'destructive',
      });
    } catch (error) {
      console.error('Erreur navigation contrat:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ouvrir ce contrat',
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
      
      // Filtrer par rôle uniquement (plus de filtre sur le statut)
      const filtered = cabinets.filter((c) => {
        const cRole = ((c as unknown as { role?: string }).role);
        return cRole === cabinetRole;
      });
      
      let userCabinet = (filtered[0] as unknown as Cabinet) || null;
  
      // Load subscription_plan from cabinets table
      if (userCabinet && userCabinet.id) {
        const { data: cabinetDetails } = await supabase
          .from('cabinets')
          .select('subscription_plan')
          .eq('id', userCabinet.id)
          .single();
        
        console.log('Cabinet subscription_plan loaded:', cabinetDetails);
        
        if (cabinetDetails) {
          userCabinet = { ...userCabinet, subscription_plan: cabinetDetails.subscription_plan };
        }
      }
      
      console.log('Final cabinet object:', userCabinet);
      
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
          const mappedMembers = arr.map(m => {
            const mm = m as { id: string; user_id?: string; email: string; nom?: string; role_cabinet: string; status: string };
            return { id: mm.id, user_id: mm.user_id, email: mm.email, nom: mm.nom || undefined, role_cabinet: mm.role_cabinet, status: mm.status };
          });
          setMembers(mappedMembers);
          
          // Set current user's role
          const currentMember = mappedMembers.find(m => m.user_id === user?.id || m.email === user?.email);
          setCurrentUserRole(currentMember?.role_cabinet || null);
        } else {
          // fallback
          const { data: membersTable } = await supabase.from('cabinet_members').select('id,user_id,email,nom,role_cabinet,status').eq('cabinet_id', userCabinet?.id);
          if (Array.isArray(membersTable)) {
            const arr = membersTable as unknown[];
            const mappedMembers = arr.map(m => {
              const mm = m as { id: string; user_id?: string; email: string; nom?: string; role_cabinet: string; status: string };
              return { id: mm.id, user_id: mm.user_id, email: mm.email, nom: mm.nom || undefined, role_cabinet: mm.role_cabinet, status: mm.status };
            });
            setMembers(mappedMembers);
            
            // Set current user's role
            const currentMember = mappedMembers.find(m => m.user_id === user?.id || m.email === user?.email);
            setCurrentUserRole(currentMember?.role_cabinet || null);
          } else {
            setMembers([]);
            setCurrentUserRole(null);
          }
        }
      } catch (e) {
        setMembers([]);
        setCurrentUserRole(null);
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

      // Load all clients for sharing dialog (not just shared ones)
      try {
        const { data: allClientsData, error: allClientsError } = await supabase.rpc('get_all_cabinet_clients', { p_cabinet_id: userCabinet?.id });
        
        if (!allClientsError && Array.isArray(allClientsData)) {
          setClients(allClientsData as Client[]);
        } else {
          console.error('Error fetching all clients for sharing:', allClientsError);
          setClients([]);
        }
      } catch (e) {
        console.error('Exception fetching all clients:', e);
        setClients([]);
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
  const loadUnreadCount = useCallback(async () => {
    if (!user || !cabinet) return;
    
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
        const lastViewed = localStorage.getItem(lastViewedKey);
        
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
  }, [user, cabinet]);

  // Load notification counts by type
  const loadNotificationCounts = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: notifications, error } = await supabase
        .from('cabinet_notifications')
        .select('type, is_read')
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      if (!notifications) return;

      // Count by type
      const documentsCount = notifications.filter(n => 
        n.type === 'cabinet_document' || n.type === 'cabinet_contrat'
      ).length;
      
      const dossiersCount = notifications.filter(n => 
        n.type === 'cabinet_dossier'
      ).length;
      
      const clientsCount = notifications.filter(n => 
        n.type === 'cabinet_client' || n.type === 'cabinet_message'
      ).length;

      console.log('Notification counts by type:', {
        total: notifications.length,
        documents: documentsCount,
        dossiers: dossiersCount,
        clients: clientsCount,
        types: notifications.map(n => n.type)
      });

      setNotifDocumentsCount(documentsCount);
      setNotifDossiersCount(dossiersCount);
      setNotifClientsCount(clientsCount);
    } catch (error) {
      console.error('Error loading notification counts:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !cabinet || !cabinet.id) return;
    
    loadUnreadCount();
    loadNotificationCounts();

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
    
    // Subscribe to cabinet notifications to update counts in real-time
    const notifChannel = supabase
      .channel(`cabinet-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cabinet_notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          loadNotificationCounts();
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
      supabase.removeChannel(notifChannel);
      window.removeEventListener('cabinet-conversation-read', handleConversationRead);
    };
  }, [user, cabinet, loadUnreadCount, loadNotificationCounts]);

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

  // Mark notifications as read when viewing a tab
  const markNotificationsAsRead = useCallback(async (types: string[]) => {
    if (!user || types.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('cabinet_notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .in('type', types);

      if (error) {
        console.error('Error marking notifications as read:', error);
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, [user]);

  const handleTabChange = useCallback((value: string) => {
    setSelectedTab(value);
    
    // Mark relevant notifications as read based on tab
    if (value === 'documents') {
      markNotificationsAsRead(['cabinet_document', 'cabinet_contrat']);
    } else if (value === 'dossiers') {
      markNotificationsAsRead(['cabinet_dossier']);
    } else if (value === 'clients') {
      markNotificationsAsRead(['cabinet_client', 'cabinet_message']);
    }
    
    try {
      const params = new URLSearchParams(location.search);
      params.set('tab', value);
      navigate(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`, { replace: true });
    } catch (e) {
      // ignore
    }
    try { sessionStorage.setItem('collab_tab', value); } catch (e) { /* ignore */ }
  }, [location.pathname, location.search, navigate, markNotificationsAsRead]);

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
              navigateToContrat(found as SharedContrat);
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
  }, [loading, location.state, documents, dossiers, contrats, collabTasks, handleViewDocument, handleTabChange, navigateToDossier, navigateToContrat, cabinetRole, navigate, location.pathname]);

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
              <p className="text-center text-gray-900">Chargement...</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!cabinet) {
    const role = location.pathname.includes('/notaires') ? 'notaire' : 'avocat';
    const colorClass = role === 'notaire' 
      ? 'bg-orange-600 hover:bg-orange-700 text-white' 
      : 'bg-blue-600 hover:bg-blue-700 text-white';
    
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">Espace Collaboratif</CardTitle>
              <CardDescription className="text-center">
                Créez ou rejoignez un cabinet pour collaborer avec votre équipe
              </CardDescription>
            </CardHeader>
            <CardContent className="py-8">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center mb-8">
                  <p className="text-gray-900 mb-2">
                    Vous n'êtes pas encore membre d'un cabinet collaboratif.
                  </p>
                  <p className="text-sm text-gray-600">
                    Choisissez une option ci-dessous pour commencer à collaborer :
                  </p>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Créer un cabinet */}
                  <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Plus className="h-5 w-5" />
                        Créer un cabinet
                      </CardTitle>
                      <CardDescription>
                        Créez votre propre cabinet et invitez des collaborateurs
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className={`w-full ${colorClass}`}
                        onClick={() => navigate(`/${role}s/create-cabinet`)}
                      >
                        Créer mon cabinet
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                  
                  {/* Rejoindre un cabinet */}
                  <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <User className="h-5 w-5" />
                        Rejoindre un cabinet
                      </CardTitle>
                      <CardDescription>
                        Rejoignez un cabinet existant via une invitation
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className={`w-full ${colorClass}`}
                        onClick={() => navigate(`/${role}s/join-cabinet`)}
                      >
                        Entrer le code d'invitation
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="text-center text-sm text-gray-600 mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium mb-2">💡 Pourquoi utiliser l'espace collaboratif ?</p>
                  <ul className="text-left max-w-md mx-auto space-y-1">
                    <li>• Partagez des documents, dossiers et contrats</li>
                    <li>• Gérez les clients en équipe</li>
                    <li>• Suivez les tâches et les échéances</li>
                    <li>• Communiquez en temps réel via le chat</li>
                  </ul>
                </div>
              </div>
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Espace Collaboratif</h1>
          <div className="flex items-center gap-2">
            <Badge className={colorClass}>{cabinet.nom}</Badge>
            <span className="text-sm text-gray-900">
              {members.length} membre{members.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Display current user's role */}
          {currentUserRole && (
            <Badge 
              variant="outline" 
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${cabinetRole === 'notaire' ? 'border-orange-500 text-orange-700 bg-orange-50' : 'border-blue-500 text-blue-700 bg-blue-50'}`}
            >
              <User className="h-3.5 w-3.5" />
              {currentUserRole}
            </Badge>
          )}
          
          {/* Management button for cabinet founder and Associé */}
          {(isCabinetOwner || currentUserRole === 'Associé') && (
            <Button
              onClick={() => navigate(`/${cabinetRole}s/cabinet?id=${cabinet?.id}`)}
              className={colorClass}
            >
              <Settings className="h-4 w-4 mr-2" />
              Gérer le cabinet
            </Button>
          )}
        </div>
      </div>

      {/* Onglets principaux */}
  <Tabs value={selectedTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Tableau de bord
          </TabsTrigger>
          <TabsTrigger value="documents" className="relative">
            <FileText className="h-4 w-4 mr-2" />
            Documents & Contrats
            {notifDocumentsCount > 0 && (
              <Badge className="ml-2 bg-red-600 text-white h-5 min-w-5 flex items-center justify-center text-xs">
                {notifDocumentsCount > 99 ? '99+' : notifDocumentsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dossiers" className="relative">
            <FolderOpen className="h-4 w-4 mr-2" />
            Dossiers
            {notifDossiersCount > 0 && (
              <Badge className="ml-2 bg-red-600 text-white h-5 min-w-5 flex items-center justify-center text-xs">
                {notifDossiersCount > 99 ? '99+' : notifDossiersCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="clients" className="relative">
            <Plus className="h-4 w-4 mr-2" />
            Clients
            {notifClientsCount > 0 && (
              <Badge className="ml-2 bg-red-600 text-white h-5 min-w-5 flex items-center justify-center text-xs">
                {notifClientsCount > 99 ? '99+' : notifClientsCount}
              </Badge>
            )}
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
              <Badge className="ml-2 bg-red-600 text-white h-5 min-w-5 flex items-center justify-center text-xs">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
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
                <p className="text-xs text-gray-900">documents et contrats au total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Dossiers partagés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dossiers.length}</div>
                <p className="text-xs text-gray-900">dossiers partagés</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Membres du cabinet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members.length}</div>
                <p className="text-xs text-gray-900">membres au total</p>
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
                      className="w-full px-3 py-2 rounded-md border border-input bg-white text-sm text-gray-900 placeholder:text-gray-900/50"
                    />
                  </div>

                  {documents.length === 0 && dossiers.length === 0 && contrats.length === 0 ? (
                <div className="text-center py-12 text-gray-900">
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
                            navigateToDossier(item as SharedDossier);
                          } else if (item.type === 'Contrat') {
                            navigateToContrat(item as SharedContrat);
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
                            <p className="text-xs text-gray-900">
                              {item.type} partagé le {new Date(item.shared_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {/* Right side: date, delete (if allowed) then type badge aligned to the right */}
                        <div className="flex flex-col items-end gap-2 ml-4">
                          <p className="text-xs text-gray-900">
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
                                <Trash2 className="h-4 w-4 text-gray-900" />
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
                  <div className="text-center py-8 text-gray-900">
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
                        className="w-full px-3 py-2 rounded-md border border-input bg-white text-sm text-gray-900 placeholder:text-gray-900/50"
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
                                  <p className="text-sm text-gray-900 mt-1">{doc.description}</p>
                                )}
                                {doc.sharer_profile && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    Partagé par {doc.sharer_profile.first_name} {doc.sharer_profile.last_name}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-2 ml-4">
                                <p className="text-xs text-gray-900">
                                  Partagé le {new Date(doc.shared_at).toLocaleDateString()}
                                </p>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setDocumentToShare(doc);
                                      setShareDialogOpen(true);
                                    }}
                                    className="p-1 rounded hover:bg-gray-100"
                                    title="Partager avec un client"
                                  >
                                    <Share2 className="h-4 w-4 text-gray-900" />
                                  </button>

                                  {(user && (doc.shared_by === user.id || isCabinetOwner)) && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deleteSharedItem('cabinet_documents', doc.id); }}
                                      className="p-1 rounded hover:bg-gray-100"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="h-4 w-4 text-gray-900" />
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
                  <div className="text-center py-8 text-gray-900">
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
                        className="w-full px-3 py-2 rounded-md border border-input bg-white text-sm text-gray-900 placeholder:text-gray-900/50"
                      />
                    </div>

                    <div className="space-y-2 max-h-[420px] overflow-y-auto">
                      {contratsFiltered.map((contrat) => {
                        return (
                          <div
                            key={contrat.id}
                            className={`p-3 border rounded-lg transition-all cursor-pointer bg-white hover:bg-gray-50`}
                            onClick={() => navigateToContrat(contrat)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{contrat.title}</p>
                                </div>
                                {contrat.description && (
                                  <p className="text-sm text-gray-900 mt-1">{contrat.description}</p>
                                )}
                                {contrat.sharer_profile && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    Partagé par {contrat.sharer_profile.first_name} {contrat.sharer_profile.last_name}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-2 ml-4">
                                <p className="text-xs text-gray-900">
                                  Type: {contrat.contrat_type} • Partagé le {new Date(contrat.shared_at).toLocaleDateString()}
                                </p>
                                <div className="flex items-center gap-3">
                                  {(user && (contrat.shared_by === user.id || isCabinetOwner)) && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deleteSharedItem('cabinet_contrats', contrat.id); }}
                                      className="p-1 rounded hover:bg-gray-100"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="h-4 w-4 text-gray-900" />
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
                <div className="text-center py-12 text-gray-900">
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
                      className="w-full px-3 py-2 rounded-md border border-input bg-white text-sm text-gray-900 placeholder:text-gray-900/50"
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
                                    <p className="text-sm text-gray-900 mt-1">{dossier.description}</p>
                                  )}
                                  {dossier.sharer_profile && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      Partagé par {dossier.sharer_profile.first_name} {dossier.sharer_profile.last_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 ml-4">
                              <p className="text-xs text-gray-900">{dossier.status}</p>
                              <p className="text-xs text-gray-900">
                                Partagé le {new Date(dossier.shared_at).toLocaleDateString()}
                              </p>

                              <div className="flex items-center gap-3">
                                {(user && (dossier.shared_by === user.id || isCabinetOwner)) && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteSharedItem('cabinet_dossiers', dossier.id); }}
                                    className="p-1 rounded hover:bg-gray-100"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="h-4 w-4 text-gray-900" />
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
                <div className="text-center py-12 text-gray-900">
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
                      className="w-full px-3 py-2 rounded-md border border-input bg-white text-sm text-gray-900 placeholder:text-gray-900/50"
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
                              <p className="text-xs text-gray-600 mt-1">
                                Partagé par {client.sharer_profile.first_name} {client.sharer_profile.last_name}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2 ml-4">
                            <p className="text-xs text-gray-900">
                              Partagé le {new Date(client.shared_at).toLocaleDateString()}
                            </p>
                            <div className="flex items-center gap-3">
                              {(user && (client.shared_by === user.id || isCabinetOwner)) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteSharedItem('cabinet_clients', client.id); }}
                                  className="p-1 rounded hover:bg-gray-100"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4 text-gray-900" />
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
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Assigner à (optionnel)</label>
                        <Input
                          type="text"
                          placeholder="Rechercher un membre..."
                          value={taskMemberSearch}
                          onChange={(e) => setTaskMemberSearch(e.target.value)}
                          className="mb-2"
                        />
                        <div className="max-h-[200px] overflow-y-auto border rounded-md p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                          {members
                            .filter(m => m.user_id)
                            .filter(m => {
                              const searchLower = taskMemberSearch.toLowerCase();
                              return (m.nom || m.email).toLowerCase().includes(searchLower);
                            })
                            .length === 0 ? (
                            <p className="text-sm text-gray-600">
                              {taskMemberSearch ? 'Aucun membre trouvé' : 'Aucun membre'}
                            </p>
                          ) : (
                            members
                              .filter(m => m.user_id)
                              .filter(m => {
                                const searchLower = taskMemberSearch.toLowerCase();
                                return (m.nom || m.email).toLowerCase().includes(searchLower);
                              })
                              .map((member) => (
                                <label key={member.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded">
                                  <input
                                    type="checkbox"
                                    checked={taskAssignedTo.includes(member.user_id!)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setTaskAssignedTo([...taskAssignedTo, member.user_id!]);
                                      } else {
                                        setTaskAssignedTo(taskAssignedTo.filter(id => id !== member.user_id));
                                      }
                                    }}
                                    className="h-4 w-4"
                                  />
                                  <span className="text-sm">{member.nom || member.email}</span>
                                </label>
                              ))
                          )}
                        </div>
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
                        <Button variant="outline" className={`${cabinetRole === 'notaire' ? 'border-orange-300 text-orange-600 hover:bg-orange-50' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`} onClick={() => { setTaskMemberSearch(''); setTaskDialogOpen(false); }}>Annuler</Button>
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
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Assigner à (optionnel)</label>
                          <Input
                            type="text"
                            placeholder="Rechercher un membre..."
                            value={editTaskMemberSearch}
                            onChange={(e) => setEditTaskMemberSearch(e.target.value)}
                            className="mb-2"
                          />
                          <div className="max-h-[200px] overflow-y-auto border rounded-md p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            {members
                              .filter(m => m.user_id)
                              .filter(m => {
                                const searchLower = editTaskMemberSearch.toLowerCase();
                                return (m.nom || m.email).toLowerCase().includes(searchLower);
                              })
                              .length === 0 ? (
                              <p className="text-sm text-gray-600">
                                {editTaskMemberSearch ? 'Aucun membre trouvé' : 'Aucun membre'}
                              </p>
                            ) : (
                              members
                                .filter(m => m.user_id)
                                .filter(m => {
                                  const searchLower = editTaskMemberSearch.toLowerCase();
                                  return (m.nom || m.email).toLowerCase().includes(searchLower);
                                })
                                .map((member) => (
                                  <label key={member.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded">
                                    <input
                                      type="checkbox"
                                      checked={editTaskAssignedTo.includes(member.user_id!)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setEditTaskAssignedTo([...editTaskAssignedTo, member.user_id!]);
                                        } else {
                                          setEditTaskAssignedTo(editTaskAssignedTo.filter(id => id !== member.user_id));
                                        }
                                      }}
                                      className="h-4 w-4"
                                    />
                                    <span className="text-sm">{member.nom || member.email}</span>
                                  </label>
                                ))
                            )}
                          </div>
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
                          <Button variant="outline" className={`${cabinetRole === 'notaire' ? 'border-orange-300 text-orange-600 hover:bg-orange-50' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`} onClick={() => { setEditTaskMemberSearch(''); setEditDialogOpen(false); }}>Annuler</Button>
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
                <div className="text-center py-12 text-gray-900">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Chargement…</p>
                </div>
              ) : collabTasks.filter(t => !t.done).length === 0 ? (
                <div className="text-center py-12 text-gray-900">
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
                            setEditTaskAssignedTo(task.assigned_to || []);
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
                          <div className="text-sm text-gray-900 mb-2 whitespace-pre-line">{task.description}</div>
                        )}
                        <div className="flex-1" />
                        {task.assigned_to && task.assigned_to.length > 0 && (
                          <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>
                              Assigné à <span className="font-medium">
                                {(() => {
                                  const firstMember = members.find(m => m.user_id === task.assigned_to[0]);
                                  return firstMember?.nom || firstMember?.email || 'Membre';
                                })()}
                              </span>
                              {task.assigned_to.length > 1 && (
                                <span> et {task.assigned_to.length - 1} autre{task.assigned_to.length - 1 > 1 ? 's' : ''}</span>
                              )}
                            </span>
                          </div>
                        )}
                        {task.creator_profile && (
                          <div className="text-xs text-gray-600 mb-2">
                            Créé par {task.creator_profile.first_name} {task.creator_profile.last_name}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          {task.due_at ? (
                            <Badge variant={overdue ? "destructive" : "outline"}>
                              {dateStr}
                            </Badge>
                          ) : (
                            <span className="text-gray-900 text-xs">Pas d'échéance</span>
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
          <div className="mb-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                // Mark all conversations as read by setting current timestamp for all
                try {
                  const { data: allMessages } = await supabase
                    .from('cabinet_messages')
                    .select('id, conversation_id, recipient_id, sender_id')
                    .eq('cabinet_id', cabinet.id)
                    .neq('sender_id', user.id);

                  if (allMessages && allMessages.length > 0) {
                    const conversationIds = new Set<string>();
                    
                    allMessages.forEach(msg => {
                      if (!msg.conversation_id && !msg.recipient_id) {
                        conversationIds.add('general');
                      } else if (msg.conversation_id) {
                        conversationIds.add(msg.conversation_id);
                      } else if (msg.recipient_id === user.id) {
                        conversationIds.add(`direct-${msg.sender_id}`);
                      }
                    });

                    const now = new Date().toISOString();
                    conversationIds.forEach(convId => {
                      const lastViewedKey = `chat-last-viewed-${cabinet.id}-${convId}`;
                      localStorage.setItem(lastViewedKey, now);
                    });

                    setTotalUnreadCount(0);
                    toast({
                      title: "Messages marqués comme lus",
                      description: "Tous les messages ont été marqués comme lus",
                    });
                  }
                } catch (error) {
                  console.error('Error marking all as read:', error);
                  toast({
                    title: "Erreur",
                    description: "Impossible de marquer les messages comme lus",
                    variant: "destructive",
                  });
                }
              }}
              className={cabinetRole === 'notaire' 
                ? 'text-orange-600 hover:text-orange-700 border-orange-300 hover:bg-orange-50' 
                : 'text-blue-600 hover:text-blue-700 border-blue-300 hover:bg-blue-50'}
            >
              Marquer tout comme lu
            </Button>
          </div>
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

    {/* Share to Client Dialog */}
    <Dialog open={shareDialogOpen} onOpenChange={(open) => {
      setShareDialogOpen(open);
      if (!open) {
        setShareStep('choice');
        setDocumentToShare(null);
        setClientSearch('');
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partager le document</DialogTitle>
          <DialogDescription>
            {shareStep === 'choice' 
              ? "Choisissez où partager ce document"
              : "Sélectionnez le client avec qui partager ce document"
            }
          </DialogDescription>
        </DialogHeader>

        {shareStep === 'choice' ? (
          <div className="space-y-3">
            <button
              onClick={() => {
                // Share to personal space - just close dialog as it's already in cabinet
                toast({ title: 'Déjà dans l\'espace perso', description: 'Ce document est déjà dans l\'espace collaboratif du cabinet' });
                setShareDialogOpen(false);
              }}
              className={`w-full p-4 text-left rounded-md border transition-colors ${
                cabinetRole === 'notaire'
                  ? 'hover:bg-orange-50 border-orange-200'
                  : 'hover:bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5" />
                <div>
                  <div className="font-medium">Espace personnel du cabinet</div>
                  <div className="text-sm text-gray-600">Document déjà accessible ici</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setShareStep('select-client')}
              className={`w-full p-4 text-left rounded-md border transition-colors ${
                cabinetRole === 'notaire'
                  ? 'hover:bg-orange-50 border-orange-200'
                  : 'hover:bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <User className="h-5 w-5" />
                <div>
                  <div className="font-medium">Espace client</div>
                  <div className="text-sm text-gray-600">Partager avec un client spécifique</div>
                </div>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShareStep('choice')}
              className="mb-2"
            >
              ← Retour
            </Button>
            
            <Input
              placeholder="Rechercher un client..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="w-full"
            />
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {clients
                .filter(c => {
                  const search = clientSearch.toLowerCase();
                  return (
                    c.nom.toLowerCase().includes(search) ||
                    c.prenom.toLowerCase().includes(search) ||
                    (c.email && c.email.toLowerCase().includes(search))
                  );
                })
                .map((client) => (
                  <button
                    key={client.id}
                    onClick={() => shareDocumentToClient(client.id)}
                    disabled={sharingToClient}
                    className={`w-full p-3 text-left rounded-md border transition-colors ${
                      cabinetRole === 'notaire'
                        ? 'hover:bg-orange-50 border-orange-200'
                        : 'hover:bg-blue-50 border-blue-200'
                    } ${sharingToClient ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="font-medium">
                      {client.prenom} {client.nom}
                    </div>
                    {client.email && (
                      <div className="text-sm text-gray-600">{client.email}</div>
                    )}
                  </button>
                ))}
              {clients.filter(c => {
                const search = clientSearch.toLowerCase();
                return (
                  c.nom.toLowerCase().includes(search) ||
                  c.prenom.toLowerCase().includes(search) ||
                  (c.email && c.email.toLowerCase().includes(search))
                );
              }).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Aucun client trouvé
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </AppLayout>
  );
}
