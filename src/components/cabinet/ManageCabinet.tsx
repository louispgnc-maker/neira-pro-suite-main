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

        // Charger les membres
        const { data: membersData, error: membersError } = await supabase
          .from('cabinet_members')
          .select('*')
          .eq('cabinet_id', ownedCabinet.id)
          .order('created_at', { ascending: true });

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
      // Vérifier si l'utilisateur existe déjà
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('email', inviteEmail.trim())
        .single();

      if (userError && userError.code !== 'PGRST116') throw userError;

      if (userData) {
        // Vérifier que le rôle correspond
        if (userData.role !== role) {
          throw new Error(`Cet utilisateur n'est pas ${role}`);
        }

        // Vérifier s'il n'est pas déjà membre
        const { data: existingMember } = await supabase
          .from('cabinet_members')
          .select('id')
          .eq('cabinet_id', cabinet.id)
          .eq('user_id', userData.id)
          .single();

        if (existingMember) {
          throw new Error('Cet utilisateur est déjà membre du cabinet');
        }

        // Ajouter directement comme membre actif
        const { error: memberError } = await supabase.from('cabinet_members').insert({
          cabinet_id: cabinet.id,
          user_id: userData.id,
          email: inviteEmail.trim(),
          nom: inviteName.trim() || userData.email,
          role_cabinet: 'membre',
          status: 'active',
          joined_at: new Date().toISOString(),
        });

        if (memberError) throw memberError;

        toast({
          title: 'Membre ajouté',
          description: `${inviteEmail} a été ajouté au cabinet.`,
        });
      } else {
        // L'utilisateur n'existe pas encore, créer une invitation en attente
        // TODO: Envoyer un email d'invitation
        const { error: memberError } = await supabase.from('cabinet_members').insert({
          cabinet_id: cabinet.id,
          user_id: userId, // Temporaire, sera mis à jour quand l'utilisateur s'inscrira
          email: inviteEmail.trim(),
          nom: inviteName.trim(),
          role_cabinet: 'membre',
          status: 'pending',
          invitation_sent_at: new Date().toISOString(),
        });

        if (memberError) throw memberError;

        toast({
          title: 'Invitation envoyée',
          description: `Une invitation a été envoyée à ${inviteEmail}.`,
        });
      }

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
      const { error } = await supabase.from('cabinet_members').delete().eq('id', memberId);

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Mon cabinet</CardTitle>
          <CardDescription>
            {cabinet.nom} {cabinet.raison_sociale && `(${cabinet.raison_sociale})`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Code d'accès du cabinet</Label>
            <div className="flex gap-2">
              <Input value={cabinet.code_acces} readOnly className="font-mono" />
              <Button type="button" variant="outline" size="icon" onClick={copyCode}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={regenerateCode}
                title="Régénérer le code"
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
                  <Button variant="outline" size="sm">
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
                      <Badge variant="outline">{member.role_cabinet}</Badge>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember(member.id)}
                        >
                          Retirer
                        </Button>
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
