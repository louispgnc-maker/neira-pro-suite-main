import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ClientForm {
  id: string;
  client_email: string;
  client_name: string | null;
  status: string;
  form_type: string;
  expires_at: string;
  cabinet_id: string;
}

export default function PublicClientForm() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ClientForm | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    code_postal: '',
    ville: '',
    date_naissance: '',
    lieu_naissance: '',
    nationalite: '',
    profession: '',
    situation_familiale: '',
    regime_matrimonial: '',
    nombre_enfants: '',
    notes: ''
  });

  useEffect(() => {
    loadForm();
  }, [token]);

  const loadForm = async () => {
    try {
      const { data, error } = await supabase
        .from('client_forms')
        .select('*')
        .eq('token', token)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error('Formulaire introuvable');
        return;
      }

      if (data.status === 'completed') {
        setSubmitted(true);
        setLoading(false);
        return;
      }

      if (data.status === 'expired' || new Date(data.expires_at) < new Date()) {
        toast.error('Ce formulaire a expiré');
        setLoading(false);
        return;
      }

      setForm(data);
      
      // Pré-remplir l'email si disponible
      if (data.client_email) {
        setFormData(prev => ({ ...prev, email: data.client_email }));
      }
      if (data.client_name) {
        const [prenom, ...nomParts] = data.client_name.split(' ');
        setFormData(prev => ({ 
          ...prev, 
          prenom: prenom || '',
          nom: nomParts.join(' ') || ''
        }));
      }
    } catch (error) {
      console.error('Error loading form:', error);
      toast.error('Erreur lors du chargement du formulaire');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form || !token) return;
    
    setSubmitting(true);
    try {
      // Use the RPC function to submit the form
      const { data, error } = await supabase.rpc('submit_client_form', {
        form_token: token,
        form_response: formData
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Formulaire soumis avec succès !');
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error(error.message || 'Erreur lors de la soumission du formulaire');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-blue-50">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            <p className="text-center text-muted-foreground">Chargement...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-blue-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Formulaire soumis avec succès !</CardTitle>
            <CardDescription>
              Merci d'avoir complété vos informations. Votre fiche client a été créée et notre équipe en sera notifiée.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-blue-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-orange-600" />
            </div>
            <CardTitle className="text-2xl">Formulaire introuvable</CardTitle>
            <CardDescription>
              Ce lien n'est pas valide ou a expiré.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 p-4 py-8">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Formulaire d'informations client</CardTitle>
          <CardDescription>
            Merci de remplir ce formulaire avec vos informations personnelles. Toutes les données sont sécurisées et confidentielles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informations de base */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informations personnelles</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input
                    id="prenom"
                    required
                    value={formData.prenom}
                    onChange={(e) => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone *</Label>
                  <Input
                    id="telephone"
                    type="tel"
                    required
                    value={formData.telephone}
                    onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Adresse */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Adresse</h3>
              
              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse complète *</Label>
                <Input
                  id="adresse"
                  required
                  value={formData.adresse}
                  onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code_postal">Code postal *</Label>
                  <Input
                    id="code_postal"
                    required
                    value={formData.code_postal}
                    onChange={(e) => setFormData(prev => ({ ...prev, code_postal: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville *</Label>
                  <Input
                    id="ville"
                    required
                    value={formData.ville}
                    onChange={(e) => setFormData(prev => ({ ...prev, ville: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Informations complémentaires */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informations complémentaires</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_naissance">Date de naissance</Label>
                  <Input
                    id="date_naissance"
                    type="date"
                    value={formData.date_naissance}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_naissance: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lieu_naissance">Lieu de naissance</Label>
                  <Input
                    id="lieu_naissance"
                    value={formData.lieu_naissance}
                    onChange={(e) => setFormData(prev => ({ ...prev, lieu_naissance: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nationalite">Nationalité</Label>
                  <Input
                    id="nationalite"
                    value={formData.nationalite}
                    onChange={(e) => setFormData(prev => ({ ...prev, nationalite: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="profession">Profession</Label>
                  <Input
                    id="profession"
                    value={formData.profession}
                    onChange={(e) => setFormData(prev => ({ ...prev, profession: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="situation_familiale">Situation familiale</Label>
                  <Select
                    value={formData.situation_familiale}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, situation_familiale: value }))}
                  >
                    <SelectTrigger id="situation_familiale">
                      <SelectValue placeholder="Sélectionnez..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="celibataire">Célibataire</SelectItem>
                      <SelectItem value="marie">Marié(e)</SelectItem>
                      <SelectItem value="pacse">Pacsé(e)</SelectItem>
                      <SelectItem value="divorce">Divorcé(e)</SelectItem>
                      <SelectItem value="veuf">Veuf/Veuve</SelectItem>
                      <SelectItem value="concubinage">Concubinage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="regime_matrimonial">Régime matrimonial</Label>
                  <Select
                    value={formData.regime_matrimonial}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, regime_matrimonial: value }))}
                  >
                    <SelectTrigger id="regime_matrimonial">
                      <SelectValue placeholder="Sélectionnez..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="communaute_legale">Communauté légale</SelectItem>
                      <SelectItem value="communaute_universelle">Communauté universelle</SelectItem>
                      <SelectItem value="separation_biens">Séparation de biens</SelectItem>
                      <SelectItem value="participation_acquets">Participation aux acquêts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre_enfants">Nombre d'enfants</Label>
                <Input
                  id="nombre_enfants"
                  type="number"
                  min="0"
                  value={formData.nombre_enfants}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre_enfants: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Informations complémentaires</Label>
                <Textarea
                  id="notes"
                  rows={4}
                  placeholder="Ajoutez ici toute information que vous jugez importante..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={submitting}
            >
              {submitting ? 'Envoi en cours...' : 'Soumettre le formulaire'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
