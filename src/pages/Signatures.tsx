import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, XCircle, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { ResourceCounter } from "@/components/subscription/ResourceCounter";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { getCurrentBillingCycleStart } from "@/lib/billingCycle";
import { SignatureDialog } from "@/components/dashboard/SignatureDialog";
import { toast } from "sonner";

type SignatureRow = {
  id: string;
  signer_name: string;
  document_name: string;
  status: string;
  last_reminder_at?: string | null;
  created_at?: string;
  transaction_id?: string | null;
};

export default function Signatures() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [signatures, setSignatures] = useState<SignatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [closingTransactionId, setClosingTransactionId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const limits = useSubscriptionLimits(role);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Vérifier si limite de signatures atteinte
  const isSignatureLimitReached = limits.max_signatures_per_month !== null && signatures.length >= limits.max_signatures_per_month;

  // Listen for subscription changes
  useEffect(() => {
    const handleRefresh = () => setRefreshTrigger(prev => prev + 1);
    window.addEventListener('subscription-updated', handleRefresh);
    return () => window.removeEventListener('subscription-updated', handleRefresh);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!user) {
        setSignatures([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      
      // Calculer le début du cycle de facturation actuel
      const { data: cabinetData } = await supabase.rpc('get_user_cabinets');
      const cabinet = cabinetData?.find((c: any) => String(c.role) === role);
      const cycleStartDate = getCurrentBillingCycleStart(cabinet?.subscription_started_at || null);

      let query = supabase
        .from("signatures")
        .select("id,signer_name,document_name,status,last_reminder_at,created_at,transaction_id")
        .eq("owner_id", user.id)
        .eq("role", role)
        .gte("created_at", cycleStartDate.toISOString()) // Filtrer par cycle actuel
        .order("created_at", { ascending: false }); // Plus récent en haut
        
      if (debounced) {
        query = query.or(`signer_name.ilike.%${debounced}%,document_name.ilike.%${debounced}%`);
      }
      const { data, error } = await query;
      if (error) {
        console.error("Erreur chargement signatures:", error);
        if (isMounted) setSignatures([]);
      } else if (isMounted) {
        setSignatures(data as SignatureRow[]);
      }
      if (isMounted) setLoading(false);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [user, role, debounced, refreshTrigger]);

  async function handleCloseTransaction(e: React.MouseEvent, transactionId: string, signatureId: string) {
    e.stopPropagation(); // Empêcher la navigation

    const confirmClose = window.confirm(
      'Êtes-vous sûr de vouloir clore cette transaction ?\n\n' +
      'Seuls les signataires ayant déjà signé seront comptabilisés.\n' +
      'Cette action est irréversible.'
    );

    if (!confirmClose) return;

    setClosingTransactionId(signatureId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expirée');
        return;
      }

      const response = await fetch(
        'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/universign-cancel-transaction',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ transactionId })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Erreur lors de la clôture');
        return;
      }

      toast.success(`Transaction clôturée - ${result.signedCount || 0} signataire(s) comptabilisé(s)`);
      setRefreshTrigger(prev => prev + 1); // Recharger la liste
    } catch (error) {
      console.error('Erreur clôture:', error);
      toast.error('Erreur lors de la clôture');
    } finally {
      setClosingTransactionId(null);
    }
  }

  // Couleur du bouton principal
  const mainButtonColor = role === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  // Couleur badge statut
  function getStatusClass(status: string) {
    if (status.toLowerCase() === 'en cours') {
      return role === 'notaire'
        ? 'bg-orange-100 text-orange-600 border-orange-200'
        : 'bg-blue-100 text-blue-600 border-blue-200';
    }
    if (status.toLowerCase() === 'signé' || status.toLowerCase() === 'signed' || status.toLowerCase() === 'signee' || status.toLowerCase() === 'signe' || status.toLowerCase() === 'completed') {
      return 'bg-success/10 text-success border-success/20';
    }
    if (status.toLowerCase() === 'en attente' || status.toLowerCase() === 'en_attente' || status.toLowerCase() === 'pending' || status.toLowerCase() === 'awaiting') {
      return 'bg-warning/10 text-warning border-warning/20';
    }
    if (status.toLowerCase() === 'fermee' || status.toLowerCase() === 'fermée' || status.toLowerCase() === 'closed' || status.toLowerCase() === 'annulee' || status.toLowerCase() === 'annulée' || status.toLowerCase() === 'cancelled') {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    if (status.toLowerCase() === 'brouillon') {
      return 'bg-muted text-gray-900 border-border';
    }
    return 'bg-muted text-gray-900 border-border';
  }

  // Normaliser l'affichage du statut
  function getStatusLabel(status: string) {
    const statusLower = status.toLowerCase();
    if (statusLower === 'signed' || statusLower === 'completed' || statusLower === 'signé' || statusLower === 'signee' || statusLower === 'signe') {
      return 'Signé';
    }
    if (statusLower === 'pending' || statusLower === 'en attente' || statusLower === 'en_attente' || statusLower === 'awaiting') {
      return 'En attente';
    }
    if (statusLower === 'fermee' || statusLower === 'fermée' || statusLower === 'closed') {
      return 'Fermée';
    }
    if (statusLower === 'cancelled' || statusLower === 'annulee' || statusLower === 'annulée') {
      return 'Annulée';
    }
    if (statusLower === 'en cours') {
      return 'En cours';
    }
    if (statusLower === 'brouillon') {
      return 'Brouillon';
    }
    return status;
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900">Signatures</h1>
            <p className="text-lg text-gray-600 mt-1">Suivez vos demandes de signatures électroniques</p>
          </div>
          {isSignatureLimitReached ? (
            <div className="text-right">
              <Button disabled className="mb-2">
                <Plus className="mr-2 h-4 w-4" />
                Limite atteinte
              </Button>
              <p className="text-xs text-destructive">
                Passez à un abonnement supérieur pour plus de signatures
              </p>
            </div>
          ) : (
            <Button className={mainButtonColor} onClick={() => setSignatureDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle signature
            </Button>
          )}
        </div>

        {/* Signatures Counter */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <ResourceCounter
              current={signatures.length}
              max={limits.max_signatures_per_month}
              label="Signatures ce mois-ci"
              type="count"
              subscriptionPlan={limits.subscription_plan}
              role={role}
            />
          </CardContent>
        </Card>

        <div className="mb-4 bg-white p-4 rounded-lg border">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (signataire ou document)…"
            className="w-full md:max-w-sm rounded-md border border-input bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-900/50"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Liste des signatures</CardTitle>
          </CardHeader>
          <CardContent>
            {/* search moved above the title */}
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <p className="text-gray-900">Chargement…</p>
          </div>
        ) : signatures.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <div className="text-center">
              <p className="text-gray-900">Aucunes signatures</p>
              <Button className={mainButtonColor + " mt-4"} onClick={() => setSignatureDialogOpen(true)}>
                Ajoutez ici vos documents signés
              </Button>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg bg-white p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Signataire</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date de création</TableHead>
                  <TableHead>Dernier rappel</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signatures.map((sig) => (
                  <TableRow 
                    key={sig.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => window.location.href = `/${role}s/signatures/${sig.id}`}
                  >
                    <TableCell className="font-medium">{sig.signer_name}</TableCell>
                    <TableCell>{sig.document_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusClass(sig.status)}>
                        {getStatusLabel(sig.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-900 text-sm">
                      {sig.created_at
                        ? new Date(sig.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-gray-900 text-sm">
                      {sig.last_reminder_at
                        ? new Date(sig.last_reminder_at).toLocaleDateString('fr-FR')
                        : "Jamais"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/${role}s/signatures/${sig.id}`)}
                          className="text-primary hover:text-primary/80 hover:bg-primary/10"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                        {sig.transaction_id && sig.status !== 'cancelled' && sig.status !== 'closed' && sig.status !== 'completed' && sig.status !== 'signed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleCloseTransaction(e, sig.transaction_id!, sig.id)}
                            disabled={closingTransactionId === sig.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            {closingTransactionId === sig.id ? 'Clôture...' : 'Clore'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Signature Dialog */}
      <SignatureDialog 
        open={signatureDialogOpen} 
        onOpenChange={setSignatureDialogOpen}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />
    </AppLayout>
  );
}
