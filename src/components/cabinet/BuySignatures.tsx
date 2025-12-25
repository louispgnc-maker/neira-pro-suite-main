import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { FileSignature, ShoppingCart, User } from 'lucide-react';

interface CabinetMember {
  id: string;
  user_id?: string;
  email: string;
  nom?: string;
  role_cabinet: string;
  signatures_used?: number;
  signatures_limit?: number;
  extra_signatures?: number;
}

interface BuySignaturesProps {
  cabinetId: string;
  subscriptionPlan: string;
  role: 'avocat' | 'notaire';
}

export function BuySignatures({ cabinetId, subscriptionPlan, role }: BuySignaturesProps) {
  const [members, setMembers] = useState<CabinetMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [packSize, setPackSize] = useState<number>(10);
  const [loading, setLoading] = useState(true);

  const colorClass = role === 'notaire' 
    ? 'bg-orange-600 hover:bg-orange-700' 
    : 'bg-blue-600 hover:bg-blue-700';

  // Prix des packs selon le plan
  const getPackPrice = (plan: string, pack: number): number => {
    if (plan === 'essentiel') {
      if (pack === 10) return 7;
      if (pack === 30) return 18;
      if (pack === 50) return 25;
    } else if (plan === 'professionnel') {
      if (pack === 20) return 12;
      if (pack === 50) return 25;
      if (pack === 100) return 45;
    }
    return 0;
  };

  // Packs disponibles selon le plan
  const getAvailablePacks = (plan: string): number[] => {
    if (plan === 'essentiel') return [10, 30, 50];
    if (plan === 'professionnel') return [20, 50, 100];
    return []; // Cabinet+ a tout illimité
  };

  const availablePacks = getAvailablePacks(subscriptionPlan);
  const price = getPackPrice(subscriptionPlan, packSize);
  const tva = Math.round(price * 0.2 * 100) / 100;
  const total = Math.round((price + tva) * 100) / 100;

  useEffect(() => {
    loadMembers();
  }, [cabinetId]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cabinet_members')
        .select('id, user_id, email, nom, role_cabinet, signatures_used, signatures_limit, extra_signatures')
        .eq('cabinet_id', cabinetId)
        .order('role_cabinet', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Erreur lors du chargement des membres');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultSignatureLimit = (plan: string): number => {
    if (plan === 'essentiel') return 15;
    if (plan === 'professionnel') return 80;
    return 999999; // Cabinet+ illimité
  };

  const handlePurchase = async () => {
    if (!selectedMember) {
      toast.error('Veuillez sélectionner un membre');
      return;
    }

    // TODO: Intégrer paiement Stripe
    toast.info('Redirection vers le paiement...');
    
    // Pour l'instant, simulation de l'ajout
    try {
      const member = members.find(m => m.id === selectedMember);
      if (!member) return;

      const currentExtra = member.extra_signatures || 0;
      const newExtra = currentExtra + packSize;

      const { error } = await supabase
        .from('cabinet_members')
        .update({ extra_signatures: newExtra })
        .eq('id', selectedMember);

      if (error) throw error;

      toast.success(`${packSize} signatures ajoutées avec succès !`);
      loadMembers();
      setSelectedMember('');
    } catch (error) {
      console.error('Error adding signatures:', error);
      toast.error('Erreur lors de l\'ajout des signatures');
    }
  };

  if (loading) {
    return <div className="text-center py-4">Chargement...</div>;
  }

  if (subscriptionPlan === 'cabinet-plus') {
    return null; // Pas besoin d'acheter des signatures avec Cabinet+ (illimité)
  }

  const selectedMemberData = members.find(m => m.id === selectedMember);
  const defaultLimit = getDefaultSignatureLimit(subscriptionPlan);
  const currentLimit = selectedMemberData?.signatures_limit || defaultLimit;
  const currentExtra = selectedMemberData?.extra_signatures || 0;
  const currentUsed = selectedMemberData?.signatures_used || 0;
  const totalLimit = currentLimit + currentExtra;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5" />
          Acheter des signatures supplémentaires
        </CardTitle>
        <CardDescription>
          Ajoutez des signatures pour un membre spécifique de votre cabinet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sélection du membre */}
        <div className="space-y-2">
          <Label>Sélectionner un membre</Label>
          <Select value={selectedMember} onValueChange={setSelectedMember}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un membre..." />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => {
                const limit = member.signatures_limit || defaultLimit;
                const extra = member.extra_signatures || 0;
                const used = member.signatures_used || 0;
                const total = limit + extra;
                
                return (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{member.email}</span>
                      <span className="text-xs text-muted-foreground">
                        ({used} / {total} signatures)
                      </span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Informations du membre sélectionné */}
        {selectedMemberData && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Quota de base :</span>
              <Badge variant="outline">{defaultLimit} signatures/mois</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Signatures supplémentaires :</span>
              <Badge variant="secondary">+{currentExtra} signatures</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total actuel :</span>
              <Badge className={colorClass}>{totalLimit} signatures/mois</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Utilisées ce mois :</span>
              <Badge variant={currentUsed >= totalLimit ? 'destructive' : 'default'}>
                {currentUsed} / {totalLimit}
              </Badge>
            </div>
          </div>
        )}

        {/* Sélection du pack */}
        <div className="space-y-2">
          <Label>Choisir un pack de signatures</Label>
          <div className="grid grid-cols-3 gap-3">
            {availablePacks.map((pack) => {
              const packPrice = getPackPrice(subscriptionPlan, pack);
              return (
                <button
                  key={pack}
                  onClick={() => setPackSize(pack)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    packSize === pack
                      ? role === 'notaire'
                        ? 'border-orange-600 bg-orange-50'
                        : 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">+{pack}</div>
                    <div className="text-xs text-gray-600">signatures</div>
                    <div className={`text-sm font-semibold mt-2 ${
                      role === 'notaire' ? 'text-orange-600' : 'text-blue-600'
                    }`}>
                      {packPrice}€/mois
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Récapitulatif du prix */}
        {selectedMember && (
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Pack de {packSize} signatures</span>
              <span>{price}€</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>TVA (20%)</span>
              <span>{tva}€</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span>
              <span>{total}€/mois</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Le pack sera ajouté au quota mensuel de {selectedMemberData?.email}
            </p>
          </div>
        )}

        {/* Bouton d'achat */}
        <Button
          onClick={handlePurchase}
          disabled={!selectedMember}
          className={`w-full ${colorClass} text-white`}
          size="lg"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Acheter pour {total}€/mois
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Paiement sécurisé • Résiliation possible à tout moment
        </p>
      </CardContent>
    </Card>
  );
}
