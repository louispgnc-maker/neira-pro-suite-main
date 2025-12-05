import { AppLayout } from "@/components/layout/AppLayout";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Search, Eye, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { ShareToCollaborativeDialog } from "@/components/cabinet/ShareToCollaborativeDialog";
import { ResourceCounter } from "@/components/subscription/ResourceCounter";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { canDeleteResources } from "@/lib/cabinetPermissions";

type DossierRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  client_count?: number;
  contrat_count?: number;
  document_count?: number;
};

type ClientRow = { id: string; name: string };
type ContratRow = { id: string; name: string; category: string; type: string };
type DocumentRow = { id: string; name: string };

export default function Dossiers() {
  const { user } = useAuth();
  const location = useLocation();
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const limits = useSubscriptionLimits(role);

  const [loading, setLoading] = useState(true);
  const [dossiers, setDossiers] = useState<DossierRow[]>([]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Vérifier si limite de dossiers atteinte
  const isDossierLimitReached = limits.max_dossiers !== null && dossiers.length >= limits.max_dossiers;

  // Listen for subscription changes
  useEffect(() => {
    const handleRefresh = () => setRefreshTrigger(prev => prev + 1);
    window.addEventListener('subscription-updated', handleRefresh);
    return () => window.removeEventListener('subscription-updated', handleRefresh);
  }, []);
  
  // Load current user role
  useEffect(() => {
    async function loadUserRole() {
      if (!user) return;
      
      try {
        const { data: cabinetsData } = await supabase.rpc('get_user_cabinets');
        if (!cabinetsData || !Array.isArray(cabinetsData)) return;
        
        const cabinets = cabinetsData.filter((c: any) => String(c.role) === role);
        const cabinet = cabinets[0];
        if (!cabinet) return;
        
        const cabinetId = String(cabinet.id);
        const { data: memberData } = await supabase
          .from('cabinet_members')
          .select('role_cabinet')
          .eq('cabinet_id', cabinetId)
          .eq('user_id', user.id)
          .single();
        
        if (memberData) {
          setCurrentUserRole(memberData.role_cabinet);
        }
      } catch (err) {
        console.error('Error loading user role:', err);
      }
    }
    
    loadUserRole();
  }, [user, role]);
  
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("En cours");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [contrats, setContrats] = useState<ContratRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedContrats, setSelectedContrats] = useState<string[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);

  const handleStatusChange = async (dossierId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('dossiers')
        .update({ status: newStatus })
        .eq('id', dossierId);

      if (error) throw error;

      // Mettre à jour l'état local
      setDossiers(prev => prev.map(d => 
        d.id === dossierId ? { ...d, status: newStatus } : d
      ));

      toast.success('Statut mis à jour');
    } catch (err: any) {
      console.error('Error updating status:', err);
      toast.error(err.message || 'Erreur lors de la mise à jour du statut');
    }
  };
  const navigate = useNavigate();
  const mainHover = role === 'notaire' ? 'hover:bg-orange-600 hover:text-white' : 'hover:bg-blue-600 hover:text-white';
  const selectContentClass = role === 'notaire' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200';
  const selectItemClass = role === 'notaire' ? 'cursor-pointer hover:bg-orange-600 hover:text-white' : 'cursor-pointer hover:bg-blue-600 hover:text-white';
  const menuContentClass = role === 'notaire' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200';
  const menuItemClass = role === 'notaire' ? 'focus:bg-orange-600 focus:text-white hover:bg-orange-600 hover:text-white' : 'focus:bg-blue-600 focus:text-white hover:bg-blue-600 hover:text-white';

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user) return;
      setLoading(true);
      const { data: d, error } = await supabase
        .from('dossiers')
        .select('id,title,status,created_at')
        .eq('owner_id', user.id)
        .eq('role', role)
        .order('created_at', { ascending: false });

      let list = (d || []) as DossierRow[];
      // Fetch cabinet shared dossiers and merge so members see shared dossiers like shared documents
      try {
        const { data: cabinetsData } = await supabase.rpc('get_user_cabinets');
        const cabinets = Array.isArray(cabinetsData) ? (cabinetsData as unknown[]) : [];
        const filtered = cabinets.filter((c) => (c as Record<string, unknown>)['role'] === role);
        const userCabinet = filtered[0] || null;
        if (userCabinet) {
          try {
            const cabinetIdParam = String((userCabinet as Record<string, unknown>)['id'] ?? '');
            const { data: sharedDossiers } = await supabase.rpc('get_cabinet_dossiers', { cabinet_id_param: cabinetIdParam });
            if (Array.isArray(sharedDossiers) && sharedDossiers.length > 0) {
              // Map cabinet_dossiers rows to DossierRow while marking them as shared
              const mapped = (sharedDossiers as unknown[]).map((sd) => {
                const s = sd as Record<string, unknown>;
                return {
                  id: String(s['dossier_id'] ?? s['id'] ?? ''),
                  title: String(s['title'] ?? ''),
                  status: String(s['status'] ?? '—'),
                  created_at: String(s['shared_at'] ?? s['created_at'] ?? ''),
                  // helper metadata kept as properties on the object for later counting
                  _shared: true,
                  _cabinet_row_id: String(s['id'] ?? ''),
                  _attached_document_count: Array.isArray(s['attached_document_ids'] as unknown) ? (s['attached_document_ids'] as unknown[]).length : 0,
                } as unknown as DossierRow & Record<string, unknown>;
              });

              // merge owned and shared, de-dup by original dossier id
              const byId = new Map<string, DossierRow & Record<string, unknown>>();
              list.forEach((it) => byId.set(it.id, it as DossierRow & Record<string, unknown>));
              mapped.forEach((it) => {
                if (!byId.has(it.id)) byId.set(it.id, it as DossierRow & Record<string, unknown>);
              });
              list = Array.from(byId.values());
            }
          } catch (e) {
            // ignore shared fetch errors
          }
        }
      } catch (e) {
        // ignore get_user_cabinets errors
      }
      // If search filter provided, refetch server-side with ilike
      if (debounced) {
        const { data: sd, error: sErr } = await supabase
          .from('dossiers')
          .select('id,title,status,created_at')
          .eq('owner_id', user.id)
          .eq('role', role)
          .or(`title.ilike.%${debounced}%`)
          .order('created_at', { ascending: false });
        if (!sErr && sd) {
          list = sd as DossierRow[];
        }
      }
      if (error) {
        console.error('Erreur chargement dossiers:', error);
        if (mounted) setDossiers([]);
      } else if (mounted) {
        // charger les compteurs d'association
        const ids = list.map((x) => x.id);
        if (ids.length > 0) {
          const [dc, dco, dd] = await Promise.all([
            supabase.from('dossier_clients').select('dossier_id', { count: 'exact' }).in('dossier_id', ids),
            supabase.from('dossier_contrats').select('dossier_id', { count: 'exact' }).in('dossier_id', ids),
            supabase.from('dossier_documents').select('dossier_id', { count: 'exact' }).in('dossier_id', ids),
          ]);
          const cntClients = new Map<string, number>();
          const cntContrats = new Map<string, number>();
          const cntDocs = new Map<string, number>();
          // Supabase doesn't group count by dossier_id with this API, fallback to fetching rows and counting client-side
          if (dc.data) (dc.data as unknown[]).forEach((row) => { const r = row as Record<string, unknown>; const id = String(r['dossier_id'] ?? ''); cntClients.set(id, (cntClients.get(id) || 0) + 1); });
          if (dco.data) (dco.data as unknown[]).forEach((row) => { const r = row as Record<string, unknown>; const id = String(r['dossier_id'] ?? ''); cntContrats.set(id, (cntContrats.get(id) || 0) + 1); });
          if (dd.data) (dd.data as unknown[]).forEach((row) => { const r = row as Record<string, unknown>; const id = String(r['dossier_id'] ?? ''); cntDocs.set(id, (cntDocs.get(id) || 0) + 1); });
          list.forEach((x) => {
            const xr = x as DossierRow & Record<string, unknown>;
            // if shared entry has attached_document_count we prefer that
            if (typeof xr['_attached_document_count'] !== 'undefined') xr.document_count = Number(xr['_attached_document_count']) || 0;
            else xr.document_count = cntDocs.get(x.id) || 0;
            xr.client_count = cntClients.get(x.id) || 0;
            xr.contrat_count = cntContrats.get(x.id) || 0;
          });
        }
        setDossiers(list);
      }
      setLoading(false);
    }
    async function loadRefs() {
      if (!user) return;
      const [cl, ct, docs] = await Promise.all([
        supabase.from('clients').select('id,name').eq('owner_id', user.id).eq('role', role).order('name'),
        supabase.from('contrats').select('id,name,category,type').eq('owner_id', user.id).eq('role', role).order('created_at', { ascending: false }),
        supabase.from('documents').select('id,name').eq('owner_id', user.id).eq('role', role).order('updated_at', { ascending: false }),
      ]);
      if (cl.data) setClients(cl.data as ClientRow[]);
      if (ct.data) setContrats(ct.data as ContratRow[]);
      if (docs.data) setDocuments(docs.data as DocumentRow[]);
    }
    load();
    loadRefs();
    return () => { mounted = false; };
  }, [user, role, debounced, refreshTrigger]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleDelete = async (dossier: DossierRow) => {
    if (!user) return;
    if (!confirm(`Supprimer "${dossier.title}" ?`)) return;
    try {
      const { error } = await supabase.from('dossiers').delete().eq('id', dossier.id).eq('owner_id', user.id);
      if (error) throw error;
      setDossiers((prev) => prev.filter((x) => x.id !== dossier.id));
      toast.success('Dossier supprimé');
      } catch (err: unknown) {
      console.error('Erreur suppression dossier:', err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error('Erreur lors de la suppression', { description: message });
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("En cours");
    setSelectedClients([]);
    setSelectedContrats([]);
    setSelectedDocuments([]);
  };

  const createDossier = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast.error('Titre requis');
      return;
    }
    try {
      const { data: inserted, error } = await supabase
        .from('dossiers')
        .insert({ owner_id: user.id, role, title, description, status })
        .select('id')
        .single();
      if (error) throw error;
      const dossierId = inserted!.id as string;

      // Insert associations
  const inserts: Promise<unknown>[] = [];
      if (selectedClients.length > 0) {
        const rows = selectedClients.map((client_id) => ({ owner_id: user.id, dossier_id: dossierId, client_id, role }));
        inserts.push(supabase.from('dossier_clients').insert(rows));
      }
      if (selectedContrats.length > 0) {
        const rows = selectedContrats.map((contrat_id) => ({ owner_id: user.id, dossier_id: dossierId, contrat_id, role }));
        inserts.push(supabase.from('dossier_contrats').insert(rows));
      }
      if (selectedDocuments.length > 0) {
        const rows = selectedDocuments.map((document_id) => ({ owner_id: user.id, dossier_id: dossierId, document_id, role }));
        inserts.push(supabase.from('dossier_documents').insert(rows));
      }
      await Promise.all(inserts);

      // Synchronisation: lier clients <-> contrats si non liés
      if (selectedClients.length > 0 && selectedContrats.length > 0) {
        // Récupérer existants
        const { data: existing } = await supabase
          .from('client_contrats')
          .select('client_id,contrat_id')
          .eq('owner_id', user.id)
          .eq('role', role)
          .in('client_id', selectedClients)
          .in('contrat_id', selectedContrats);
        const existingSet = new Set((existing || []).map((r) => {
          const row = r as Record<string, unknown>;
          return `${String(row['client_id'] ?? '')}|${String(row['contrat_id'] ?? '')}`;
        }));
        const toInsert = [] as { owner_id: string; client_id: string; contrat_id: string; role: string }[];
        for (const cId of selectedClients) {
          for (const kId of selectedContrats) {
            const key = `${cId}|${kId}`;
            if (!existingSet.has(key)) toInsert.push({ owner_id: user.id, client_id: cId, contrat_id: kId, role });
          }
        }
        if (toInsert.length > 0) {
          await supabase.from('client_contrats').insert(toInsert);
        }
      }

      toast.success('Dossier créé');
      setOpen(false);
      resetForm();
      // Refresh list
      const { data: refreshed } = await supabase
        .from('dossiers')
        .select('id,title,status,created_at')
        .eq('owner_id', user.id)
        .eq('role', role)
        .order('created_at', { ascending: false });
      setDossiers((refreshed || []) as DossierRow[]);
    } catch (err: unknown) {
      console.error('Erreur création dossier:', err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error('Erreur création', { description: message });
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dossiers</h1>
            <p className="text-foreground mt-1">Gérez vos dossiers et leurs associations</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { 
            if (isDossierLimitReached && v) {
              toast.error("Limite de dossiers atteinte", { 
                description: "Passez à un abonnement supérieur pour créer plus de dossiers" 
              });
              return;
            }
            setOpen(v); 
            if (!v) resetForm(); 
          }}>
            <DialogTrigger asChild>
              <Button 
                className={role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}
                disabled={isDossierLimitReached}
              >
                {isDossierLimitReached ? 'Limite atteinte' : 'Nouveau dossier'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Nouveau dossier</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Titre</label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Litige commercial - DUPONT" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Statut</label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                      <SelectContent className={selectContentClass}>
                        <SelectItem className={selectItemClass} value="Ouvert">Ouvert</SelectItem>
                        <SelectItem className={selectItemClass} value="En cours">En cours</SelectItem>
                        <SelectItem className={selectItemClass} value="En attente">En attente</SelectItem>
                        <SelectItem className={selectItemClass} value="Clos">Clos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Clients</label>
                    <div className="border rounded-md p-2 max-h-48 overflow-y-auto">
                      {clients.length === 0 ? (
                        <div className="text-sm text-foreground px-1">Aucun client</div>
                      ) : clients.map((c) => {
                        const checked = selectedClients.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" className="h-4 w-4" checked={checked} onChange={(e) => setSelectedClients((prev) => e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id))} />
                            <span>{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contrats</label>
                    <div className="border rounded-md p-2 max-h-48 overflow-y-auto">
                      {contrats.length === 0 ? (
                        <div className="text-sm text-foreground px-1">Aucun contrat</div>
                      ) : contrats.map((c) => {
                        const checked = selectedContrats.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-start gap-2 text-sm cursor-pointer">
                            <input type="checkbox" className="mt-1 h-4 w-4" checked={checked} onChange={(e) => setSelectedContrats((prev) => e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id))} />
                            <span>
                              <span className="font-medium">{c.name}</span>
                              <span className="text-foreground"> — {c.category}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Documents</label>
                    <div className="border rounded-md p-2 max-h-48 overflow-y-auto">
                      {documents.length === 0 ? (
                        <div className="text-sm text-foreground px-1">Aucun document</div>
                      ) : documents.map((d) => {
                        const checked = selectedDocuments.includes(d.id);
                        return (
                          <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" className="h-4 w-4" checked={checked} onChange={(e) => setSelectedDocuments((prev) => e.target.checked ? [...prev, d.id] : prev.filter((id) => id !== d.id))} />
                            <span>{d.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Annuler</Button>
                  <Button className={role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} onClick={createDossier}>Créer</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Dossiers Counter */}
        <Card>
          <CardContent className="pt-6">
            <ResourceCounter
              current={dossiers.length}
              max={limits.max_dossiers}
              label="Dossiers actifs"
              type="count"
              subscriptionPlan={limits.subscription_plan}
              role={role}
            />
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Liste des dossiers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[300px] border border-dashed border-border rounded-lg">
                <p className="text-foreground">Chargement…</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 bg-white p-4 rounded-lg border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground" />
                <Input
                  placeholder="Rechercher un dossier..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white text-foreground placeholder:text-foreground/50"
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Liste des dossiers</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Clients</TableHead>
                      <TableHead>Contrats</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Créé le</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dossiers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-foreground">Aucun dossier</TableCell>
                      </TableRow>
                    ) : (
                      dossiers.map((d) => (
                        <TableRow
                          key={d.id}
                          onClick={() => navigate(role === 'notaire' ? `/notaires/dossiers/${d.id}` : `/avocats/dossiers/${d.id}`)}
                          className="cursor-pointer"
                        >
                          <TableCell className="font-medium">{d.title}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={d.status}
                              onValueChange={(newStatus) => handleStatusChange(d.id, newStatus)}
                            >
                              <SelectTrigger className={`w-[180px] ${
                                d.status === 'Prospect' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                                d.status === 'Nouveau' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                d.status === 'En cours' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                d.status === 'En attente de signature' ? 'bg-purple-100 text-purple-700 border-purple-300' :
                                d.status === 'À traiter' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                                d.status === 'Terminé' ? 'bg-green-100 text-green-700 border-green-300' :
                                'bg-gray-100 text-gray-700 border-gray-300'
                              }`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Prospect">Prospect</SelectItem>
                                <SelectItem value="Nouveau">Nouveau</SelectItem>
                                <SelectItem value="En cours">En cours</SelectItem>
                                <SelectItem value="En attente de signature">En attente de signature</SelectItem>
                                <SelectItem value="À traiter">À traiter</SelectItem>
                                <SelectItem value="Terminé">Terminé</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>{d.client_count ?? '—'}</TableCell>
                          <TableCell>{d.contrat_count ?? '—'}</TableCell>
                          <TableCell>{d.document_count ?? '—'}</TableCell>
                          <TableCell className="text-sm text-foreground">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <ShareToCollaborativeDialog
                                itemId={d.id}
                                itemName={d.title}
                                itemType="dossier"
                                role={role}
                                onSuccess={() => {
                                  // Toast déjà affiché dans ShareToCollaborativeDialog
                                }}
                              />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={role === 'notaire' ? 'hover:bg-orange-100 hover:text-orange-600' : 'hover:bg-blue-100 hover:text-blue-600'}
                                  >
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className={menuContentClass}>
                                    <DropdownMenuItem className={menuItemClass} onClick={() => navigate(role === 'notaire' ? `/notaires/dossiers/${d.id}` : `/avocats/dossiers/${d.id}`)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Voir
                                  </DropdownMenuItem>
                                    {currentUserRole && canDeleteResources(currentUserRole) && (((d as unknown) as Record<string, unknown>)['_shared']) !== true && (
                                      <DropdownMenuItem className={`text-destructive ${menuItemClass}`} onClick={() => handleDelete(d)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Supprimer
                                      </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
