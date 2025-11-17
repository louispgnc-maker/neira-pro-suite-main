import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

interface CreateCabinetDialogProps {
  role: 'avocat' | 'notaire';
  onSuccess?: () => void;
}

export function CreateCabinetDialog({ role, onSuccess }: CreateCabinetDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nom: '',
    raison_sociale: '',
    siret: '',
    numero_tva: '',
    forme_juridique: '',
    capital_social: '',
    adresse: '',
    code_postal: '',
    ville: '',
    pays: 'France',
    telephone: '',
    email: '',
    site_web: '',
    ordre_inscription: '',
    numero_inscription: '',
  });

  const colorClass =
    role === 'notaire'
      ? 'bg-orange-600 hover:bg-orange-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white';

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Créer le cabinet via RPC (bypass RLS)
      const { data: cabinetId, error } = await supabase.rpc('create_cabinet', {
        nom_param: formData.nom,
        raison_sociale_param: formData.raison_sociale,
        siret_param: formData.siret,
        adresse_param: formData.adresse,
        code_postal_param: formData.code_postal,
        ville_param: formData.ville,
        telephone_param: formData.telephone,
        email_param: formData.email,
        role_param: role,
      });

      if (error) throw error;

      // TODO: Envoyer l'email de vérification via Edge Function
      // Pour l'instant, le cabinet est auto-vérifié

      toast({
        title: 'Cabinet créé !',
        description: 'Votre cabinet a été créé avec succès.',
      });

      setOpen(false);
      setFormData({
        nom: '',
        raison_sociale: '',
        siret: '',
        numero_tva: '',
        forme_juridique: '',
        capital_social: '',
        adresse: '',
        code_postal: '',
        ville: '',
        pays: 'France',
        telephone: '',
        email: '',
        site_web: '',
        ordre_inscription: '',
        numero_inscription: '',
      });

      if (onSuccess) onSuccess();
    } catch (error: unknown) {
      console.error('Erreur création cabinet:', error);
      // Show more detailed RPC error when available to help debugging (safe client-side)
      let desc = 'Impossible de créer le cabinet';
      let extra = '';
      if (typeof error === 'string') {
        desc = error;
      } else if (typeof error === 'object' && error !== null) {
        // try to read a message property if present (use unknown-safe handling)
        const maybe = error as Record<string, unknown>;
        if (maybe?.message && typeof maybe.message === 'string') desc = maybe.message as string;
        try { extra = ` (${JSON.stringify(maybe)})`; } catch (e) { /* ignore */ }
      }
      toast({
        title: 'Erreur',
        description: desc + extra,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={colorClass}>Créer un cabinet</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un cabinet {role === 'notaire' ? 'de notaire' : 'd\'avocat'}</DialogTitle>
          <DialogDescription>
            Renseignez les informations légales de votre cabinet. Un email de vérification sera
            envoyé pour valider la création.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informations générales */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Informations générales</h3>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom du cabinet *</Label>
              <Input
                id="nom"
                required
                value={formData.nom}
                onChange={(e) => handleChange('nom', e.target.value)}
                placeholder="Cabinet Dupont & Associés"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="raison_sociale">Raison sociale</Label>
              <Input
                id="raison_sociale"
                value={formData.raison_sociale}
                onChange={(e) => handleChange('raison_sociale', e.target.value)}
                placeholder="SELARL Dupont & Associés"
              />
            </div>
          </div>

          {/* Informations légales */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Informations légales</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="siret">SIRET</Label>
                <Input
                  id="siret"
                  value={formData.siret}
                  onChange={(e) => handleChange('siret', e.target.value)}
                  placeholder="123 456 789 00012"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero_tva">Numéro TVA</Label>
                <Input
                  id="numero_tva"
                  value={formData.numero_tva}
                  onChange={(e) => handleChange('numero_tva', e.target.value)}
                  placeholder="FR12345678901"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="forme_juridique">Forme juridique</Label>
                <Select
                  value={formData.forme_juridique}
                  onValueChange={(v) => handleChange('forme_juridique', v)}
                >
                  <SelectTrigger id="forme_juridique">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SELARL">SELARL</SelectItem>
                    <SelectItem value="SCP">SCP</SelectItem>
                    <SelectItem value="SARL">SARL</SelectItem>
                    <SelectItem value="SAS">SAS</SelectItem>
                    <SelectItem value="Entreprise individuelle">Entreprise individuelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capital_social">Capital social</Label>
                <Input
                  id="capital_social"
                  value={formData.capital_social}
                  onChange={(e) => handleChange('capital_social', e.target.value)}
                  placeholder="10 000 €"
                />
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Adresse</h3>
            <div className="space-y-2">
              <Label htmlFor="adresse">Adresse *</Label>
              <Textarea
                id="adresse"
                required
                value={formData.adresse}
                onChange={(e) => handleChange('adresse', e.target.value)}
                placeholder="12 rue de la République"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="code_postal">Code postal</Label>
                <Input
                  id="code_postal"
                  value={formData.code_postal}
                  onChange={(e) => handleChange('code_postal', e.target.value)}
                  placeholder="75001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ville">Ville</Label>
                <Input
                  id="ville"
                  value={formData.ville}
                  onChange={(e) => handleChange('ville', e.target.value)}
                  placeholder="Paris"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pays">Pays</Label>
                <Input
                  id="pays"
                  value={formData.pays}
                  onChange={(e) => handleChange('pays', e.target.value)}
                  placeholder="France"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Contact</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => handleChange('telephone', e.target.value)}
                  placeholder="01 23 45 67 89"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contact@cabinet.fr"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="site_web">Site web</Label>
              <Input
                id="site_web"
                type="url"
                value={formData.site_web}
                onChange={(e) => handleChange('site_web', e.target.value)}
                placeholder="https://www.cabinet.fr"
              />
            </div>
          </div>

          {/* Informations métier */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Informations métier</h3>
            <div className="space-y-2">
              <Label htmlFor="ordre_inscription">
                {role === 'notaire' ? 'Chambre des Notaires' : 'Barreau'}
              </Label>
              <Input
                id="ordre_inscription"
                value={formData.ordre_inscription}
                onChange={(e) => handleChange('ordre_inscription', e.target.value)}
                placeholder={role === 'notaire' ? 'Chambre de Paris' : 'Barreau de Paris'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero_inscription">Numéro d'inscription</Label>
              <Input
                id="numero_inscription"
                value={formData.numero_inscription}
                onChange={(e) => handleChange('numero_inscription', e.target.value)}
                placeholder="N° 12345"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" className={colorClass} disabled={loading}>
              {loading ? 'Création...' : 'Créer le cabinet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
