import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

interface Client {
  id: string;
  nom?: string;
  prenom?: string;
  name?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
}

interface ClientAssignmentProps {
  parties: string[]; // ["Le vendeur", "L'acquéreur"]
  role: 'avocat' | 'notaire';
  onComplete: (assignments: Record<string, string>) => void;
  onCancel: () => void;
}

export function ClientAssignment({ parties, role, onComplete, onCancel }: ClientAssignmentProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    loadClients();
  }, [user, role]);

  const loadClients = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Récupérer les cabinets
      const { data: cabinetsData } = await supabase.rpc('get_user_cabinets');
      const cabinets = Array.isArray(cabinetsData) ? cabinetsData : [];

      if (cabinets.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }

      const matchingCabinet = cabinets.find((c: any) => c.role === role) || cabinets[0];
      const cabinetId = matchingCabinet.id;

      // Clients directs
      const { data: directClients } = await supabase
        .from('clients')
        .select('id, nom, prenom, name, email, telephone, adresse')
        .eq('owner_id', cabinetId)
        .eq('role', role)
        .order('nom', { ascending: true });

      // Clients partagés
      const { data: sharedClients } = await supabase
        .from('cabinet_clients')
        .select(`
          client_id,
          clients (id, nom, prenom, name, email, telephone, adresse, role)
        `)
        .eq('cabinet_id', cabinetId);

      // Fusion
      const allClients = [...(directClients || [])];
      if (sharedClients) {
        for (const shared of sharedClients) {
          const client = (shared as any).clients;
          if (client && client.role === role && !allClients.some(c => c.id === client.id)) {
            allClients.push(client);
          }
        }
      }

      setClients(allClients);
    } catch (error) {
      console.error('❌ Erreur chargement clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignment = (party: string, clientId: string) => {
    setAssignments(prev => ({
      ...prev,
      [party]: clientId
    }));
  };

  const handleComplete = () => {
    // Vérifier que toutes les parties ont un client assigné
    const allAssigned = parties.every(party => assignments[party]);
    if (!allAssigned) {
      alert('Veuillez assigner un client à chaque partie');
      return;
    }
    onComplete(assignments);
  };

  const getClientDisplay = (client: Client) => {
    if (client.nom && client.prenom) {
      return `${client.prenom} ${client.nom}`;
    }
    return client.name || client.email || 'Client sans nom';
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Chargement des clients...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold mb-2">Attribution des clients</h3>
        <p className="text-sm text-gray-600">
          Sélectionnez un client pour chaque partie du contrat
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            ⚠️ Aucun client disponible. Créez des fiches clients dans "Mes Clients" avant d'attribuer.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {parties.map((party, index) => (
            <div key={index} className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
              <Label className="text-base font-semibold mb-2 block">
                👤 {party}
              </Label>
              <Select
                value={assignments[party] || ''}
                onValueChange={(value) => handleAssignment(party, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {getClientDisplay(client)}
                      {client.email && <span className="text-xs text-gray-500 ml-2">({client.email})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Retour
        </Button>
        <Button
          onClick={handleComplete}
          disabled={!parties.every(party => assignments[party])}
          className="flex-1"
        >
          Finaliser le contrat
        </Button>
      </div>
    </div>
  );
}
