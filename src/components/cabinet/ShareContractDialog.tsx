import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, User } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Client {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
}

interface ShareContractDialogProps {
  open: boolean;
  onClose: () => void;
  contractId: string;
  contractName: string;
  role: 'avocat' | 'notaire';
  onSuccess?: () => void;
}

export function ShareContractDialog({
  open,
  onClose,
  contractId,
  contractName,
  role,
  onSuccess
}: ShareContractDialogProps) {
  const { user } = useAuth();
  const [shareStep, setShareStep] = useState<'choice' | 'select-client'>('choice');
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [sharingToClient, setSharingToClient] = useState(false);
  const [sharingToCabinet, setSharingToCabinet] = useState(false);

  useEffect(() => {
    if (open) {
      // Réinitialiser à l'étape de choix quand le dialogue s'ouvre
      setShareStep('choice');
      setClientSearch('');
    }
  }, [open]);

  useEffect(() => {
    if (open && shareStep === 'select-client') {
      loadClients();
    }
  }, [open, shareStep]);

  const loadClients = async () => {
    if (!user) return;

    try {
      // Get user's cabinet
      const { data: cabinetsData, error: cabinetsErr } = await supabase.rpc('get_user_cabinets');
      if (cabinetsErr || !Array.isArray(cabinetsData)) {
        console.error('Error loading cabinets:', cabinetsErr);
        toast.error('Impossible de récupérer votre cabinet');
        return;
      }

      type MaybeCab = { role?: string; role_cabinet?: string; id?: string };
      const found = cabinetsData.find((c) => ((c as MaybeCab).role || (c as MaybeCab).role_cabinet) === role) as MaybeCab | undefined;
      const cabinetId = found?.id || (cabinetsData[0] && (cabinetsData[0] as MaybeCab).id);

      if (!cabinetId) {
        toast.error('Aucun cabinet trouvé');
        return;
      }

      // Load all clients from cabinet using the same RPC as EspaceCollaboratif
      const { data: allClientsData, error: allClientsError } = await supabase.rpc('get_all_cabinet_clients', { p_cabinet_id: cabinetId });
      
      if (allClientsError) {
        console.error('Error loading clients:', allClientsError);
        toast.error('Erreur lors du chargement des clients');
        return;
      }

      setClients(allClientsData || []);
    } catch (error) {
      console.error('Erreur chargement clients:', error);
      toast.error('Erreur lors du chargement des clients');
    }
  };

  const shareToCabinet = async () => {
    if (!user) {
      toast.error('Connexion requise');
      return;
    }

    setSharingToCabinet(true);
    try {
      // Get user's cabinet
      const { data: cabinetsData, error: cabinetsErr } = await supabase.rpc('get_user_cabinets');
      if (cabinetsErr || !Array.isArray(cabinetsData)) {
        toast.error('Impossible de récupérer votre cabinet');
        setSharingToCabinet(false);
        return;
      }

      type MaybeCab = { role?: string; role_cabinet?: string; id?: string };
      const found = cabinetsData.find((c) => ((c as MaybeCab).role || (c as MaybeCab).role_cabinet) === role) as MaybeCab | undefined;
      const cabinetId = found?.id || (cabinetsData[0] && (cabinetsData[0] as MaybeCab).id);

      if (!cabinetId) {
        toast.error('Aucun cabinet trouvé');
        setSharingToCabinet(false);
        return;
      }

      // Get contract details
      const { data: contrat, error: contratError } = await supabase
        .from('contrats')
        .select('name, type, category')
        .eq('id', contractId)
        .single();

      if (contratError || !contrat) {
        toast.error('Contrat introuvable');
        setSharingToCabinet(false);
        return;
      }

      // Share to cabinet
      const { error: insertError } = await supabase
        .from('cabinet_contrats')
        .insert({
          cabinet_id: cabinetId,
          contrat_id: contractId,
          title: contrat.name,
          contrat_type: contrat.type,
          category: contrat.category,
          shared_by: user.id,
          shared_at: new Date().toISOString()
        });

      if (insertError && insertError.code !== '23505') {
        console.error('Insert failed', insertError);
        toast.error('Partage impossible');
        setSharingToCabinet(false);
        return;
      }

      toast.success('Contrat partagé sur l\'espace de votre cabinet');
      handleClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erreur partage cabinet:', error);
      toast.error('Erreur lors du partage');
    } finally {
      setSharingToCabinet(false);
    }
  };

  const shareToClient = async (clientId: string) => {
    if (!user) {
      toast.error('Connexion requise');
      return;
    }

    setSharingToClient(true);
    try {
      // Get contract details to verify it exists
      const { data: contrat, error: contratError } = await supabase
        .from('contrats')
        .select('client_id')
        .eq('id', contractId)
        .single();

      if (contratError || !contrat) {
        toast.error('Contrat introuvable');
        setSharingToClient(false);
        return;
      }

      // Check if already shared with a client
      if (contrat.client_id) {
        toast.info('Ce contrat est déjà partagé avec un client');
        handleClose();
        return;
      }

      // Share contract with client by updating client_id
      const { error: updateError } = await supabase
        .from('contrats')
        .update({ client_id: clientId })
        .eq('id', contractId);

      if (updateError) {
        console.error('Update failed', updateError);
        toast.error('Partage impossible');
        setSharingToClient(false);
        return;
      }

      const client = clients.find(c => c.id === clientId);
      toast.success(`Contrat partagé avec ${client?.prenom} ${client?.nom}`);
      handleClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erreur partage client:', error);
      toast.error('Erreur lors du partage');
    } finally {
      setSharingToClient(false);
    }
  };

  const handleClose = () => {
    setShareStep('choice');
    setClientSearch('');
    onClose();
  };

  const colorClass = role === 'notaire'
    ? 'hover:bg-orange-50 border-orange-200'
    : 'hover:bg-blue-50 border-blue-200';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Partager "{contractName}"</DialogTitle>
        </DialogHeader>

        {shareStep === 'choice' ? (
          <div className="space-y-3 py-4">
            <button
              onClick={shareToCabinet}
              disabled={sharingToCabinet}
              className={`w-full p-4 text-left rounded-md border transition-colors ${colorClass} ${
                sharingToCabinet ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5" />
                <div>
                  <div className="font-medium">Espace personnel du cabinet</div>
                  <div className="text-sm text-gray-600">
                    {sharingToCabinet ? 'Partage en cours...' : 'Accessible par tous les membres du cabinet'}
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setShareStep('select-client')}
              className={`w-full p-4 text-left rounded-md border transition-colors ${colorClass}`}
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
          <div className="space-y-4 py-4">
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
                    onClick={() => shareToClient(client.id)}
                    disabled={sharingToClient}
                    className={`w-full p-3 text-left rounded-md border transition-colors ${colorClass} ${
                      sharingToClient ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
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
  );
}
