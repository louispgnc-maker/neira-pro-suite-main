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
}

interface FormSection {
  title: string;
  fields: string[];
}

interface FormSchema {
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

  // Rendu de la section fixe client (toujours en haut)
  const renderClientSection = () => (
    <div className="space-y-4 bg-blue-50 dark:bg-blue-950 p-6 rounded-lg border-2 border-blue-200 mb-6">
      <h3 className="text-xl font-semibold flex items-center gap-2">
        <span>👤</span> Votre Client
      </h3>
      
      {/* Choix entre client existant ou saisie manuelle */}
      <RadioGroup 
        value={clientMode} 
        onValueChange={(val: 'existing' | 'manual') => {
          setClientMode(val);
          if (val === 'manual') {
            // Supprimer l'ID du client
            const newData = { ...formData };
            delete newData['main_client_id'];
            onFormDataChange(newData);
          }
        }}
        className="flex gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="existing" id="client_existing" />
          <Label htmlFor="client_existing" className="cursor-pointer font-medium">Client existant</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="manual" id="client_manual" />
          <Label htmlFor="client_manual" className="cursor-pointer font-medium">Nouvelle personne</Label>
        </div>
      </RadioGroup>

      {clientMode === 'existing' ? (
        /* Mode: Client existant */
        <div className="space-y-4">
          <Select 
            value={formData['main_client_id'] || ''} 
            onValueChange={(val) => updateFormData('main_client_id', val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={clients.length > 0 ? "Sélectionner votre client..." : "Aucun client enregistré"} />
            </SelectTrigger>
            <SelectContent>
              {clients.length > 0 ? (
                clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name || `${client.nom || ''} ${client.prenom || ''}`.trim()}
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-sm text-muted-foreground">
                  Aucun client trouvé. Créez d'abord un client dans la section "Clients".
                </div>
              )}
            </SelectContent>
          </Select>

          {/* Affichage des informations du client sélectionné */}
          {selectedClientData && (
            <div className="bg-white dark:bg-gray-900 p-4 rounded border space-y-3">
              <h4 className="font-semibold text-sm text-blue-700 dark:text-blue-300">Informations du client</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedClientData.nom && selectedClientData.prenom && (
                  <div>
                    <span className="font-medium">Nom complet :</span> {selectedClientData.nom} {selectedClientData.prenom}
                  </div>
                )}
                {selectedClientData.date_naissance && (
                  <div>
                    <span className="font-medium">Né(e) le :</span> {selectedClientData.date_naissance}
                  </div>
                )}
                {selectedClientData.adresse && (
                  <div className="col-span-2">
                    <span className="font-medium">Adresse :</span> {selectedClientData.adresse}
                  </div>
                )}
                {selectedClientData.email && (
                  <div>
                    <span className="font-medium">Email :</span> {selectedClientData.email}
                  </div>
                )}
                {selectedClientData.telephone && (
                  <div>
                    <span className="font-medium">Tél :</span> {selectedClientData.telephone}
                  </div>
                )}
              </div>

              {/* Pièce d'identité */}
              <div className="border-t pt-3">
                <Label className="text-sm font-medium">📎 Pièce d'identité</Label>
                {clientIdentiteUrl ? (
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded mt-2">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm flex-1 text-green-700">Pièce d'identité chargée</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white h-8"
                      onClick={() => window.open(clientIdentiteUrl, '_blank')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded mt-2">
                    <svg className="w-4 h-4 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm flex-1 text-orange-700">Aucune pièce d'identité dans le profil</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {clients.length === 0 && (
            <p className="text-xs text-orange-600">
              💡 Créez vos clients dans la section "Clients" ou utilisez "Nouvelle personne"
            </p>
          )}
        </div>
      ) : (
        /* Mode: Saisie manuelle */
        <div className="space-y-4 bg-white dark:bg-gray-900 p-4 rounded">
          {/* Choix Personne physique / Société */}
          <div className="space-y-2">
            <Label className="font-medium">Type de personne</Label>
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
    </div>
  );

  // Si des sections sont définies, afficher par section
  if (schema.sections && schema.sections.length > 0) {
    return (
      <div className="space-y-8">
        {/* Section fixe client en premier */}
        {renderClientSection()}
        
        {/* Sections dynamiques */}
        {schema.sections.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              {section.title}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.fields.map((fieldId) => {
                const field = schema.fields.find(f => f.id === fieldId);
                return field ? renderField(field) : null;
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
      
      {/* Champs dynamiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schema.fields.map(renderField)}
      </div>
    </div>
  );
}
