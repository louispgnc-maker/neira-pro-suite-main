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
  const [clients, setClients] = useState<Array<{id: string, nom: string, prenom: string}>>([]);
  const [clientModes, setClientModes] = useState<Record<string, 'existing' | 'manual'>>({});

  // Charger les clients
  useEffect(() => {
    if (!userId) return;
    
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, nom, prenom')
        .eq('user_id', userId)
        .order('nom', { ascending: true });
      
      if (data && !error) {
        setClients(data);
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
              <Select value={formData[field.id] || ''} onValueChange={(val) => updateFormData(field.id, val)}>
                <SelectTrigger id={field.id}>
                  <SelectValue placeholder="Sélectionner un client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nom} {client.prenom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-3 bg-white dark:bg-gray-900 p-3 rounded">
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
