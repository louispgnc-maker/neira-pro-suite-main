import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Upload, Eye } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  multiple?: boolean;
  accept?: string;
  description?: string;
  conditional_on?: {
    field: string;
    value: string | boolean;
  };
}

interface FormSection {
  title: string;
  fields: string[];
}

interface FormSchema {
  client_roles?: string[]; // Rôles possibles du client (ex: ["Le vendeur", "L'acquéreur"])
  fields: FormField[];
  sections?: FormSection[];
}

interface DynamicFormRendererProps {
  schema: FormSchema;
  formData: Record<string, any>;
  onFormDataChange: (data: Record<string, any>) => void;
  role?: 'notaire' | 'avocat';
  userId?: string;
}

export function DynamicFormRenderer({ schema, formData, onFormDataChange, role = 'avocat', userId }: DynamicFormRendererProps) {
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({});
  const [clients, setClients] = useState<Array<{id: string, name: string, nom?: string, prenom?: string, id_doc_path?: string}>>([]);
  const [clientMode, setClientMode] = useState<'existing' | 'manual'>('existing');
  const [personType, setPersonType] = useState<'physique' | 'morale'>('physique');
  const [selectedClientData, setSelectedClientData] = useState<any>(null);
  const [clientIdentiteUrl, setClientIdentiteUrl] = useState<string | null>(null);
  const [clientRole, setClientRole] = useState<string>(''); // Rôle du client dans le contrat
  
  // States pour l'autre partie
  const [otherPartyMode, setOtherPartyMode] = useState<'existing' | 'manual'>('existing');
  const [otherPartyPersonType, setOtherPartyPersonType] = useState<'physique' | 'morale'>('physique');
  const [selectedOtherPartyData, setSelectedOtherPartyData] = useState<any>(null);
  const [otherPartyIdentiteUrl, setOtherPartyIdentiteUrl] = useState<string | null>(null);
  
  // Charger les clients avec leurs pièces d'identité
  useEffect(() => {
    if (!userId) {
      console.log('⚠️ userId manquant pour charger les clients');
      return;
    }
    
    const fetchClients = async () => {
      console.log('🔍 Chargement des clients pour userId:', userId);
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, nom, prenom, id_doc_path, email, telephone, adresse, date_naissance, lieu_naissance, nationalite, profession, type_identite, numero_identite')
        .eq('owner_id', userId)
        .order('name', { ascending: true });
      
      if (error) {
        console.error('❌ Erreur chargement clients:', error);
      } else {
        console.log('✅ Clients chargés:', data?.length, data);
        setClients(data || []);
      }
    };
    
    fetchClients();
  }, [userId]);

  // Charger les détails du client sélectionné
  useEffect(() => {
    const loadClientDetails = async () => {
      const clientId = formData['main_client_id'];
      if (!clientId || clientMode !== 'existing') {
        setSelectedClientData(null);
        setClientIdentiteUrl(null);
        return;
      }

      const client = clients.find(c => c.id === clientId);
      if (client) {
        setSelectedClientData(client);
        
        // Charger l'URL de la pièce d'identité si elle existe
        if (client.id_doc_path) {
          const { data } = await supabase.storage
            .from('documents')
            .createSignedUrl(client.id_doc_path, 3600);
          
          if (data) {
            setClientIdentiteUrl(data.signedUrl);
          }
        } else {
          setClientIdentiteUrl(null);
        }
      }
    };

    loadClientDetails();
  }, [formData['main_client_id'], clientMode, clients]);

  // Charger les détails de l'autre partie si un client est sélectionné
  useEffect(() => {
    const loadOtherPartyDetails = async () => {
      const otherPartyId = formData['other_party_id'];
      if (!otherPartyId) {
        setSelectedOtherPartyData(null);
        setOtherPartyIdentiteUrl(null);
        return;
      }

      const otherParty = clients.find(c => c.id === otherPartyId);
      if (otherParty) {
        setSelectedOtherPartyData(otherParty);
        
        // Charger l'URL de la pièce d'identité si elle existe
        if (otherParty.id_doc_path) {
          const { data } = await supabase.storage
            .from('documents')
            .createSignedUrl(otherParty.id_doc_path, 3600);
          
          if (data) {
            setOtherPartyIdentiteUrl(data.signedUrl);
          }
        } else {
          setOtherPartyIdentiteUrl(null);
        }
      }
    };

    loadOtherPartyDetails();
  }, [formData['other_party_id'], otherPartyMode, clients]);

  // Initialiser le rôle client avec la première option si disponible
  useEffect(() => {
    if (schema.client_roles && schema.client_roles.length > 0 && !clientRole && !formData['client_role']) {
      const firstRole = schema.client_roles[0];
      setClientRole(firstRole);
      updateFormData('client_role', firstRole);
    }
  }, [schema.client_roles]);

  const updateFormData = (fieldId: string, value: any) => {
    onFormDataChange({
      ...formData,
      [fieldId]: value
    });
  };

  const handleFileChange = (fieldId: string, files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    setUploadedFiles(prev => ({
      ...prev,
      [fieldId]: fileArray
    }));
    
    updateFormData(fieldId, fileArray);
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id] || '';

    switch (field.type) {
      case 'text':
      case 'number':
      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              type={field.type}
              value={value}
              onChange={(e) => updateFormData(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
            />
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={field.id}
              value={value}
              onChange={(e) => updateFormData(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              className="min-h-[100px]"
            />
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select value={value} onValueChange={(val) => updateFormData(field.id, val)}>
              <SelectTrigger id={field.id}>
                <SelectValue placeholder={field.placeholder || "Sélectionner..."} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
          </div>
        );


      case 'checkbox':
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value === true}
              onCheckedChange={(checked) => updateFormData(field.id, checked)}
            />
            <Label htmlFor={field.id} className="cursor-pointer">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground ml-6">{field.description}</p>
            )}
          </div>
        );

      case 'file':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <div className="flex items-center gap-2">
              <label
                htmlFor={field.id}
                className={`flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-muted transition-colors ${
                  role === 'notaire' 
                    ? 'border-orange-300 hover:bg-orange-50' 
                    : 'border-blue-300 hover:bg-blue-50'
                }`}
              >
                <Upload className="h-4 w-4" />
                <span className="text-sm">
                  {uploadedFiles[field.id]?.length 
                    ? `${uploadedFiles[field.id].length} fichier(s)` 
                    : 'Choisir fichier(s)'}
                </span>
              </label>
              <input
                id={field.id}
                type="file"
                multiple={field.multiple}
                accept={field.accept}
                onChange={(e) => handleFileChange(field.id, e.target.files)}
                className="hidden"
              />
            </div>
            {uploadedFiles[field.id]?.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {uploadedFiles[field.id].map((file, idx) => (
                  <div key={idx}>• {file.name}</div>
                ))}
              </div>
            )}
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Vérifier si un champ doit être affiché selon ses conditions
  const shouldShowField = (field: FormField): boolean => {
    if (!field.conditional_on) return true;
    
    const dependentFieldValue = formData[field.conditional_on.field];
    return dependentFieldValue === field.conditional_on.value;
  };

  // Rendu de la section fixe client (toujours en haut) - Design aligné sur les formulaires legacy
  const renderClientSection = () => (
    <div className="space-y-4 bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border-2 border-blue-200 mb-6">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <span>👤</span> Votre Client *
      </h3>
      
      {/* Select client avec bouton "Saisie manuelle" (comme ClientSelector) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="main-client-select">
            Sélectionner votre client
          </Label>
          {formData['main_client_id'] && (
            <button
              type="button"
              onClick={() => {
                setClientMode('manual');
                const newData = { ...formData };
                delete newData['main_client_id'];
                onFormDataChange(newData);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
            >
              Saisie manuelle
            </button>
          )}
        </div>
        
        {clientMode === 'existing' ? (
          <>
            {clients.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800">
                  ⚠️ Aucun client disponible. Utilisez la <button 
                    type="button"
                    onClick={() => setClientMode('manual')}
                    className="underline font-medium hover:text-amber-900"
                  >saisie manuelle</button> ou créez un client depuis la section "Clients".
                </p>
              </div>
            ) : (
              <>
                <Select 
                  value={formData['main_client_id'] || ''} 
                  onValueChange={(val) => updateFormData('main_client_id', val)}
                >
                  <SelectTrigger id="main-client-select">
                    <SelectValue placeholder="Choisir un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.prenom} {client.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Affichage des informations du client sélectionné (comme legacy) */}
                {selectedClientData && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                    <p><strong>Nom complet:</strong> {selectedClientData.nom} {selectedClientData.prenom}</p>
                    {selectedClientData.adresse && (
                      <p><strong>Adresse:</strong> {selectedClientData.adresse}</p>
                    )}
                    {selectedClientData.telephone && (
                      <p><strong>Téléphone:</strong> {selectedClientData.telephone}</p>
                    )}
                    {selectedClientData.email && (
                      <p><strong>Email:</strong> {selectedClientData.email}</p>
                    )}
                    {selectedClientData.date_naissance && (
                      <p><strong>Date de naissance:</strong> {new Date(selectedClientData.date_naissance).toLocaleDateString('fr-FR')}</p>
                    )}
                    {selectedClientData.nationalite && (
                      <p><strong>Nationalité:</strong> {selectedClientData.nationalite}</p>
                    )}
                  </div>
                )}

                {/* Pièce d'identité (design legacy) */}
                {formData['main_client_id'] && (
                  <div className="space-y-2">
                    <Label>📎 Pièce d'identité</Label>
                    {clientIdentiteUrl ? (
                      <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm flex-1 text-green-700">Pièce d'identité chargée depuis le profil client</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => window.open(clientIdentiteUrl, '_blank')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                        <svg className="w-4 h-4 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm flex-1 text-orange-700">Aucune pièce d'identité dans le profil client</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        ) : null}
      </div>

      {/* Mode: Saisie manuelle - Affiché quand on clique sur "Saisie manuelle" */}
      {clientMode === 'manual' && (
        <div className="space-y-4 bg-white dark:bg-gray-900 p-4 rounded border">
          {/* Bouton pour revenir au mode client existant */}
          <div className="flex justify-between items-center pb-3 border-b">
            <h4 className="font-semibold">Saisie manuelle</h4>
            <button
              type="button"
              onClick={() => {
                setClientMode('existing');
                // Nettoyer les champs manuels
                const newData = { ...formData };
                delete newData['manual_nom'];
                delete newData['manual_prenom'];
                delete newData['manual_email'];
                delete newData['manual_telephone'];
                delete newData['manual_adresse'];
                delete newData['manual_raison_sociale'];
                delete newData['manual_siret'];
                delete newData['manual_forme_juridique'];
                delete newData['manual_representant_nom'];
                delete newData['manual_representant_prenom'];
                onFormDataChange(newData);
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline font-medium flex items-center gap-1"
            >
              ← Choisir un client
            </button>
          </div>

          {/* Choix Personne physique / Société */}
          <div className="space-y-2">
            <Label className="font-medium">Type de personne *</Label>
            <RadioGroup 
              value={personType} 
              onValueChange={(val: 'physique' | 'morale') => {
                setPersonType(val);
                // Nettoyer les champs de l'autre type
                const newData = { ...formData };
                if (val === 'physique') {
                  delete newData['manual_raison_sociale'];
                  delete newData['manual_siret'];
                  delete newData['manual_forme_juridique'];
                  delete newData['manual_representant_nom'];
                  delete newData['manual_representant_prenom'];
                } else {
                  delete newData['manual_nom'];
                  delete newData['manual_prenom'];
                }
                onFormDataChange(newData);
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="physique" id="type_physique" />
                <Label htmlFor="type_physique" className="cursor-pointer">Personne physique</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="morale" id="type_morale" />
                <Label htmlFor="type_morale" className="cursor-pointer">Société</Label>
              </div>
            </RadioGroup>
          </div>

          {personType === 'morale' ? (
            /* Formulaire Société */
            <div className="space-y-3">
              <div>
                <Label htmlFor="manual_raison_sociale">Raison sociale *</Label>
                <Input
                  id="manual_raison_sociale"
                  value={formData['manual_raison_sociale'] || ''}
                  onChange={(e) => updateFormData('manual_raison_sociale', e.target.value)}
                  placeholder="SARL Exemple, SAS MonEntreprise..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="manual_siret">SIRET</Label>
                  <Input
                    id="manual_siret"
                    value={formData['manual_siret'] || ''}
                    onChange={(e) => updateFormData('manual_siret', e.target.value)}
                    placeholder="123 456 789 00010"
                    maxLength={14}
                  />
                </div>
                <div>
                  <Label htmlFor="manual_forme_juridique">Forme juridique</Label>
                  <Input
                    id="manual_forme_juridique"
                    value={formData['manual_forme_juridique'] || ''}
                    onChange={(e) => updateFormData('manual_forme_juridique', e.target.value)}
                    placeholder="SARL, SAS, SA..."
                  />
                </div>
              </div>
              <div className="border-t pt-3">
                <Label className="text-sm font-semibold">Représentant légal</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label htmlFor="manual_representant_nom">Nom</Label>
                    <Input
                      id="manual_representant_nom"
                      value={formData['manual_representant_nom'] || ''}
                      onChange={(e) => updateFormData('manual_representant_nom', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="manual_representant_prenom">Prénom</Label>
                    <Input
                      id="manual_representant_prenom"
                      value={formData['manual_representant_prenom'] || ''}
                      onChange={(e) => updateFormData('manual_representant_prenom', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="manual_email">Email</Label>
                <Input
                  id="manual_email"
                  type="email"
                  value={formData['manual_email'] || ''}
                  onChange={(e) => updateFormData('manual_email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="manual_telephone">Téléphone</Label>
                <Input
                  id="manual_telephone"
                  type="tel"
                  value={formData['manual_telephone'] || ''}
                  onChange={(e) => updateFormData('manual_telephone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="manual_adresse">Siège social</Label>
                <Textarea
                  id="manual_adresse"
                  value={formData['manual_adresse'] || ''}
                  onChange={(e) => updateFormData('manual_adresse', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          ) : (
            /* Formulaire Personne Physique */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="manual_nom">Nom *</Label>
                  <Input
                    id="manual_nom"
                    value={formData['manual_nom'] || ''}
                    onChange={(e) => updateFormData('manual_nom', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="manual_prenom">Prénom *</Label>
                  <Input
                    id="manual_prenom"
                    value={formData['manual_prenom'] || ''}
                    onChange={(e) => updateFormData('manual_prenom', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="manual_email">Email</Label>
                <Input
                  id="manual_email"
                  type="email"
                  value={formData['manual_email'] || ''}
                  onChange={(e) => updateFormData('manual_email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="manual_telephone">Téléphone</Label>
                <Input
                  id="manual_telephone"
                  type="tel"
                  value={formData['manual_telephone'] || ''}
                  onChange={(e) => updateFormData('manual_telephone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="manual_adresse">Adresse complète</Label>
                <Textarea
                  id="manual_adresse"
                  value={formData['manual_adresse'] || ''}
                  onChange={(e) => updateFormData('manual_adresse', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Choix du rôle du client (si défini dans le schéma) */}
      {schema.client_roles && schema.client_roles.length > 0 && (
        <div className="space-y-2 mt-4 pt-4 border-t">
          <Label className="font-medium text-base">Qui est votre client ? *</Label>
          <RadioGroup 
            value={clientRole} 
            onValueChange={(val) => {
              setClientRole(val);
              updateFormData('client_role', val);
            }}
            className="space-y-2"
          >
            {schema.client_roles.map((role, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <RadioGroupItem value={role} id={`role-${idx}`} />
                <Label htmlFor={`role-${idx}`} className="cursor-pointer font-normal">
                  {role}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {!clientRole && (
            <p className="text-xs text-orange-600 mt-1">
              ⚠️ Sélectionnez qui est votre client pour personnaliser le contrat
            </p>
          )}
        </div>
      )}
    </div>
  );

  // Fonction pour obtenir le label de l'autre partie (celle qui n'est PAS notre client)
  const getOtherPartyLabel = (): string => {
    if (!schema.client_roles || schema.client_roles.length < 2 || !clientRole) {
      return "Autre partie";
    }
    
    const otherRole = schema.client_roles.find(r => r !== clientRole);
    return otherRole || "Autre partie";
  };

  // Rendu de la section "Autre partie" (la partie qui N'EST PAS notre client)
  const renderOtherPartySection = () => {
    if (!schema.client_roles || schema.client_roles.length < 2) {
      return null; // Pas besoin d'autre partie si moins de 2 rôles
    }

    const otherPartyLabel = getOtherPartyLabel();

    return (
      <div className="space-y-4 bg-purple-50 dark:bg-purple-950 p-4 rounded-lg border-2 border-purple-200 mb-6">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <span>👥</span> {otherPartyLabel} *
        </h3>
        
        {/* Select autre partie avec bouton "Saisie manuelle" */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="other-party-select">
              Sélectionner depuis vos clients ou saisir manuellement
            </Label>
            {formData['other_party_id'] && (
              <button
                type="button"
                onClick={() => {
                  setOtherPartyMode('manual');
                  const newData = { ...formData };
                  delete newData['other_party_id'];
                  onFormDataChange(newData);
                }}
                className="text-xs text-purple-600 hover:text-purple-800 underline font-medium"
              >
                Saisie manuelle
              </button>
            )}
          </div>
          
          {otherPartyMode === 'existing' ? (
            <>
              <Select 
                value={formData['other_party_id'] || ''} 
                onValueChange={(val) => updateFormData('other_party_id', val)}
              >
                <SelectTrigger id="other-party-select">
                  <SelectValue placeholder="Choisir un client ou laisser vide pour saisie manuelle" />
                </SelectTrigger>
                <SelectContent>
                  {clients.length > 0 ? (
                    clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.prenom} {client.nom}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">
                      Aucun client trouvé
                    </div>
                  )}
                </SelectContent>
              </Select>

              {!formData['other_party_id'] && (
                <button
                  type="button"
                  onClick={() => setOtherPartyMode('manual')}
                  className="text-sm text-purple-600 hover:text-purple-800 underline"
                >
                  → Cliquez ici pour remplir manuellement
                </button>
              )}

              {/* Affichage des informations de l'autre partie sélectionnée */}
              {selectedOtherPartyData && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                  <p><strong>Nom complet:</strong> {selectedOtherPartyData.nom} {selectedOtherPartyData.prenom}</p>
                  {selectedOtherPartyData.adresse && (
                    <p><strong>Adresse:</strong> {selectedOtherPartyData.adresse}</p>
                  )}
                  {selectedOtherPartyData.telephone && (
                    <p><strong>Téléphone:</strong> {selectedOtherPartyData.telephone}</p>
                  )}
                  {selectedOtherPartyData.email && (
                    <p><strong>Email:</strong> {selectedOtherPartyData.email}</p>
                  )}
                  {selectedOtherPartyData.date_naissance && (
                    <p><strong>Date de naissance:</strong> {new Date(selectedOtherPartyData.date_naissance).toLocaleDateString('fr-FR')}</p>
                  )}
                  {selectedOtherPartyData.nationalite && (
                    <p><strong>Nationalité:</strong> {selectedOtherPartyData.nationalite}</p>
                  )}
                </div>
              )}

              {/* Pièce d'identité de l'autre partie */}
              {formData['other_party_id'] && (
                <div className="space-y-2">
                  <Label>📎 Pièce d'identité</Label>
                  {otherPartyIdentiteUrl ? (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm flex-1 text-green-700">Pièce d'identité chargée depuis le profil client</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => window.open(otherPartyIdentiteUrl, '_blank')}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                      <svg className="w-4 h-4 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm flex-1 text-orange-700">Aucune pièce d'identité dans le profil client</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

      {/* Mode: Saisie manuelle pour l'autre partie */}
      {otherPartyMode === 'manual' && (
        <div className="space-y-4 bg-white dark:bg-gray-900 p-4 rounded border">
          {/* Header avec bouton retour */}
          <div className="flex items-center justify-between mb-4">
            <Label className="font-medium">Saisie manuelle</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOtherPartyMode('existing');
                // Nettoyer toutes les données manuelles de l'autre partie
                const newData = { ...formData };
                delete newData['other_party_nom'];
                delete newData['other_party_prenom'];
                delete newData['other_party_raison_sociale'];
                delete newData['other_party_siret'];
                delete newData['other_party_forme_juridique'];
                delete newData['other_party_representant_nom'];
                delete newData['other_party_representant_prenom'];
                delete newData['other_party_email'];
                delete newData['other_party_telephone'];
                delete newData['other_party_adresse'];
                onFormDataChange(newData);
              }}
            >
              ← Revenir à la sélection client
            </Button>
          </div>
          
          {/* Choix Personne physique / Société */}
          <div className="space-y-2">
            <Label className="font-medium">Type de personne *</Label>
            <RadioGroup 
              value={otherPartyPersonType} 
              onValueChange={(val: 'physique' | 'morale') => {
                setOtherPartyPersonType(val);
                // Nettoyer les champs de l'autre type
                const newData = { ...formData };
                if (val === 'physique') {
                  delete newData['other_party_raison_sociale'];
                  delete newData['other_party_siret'];
                  delete newData['other_party_forme_juridique'];
                  delete newData['other_party_representant_nom'];
                  delete newData['other_party_representant_prenom'];
                } else {
                  delete newData['other_party_nom'];
                  delete newData['other_party_prenom'];
                }
                onFormDataChange(newData);
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="physique" id="other_type_physique" />
                <Label htmlFor="other_type_physique" className="cursor-pointer">Personne physique</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="morale" id="other_type_morale" />
                <Label htmlFor="other_type_morale" className="cursor-pointer">Société</Label>
              </div>
            </RadioGroup>
          </div>

          {otherPartyPersonType === 'morale' ? (
            /* Formulaire Société pour l'autre partie */
            <div className="space-y-3">
              <div>
                <Label htmlFor="other_party_raison_sociale">Raison sociale *</Label>
                <Input
                  id="other_party_raison_sociale"
                  value={formData['other_party_raison_sociale'] || ''}
                  onChange={(e) => updateFormData('other_party_raison_sociale', e.target.value)}
                  placeholder="SARL Exemple, SAS MonEntreprise..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="other_party_siret">SIRET</Label>
                  <Input
                    id="other_party_siret"
                    value={formData['other_party_siret'] || ''}
                    onChange={(e) => updateFormData('other_party_siret', e.target.value)}
                    placeholder="123 456 789 00010"
                    maxLength={14}
                  />
                </div>
                <div>
                  <Label htmlFor="other_party_forme_juridique">Forme juridique</Label>
                  <Input
                    id="other_party_forme_juridique"
                    value={formData['other_party_forme_juridique'] || ''}
                    onChange={(e) => updateFormData('other_party_forme_juridique', e.target.value)}
                    placeholder="SARL, SAS, SA..."
                  />
                </div>
              </div>
              <div className="border-t pt-3">
                <Label className="text-sm font-semibold">Représentant légal</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label htmlFor="other_party_representant_nom">Nom</Label>
                    <Input
                      id="other_party_representant_nom"
                      value={formData['other_party_representant_nom'] || ''}
                      onChange={(e) => updateFormData('other_party_representant_nom', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="other_party_representant_prenom">Prénom</Label>
                    <Input
                      id="other_party_representant_prenom"
                      value={formData['other_party_representant_prenom'] || ''}
                      onChange={(e) => updateFormData('other_party_representant_prenom', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="other_party_email">Email</Label>
                <Input
                  id="other_party_email"
                  type="email"
                  value={formData['other_party_email'] || ''}
                  onChange={(e) => updateFormData('other_party_email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="other_party_telephone">Téléphone</Label>
                <Input
                  id="other_party_telephone"
                  type="tel"
                  value={formData['other_party_telephone'] || ''}
                  onChange={(e) => updateFormData('other_party_telephone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="other_party_adresse">Siège social</Label>
                <Textarea
                  id="other_party_adresse"
                  value={formData['other_party_adresse'] || ''}
                  onChange={(e) => updateFormData('other_party_adresse', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          ) : (
            /* Formulaire Personne Physique pour l'autre partie */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="other_party_nom">Nom *</Label>
                  <Input
                    id="other_party_nom"
                    value={formData['other_party_nom'] || ''}
                    onChange={(e) => updateFormData('other_party_nom', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="other_party_prenom">Prénom *</Label>
                  <Input
                    id="other_party_prenom"
                    value={formData['other_party_prenom'] || ''}
                    onChange={(e) => updateFormData('other_party_prenom', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="other_party_email">Email</Label>
                <Input
                  id="other_party_email"
                  type="email"
                  value={formData['other_party_email'] || ''}
                  onChange={(e) => updateFormData('other_party_email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="other_party_telephone">Téléphone</Label>
                <Input
                  id="other_party_telephone"
                  type="tel"
                  value={formData['other_party_telephone'] || ''}
                  onChange={(e) => updateFormData('other_party_telephone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="other_party_adresse">Adresse complète</Label>
                <Textarea
                  id="other_party_adresse"
                  value={formData['other_party_adresse'] || ''}
                  onChange={(e) => updateFormData('other_party_adresse', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    );
  };

  // Si des sections sont définies, afficher par section
  if (schema.sections && schema.sections.length > 0) {
    return (
      <div className="space-y-8">
        {/* Section fixe client en premier */}
        {renderClientSection()}
        
        {/* Section autre partie */}
        {renderOtherPartySection()}
        
        {/* Sections dynamiques */}
        {schema.sections.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              {section.title}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.fields.map((fieldId) => {
                const field = schema.fields.find(f => f.id === fieldId);
                // Afficher uniquement si le champ existe ET respecte ses conditions
                return field && shouldShowField(field) ? renderField(field) : null;
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Sinon, afficher tous les champs en grille
  return (
    <div className="space-y-8">
      {/* Section fixe client en premier */}
      {renderClientSection()}
      
      {/* Section autre partie */}
      {renderOtherPartySection()}
      
      {/* Champs dynamiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schema.fields.filter(shouldShowField).map(renderField)}
      </div>
    </div>
  );
}
