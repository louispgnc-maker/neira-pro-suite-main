import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Copy, RefreshCw, Mail, Users, ChevronDown, Trash2, ArrowRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Cabinet {
  id: string;
  nom: string;
  code_acces: string;
  email_verified: boolean;
  role: string;
  raison_sociale?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
}

interface CabinetMember {
  id: string;
  email: string;
  nom?: string;
  role_cabinet: string;
  status: string;
  joined_at?: string;
}

interface ManageCabinetProps {
  role: 'avocat' | 'notaire';
  userId: string;
}

export function ManageCabinet({ role, userId }: ManageCabinetProps) {
  const [cabinet, setCabinet] = useState<Cabinet | null>(null);
  const [members, setMembers] = useState<CabinetMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const colorClass =
    role === 'notaire'
      ? 'bg-orange-600 hover:bg-orange-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white';

  // Edit cabinet dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    nom: '',
    raison_sociale: '',
    siret: '',
    adresse: '',
    code_postal: '',
    ville: '',
    telephone: '',
    email: '',
    site_web: '',
  });

  const openEditDialog = () => {
    if (!cabinet) return;
    setEditForm({
      nom: cabinet.nom || '',
      raison_sociale: cabinet.raison_sociale || '',
      siret: '',
      adresse: cabinet.adresse || '',
      code_postal: '',
      ville: '',
      telephone: cabinet.telephone || '',
      email: cabinet.email || '',
      site_web: '',
    });
    setEditDialogOpen(true);
  };

  const handleEditChange = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateCabinet = async () => {
    if (!cabinet) return;
    setEditLoading(true);
    try {
      const { error } = await supabase
        .from('cabinets')
        .update({
          nom: editForm.nom,
          raison_sociale: editForm.raison_sociale,
          siret: editForm.siret || null,
          adresse: editForm.adresse,
          code_postal: editForm.code_postal || null,
          ville: editForm.ville || null,
          telephone: editForm.telephone || null,
          email: editForm.email || null,
          site_web: editForm.site_web || null,
        })
        .eq('id', cabinet.id);

      if (error) throw error;

      toast({ title: 'Cabinet mis à jour', description: 'Les informations ont été enregistrées.' });
      setEditDialogOpen(false);
      loadCabinet();
    } catch (error: any) {
      console.error('Erreur mise à jour cabinet:', error);
      toast({ title: 'Erreur', description: error.message || 'Mise à jour impossible', variant: 'destructive' });
    } finally {
      setEditLoading(false);
    }
  };

  // Mettre à jour rôle membre
  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase.rpc('update_cabinet_member_role', {
        member_id_param: memberId,
        new_role_param: newRole,
      });
      if (error) throw error;
      
      // Mettre à jour l'état local sans recharger
      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, role_cabinet: newRole } : m
      ));
    } catch (error: any) {
      console.error('Erreur changement rôle:', error);
      toast({ title: 'Erreur', description: error.message || 'Impossible de changer le rôle', variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadCabinet();
  }, [userId, role]);

  const loadCabinet = async () => {
    setLoading(true);
    try {
      // Utiliser la fonction RPC pour bypass les policies RLS
      const { data: cabinetsData, error: cabinetError } = await supabase.rpc('get_user_cabinets');
      if (cabinetError) throw cabinetError;

      const cabinets = Array.isArray(cabinetsData) ? cabinetsData as any[] : [];
      const filtered = cabinets.filter((c: any) => c.role === role);

      // Choisir cabinet: owner en priorité, sinon premier cabinet où l'utilisateur est membre
      const ownedCabinet = filtered?.find((c: any) => c.owner_id === userId);
      const firstCabinet = ownedCabinet || (filtered && filtered.length > 0 ? filtered[0] : null);

      if (firstCabinet) {
        setCabinet(firstCabinet);
        setIsOwner(firstCabinet.owner_id === userId);

        // Charger les membres via RPC, sinon fallback table, puis fallback profils (owner + user)
        let membersRes: any[] = [];
        try {
          const { data: membersData, error: membersError } = await supabase
            .rpc('get_cabinet_members_simple', { cabinet_id_param: firstCabinet.id });
          if (membersError) throw membersError;
          membersRes = Array.isArray(membersData) ? (membersData as any[]) : [];
        } catch (rpcErr) {
          try {
            const { data: membersTableData, error: tableErr } = await supabase
              .from('cabinet_members')
              .select('id,email,nom,role_cabinet,status,joined_at')
              .eq('cabinet_id', firstCabinet.id);
            if (tableErr) throw tableErr;
            membersRes = Array.isArray(membersTableData) ? (membersTableData as any[]) : [];
          } catch (tableErr) {
            membersRes = [];
          }
        }

        if (!Array.isArray(membersRes) || membersRes.length === 0) {
          const fallback: any[] = [];
          try {
            const ownerId = (firstCabinet as any).owner_id;
            const idsToFetch = Array.from(new Set([ownerId, userId].filter(Boolean)));
            if (idsToFetch.length > 0) {
              const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, email, nom, full_name')
                .in('id', idsToFetch);
              if (Array.isArray(profilesData)) {
                for (const p of profilesData) {
                  fallback.push({
                    id: p.id,
                    email: p.email || '',
                    nom: p.nom || p.full_name || '',
                    role_cabinet: p.id === ownerId ? 'Fondateur' : 'Membre',
                    status: 'active',
                  });
                }
              }
            }
          } catch (pfE) {
            // ignore profile fallback errors
          }

          setMembers(fallback.length > 0 ? fallback : []);
        } else {
          setMembers(membersRes);
        }
      } else {
        setCabinet(null);
        setIsOwner(false);
        setMembers([]);
      }
    } catch (error: any) {
      console.error('Erreur chargement cabinet:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (!cabinet) return;
    navigator.clipboard.writeText(cabinet.code_acces);
    toast({
      title: 'Code copié !',
      description: 'Le code d\'accès a été copié dans le presse-papiers.',
    });
  };

  const regenerateCode = async () => {
    if (!cabinet) return;
    try {
      const { data, error } = await supabase.rpc('regenerate_cabinet_code', {
        cabinet_id_param: cabinet.id,
      });

      if (error) throw error;

      toast({
        title: 'Code régénéré',
        description: 'Un nouveau code d\'accès a été créé.',
      });

      loadCabinet();
    } catch (error: any) {
      console.error('Erreur régénération code:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de régénérer le code',
        variant: 'destructive',
      });
    }
  };

  const inviteMember = async () => {
    if (!cabinet || !inviteEmail.trim()) return;

    setInviteLoading(true);
    try {
      // Utiliser la fonction RPC pour inviter (bypass RLS)
      const { data: memberId, error } = await supabase.rpc('invite_cabinet_member', {
        cabinet_id_param: cabinet.id,
        email_param: inviteEmail.trim(),
        nom_param: inviteName.trim() || inviteEmail.trim(),
      });

      if (error) throw error;

      // Tenter d'envoyer un email via Edge Function (si configurée)
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess?.session?.access_token;
        if (token && import.meta?.env?.VITE_SUPABASE_URL) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invite`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              cabinet_id: cabinet.id,
              email: inviteEmail.trim(),
              nom: inviteName.trim() || inviteEmail.trim(),
            })
          });
        }
      } catch (e) {
        // Ne bloque pas l'UX si l'email n'est pas configuré
        console.warn('Edge invite email skipped/failure', e);
      }

      toast({
        title: 'Membre invité',
        description: `${inviteEmail} a été ajouté/invité au cabinet.`,
      });

      setInviteEmail('');
      setInviteName('');
      setInviteDialogOpen(false);
      loadCabinet();
    } catch (error: any) {
      console.error('Erreur invitation membre:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'inviter ce membre',
        variant: 'destructive',
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      // Utiliser la fonction RPC pour retirer (bypass RLS)
      const { error } = await supabase.rpc('remove_cabinet_member', {
        member_id_param: memberId,
      });

      if (error) throw error;

      // Mettre à jour l'état local
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (error: any) {
      console.error('Erreur retrait membre:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de retirer ce membre',
        variant: 'destructive',
      });
    }
  };

  const deleteCabinet = async () => {
    if (!cabinet) return;
    
    try {
      const { error } = await supabase.rpc('delete_cabinet', {
        cabinet_id_param: cabinet.id,
      });

      if (error) throw error;

      toast({
        title: 'Cabinet supprimé',
        description: 'Le cabinet a été supprimé définitivement.',
      });

      // Recharger les données du cabinet (qui sera maintenant null)
      loadCabinet();
    } catch (error: any) {
      console.error('Erreur suppression cabinet:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer ce cabinet',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestion du cabinet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (!cabinet) {
    return null;
  }

  const roleOptions = role === 'notaire'
    ? ['Fondateur', 'Notaire', 'Clerc de Notaire', 'Formaliste', 'Juriste Notarial']
    : ['Fondateur', 'Avocat Associé', 'Avocat Collaborateur', 'Juriste', 'Responsable Administratif'];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Mon cabinet</CardTitle>
              <CardDescription>
                {cabinet.nom} {cabinet.raison_sociale && `(${cabinet.raison_sociale})`}
              </CardDescription>
            </div>
            {/* Boutons d'accès selon le rôle */}
            {isOwner ? (
              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className={colorClass}
                    onClick={() => navigate(`/${role === 'notaire' ? 'notaires' : 'avocats'}/espace-collaboratif`)}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Espace collaboratif
                  </Button>
                  <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className={colorClass} onClick={openEditDialog}>
                        Modifier le cabinet
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl">
                      <DialogHeader>
                        <DialogTitle>Modifier le cabinet</DialogTitle>
                        <DialogDescription>Mettez à jour les informations de votre cabinet.</DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-3 py-2">
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="edit-nom">Nom *</Label>
                          <Input id="edit-nom" value={editForm.nom} onChange={(e) => handleEditChange('nom', e.target.value)} />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="edit-raison">Raison sociale</Label>
                          <Input id="edit-raison" value={editForm.raison_sociale} onChange={(e) => handleEditChange('raison_sociale', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-siret">SIRET</Label>
                          <Input id="edit-siret" value={editForm.siret} onChange={(e) => handleEditChange('siret', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-telephone">Téléphone</Label>
                          <Input id="edit-telephone" value={editForm.telephone} onChange={(e) => handleEditChange('telephone', e.target.value)} />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="edit-adresse">Adresse</Label>
                          <Input id="edit-adresse" value={editForm.adresse} onChange={(e) => handleEditChange('adresse', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-code-postal">Code postal</Label>
                          <Input id="edit-code-postal" value={editForm.code_postal} onChange={(e) => handleEditChange('code_postal', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-ville">Ville</Label>
                          <Input id="edit-ville" value={editForm.ville} onChange={(e) => handleEditChange('ville', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-email">Email</Label>
                          <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => handleEditChange('email', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-site">Site web</Label>
                          <Input id="edit-site" value={editForm.site_web} onChange={(e) => handleEditChange('site_web', e.target.value)} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => setEditDialogOpen(false)}
                          className={role === 'notaire' ? 'hover:bg-orange-600 hover:text-white' : 'hover:bg-blue-600 hover:text-white'}
                        >
                          Annuler
                        </Button>
                        <Button className={colorClass} disabled={editLoading} onClick={handleUpdateCabinet}>
                          {editLoading ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              
                {/* Bouton supprimer en petit */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Supprimer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Supprimer définitivement le cabinet ?</DialogTitle>
                      <DialogDescription>
                        Cette action est irréversible. Le cabinet "{cabinet?.nom}" et tous ses membres seront supprimés de façon permanente.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button 
                          variant="outline"
                          className={role === 'notaire' ? 'hover:bg-orange-600 hover:text-white' : 'hover:bg-blue-600 hover:text-white'}
                        >
                          Annuler
                        </Button>
                      </DialogClose>
                      <Button variant="destructive" onClick={deleteCabinet}>
                        Oui, supprimer définitivement
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <Button 
                size="sm" 
                className={colorClass}
                onClick={() => navigate(`/${role === 'notaire' ? 'notaires' : 'avocats'}/espace-collaboratif`)}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Espace collaboratif
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOwner && (
            <div className="space-y-2">
              <Label>Code d'accès du cabinet</Label>
              <div className="flex gap-2">
                <Input value={cabinet.code_acces} readOnly className="font-mono" />
                <Button 
                  type="button" 
                  size="icon" 
                  onClick={copyCode}
                  className={colorClass}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  onClick={regenerateCode}
                  title="Régénérer le code"
                  className={colorClass}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                <Users className="inline h-4 w-4 mr-1" />
                Membres du cabinet ({members.length})
              </Label>
              {isOwner && (
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className={colorClass}>
                      <Mail className="h-4 w-4 mr-1" />
                      Inviter par email
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Inviter un membre</DialogTitle>
                      <DialogDescription>
                        Ajoutez un membre à votre cabinet en saisissant son adresse email et son nom.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="invite-email">Email *</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="nom@exemple.fr"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invite-name">Nom</Label>
                        <Input
                          id="invite-name"
                          placeholder="Jean Dupont"
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setInviteDialogOpen(false)}
                        className={role === 'notaire' ? 'hover:bg-orange-600 hover:text-white' : 'hover:bg-blue-600 hover:text-white'}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={inviteMember}
                        disabled={!inviteEmail.trim() || inviteLoading}
                        className={colorClass}
                      >
                        {inviteLoading ? 'Envoi...' : 'Inviter'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  {isOwner && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono text-xs">{member.email}</TableCell>
                    <TableCell>{member.nom || '—'}</TableCell>
                    <TableCell>
                      {isOwner ? (
                        (member.role_cabinet === 'owner' || member.role_cabinet === 'Fondateur') ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-8 text-xs px-3 ${role === 'notaire' ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700 hover:text-white' : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white'}`}
                              >
                                Fondateur
                                <ChevronDown className="ml-1 h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {roleOptions.map((opt) => (
                                <DropdownMenuItem
                                  key={opt}
                                  onClick={() => updateMemberRole(member.id, opt)}
                                  className={role === 'notaire' ? 'hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white' : 'hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white'}
                                >
                                  {opt}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <Select
                            value={member.role_cabinet}
                            onValueChange={(value) => updateMemberRole(member.id, value)}
                          >
                            <SelectTrigger className={`h-8 text-xs px-3 w-auto ${role === 'notaire' ? 'bg-orange-600 text-white hover:bg-orange-700 border-orange-600' : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'}`}>
                              <SelectValue placeholder="Sélectionner un rôle" />
                            </SelectTrigger>
                            <SelectContent>
                              {roleOptions.map((opt) => (
                                <SelectItem 
                                  key={opt} 
                                  value={opt}
                                  className={role === 'notaire' ? 'hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white' : 'hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white'}
                                >
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )
                      ) : (
                        <Badge 
                          variant={ (member.role_cabinet === 'Fondateur' || member.role_cabinet === 'owner') ? 'default' : 'secondary' }
                          className={`text-xs ${ (member.role_cabinet === 'Fondateur' || member.role_cabinet === 'owner') ? (role === 'notaire' ? 'bg-orange-600' : 'bg-blue-600') : ''}`}
                        >
                          {member.role_cabinet === 'owner' ? 'Fondateur' : member.role_cabinet}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.status === 'active' ? 'default' : 'secondary'}
                        className={
                          member.status === 'active'
                            ? role === 'notaire'
                              ? 'bg-orange-600'
                              : 'bg-blue-600'
                            : ''
                        }
                      >
                        {member.status === 'active' ? 'Actif' : 'En attente'}
                      </Badge>
                    </TableCell>
                    {isOwner && (
                      <TableCell className="text-right">
                        {member.role_cabinet !== 'owner' && member.role_cabinet !== 'Fondateur' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                Expulser
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-sm">
                              <DialogHeader>
                                <DialogTitle>Expulser ce membre ?</DialogTitle>
                                <DialogDescription>
                                  Cette action supprimera ce membre du cabinet. Voulez-vous continuer ?
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button 
                                    variant="outline"
                                    className={role === 'notaire' ? 'hover:bg-orange-600 hover:text-white' : 'hover:bg-blue-600 hover:text-white'}
                                  >
                                    Non
                                  </Button>
                                </DialogClose>
                                <Button variant="destructive" onClick={() => removeMember(member.id)}>Oui</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {members.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isOwner ? 5 : 4} className="text-center text-muted-foreground">
                      Aucun membre pour le moment
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
    </div>
  );
}
