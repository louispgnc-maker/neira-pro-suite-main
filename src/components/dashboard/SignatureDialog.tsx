import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, X, Loader2, FileText, Search } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Document = {
  id: string;
  name: string;
  storage_path: string | null;
  updated_at: string;
};

type Dossier = {
  id: string;
  title: string;
  updated_at: string;
};

type Contrat = {
  id: string;
  name: string;
  updated_at: string;
};

type Signatory = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
};

type SignatureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function SignatureDialog({ open, onOpenChange, onSuccess }: SignatureDialogProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [itemType, setItemType] = useState<'document' | 'dossier' | 'contrat'>('document');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [contrats, setContrats] = useState<Contrat[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [itemSearchOpen, setItemSearchOpen] = useState(false);
  const [signatureLevel, setSignatureLevel] = useState<'simple' | 'advanced' | 'qualified'>('simple');
  const [signatories, setSignatories] = useState<Signatory[]>([
    { firstName: '', lastName: '', email: '', phone: '' }
  ]);

  // Determine role from URL path first (most reliable), then profile
  const role = window.location.pathname.includes('/notaires') || window.location.pathname.includes('/notaire') ? 'notaire' : 
               window.location.pathname.includes('/avocats') || window.location.pathname.includes('/avocat') ? 'avocat' :
               (profile?.role || 'avocat');

  useEffect(() => {
    console.log('SignatureDialog - URL:', window.location.pathname, 'Detected role:', role, 'Profile role:', profile?.role);
  }, [role, profile]);

  useEffect(() => {
    if (open && user) {
      loadItems();
    }
  }, [open, user, itemType]);

  const loadItems = async () => {
    if (!user) return;

    if (itemType === 'document') {
      const { data, error } = await supabase
        .from('documents')
        .select('id, name, storage_path, updated_at')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) {
        console.error('Error loading documents:', error);
        toast.error('Erreur lors du chargement des documents');
      } else {
        setDocuments(data || []);
      }
    } else if (itemType === 'dossier') {
      const { data, error } = await supabase
        .from('dossiers')
        .select('id, title, updated_at')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) {
        console.error('Error loading dossiers:', error);
        toast.error('Erreur lors du chargement des dossiers');
      } else {
        setDossiers(data || []);
      }
    } else if (itemType === 'contrat') {
      const { data, error } = await supabase
        .from('contrats')
        .select('id, name, updated_at')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) {
        console.error('Error loading contrats:', error);
        toast.error('Erreur lors du chargement des contrats');
      } else {
        setContrats(data || []);
      }
    }
  };

  const addSignatory = () => {
    // Limité à 1 signataire pour signature simple
    if (signatories.length >= 1) {
      toast.error('Signature simple limitée à 1 signataire');
      return;
    }
    setSignatories([...signatories, { firstName: '', lastName: '', email: '', phone: '' }]);
  };

  const removeSignatory = (index: number) => {
    if (signatories.length > 1) {
      setSignatories(signatories.filter((_, i) => i !== index));
    }
  };

  const updateSignatory = (index: number, field: keyof Signatory, value: string) => {
    const updated = [...signatories];
    updated[index][field] = value;
    setSignatories(updated);
  };

  const handleSubmit = async () => {
    if (!selectedItemId) {
      toast.error('Veuillez sélectionner un élément à faire signer');
      return;
    }

    const invalidSignatory = signatories.find(s => !s.firstName || !s.lastName || !s.email);
    if (invalidSignatory) {
      toast.error('Veuillez remplir tous les champs obligatoires du signataire');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/universign-create-signature',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: selectedItemId,
            itemType: itemType,
            signatories: signatories,
            signatureLevel: signatureLevel
          })
        }
      );

      if (!response.ok) {
        throw new Error('Échec de la création de la demande de signature');
      }

      const data = await response.json();

      toast.success('Demande de signature créée avec succès!', {
        description: 'Le signataire a reçu un email avec le lien de signature'
      });

      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setSelectedItemId('');
      setSignatories([{ firstName: '', lastName: '', email: '', phone: '' }]);
      setItemType('document');

    } catch (error: any) {
      console.error('Error creating signature:', error);
      toast.error('Erreur lors de la création de la signature', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lancer une signature électronique
          </DialogTitle>
          <DialogDescription>
            Signature simple • 1 signataire • 1 signature
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Type selection */}
          <div className="space-y-2">
            <Label htmlFor="item-type">Type d'élément à faire signer *</Label>
            <Select value={itemType} onValueChange={(value: any) => {
              setItemType(value);
              setSelectedItemId('');
            }}>
              <SelectTrigger 
                id="item-type" 
                className={role === 'notaire' 
                  ? 'border-orange-300 hover:bg-orange-100 hover:text-black hover:border-orange-300' 
                  : 'border-blue-300 hover:bg-blue-100 hover:text-black hover:border-blue-300'}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem 
                  value="document"
                  className={role === 'notaire'
                    ? 'hover:bg-orange-100 hover:text-black focus:bg-orange-100 focus:text-black data-[state=checked]:bg-orange-100 data-[state=checked]:text-black'
                    : 'hover:bg-blue-100 hover:text-black focus:bg-blue-100 focus:text-black data-[state=checked]:bg-blue-100 data-[state=checked]:text-black'}
                >
                  Document
                </SelectItem>
                <SelectItem 
                  value="dossier"
                  className={role === 'notaire'
                    ? 'hover:bg-orange-100 hover:text-black focus:bg-orange-100 focus:text-black data-[state=checked]:bg-orange-100 data-[state=checked]:text-black'
                    : 'hover:bg-blue-100 hover:text-black focus:bg-blue-100 focus:text-black data-[state=checked]:bg-blue-100 data-[state=checked]:text-black'}
                >
                  Dossier
                </SelectItem>
                <SelectItem 
                  value="contrat"
                  className={role === 'notaire'
                    ? 'hover:bg-orange-100 hover:text-black focus:bg-orange-100 focus:text-black data-[state=checked]:bg-orange-100 data-[state=checked]:text-black'
                    : 'hover:bg-blue-100 hover:text-black focus:bg-blue-100 focus:text-black data-[state=checked]:bg-blue-100 data-[state=checked]:text-black'}
                >
                  Contrat
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Document/Dossier/Contrat selection with search */}
          <div className="space-y-2">
            <Label htmlFor="item">
              {itemType === 'document' && 'Document à signer *'}
              {itemType === 'dossier' && 'Dossier à faire signer *'}
              {itemType === 'contrat' && 'Contrat à faire signer *'}
            </Label>
            <Popover open={itemSearchOpen} onOpenChange={setItemSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={itemSearchOpen}
                  className={`w-full justify-between ${role === 'notaire' 
                    ? 'border-orange-300 hover:bg-orange-100 hover:text-black hover:border-orange-300' 
                    : 'border-blue-300 hover:bg-blue-100 hover:text-black hover:border-blue-300'}`}
                >
                  {selectedItemId
                    ? (itemType === 'document' 
                        ? documents.find((doc) => doc.id === selectedItemId)?.name
                        : itemType === 'dossier'
                        ? dossiers.find((d) => d.id === selectedItemId)?.title
                        : contrats.find((c) => c.id === selectedItemId)?.name)
                    : `Sélectionnez un ${itemType === 'document' ? 'document' : itemType === 'dossier' ? 'dossier' : 'contrat'}`}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder={`Rechercher un ${itemType === 'document' ? 'document' : itemType === 'dossier' ? 'dossier' : 'contrat'}...`} />
                  <CommandList>
                    <CommandEmpty>Aucun élément trouvé</CommandEmpty>
                    <CommandGroup>
                      {itemType === 'document' && documents.map((doc) => (
                        <CommandItem
                          key={doc.id}
                          value={`${doc.id}-${doc.name}`}
                          keywords={[doc.name]}
                          onSelect={() => {
                            setSelectedItemId(doc.id);
                            setItemSearchOpen(false);
                          }}
                          className={role === 'notaire'
                            ? 'hover:bg-orange-100 hover:text-black data-[selected=true]:bg-orange-100 data-[selected=true]:text-black aria-selected:bg-orange-100 aria-selected:text-black cursor-pointer'
                            : 'hover:bg-blue-100 hover:text-black data-[selected=true]:bg-blue-100 data-[selected=true]:text-black aria-selected:bg-blue-100 aria-selected:text-black cursor-pointer'}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {doc.name}
                        </CommandItem>
                      ))}
                      {itemType === 'dossier' && dossiers.map((dossier) => (
                        <CommandItem
                          key={dossier.id}
                          value={`${dossier.id}-${dossier.title}`}
                          keywords={[dossier.title]}
                          onSelect={() => {
                            setSelectedItemId(dossier.id);
                            setItemSearchOpen(false);
                          }}
                          className={role === 'notaire'
                            ? 'hover:bg-orange-100 hover:text-black data-[selected=true]:bg-orange-100 data-[selected=true]:text-black aria-selected:bg-orange-100 aria-selected:text-black cursor-pointer'
                            : 'hover:bg-blue-100 hover:text-black data-[selected=true]:bg-blue-100 data-[selected=true]:text-black aria-selected:bg-blue-100 aria-selected:text-black cursor-pointer'}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {dossier.title}
                        </CommandItem>
                      ))}
                      {itemType === 'contrat' && contrats.map((contrat) => (
                        <CommandItem
                          key={contrat.id}
                          value={`${contrat.id}-${contrat.name}`}
                          keywords={[contrat.name]}
                          onSelect={() => {
                            setSelectedItemId(contrat.id);
                            setItemSearchOpen(false);
                          }}
                          className={role === 'notaire'
                            ? 'hover:bg-orange-100 hover:text-black data-[selected=true]:bg-orange-100 data-[selected=true]:text-black aria-selected:bg-orange-100 aria-selected:text-black cursor-pointer'
                            : 'hover:bg-blue-100 hover:text-black data-[selected=true]:bg-blue-100 data-[selected=true]:text-black aria-selected:bg-blue-100 aria-selected:text-black cursor-pointer'}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {contrat.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {itemType === 'document' && documents.length === 0 && (
              <p className="text-sm text-gray-600">
                Aucun document disponible pour signature
              </p>
            )}
            {itemType === 'dossier' && dossiers.length === 0 && (
              <p className="text-sm text-gray-600">
                Aucun dossier disponible pour signature
              </p>
            )}
            {itemType === 'contrat' && contrats.length === 0 && (
              <p className="text-sm text-gray-600">
                Aucun contrat disponible pour signature
              </p>
            )}
          </div>

          {/* Signature Level - Hidden, always "simple" */}
          <input type="hidden" value="simple" />

          {/* Signatories */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Signataire * (maximum 1)</Label>
            </div>

            {signatories.map((signatory, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Signataire</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`firstName-${index}`}>Prénom *</Label>
                    <Input
                      id={`firstName-${index}`}
                      value={signatory.firstName}
                      onChange={(e) => updateSignatory(index, 'firstName', e.target.value)}
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`lastName-${index}`}>Nom *</Label>
                    <Input
                      id={`lastName-${index}`}
                      value={signatory.lastName}
                      onChange={(e) => updateSignatory(index, 'lastName', e.target.value)}
                      placeholder="Dupont"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`email-${index}`}>Email *</Label>
                  <Input
                    id={`email-${index}`}
                    type="email"
                    value={signatory.email}
                    onChange={(e) => updateSignatory(index, 'email', e.target.value)}
                    placeholder="jean.dupont@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor={`phone-${index}`}>Téléphone (optionnel)</Label>
                  <Input
                    id={`phone-${index}`}
                    type="tel"
                    value={signatory.phone}
                    onChange={(e) => updateSignatory(index, 'phone', e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className={role === 'notaire' 
                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : (
                'Lancer la signature'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
