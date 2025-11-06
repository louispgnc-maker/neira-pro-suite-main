import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Copy, RefreshCw, Mail, Users } from 'lucide-react';
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
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const { toast } = useToast();

  const colorClass =
    role === 'notaire'
      ? 'bg-amber-600 hover:bg-amber-700 text-white'
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
      toast({ title: 'Rôle mis à jour', description: 'Le rôle du membre a été modifié.' });
      loadCabinet();
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
      const { data: cabinets, error: cabinetError } = await supabase
        .rpc('get_user_cabinets')
        .eq('role', role);

      if (cabinetError) throw cabinetError;

      // Prendre le premier cabinet où l'utilisateur est owner
      const ownedCabinet = cabinets?.find((c: any) => c.owner_id === userId);
      
      if (ownedCabinet) {
        setCabinet(ownedCabinet);

        // Charger les membres via RPC (bypass RLS)
        const { data: membersData, error: membersError } = await supabase
          .rpc('get_cabinet_members', { cabinet_id_param: ownedCabinet.id });

        if (membersError) throw membersError;
        setMembers(membersData || []);
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
    if (!confirm('Êtes-vous sûr de vouloir retirer ce membre du cabinet ?')) return;

    try {
      // Utiliser la fonction RPC pour retirer (bypass RLS)
      const { error } = await supabase.rpc('remove_cabinet_member', {
        member_id_param: memberId,
      });

      if (error) throw error;

      toast({
        title: 'Membre retiré',
        description: 'Le membre a été retiré du cabinet.',
      });

      loadCabinet();
    } catch (error: any) {
      console.error('Erreur retrait membre:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de retirer ce membre',
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
    ? ['Notaire', 'Clerc de Notaire', 'Formaliste', 'Juriste Notarial']
    : ['Avocat Associé', 'Avocat Collaborateur', 'Juriste', 'Responsable Administratif'];

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
            {/* Bouton visible uniquement pour le owner (ManageCabinet est affiché pour l'owner, mais on protège quand même) */}
            {userId && (
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
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Annuler</Button>
                    <Button className={colorClass} disabled={editLoading} onClick={handleUpdateCabinet}>
                      {editLoading ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <p className="text-xs text-muted-foreground">
              Partagez ce code avec vos employés pour qu'ils puissent rejoindre le cabinet.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                <Users className="inline h-4 w-4 mr-1" />
                Membres du cabinet ({members.length})
              </Label>
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
                    <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
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
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono text-xs">{member.email}</TableCell>
                    <TableCell>{member.nom || '—'}</TableCell>
                    <TableCell>
                      {member.role_cabinet === 'owner' ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-7 ${role === 'notaire' ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700 hover:text-white' : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white'}`}
                            >
                              Fondateur
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {roleOptions.map((opt) => (
                              <DropdownMenuItem
                                key={opt}
                                onClick={() => updateMemberRole(member.id, opt)}
                                className={role === 'notaire' ? 'hover:bg-amber-600 hover:text-white focus:bg-amber-600 focus:text-white' : 'hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white'}
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
                          <SelectTrigger className={`w-[220px] ${role === 'notaire' ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                            <SelectValue placeholder="Sélectionner un rôle" />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((opt) => (
                              <SelectItem 
                                key={opt} 
                                value={opt}
                                className={role === 'notaire' ? 'hover:bg-amber-600 hover:text-white focus:bg-amber-600 focus:text-white' : 'hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white'}
                              >
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.status === 'active' ? 'default' : 'secondary'}
                        className={
                          member.status === 'active'
                            ? role === 'notaire'
                              ? 'bg-amber-600'
                              : 'bg-blue-600'
                            : ''
                        }
                      >
                        {member.status === 'active' ? 'Actif' : 'En attente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {member.role_cabinet !== 'owner' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">Retirer</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-sm">
                            <DialogHeader>
                              <DialogTitle>Retirer ce membre ?</DialogTitle>
                              <DialogDescription>
                                Cette action supprimera ce membre du cabinet. Voulez-vous continuer ?
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline">Annuler</Button>
                              <Button className={colorClass} onClick={() => removeMember(member.id)}>Confirmer</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {members.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
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
