import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'file' | 'client_select';
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
  const [clients, setClients] = useState<Array<{id: string, name: string, nom?: string, prenom?: string}>>([]);
  const [clientModes, setClientModes] = useState<Record<string, 'existing' | 'manual'>>({});
  const [personTypes, setPersonTypes] = useState<Record<string, 'physique' | 'morale'>>({});
  // Charger les clients
  useEffect(() => {
    if (!userId) {
      console.log('⚠️ userId manquant pour charger les clients');
      return;
    }
    
    const fetchClients = async () => {
      console.log('🔍 Chargement des clients pour userId:', userId);
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, nom, prenom')
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

      case 'client_select':
        const mode = clientModes[field.id] || 'existing';
        const manualPrefix = `${field.id}_manual_`;
        
        return (
          <div key={field.id} className="space-y-4 bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border-2 border-blue-200">
            <div className="space-y-2">
              <Label htmlFor={field.id}>
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </Label>
              
              <RadioGroup 
                value={mode} 
                onValueChange={(val: 'existing' | 'manual') => {
                  setClientModes(prev => ({ ...prev, [field.id]: val }));
                  // Réinitialiser les données selon le mode
                  if (val === 'existing') {
                    // Supprimer les champs manuels
                    const newFormData = { ...formData };
                    delete newFormData[`${manualPrefix}nom`];
                    delete newFormData[`${manualPrefix}prenom`];
                    delete newFormData[`${manualPrefix}email`];
                    delete newFormData[`${manualPrefix}telephone`];
                    delete newFormData[`${manualPrefix}adresse`];
                    onFormDataChange(newFormData);
                  } else {
                    // Supprimer l'ID client
                    const newFormData = { ...formData };
                    delete newFormData[field.id];
                    onFormDataChange(newFormData);
                  }
                }}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id={`${field.id}_existing`} />
                  <Label htmlFor={`${field.id}_existing`} className="cursor-pointer">Client existant</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id={`${field.id}_manual`} />
                  <Label htmlFor={`${field.id}_manual`} className="cursor-pointer">Nouvelle personne</Label>
                </div>
              </RadioGroup>
            </div>

            {mode === 'existing' ? (
              <div className="space-y-2">
                <Select value={formData[field.id] || ''} onValueChange={(val) => updateFormData(field.id, val)}>
                  <SelectTrigger id={field.id}>
                    <SelectValue placeholder={clients.length > 0 ? "Sélectionner un client..." : "Aucun client enregistré"} />
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
                        Aucun client trouvé. Ajoutez d'abord un client dans la section "Clients".
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {clients.length === 0 && (
                  <p className="text-xs text-orange-600">
                    💡 Astuce : Créez vos clients dans la section "Clients" ou utilisez "Nouvelle personne"
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3 bg-white dark:bg-gray-900 p-3 rounded">
                {/* Choix Personne physique / Société */}
                <div className="space-y-2">
                  <Label>Type</Label>
                  <RadioGroup 
                    value={personTypes[field.id] || 'physique'} 
                    onValueChange={(val: 'physique' | 'morale') => {
                      setPersonTypes(prev => ({ ...prev, [field.id]: val }));
                      // Réinitialiser les champs selon le type
                      const newFormData = { ...formData };
                      if (val === 'physique') {
                        // Supprimer champs société
                        delete newFormData[`${manualPrefix}raison_sociale`];
                        delete newFormData[`${manualPrefix}siret`];
                        delete newFormData[`${manualPrefix}forme_juridique`];
                        delete newFormData[`${manualPrefix}representant_nom`];
                        delete newFormData[`${manualPrefix}representant_prenom`];
                      } else {
                        // Supprimer champs personne physique
                        delete newFormData[`${manualPrefix}nom`];
                        delete newFormData[`${manualPrefix}prenom`];
                      }
                      onFormDataChange(newFormData);
                    }}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="physique" id={`${field.id}_physique`} />
                      <Label htmlFor={`${field.id}_physique`} className="cursor-pointer">Personne physique</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="morale" id={`${field.id}_morale`} />
                      <Label htmlFor={`${field.id}_morale`} className="cursor-pointer">Société</Label>
                    </div>
                  </RadioGroup>
                </div>

                {personTypes[field.id] === 'morale' ? (
                  /* Formulaire Société */
                  <>
                    <div>
                      <Label htmlFor={`${manualPrefix}raison_sociale`}>Raison sociale *</Label>
                      <Input
                        id={`${manualPrefix}raison_sociale`}
                        value={formData[`${manualPrefix}raison_sociale`] || ''}
                        onChange={(e) => updateFormData(`${manualPrefix}raison_sociale`, e.target.value)}
                        placeholder="SARL Exemple, SAS MonEntreprise..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`${manualPrefix}siret`}>SIRET</Label>
                        <Input
                          id={`${manualPrefix}siret`}
                          value={formData[`${manualPrefix}siret`] || ''}
                          onChange={(e) => updateFormData(`${manualPrefix}siret`, e.target.value)}
                          placeholder="123 456 789 00010"
                          maxLength={14}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${manualPrefix}forme_juridique`}>Forme juridique</Label>
                        <Input
                          id={`${manualPrefix}forme_juridique`}
                          value={formData[`${manualPrefix}forme_juridique`] || ''}
                          onChange={(e) => updateFormData(`${manualPrefix}forme_juridique`, e.target.value)}
                          placeholder="SARL, SAS, SA, EURL..."
                        />
                      </div>
                    </div>
                    <div className="border-t pt-3 mt-2">
                      <Label className="text-sm font-semibold">Représentant légal</Label>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div>
                          <Label htmlFor={`${manualPrefix}representant_nom`}>Nom</Label>
                          <Input
                            id={`${manualPrefix}representant_nom`}
                            value={formData[`${manualPrefix}representant_nom`] || ''}
                            onChange={(e) => updateFormData(`${manualPrefix}representant_nom`, e.target.value)}
                            placeholder="Nom"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${manualPrefix}representant_prenom`}>Prénom</Label>
                          <Input
                            id={`${manualPrefix}representant_prenom`}
                            value={formData[`${manualPrefix}representant_prenom`] || ''}
                            onChange={(e) => updateFormData(`${manualPrefix}representant_prenom`, e.target.value)}
                            placeholder="Prénom"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`${manualPrefix}email`}>Email de contact</Label>
                      <Input
                        id={`${manualPrefix}email`}
                        type="email"
                        value={formData[`${manualPrefix}email`] || ''}
                        onChange={(e) => updateFormData(`${manualPrefix}email`, e.target.value)}
                        placeholder="contact@entreprise.fr"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`${manualPrefix}telephone`}>Téléphone</Label>
                      <Input
                        id={`${manualPrefix}telephone`}
                        type="tel"
                        value={formData[`${manualPrefix}telephone`] || ''}
                        onChange={(e) => updateFormData(`${manualPrefix}telephone`, e.target.value)}
                        placeholder="01 23 45 67 89"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`${manualPrefix}adresse`}>Siège social</Label>
                      <Textarea
                        id={`${manualPrefix}adresse`}
                        value={formData[`${manualPrefix}adresse`] || ''}
                        onChange={(e) => updateFormData(`${manualPrefix}adresse`, e.target.value)}
                        placeholder="Adresse complète du siège social"
                        rows={2}
                      />
                    </div>
                  </>
                ) : (
                  /* Formulaire Personne Physique */
                  <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`${manualPrefix}nom`}>Nom *</Label>
                    <Input
                      id={`${manualPrefix}nom`}
                      value={formData[`${manualPrefix}nom`] || ''}
                      onChange={(e) => updateFormData(`${manualPrefix}nom`, e.target.value)}
                      placeholder="Nom"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${manualPrefix}prenom`}>Prénom *</Label>
                    <Input
                      id={`${manualPrefix}prenom`}
                      value={formData[`${manualPrefix}prenom`] || ''}
                      onChange={(e) => updateFormData(`${manualPrefix}prenom`, e.target.value)}
                      placeholder="Prénom"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor={`${manualPrefix}email`}>Email</Label>
                  <Input
                    id={`${manualPrefix}email`}
                    type="email"
                    value={formData[`${manualPrefix}email`] || ''}
                    onChange={(e) => updateFormData(`${manualPrefix}email`, e.target.value)}
                    placeholder="email@exemple.fr"
                  />
                </div>
                <div>
                  <Label htmlFor={`${manualPrefix}telephone`}>Téléphone</Label>
                  <Input
                    id={`${manualPrefix}telephone`}
                    type="tel"
                    value={formData[`${manualPrefix}telephone`] || ''}
                    onChange={(e) => updateFormData(`${manualPrefix}telephone`, e.target.value)}
                    placeholder="06 12 34 56 78"
                  />
                </div>
                <div>
                  <Label htmlFor={`${manualPrefix}adresse`}>Adresse complète</Label>
                  <Textarea
                    id={`${manualPrefix}adresse`}
                    value={formData[`${manualPrefix}adresse`] || ''}
                    onChange={(e) => updateFormData(`${manualPrefix}adresse`, e.target.value)}
                    placeholder="Adresse, code postal, ville"
                    rows={2}
                  />
                </div>
                  </>
                )}
              </div>
            )}
            
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

  // Si des sections sont définies, afficher par section
  if (schema.sections && schema.sections.length > 0) {
    return (
      <div className="space-y-8">
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {schema.fields.map(renderField)}
    </div>
  );
}
