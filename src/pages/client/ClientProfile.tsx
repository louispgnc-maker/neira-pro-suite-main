import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Edit2, Save, X, User, Briefcase, FileText, Shield, Heart } from 'lucide-react';
import ClientLayout from '@/components/client/ClientLayout';

interface ClientData {
  id: string;
  name: string;
  role: string;
  kyc_status: string;
  // Personnelles
  nom: string | null;
  prenom: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  pays: string | null;
  telephone: string | null;
  email: string | null;
  nationalite: string | null;
  sexe: string | null;
  etat_civil: string | null;
  situation_matrimoniale: string | null;
  // Identification
  type_identite: string | null;
  numero_identite: string | null;
  date_expiration_identite: string | null;
  pays_delivrance_identite: string | null;
  // Professionnelles
  profession: string | null;
  employeur: string | null;
  adresse_professionnelle: string | null;
  telephone_professionnel: string | null;
  email_professionnel: string | null;
  statut_professionnel: string | null;
  siret: string | null;
  situation_fiscale: string | null;
  revenus: string | null;
  // Familiales
  enfants: { nom: string; prenom?: string; date_naissance: string | null }[] | null;
}

interface SuggestedChange {
  field: string;
  current_value: string | null;
  suggested_value: string;
  reason: string;
}

export default function ClientProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<Partial<ClientData>>({});
  const [suggestionReason, setSuggestionReason] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/client-login');
      return;
    }
    loadClientData();
  }, [user, navigate]);

  const loadClientData = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      setClientData(data as ClientData);
      setEditedData(data as ClientData);
    } catch (err) {
      console.error('Error loading client data:', err);
      toast.error('Erreur lors du chargement de vos informations');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSuggestions = async () => {
    if (!clientData || !editedData) return;

    // Identifier les champs modifiés
    const changes: SuggestedChange[] = [];
    Object.keys(editedData).forEach((key) => {
      const field = key as keyof ClientData;
      if (editedData[field] !== clientData[field] && editedData[field] !== undefined) {
        changes.push({
          field,
          current_value: String(clientData[field] || ''),
          suggested_value: String(editedData[field]),
          reason: suggestionReason,
        });
      }
    });

    if (changes.length === 0) {
      toast.info('Aucune modification détectée');
      setEditMode(false);
      return;
    }

    try {
      // Créer une notification pour le professionnel
      const { data: cabinetData } = await supabase
        .from('clients')
        .select('owner_id')
        .eq('id', clientData.id)
        .single();

      if (cabinetData?.owner_id) {
        // Enregistrer la suggestion dans une table (à créer si nécessaire)
        // Pour l'instant, on va juste notifier
        const { error: notifError } = await supabase
          .from('client_profile_suggestions')
          .insert({
            client_id: clientData.id,
            cabinet_id: cabinetData.owner_id,
            suggested_changes: changes,
            reason: suggestionReason,
            status: 'pending',
          });

        if (notifError) {
          console.error('Error creating suggestion:', notifError);
          toast.error('Erreur lors de l\'envoi de vos suggestions');
          return;
        }

        toast.success('Vos suggestions ont été envoyées !', {
          description: 'Votre professionnel examinera vos demandes de modification.',
        });
        setEditMode(false);
        setSuggestionReason('');
      }
    } catch (err) {
      console.error('Error saving suggestions:', err);
      toast.error('Erreur lors de l\'envoi');
    }
  };

  const getKycBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      Complet: { variant: 'default', label: 'Complet' },
      Partiel: { variant: 'secondary', label: 'Partiel' },
      Manquant: { variant: 'destructive', label: 'Incomplet' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ClientLayout>
    );
  }

  if (!clientData) {
    return (
      <ClientLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Impossible de charger vos informations</p>
          </CardContent>
        </Card>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
            <p className="text-gray-600 mt-1">Consultez et suggérez des modifications à votre professionnel</p>
          </div>
          {!editMode ? (
            <Button onClick={() => setEditMode(true)} className="bg-blue-600 hover:bg-blue-700">
              <Edit2 className="h-4 w-4 mr-2" />
              Suggérer des modifications
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={() => { setEditMode(false); setEditedData(clientData); }} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button onClick={handleSaveSuggestions} className="bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4 mr-2" />
                Envoyer les suggestions
              </Button>
            </div>
          )}
        </div>

        {/* Status KYC */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Statut du profil</span>
              {getKycBadge(clientData.kyc_status)}
            </CardTitle>
          </CardHeader>
        </Card>

        {editMode && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Raison de vos modifications</CardTitle>
              <CardDescription>Expliquez pourquoi vous souhaitez modifier ces informations</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={suggestionReason}
                onChange={(e) => setSuggestionReason(e.target.value)}
                placeholder="Ex: Mon adresse a changé, je souhaite mettre à jour mes coordonnées..."
                rows={3}
              />
            </CardContent>
          </Card>
        )}

        {/* Informations personnelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Informations personnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nom</Label>
              <Input
                value={editMode ? (editedData.nom || '') : (clientData.nom || '')}
                onChange={(e) => setEditedData({ ...editedData, nom: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
              />
            </div>
            <div>
              <Label>Prénom</Label>
              <Input
                value={editMode ? (editedData.prenom || '') : (clientData.prenom || '')}
                onChange={(e) => setEditedData({ ...editedData, prenom: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
              />
            </div>
            <div>
              <Label>Date de naissance</Label>
              <Input
                type="date"
                value={editMode ? (editedData.date_naissance || '') : (clientData.date_naissance || '')}
                onChange={(e) => setEditedData({ ...editedData, date_naissance: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
              />
            </div>
            <div>
              <Label>Lieu de naissance</Label>
              <Input
                value={editMode ? (editedData.lieu_naissance || '') : (clientData.lieu_naissance || '')}
                onChange={(e) => setEditedData({ ...editedData, lieu_naissance: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
              />
            </div>
            <div>
              <Label>Sexe</Label>
              <Select
                value={editMode ? (editedData.sexe || '') : (clientData.sexe || '')}
                onValueChange={(value) => setEditedData({ ...editedData, sexe: value })}
                disabled={!editMode}
              >
                <SelectTrigger className={editMode ? 'border-blue-300' : ''}>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculin</SelectItem>
                  <SelectItem value="F">Féminin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nationalité</Label>
              <Input
                value={editMode ? (editedData.nationalite || '') : (clientData.nationalite || '')}
                onChange={(e) => setEditedData({ ...editedData, nationalite: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Adresse</Label>
              <Input
                value={editMode ? (editedData.adresse || '') : (clientData.adresse || '')}
                onChange={(e) => setEditedData({ ...editedData, adresse: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
              />
            </div>
            <div>
              <Label>Code postal</Label>
              <Input
                value={editMode ? (editedData.code_postal || '') : (clientData.code_postal || '')}
                onChange={(e) => setEditedData({ ...editedData, code_postal: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
              />
            </div>
            <div>
              <Label>Ville</Label>
              <Input
                value={editMode ? (editedData.ville || '') : (clientData.ville || '')}
                onChange={(e) => setEditedData({ ...editedData, ville: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
              />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input
                value={editMode ? (editedData.telephone || '') : (clientData.telephone || '')}
                onChange={(e) => setEditedData({ ...editedData, telephone: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={editMode ? (editedData.email || '') : (clientData.email || '')}
                onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
              />
            </div>
          </CardContent>
        </Card>

        {/* Informations d'identification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Pièce d'identité
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Type de document</Label>
              <Select
                value={editMode ? (editedData.type_identite || '') : (clientData.type_identite || '')}
                onValueChange={(value) => setEditedData({ ...editedData, type_identite: value })}
                disabled={!editMode}
              >
                <SelectTrigger className={editMode ? 'border-blue-300' : ''}>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CNI">Carte nationale d'identité</SelectItem>
                  <SelectItem value="Passeport">Passeport</SelectItem>
                  <SelectItem value="Permis">Permis de conduire</SelectItem>
                  <SelectItem value="Titre de séjour">Titre de séjour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Numéro</Label>
              <Input
                value={editMode ? (editedData.numero_identite || '') : (clientData.numero_identite || '')}
                onChange={(e) => setEditedData({ ...editedData, numero_identite: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
              />
            </div>
            <div>
              <Label>Date d'expiration</Label>
              <Input
                type="date"
                value={editMode ? (editedData.date_expiration_identite || '') : (clientData.date_expiration_identite || '')}
                onChange={(e) => setEditedData({ ...editedData, date_expiration_identite: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
              />
            </div>
            <div>
              <Label>Pays de délivrance</Label>
              <Input
                value={editMode ? (editedData.pays_delivrance_identite || '') : (clientData.pays_delivrance_identite || '')}
                onChange={(e) => setEditedData({ ...editedData, pays_delivrance_identite: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
              />
            </div>
          </CardContent>
        </Card>

        {/* Informations professionnelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Informations professionnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Profession</Label>
              <Input
                value={editMode ? (editedData.profession || '') : (clientData.profession || '')}
                onChange={(e) => setEditedData({ ...editedData, profession: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
              />
            </div>
            <div>
              <Label>Employeur</Label>
              <Input
                value={editMode ? (editedData.employeur || '') : (clientData.employeur || '')}
                onChange={(e) => setEditedData({ ...editedData, employeur: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
              />
            </div>
            <div>
              <Label>Statut professionnel</Label>
              <Select
                value={editMode ? (editedData.statut_professionnel || '') : (clientData.statut_professionnel || '')}
                onValueChange={(value) => setEditedData({ ...editedData, statut_professionnel: value })}
                disabled={!editMode}
              >
                <SelectTrigger className={editMode ? 'border-blue-300' : ''}>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Salarié">Salarié</SelectItem>
                  <SelectItem value="Indépendant">Indépendant</SelectItem>
                  <SelectItem value="Fonctionnaire">Fonctionnaire</SelectItem>
                  <SelectItem value="Retraité">Retraité</SelectItem>
                  <SelectItem value="Sans emploi">Sans emploi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Téléphone professionnel</Label>
              <Input
                value={editMode ? (editedData.telephone_professionnel || '') : (clientData.telephone_professionnel || '')}
                onChange={(e) => setEditedData({ ...editedData, telephone_professionnel: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Adresse professionnelle</Label>
              <Input
                value={editMode ? (editedData.adresse_professionnelle || '') : (clientData.adresse_professionnelle || '')}
                onChange={(e) => setEditedData({ ...editedData, adresse_professionnelle: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
              />
            </div>
          </CardContent>
        </Card>

        {/* Situation familiale */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-blue-600" />
              Situation familiale
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>État civil</Label>
              <Select
                value={editMode ? (editedData.etat_civil || '') : (clientData.etat_civil || '')}
                onValueChange={(value) => setEditedData({ ...editedData, etat_civil: value })}
                disabled={!editMode}
              >
                <SelectTrigger className={editMode ? 'border-blue-300' : ''}>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Célibataire">Célibataire</SelectItem>
                  <SelectItem value="Marié(e)">Marié(e)</SelectItem>
                  <SelectItem value="Pacsé(e)">Pacsé(e)</SelectItem>
                  <SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem>
                  <SelectItem value="Veuf(ve)">Veuf(ve)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Situation matrimoniale</Label>
              <Input
                value={editMode ? (editedData.situation_matrimoniale || '') : (clientData.situation_matrimoniale || '')}
                onChange={(e) => setEditedData({ ...editedData, situation_matrimoniale: e.target.value })}
                disabled={!editMode}
                className={editMode ? 'border-blue-300' : ''}
                placeholder="Ex: Communauté réduite aux acquêts"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
