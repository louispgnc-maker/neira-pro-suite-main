import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Trash2, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';

// Liste des types de contrats (à synchroniser avec ContractCreationDialog)
const CONTRACT_TYPES = [
  "CDI",
  "CDD",
  "Stage",
  "Freelance",
  "Bail commercial",
  "Bail habitation",
  "Dev web/application",
  "NDA",
  "Cession droits auteur",
  "Compromis de vente",
  "Promesse unilatérale",
  "Contrat de prêt",
  "Donation",
  "Testament",
  "Mandat de protection future",
  "Rupture conventionnelle",
  "Transaction",
  "Mise en demeure",
  "PACS",
  "Contrat de mariage",
  "Convention divorce",
  "Reconnaissance dette",
  "CGU/CGV",
];

interface TemplateFile {
  name: string;
  size: number;
  created_at: string;
  path: string;
}

export default function TemplatesManagement() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string>('');
  const [templates, setTemplates] = useState<Record<string, TemplateFile[]>>({});
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Charger tous les templates au démarrage
  useEffect(() => {
    loadAllTemplates();
  }, []);

  async function loadAllTemplates() {
    setLoading(true);
    const allTemplates: Record<string, TemplateFile[]> = {};

    for (const contractType of CONTRACT_TYPES) {
      const folderName = contractType.replace(/[\/\\]/g, '-');
      
      const { data, error } = await supabase.storage
        .from('contract-templates')
        .list(folderName);

      if (!error && data) {
        allTemplates[contractType] = data.map(file => ({
          name: file.name,
          size: file.metadata?.size || 0,
          created_at: file.created_at,
          path: `${folderName}/${file.name}`
        }));
      } else {
        allTemplates[contractType] = [];
      }
    }

    setTemplates(allTemplates);
    setLoading(false);
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedType) {
      toast.error('Sélectionnez d\'abord un type de contrat');
      return;
    }

    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    const folderName = selectedType.replace(/[\/\\]/g, '-');

    for (const file of Array.from(files)) {
      // Vérifier le type de fichier
      if (!file.name.match(/\.(txt|pdf|docx?|odt)$/i)) {
        toast.error(`${file.name}: Format non supporté. Utilisez .txt, .pdf, .docx`);
        continue;
      }

      const filePath = `${folderName}/${file.name}`;

      const { error } = await supabase.storage
        .from('contract-templates')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (error) {
        toast.error(`Erreur upload ${file.name}: ${error.message}`);
      } else {
        toast.success(`${file.name} uploadé avec succès`);
      }
    }

    setUploading(false);
    loadAllTemplates();
  }

  async function handleDelete(contractType: string, fileName: string) {
    const folderName = contractType.replace(/[\/\\]/g, '-');
    const filePath = `${folderName}/${fileName}`;

    const { error } = await supabase.storage
      .from('contract-templates')
      .remove([filePath]);

    if (error) {
      toast.error(`Erreur suppression: ${error.message}`);
    } else {
      toast.success(`${fileName} supprimé`);
      loadAllTemplates();
    }
  }

  async function handleDownload(contractType: string, fileName: string) {
    const folderName = contractType.replace(/[\/\\]/g, '-');
    const filePath = `${folderName}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('contract-templates')
      .download(filePath);

    if (error || !data) {
      toast.error('Erreur téléchargement');
      return;
    }

    // Créer un lien de téléchargement
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const totalTemplates = Object.values(templates).reduce((sum, files) => sum + files.length, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">📚 Gestion des Templates IA</h1>
        <p className="text-gray-600">
          Ajoutez des modèles de contrats pour améliorer la précision de l'IA.
          Plus vous ajoutez d'exemples, plus l'IA comprendra votre style de rédaction.
        </p>
        <div className="mt-2 text-sm text-gray-500">
          {totalTemplates} template(s) au total
        </div>
      </div>

      {/* Sélection du type + Upload */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Ajouter un template</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Type de contrat
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">-- Sélectionner un type --</option>
              {CONTRACT_TYPES.map(type => (
                <option key={type} value={type}>
                  {type} {templates[type]?.length > 0 && `(${templates[type].length})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Fichiers (.txt, .pdf, .docx)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                multiple
                accept=".txt,.pdf,.doc,.docx,.odt"
                onChange={handleUpload}
                disabled={!selectedType || uploading}
                className="flex-1"
              />
              <Button
                disabled={!selectedType || uploading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Upload...' : 'Upload'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ⚠️ Actuellement, seuls les fichiers .txt sont analysés par l'IA. 
              Les PDF/DOCX seront supportés prochainement.
            </p>
          </div>
        </div>
      </Card>

      {/* Liste des templates par type */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Templates existants</h2>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Chargement des templates...
          </div>
        ) : (
          <div className="grid gap-4">
            {CONTRACT_TYPES.filter(type => templates[type]?.length > 0).map(contractType => (
              <Card key={contractType} className="p-4">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  {contractType}
                  <span className="text-sm text-gray-500 font-normal">
                    ({templates[contractType].length} template{templates[contractType].length > 1 ? 's' : ''})
                  </span>
                </h3>
                
                <div className="space-y-2">
                  {templates[contractType].map(file => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{file.name}</div>
                          <div className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(2)} KB • {new Date(file.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(contractType, file.name)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Supprimer ${file.name} ?`)) {
                              handleDelete(contractType, file.name);
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            {Object.values(templates).every(files => files.length === 0) && !loading && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun template uploadé pour le moment</p>
                <p className="text-sm mt-1">Commencez par sélectionner un type de contrat et uploader vos modèles</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
