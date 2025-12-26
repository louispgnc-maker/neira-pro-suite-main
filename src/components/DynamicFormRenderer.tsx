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
