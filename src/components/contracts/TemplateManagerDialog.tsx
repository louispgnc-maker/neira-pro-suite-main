import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Trash2, FileText, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NOTAIRE_CONTRACT_CATEGORIES } from '@/components/dashboard/ContractSelectorNotaire';
import { AVOCAT_CONTRACT_CATEGORIES } from '@/components/dashboard/ContractSelectorAvocat';

interface TemplateManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: 'avocat' | 'notaire';
}

// Extraire tous les types de contrats depuis les catégories
const getAllContractTypes = (role: 'avocat' | 'notaire') => {
  const categories = role === 'notaire' ? NOTAIRE_CONTRACT_CATEGORIES : AVOCAT_CONTRACT_CATEGORIES;
  const types: string[] = [];
  categories.forEach(cat => {
    if (cat.contracts) {
      types.push(...cat.contracts);
    }
  });
  return types.sort();
};

export function TemplateManagerDialog({ open, onOpenChange, role }: TemplateManagerDialogProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const contractTypes = getAllContractTypes(role);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: files, error } = await supabase.storage
        .from('contract-templates')
        .list('', {
          limit: 100,
          offset: 0,
        });

      if (error) throw error;

      // Récupérer les URLs publiques
      const templatesWithUrls = await Promise.all(
        (files || []).map(async (file: any) => {
          if (file.name === '.emptyFolderPlaceholder') return null;
          
          const { data: urlData } = supabase.storage
            .from('contract-templates')
            .getPublicUrl(file.name);

          return {
            name: file.name,
            url: urlData.publicUrl,
            size: file.metadata?.size || 0,
            created_at: file.created_at,
          };
        })
      );

      setTemplates(templatesWithUrls.filter(t => t !== null) as any[]);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast.error('Erreur lors du chargement des templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const handleUpload = async () => {
    if (!uploadFile || !selectedType) {
      toast.error('Veuillez sélectionner un type de contrat et un fichier');
      return;
    }

    try {
      setUploading(true);

      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${selectedType}_${Date.now()}.${fileExt}`;
      const filePath = `${selectedType}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('contract-templates')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      toast.success('Template uploadé avec succès');
      setUploadFile(null);
      setSelectedType('');
      loadTemplates();
    } catch (error: any) {
      console.error('Error uploading:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm('Supprimer ce template ?')) return;

    try {
      const { error } = await supabase.storage
        .from('contract-templates')
        .remove([fileName]);

      if (error) throw error;

      toast.success('Template supprimé');
      loadTemplates();
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDownload = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gérer mes templates IA</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Uploadez vos contrats existants pour que l'IA apprenne votre style de rédaction
          </p>
        </DialogHeader>

        {/* Upload Section */}
        <Card className="p-4 mb-4">
          <h3 className="font-semibold mb-3">Ajouter un template</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Type de contrat</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Fichier (.txt, .md, .pdf)</label>
              <input
                type="file"
                accept=".txt,.md,.pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <Button
              onClick={handleUpload}
              disabled={!uploadFile || !selectedType || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Uploader le template
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Templates List */}
        <div>
          <h3 className="font-semibold mb-3">Mes templates ({templates.length})</h3>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center p-8 border-2 border-dashed rounded-lg">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <p className="text-gray-500">Aucun template. Commencez par en ajouter un!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <Card key={template.name} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{template.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(template.size)} • {new Date(template.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownload(template.url, template.name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(template.name)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
