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
import { PdfAnchorSelector } from './PdfAnchorSelector';

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
  preSelectedContractId?: string;
  preSelectedContractName?: string;
};

export function SignatureDialog({ open, onOpenChange, onSuccess, preSelectedContractId, preSelectedContractName }: SignatureDialogProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [itemType, setItemType] = useState<'document' | 'dossier' | 'contrat'>(preSelectedContractId ? 'contrat' : 'document');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [contrats, setContrats] = useState<Contrat[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>(preSelectedContractId || '');
  const [itemSearchOpen, setItemSearchOpen] = useState(false);
  const [signatureLevel, setSignatureLevel] = useState<'simple' | 'advanced' | 'qualified'>('simple');
  const [signatories, setSignatories] = useState<Signatory[]>([
    { firstName: '', lastName: '', email: '', phone: '' }
  ]);
  const [signaturePosition, setSignaturePosition] = useState({ page: 1, x: 50, y: 750 });
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [anchorPositions, setAnchorPositions] = useState<Array<{page: number, x: number, y: number, pageWidth: number, pageHeight: number, signatoryIndex: number}>>([]);
  const [originalPdfBase64, setOriginalPdfBase64] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string>('');

  // Determine role from URL path first (most reliable), then profile
  const role = window.location.pathname.includes('/notaires') || window.location.pathname.includes('/notaire') ? 'notaire' : 
               window.location.pathname.includes('/avocats') || window.location.pathname.includes('/avocat') ? 'avocat' :
               (profile?.role || 'avocat');

  useEffect(() => {
    console.log('SignatureDialog - URL:', window.location.pathname, 'Detected role:', role, 'Profile role:', profile?.role);
    
    // Récupérer le token d'authentification
    const getToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setAuthToken(session.access_token);
      }
    };
    getToken();
  }, [role, profile]);

  // Forcer itemType à 'contrat' quand un contrat est pré-sélectionné
  useEffect(() => {
    console.log('[SignatureDialog] preSelectedContractId:', preSelectedContractId);
    if (preSelectedContractId) {
      console.log('[SignatureDialog] Setting itemType to contrat');
      setItemType('contrat');
      setSelectedItemId(preSelectedContractId);
      
      // Charger immédiatement le contenu du contrat et générer le PDF
      const loadContractPreview = async () => {
        setPreviewLoading(true);
        try {
          const { data, error } = await supabase
            .from('contrats')
            .select('content, name')
            .eq('id', preSelectedContractId)
            .single();

          if (!error && data) {
            // Générer le PDF via l'Edge Function
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const response = await fetch(
                'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/generate-pdf-from-html',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                  },
                  body: JSON.stringify({
                    html: data.content || '<p>Contrat vide</p>',
                    filename: `${data.name}.pdf`
                  })
                }
              );

              if (response.ok) {
                const result = await response.json();
                if (result.success && result.pdf) {
                  // Convertir base64 en blob
                  const byteCharacters = atob(result.pdf);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], { type: 'application/pdf' });
                  const pdfUrl = URL.createObjectURL(blob);
                  setPreviewContent(pdfUrl);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error loading contract preview:', error);
        } finally {
          setPreviewLoading(false);
        }
      };
      
      loadContractPreview();
    }
  }, [preSelectedContractId]);

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

  // Charger la preview du contenu sélectionné
  useEffect(() => {
    const loadPreview = async () => {
      if (!selectedItemId || !itemType) {
        setPreviewContent(null);
        return;
      }

      setPreviewLoading(true);
      try {
        if (itemType === 'contrat') {
          // Pour les contrats, générer un PDF comme dans l'export
          const { data, error } = await supabase
            .from('contrats')
            .select('content, name')
            .eq('id', selectedItemId)
            .single();

          if (!error && data) {
            // Générer le PDF via l'Edge Function
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const response = await fetch(
                'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/generate-pdf-from-html',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                  },
                  body: JSON.stringify({
                    html: data.content || '<p>Contrat vide</p>',
                    filename: `${data.name}.pdf`
                  })
                }
              );

              if (response.ok) {
                const result = await response.json();
                if (result.success && result.pdf) {
                  // Stocker le PDF base64 original
                  setOriginalPdfBase64(result.pdf);
                  // Convertir base64 en blob pour preview
                  const byteCharacters = atob(result.pdf);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], { type: 'application/pdf' });
                  const pdfUrl = URL.createObjectURL(blob);
                  setPreviewContent(pdfUrl);
                }
              }
            }
          }
        } else if (itemType === 'dossier') {
          // Pour les dossiers, récupérer le contrat associé et générer son PDF
          const { data: dossierContrats, error: dcError } = await supabase
            .from('dossier_contrats')
            .select('contrat_id')
            .eq('dossier_id', selectedItemId)
            .limit(1)
            .single();

          if (!dcError && dossierContrats?.contrat_id) {
            // Récupérer le contrat
            const { data: contrat, error: contratError } = await supabase
              .from('contrats')
              .select('content, name')
              .eq('id', dossierContrats.contrat_id)
              .single();

            if (!contratError && contrat) {
              // Générer le PDF du contrat
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                const response = await fetch(
                  'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/generate-pdf-from-html',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                      html: contrat.content || '<p>Contrat vide</p>',
                      filename: `${contrat.name}.pdf`
                    })
                  }
                );

                if (response.ok) {
                  const result = await response.json();
                  if (result.success && result.pdf) {
                    // Convertir base64 en blob
                    const byteCharacters = atob(result.pdf);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    const pdfUrl = URL.createObjectURL(blob);
                    setPreviewContent(pdfUrl);
                  } else {
                    setPreviewContent('NO_CONTRACT');
                  }
                } else {
                  setPreviewContent('NO_CONTRACT');
                }
              }
            } else {
              setPreviewContent('NO_CONTRACT');
            }
          } else {
            setPreviewContent('NO_CONTRACT');
          }
        } else if (itemType === 'document') {
          const { data: doc, error } = await supabase
            .from('documents')
            .select('storage_path')
            .eq('id', selectedItemId)
            .single();

          if (!error && doc?.storage_path) {
            const { data } = supabase.storage
              .from('documents')
              .getPublicUrl(doc.storage_path);
            
            if (data?.publicUrl) {
              setPreviewContent(data.publicUrl);
            }
          }
        }
      } catch (error) {
        console.error('Error loading preview:', error);
      } finally {
        setPreviewLoading(false);
      }
    };

    loadPreview();
  }, [selectedItemId, itemType]);

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
    const itemToSign = preSelectedContractId || selectedItemId;
    
    if (!itemToSign) {
      toast.error('Veuillez sélectionner un élément à faire signer');
      return;
    }

    if (anchorPositions.length !== signatories.length) {
      toast.error(`Veuillez placer ${signatories.length} ancre(s) de signature (une par signataire)`);
      return;
    }

    const invalidSignatory = signatories.find(s => !s.firstName || !s.lastName || !s.email);
    if (invalidSignatory) {
      toast.error('Veuillez remplir tous les champs obligatoires du signataire');
      return;
    }

    setLoading(true);
    try {
      // Récupérer le token de session pour l'authentification
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Vous devez être connecté pour créer une signature');
      }

      // Déterminer le type correct : si un contrat est pré-sélectionné, c'est forcément un contrat
      const correctItemType = preSelectedContractId ? 'contrat' : itemType;

      // Le PDF est déjà modifié avec toutes les ancres, on l'envoie directement
      const requestBody = {
        itemId: itemToSign,
        itemType: correctItemType,
        signatories: signatories,
        signatureLevel: signatureLevel,
        modifiedPdfBase64: originalPdfBase64, // Le PDF contient déjà toutes les ancres
        anchorPositions: anchorPositions
      };
      
      console.log('[SignatureDialog] Sending signature request with PDF containing', anchorPositions.length, 'anchors');

      const response = await fetch(
        'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/universign-create-signature',
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(requestBody)
        }
      );

      const responseData = await response.json();
      console.log('Signature response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Échec de la création de la demande de signature');
      }

      const data = responseData;

      // Ouvrir l'URL de signature Universign dans un nouvel onglet
      if (data.signatureUrl) {
        window.open(data.signatureUrl, '_blank');
        toast.success('Demande de signature créée avec succès!', {
          description: 'La page Universign s\'est ouverte dans un nouvel onglet'
        });
      } else {
        toast.success('Demande de signature créée avec succès!', {
          description: 'Le signataire a reçu un email avec le lien de signature'
        });
      }

      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setSelectedItemId('');
      setSignatories([{ firstName: '', lastName: '', email: '', phone: '' }]);
      setSignaturePosition({ page: 1, x: 50, y: 750 });
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
            Sélectionnez un élément et ajoutez les signataires pour lancer une demande de signature avec Universign
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Signature info banner */}
          <div className={`p-4 rounded-lg border-2 ${role === 'notaire' ? 'bg-orange-50 border-orange-300' : 'bg-blue-50 border-blue-300'}`}>
            <div className="flex items-start gap-3">
              <FileText className={`h-5 w-5 mt-0.5 ${role === 'notaire' ? 'text-orange-600' : 'text-blue-600'}`} />
              <div>
                <h3 className={`font-semibold text-sm ${role === 'notaire' ? 'text-orange-900' : 'text-blue-900'}`}>
                  Signature simple
                </h3>
                <p className={`text-sm mt-1 ${role === 'notaire' ? 'text-orange-700' : 'text-blue-700'}`}>
                  <strong>1 signataire = 1 signature</strong>
                </p>
                <p className={`text-xs mt-1 ${role === 'notaire' ? 'text-orange-600' : 'text-blue-600'}`}>
                  {itemType === 'document' && '📄 Document : signature directe sur le fichier PDF'}
                  {itemType === 'contrat' && '📝 Contrat : le texte sera converti en PDF puis signé'}
                  {itemType === 'dossier' && '📁 Dossier : signature du contrat associé (converti en PDF)'}
                </p>
                <p className={`text-xs mt-1 ${role === 'notaire' ? 'text-orange-600' : 'text-blue-600'}`}>
                  Chaque signataire recevra un lien unique par email
                </p>
              </div>
            </div>
          </div>

          {/* Type selection - Caché si contrat pré-sélectionné */}
          {!preSelectedContractId && (
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
          )}

          {/* Document/Dossier/Contrat selection with search - Caché si contrat pré-sélectionné */}
          {!preSelectedContractId && (
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

            {/* Preview du contenu sélectionné */}
            {selectedItemId && (
              <div className="mt-4">
                {previewLoading ? (
                  <div className="flex items-center justify-center py-8 border rounded-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : previewContent === 'NO_CONTRACT' ? (
                  <p className="text-sm text-gray-500 text-center py-8 border rounded-lg">
                    Pas de contrat à signer dans ce dossier
                  </p>
                ) : previewContent ? (
                  <PdfAnchorSelector 
                    pdfUrl={previewContent}
                    pdfBase64={originalPdfBase64}
                    onPdfModified={(newPdfBase64, anchors) => {
                      setOriginalPdfBase64(newPdfBase64);
                      setAnchorPositions(anchors);
                    }}
                    signatoryCount={signatories.length}
                    role={role}
                    authToken={authToken}
                  />
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8 border rounded-lg">
                    Aucun aperçu disponible
                  </p>
                )}
              </div>
            )}
          </div>
          )}

          {/* Afficher le nom du contrat pré-sélectionné */}
          {preSelectedContractId && preSelectedContractName && (
            <div className="space-y-2">
              <Label>Contrat à faire signer *</Label>
              <div className={`p-3 rounded-md border ${
                role === 'notaire' 
                  ? 'bg-orange-50 border-orange-200 text-orange-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{preSelectedContractName}</span>
                </div>
              </div>
            </div>
          )}

          {/* Signature Level - Hidden, always "simple" */}
          <input type="hidden" value="simple" />

          {/* Signatories */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Signataires *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSignatory}
                className={role === 'notaire' 
                  ? 'hover:bg-orange-100 hover:text-black border-orange-300' 
                  : 'hover:bg-blue-100 hover:text-black border-blue-300'}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un signataire
              </Button>
            </div>

            <div className={`text-xs p-2 rounded ${role === 'notaire' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
              💡 <strong>Rappel :</strong> 1 signataire = 1 signature électronique
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
                      className={role === 'notaire' 
                        ? 'hover:bg-orange-100 hover:text-orange-600' 
                        : 'hover:bg-blue-100 hover:text-blue-600'}
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
                    autoComplete="email"
                    name={`email-${index}`}
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
