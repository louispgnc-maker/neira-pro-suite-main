import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { canChangeRoles, canInviteMembers, canRemoveMembers, canAssignRole, canModifyMemberRole } from '@/lib/cabinetPermissions';
import { Copy, RefreshCw, Mail, Users, ChevronDown, Trash2, ArrowRight, ShoppingCart } from 'lucide-react';
import { CabinetStats } from './CabinetStats';
import { BuySignaturesDialog } from './BuySignaturesDialog';
import { updateSubscriptionQuantity } from '@/lib/stripeQuantity';
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
  subscription_plan?: string;
  max_members?: number;
}

interface CabinetMember {
  id: string;
  user_id?: string;
  email: string;
  nom?: string;
  role_cabinet: string;
  status: string;
  joined_at?: string;
}

interface ManageCabinetProps {
  role: 'avocat' | 'notaire';
  userId: string;
  cabinetId?: string;  // Si spécifié, charge ce cabinet spécifique au lieu de chercher
}

export function ManageCabinet({ role, userId, cabinetId }: ManageCabinetProps) {
  const [cabinet, setCabinet] = useState<Cabinet | null>(null);
  const [members, setMembers] = useState<CabinetMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
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
    } catch (error: unknown) {
        console.error('Erreur mise à jour cabinet:', error);
        const message = error instanceof Error ? error.message : String(error ?? 'Mise à jour impossible');
        toast({ title: 'Erreur', description: message, variant: 'destructive' });
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
    } catch (error: unknown) {
      console.error('Erreur changement rôle:', error);
      const message = error instanceof Error ? error.message : String(error ?? 'Impossible de changer le rôle');
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
    }
  };
  const loadCabinet = useCallback(async () => {
    setLoading(true);
    try {
      // Utiliser la fonction RPC pour bypass les policies RLS
      const { data: cabinetsData, error: cabinetError } = await supabase.rpc('get_user_cabinets');
      if (cabinetError) throw cabinetError;

      const cabinets = Array.isArray(cabinetsData) ? (cabinetsData as unknown[]) : [];
      
      let firstCabinet: unknown | null = null;
      
      if (cabinetId) {
        // Si cabinetId est spécifié, chercher ce cabinet spécifique
        firstCabinet = cabinets.find((c) => String((c as Record<string, unknown>)['id']) === cabinetId);
      } else {
        // Sinon, logique par défaut: filtrer par rôle
        const filtered = cabinets.filter((c) => {
          const cabinetRole = String((c as Record<string, unknown>)['role']);
          return cabinetRole === role;
        });
        // Choisir cabinet: owner en priorité, sinon premier cabinet où l'utilisateur est membre
        const ownedCabinet = filtered?.find((c) => String((c as Record<string, unknown>)['owner_id']) === userId);
        firstCabinet = ownedCabinet || (filtered && filtered.length > 0 ? filtered[0] : null);
      }

      if (firstCabinet) {
        // Load subscription details from cabinets table
        const cabinetId = String((firstCabinet as Record<string, unknown>)['id'] ?? '');
        const { data: cabinetDetails } = await supabase
          .from('cabinets')
          .select('subscription_plan, max_members')
          .eq('id', cabinetId)
          .single();
        
        const enrichedCabinet = {
          ...(firstCabinet as unknown as Cabinet),
          subscription_plan: cabinetDetails?.subscription_plan || 'essentiel',
          max_members: cabinetDetails?.max_members || 1
        };
        
        setCabinet(enrichedCabinet);
        setIsOwner(String((firstCabinet as Record<string, unknown>)['owner_id']) === userId);

        // Charger les membres via RPC, sinon fallback table, puis fallback profils (owner + user)
        let membersRes: unknown[] = [];
        try {
          const { data: membersData, error: membersError } = await supabase
            .rpc('get_cabinet_members_simple', { cabinet_id_param: cabinetId });
          if (membersError) throw membersError;
          membersRes = Array.isArray(membersData) ? (membersData as unknown[]) : [];
        } catch (rpcErr) {
          try {
            const { data: membersTableData, error: tableErr } = await supabase
              .from('cabinet_members')
              .select('id, email, nom, role_cabinet, status, joined_at, user_id')
              .eq('cabinet_id', cabinetId);
            if (tableErr) throw tableErr;
            
            // Récupérer les profiles séparément
            const userIds = membersTableData?.map((m: any) => m.user_id).filter(Boolean) || [];
            let profilesMap: Record<string, any> = {};
            
            if (userIds.length > 0) {
              const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, first_name, last_name')
                .in('id', userIds);
              
              profilesData?.forEach((p: any) => {
                profilesMap[p.id] = p;
              });
            }
            
            // Fusionner profiles avec members
            membersRes = Array.isArray(membersTableData) 
              ? membersTableData.map((m: any) => ({
                  ...m,
                  first_name: profilesMap[m.user_id]?.first_name,
                  last_name: profilesMap[m.user_id]?.last_name
                }))
              : [];
          } catch (tableErr) {
            membersRes = [];
          }
        }
        if (!Array.isArray(membersRes) || membersRes.length === 0) {
          const fallback: CabinetMember[] = [];
          try {
            const ownerId = String((firstCabinet as Record<string, unknown>)['owner_id'] ?? '');
            const idsToFetch = Array.from(new Set([ownerId, userId].filter(Boolean)));
            if (idsToFetch.length > 0) {
              const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, email, nom, full_name')
                .in('id', idsToFetch as string[]);
              if (Array.isArray(profilesData)) {
                for (const p of profilesData as unknown[]) {
                  const pid = String((p as Record<string, unknown>)['id'] ?? '');
                  fallback.push({
                    id: pid,
                    email: String((p as Record<string, unknown>)['email'] ?? ''),
                    nom: String((p as Record<string, unknown>)['nom'] ?? (p as Record<string, unknown>)['full_name'] ?? ''),
                    role_cabinet: pid === ownerId ? 'Fondateur' : 'Membre',
                    status: 'active',
                  });
                }
              }
            }
          } catch (pfE) {
            // ignore profile fallback errors
            console.warn('Profile fallback failed', pfE);
          }

          setMembers(fallback.length > 0 ? fallback : []);
        } else {
          // Normalize unknown items into CabinetMember[]
          const normalized: CabinetMember[] = (membersRes as unknown[]).map((m) => ({
            id: String((m as Record<string, unknown>)['id'] ?? ''),
            user_id: String((m as Record<string, unknown>)['user_id'] ?? ''),
            email: String((m as Record<string, unknown>)['email'] ?? ''),
            nom: String((m as Record<string, unknown>)['nom'] ?? '') || undefined,
            role_cabinet: String((m as Record<string, unknown>)['role_cabinet'] ?? ''),
            status: String((m as Record<string, unknown>)['status'] ?? ''),
            joined_at: (m as Record<string, unknown>)['joined_at'] ? String((m as Record<string, unknown>)['joined_at']) : undefined,
          }));
          setMembers(normalized);
          
          // Set current user's role for permissions - use user_id to match
          const currentMember = normalized.find(m => m.user_id === userId);
          setCurrentUserRole(currentMember?.role_cabinet || null);
        }
      } else {
        setCabinet(null);
        setIsOwner(false);
        setMembers([]);
      }
    } catch (error: unknown) {
      console.error('Erreur chargement cabinet:', error);
      const message = error instanceof Error ? error.message : String(error ?? 'Erreur chargement cabinet');
      // non-blocking: log to console; do not show toast here to avoid noisy UX
      console.warn(message);
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  useEffect(() => {
    loadCabinet();
  }, [loadCabinet]);

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
    } catch (error: unknown) {
      console.error('Erreur régénération code:', error);
      const message = error instanceof Error ? error.message : String(error ?? 'Impossible de régénérer le code');
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const inviteMember = async () => {
    if (!cabinet || !inviteEmail.trim()) return;

    // Check subscription limits
    const currentMemberCount = members.length;
    const maxMembers = cabinet.max_members || 1;
    const subscriptionPlan = cabinet.subscription_plan || 'essentiel';

    if (subscriptionPlan === 'essentiel') {
      toast({
        title: 'Abonnement insuffisant',
        description: "L'abonnement Essentiel ne permet qu'un seul membre. Passez à un abonnement supérieur pour inviter des collaborateurs.",
        variant: 'destructive',
      });
      return;
    }

    if (subscriptionPlan === 'professionnel' && currentMemberCount >= maxMembers) {
      toast({
        title: 'Limite atteinte',
        description: `Votre abonnement Professionnel permet ${maxMembers} membres maximum. Passez à l'offre Cabinet+ pour inviter plus de collaborateurs.`,
        variant: 'destructive',
      });
      return;
    }

    if (subscriptionPlan === 'cabinet-plus' && currentMemberCount >= 50) {
      toast({
        title: 'Cabinet de grande taille',
        description: `Vous avez ${currentMemberCount} membres. Pour ajouter des membres supplémentaires, contactez-nous pour une offre personnalisée.`,
        variant: 'destructive',
      });
      return;
    }

    setInviteLoading(true);
    try {
      console.log('📧 Invitation:', { email: inviteEmail.trim(), nom: inviteName.trim() || inviteEmail.trim() });
      
      // Utiliser la fonction RPC pour inviter (bypass RLS)
      const { data: memberId, error } = await supabase.rpc('invite_cabinet_member', {
        cabinet_id_param: cabinet.id,
        email_param: inviteEmail.trim(),
        nom_param: inviteName.trim() || inviteEmail.trim(),
      });

      console.log('🔍 RPC result:', { memberId, error });

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

      // Mettre à jour la quantity Stripe
      if (cabinet?.id) {
        try {
          await updateSubscriptionQuantity(cabinet.id);
        } catch (error) {
          console.error('Erreur mise à jour quantity Stripe:', error);
          // Ne pas bloquer l'UX si la mise à jour Stripe échoue
        }
      }
    } catch (error: any) {
      console.error('Erreur invitation membre:', error);
      // Gérer les erreurs Supabase qui ont une structure spécifique
      let message = 'Impossible d\'inviter ce membre';
      if (error?.message) {
        message = error.message;
      } else if (error?.error) {
        message = error.error;
      } else if (typeof error === 'string') {
        message = error;
      }
      
      toast({
        title: 'Erreur',
        description: message,
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

      // Mettre à jour la quantity Stripe
      if (cabinet?.id) {
        try {
          await updateSubscriptionQuantity(cabinet.id);
        } catch (error) {
          console.error('Erreur mise à jour quantity Stripe:', error);
          // Ne pas bloquer l'UX si la mise à jour Stripe échoue
        }
      }
    } catch (error: unknown) {
      console.error('Erreur retrait membre:', error);
      const message = error instanceof Error ? error.message : String(error ?? 'Impossible de retirer ce membre');
      toast({
        title: 'Erreur',
        description: message,
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
    } catch (error: unknown) {
      console.error('Erreur suppression cabinet:', error);
      const message = error instanceof Error ? error.message : String(error ?? 'Impossible de supprimer ce cabinet');
      toast({
        title: 'Erreur',
        description: message,
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
          <p className="text-sm text-gray-600">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (!cabinet) {
    return null;
  }

  const allRoleOptions = role === 'notaire'
    ? ['Fondateur', 'Associé', 'Notaire', 'Clerc de Notaire', 'Formaliste', 'Juriste Notarial']
    : ['Fondateur', 'Associé', 'Avocat Associé', 'Avocat Collaborateur', 'Juriste', 'Responsable Administratif'];

  // Filtrer les options de rôles en fonction des permissions de l'utilisateur
  const getAvailableRoles = (userRole: string | null) => {
    if (!userRole) return [];
    return allRoleOptions.filter(opt => canAssignRole(userRole, opt));
  };

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
                  <Button 
                    size="sm" 
                    className={colorClass}
                    onClick={() => navigate(`/${role === 'notaire' ? 'notaires' : 'avocats'}/subscription`)}
                  >
                    Modifier l'offre
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
          {/* Code d'accès visible pour tous les membres */}
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
            </div>
          </div>

          {/* Upgrade alert if at limit */}
          {isOwner && cabinet.subscription_plan === 'essentiel' && (
            <Alert className="border-orange-500 bg-orange-50">
              <AlertDescription className="text-sm">
                <strong>Abonnement Essentiel :</strong> Vous ne pouvez pas ajouter de membres supplémentaires. 
                <Button 
                  size="sm" 
                  variant="link" 
                  className="text-orange-600 underline px-1 h-auto"
                  onClick={() => navigate(`/${role === 'notaire' ? 'notaires' : 'avocats'}/subscription`)}
                >
                  Passer à un abonnement supérieur
                </Button>
                pour inviter des collaborateurs.
              </AlertDescription>
            </Alert>
          )}

          {isOwner && cabinet.subscription_plan === 'professionnel' && members.length >= (cabinet.max_members || 10) && (
            <Alert className="border-orange-500 bg-orange-50">
              <AlertDescription className="text-sm">
                <strong>Limite atteinte :</strong> Votre abonnement Professionnel permet {cabinet.max_members} membres maximum. 
                <Button 
                  size="sm" 
                  variant="link" 
                  className="text-orange-600 underline px-1 h-auto"
                  onClick={() => navigate(`/${role === 'notaire' ? 'notaires' : 'avocats'}/subscription`)}
                >
                  Passer à l'offre Cabinet+
                </Button>
                pour inviter plus de collaborateurs.
              </AlertDescription>
            </Alert>
          )}

          {isOwner && cabinet.subscription_plan === 'cabinet-plus' && members.length >= 50 && (
            <Alert className="border-blue-500 bg-blue-50">
              <AlertDescription className="text-sm">
                <strong>Cabinet de grande taille :</strong> Vous avez {members.length} membres. Pour ajouter des membres supplémentaires à l'unité, 
                <Button 
                  size="sm" 
                  variant="link" 
                  className="text-blue-600 underline px-1 h-auto"
                  onClick={() => navigate(`/${role === 'notaire' ? 'notaires' : 'avocats'}/contact-support`)}
                >
                  contactez-nous
                </Button>
                pour une offre personnalisée.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Label>
                  <Users className="inline h-4 w-4 mr-1" />
                  Membres du cabinet
                </Label>
                <Badge
                  variant={members.filter(m => m.status === 'active').length >= (cabinet.max_members || 1) ? 'destructive' : 'default'}
                  className={members.filter(m => m.status === 'active').length >= (cabinet.max_members || 1) ? '' : (role === 'notaire' ? 'bg-orange-600' : 'bg-blue-600')}
                >
                  {members.filter(m => m.status === 'active').length} / {cabinet.max_members === 0 || cabinet.max_members === 999 ? '∞' : cabinet.max_members}
                </Badge>
                {cabinet.subscription_plan === 'essentiel' && (
                  <Badge variant="secondary" className="text-xs">
                    Plan Essentiel
                  </Badge>
                )}
              </div>
              {currentUserRole && canInviteMembers(currentUserRole) && (
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      className={colorClass}
                      disabled={
                        cabinet.subscription_plan === 'essentiel' || 
                        (cabinet.max_members && members.length >= cabinet.max_members)
                      }
                      title={
                        cabinet.subscription_plan === 'essentiel' 
                          ? "L'abonnement Essentiel ne permet qu'un seul membre"
                          : (cabinet.max_members && members.length >= cabinet.max_members)
                          ? `Limite de ${cabinet.max_members} membre${cabinet.max_members > 1 ? 's' : ''} atteinte - Augmentez votre abonnement`
                          : 'Inviter un membre'
                      }
                    >
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
                  <TableHead>Signatures</TableHead>
                  {currentUserRole && canRemoveMembers(currentUserRole) && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id} className={member.status === 'pending' ? 'opacity-60' : ''}>
                    <TableCell className="font-mono text-xs">
                      {member.email}
                      {member.status === 'pending' && (
                        <Badge variant="outline" className="ml-2 text-xs">En attente</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.nom || member.first_name || member.last_name 
                        ? `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.nom 
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {member.status === 'pending' ? (
                        <span className="text-muted-foreground text-sm">—</span>
                      ) : currentUserRole && canChangeRoles(currentUserRole) && canModifyMemberRole(currentUserRole, member.role_cabinet) ? (
                        (member.role_cabinet === 'Fondateur') ? (
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
                              {getAvailableRoles(currentUserRole).map((opt) => (
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
                              {getAvailableRoles(currentUserRole).map((opt) => (
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
                            variant={(member.role_cabinet === 'Fondateur' || member.role_cabinet === 'Associé') ? 'default' : 'secondary'}
                            className={`text-xs ${(member.role_cabinet === 'Fondateur' || member.role_cabinet === 'Associé') ? (role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white') : (['Notaire','Clerc de Notaire','Formaliste','Juriste Notarial'].includes(member.role_cabinet || '') ? 'bg-orange-600 hover:bg-orange-700 text-white' : '')}`}
                          >
                            {member.role_cabinet}
                          </Badge>
                        )}
                    </TableCell>
                    <TableCell>
                      {member.status === 'pending' ? (
                        <span className="text-muted-foreground text-sm">—</span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMemberId(member.user_id || null);
                            setSignatureDialogOpen(true);
                          }}
                          className={`${role === 'notaire' ? 'hover:bg-orange-600 hover:text-white' : 'hover:bg-blue-600 hover:text-white'}`}
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Acheter
                        </Button>
                      )}
                    </TableCell>
                    </TableCell>
                    {currentUserRole && canRemoveMembers(currentUserRole) && (
                      <TableCell className="text-right">
                        {member.status === 'pending' ? (
                          <span className="text-muted-foreground text-sm">—</span>
                        ) : member.role_cabinet !== 'owner' && member.role_cabinet !== 'Fondateur' && (
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
                    <TableCell colSpan={(currentUserRole && canRemoveMembers(currentUserRole)) ? 4 : 3} className="text-center text-gray-600">
                      Aucun membre pour le moment
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques globales du cabinet - visible pour tous les membres */}
      {cabinet && (
        <CabinetStats
          cabinetId={cabinet.id}
          subscriptionPlan={cabinet.subscription_plan || 'essentiel'}
          role={role}
          members={members}
        />
      )}

      <BuySignaturesDialog
        open={signatureDialogOpen}
        onOpenChange={setSignatureDialogOpen}
        subscriptionPlan={(cabinet?.subscription_plan || 'essentiel') as 'essentiel' | 'professionnel' | 'cabinet-plus'}
        currentMonthlyPrice={
          cabinet?.subscription_plan === 'essentiel' ? 39 :
          cabinet?.subscription_plan === 'professionnel' ? 59 : 89
        }
        role={role}
        targetUserId={selectedMemberId}
      />
      
    </div>
  );
}
