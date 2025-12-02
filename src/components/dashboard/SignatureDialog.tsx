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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [documentSearchOpen, setDocumentSearchOpen] = useState(false);
  const [signatories, setSignatories] = useState<Signatory[]>([
    { firstName: '', lastName: '', email: '', phone: '' }
  ]);

  useEffect(() => {
    if (open && user) {
      loadDocuments();
    }
  }, [open, user]);

  const loadDocuments = async () => {
    if (!user) return;

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
  };

  const addSignatory = () => {
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
    if (!selectedDocumentId) {
      toast.error('Veuillez sélectionner un document');
      return;
    }

    const invalidSignatory = signatories.find(s => !s.firstName || !s.lastName || !s.email);
    if (invalidSignatory) {
      toast.error('Veuillez remplir tous les champs obligatoires des signataires');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/yousign-create-signature',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: selectedDocumentId,
            signatories: signatories
          })
        }
      );

      if (!response.ok) {
        throw new Error('Échec de la création de la demande de signature');
      }

      const data = await response.json();

      toast.success('Demande de signature créée avec succès!', {
        description: 'Les signataires ont reçu un email avec le lien de signature'
      });

      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setSelectedDocumentId('');
      setSignatories([{ firstName: '', lastName: '', email: '', phone: '' }]);

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
            Sélectionnez un document et ajoutez les signataires pour lancer une demande de signature avec YouSign
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document selection with search */}
          <div className="space-y-2">
            <Label htmlFor="document">Document à signer *</Label>
            <Popover open={documentSearchOpen} onOpenChange={setDocumentSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={documentSearchOpen}
                  className="w-full justify-between"
                >
                  {selectedDocumentId
                    ? documents.find((doc) => doc.id === selectedDocumentId)?.name
                    : "Sélectionnez un document"}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher un document..." />
                  <CommandList>
                    <CommandEmpty>Aucun document trouvé</CommandEmpty>
                    <CommandGroup>
                      {documents.map((doc) => (
                        <CommandItem
                          key={doc.id}
                          value={doc.name}
                          onSelect={() => {
                            setSelectedDocumentId(doc.id);
                            setDocumentSearchOpen(false);
                          }}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {doc.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {documents.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun document disponible pour signature
              </p>
            )}
          </div>

          {/* Signatories */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Signataires *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSignatory}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un signataire
              </Button>
            </div>

            {signatories.map((signatory, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Signataire {index + 1}</span>
                  {signatories.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSignatory(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
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
              className="bg-orange-600 hover:bg-orange-700"
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
