import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { Building2, Loader2 } from 'lucide-react';

export default function OnboardingCreateCabinet() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const profession = searchParams.get('profession') as 'avocat' | 'notaire' | null;
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    siret: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (!profession) {
      navigate('/select-profession');
    }
  }, [profession, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Veuillez vous connecter');
        navigate('/auth');
        return;
      }

      // Créer le cabinet via la fonction RPC (crée automatiquement le cabinet et ajoute le fondateur)
      const { data: cabinetId, error: cabinetError } = await supabase.rpc('create_cabinet', {
        nom_param: formData.name,
        raison_sociale_param: formData.name, // Utiliser le nom comme raison sociale par défaut
        siret_param: formData.siret,
        adresse_param: formData.address,
        code_postal_param: '', // Sera complété plus tard si nécessaire
        ville_param: '', // Sera complété plus tard si nécessaire
        telephone_param: formData.phone,
        email_param: formData.email,
        role_param: profession || 'avocat'
      });

      if (cabinetError) throw cabinetError;

      // Stocker le cabinet_id pour le webhook
      const sessionId = localStorage.getItem('pending_cabinet_session');
      if (sessionId && cabinetId) {
        // Stocker temporairement le lien session -> cabinet
        localStorage.setItem(`cabinet_for_session_${sessionId}`, cabinetId);
        localStorage.removeItem('pending_cabinet_session');
      }

      // Mettre à jour le profil utilisateur avec le rôle et le cabinet
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: profession,
          cabinet_id: cabinetId
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success('Cabinet créé avec succès !', {
        description: 'Redirection vers votre espace professionnel...'
      });
      
      // Rediriger vers le dashboard approprié sans recharger la page
      // Le système de routing chargera automatiquement le nouveau contexte
      setTimeout(() => {
        navigate(`/${profession}s/dashboard`, { replace: true });
      }, 1500);
      
    } catch (error: any) {
      console.error('Erreur création cabinet:', error);
      toast.error(error.message || 'Erreur lors de la création du cabinet');
    } finally {
      setLoading(false);
    }
  };

  if (!profession) return null;

  const color = profession === 'avocat' ? 'blue' : 'orange';

  return (
    <div className="min-h-screen relative bg-gray-50">
      <div className="relative flex-1 flex items-center justify-center px-6 py-24">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-${color}-600 to-${color}-700 flex items-center justify-center shadow-lg`}>
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl">Créez votre cabinet</CardTitle>
            <CardDescription>
              Dernière étape pour accéder à votre espace professionnel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Nom du cabinet *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Cabinet Dupont & Associés"
                />
              </div>

              <div>
                <Label htmlFor="address">Adresse *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  placeholder="123 rue de la République, 75001 Paris"
                />
              </div>

              <div>
                <Label htmlFor="siret">SIRET *</Label>
                <Input
                  id="siret"
                  value={formData.siret}
                  onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                  required
                  placeholder="123 456 789 00012"
                  maxLength={14}
                />
              </div>

              <div>
                <Label htmlFor="phone">Téléphone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  placeholder="01 23 45 67 89"
                />
              </div>

              <div>
                <Label htmlFor="email">Email du cabinet *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="contact@cabinet.fr"
                />
              </div>

              <Button
                type="submit"
                className={`w-full bg-${color}-600 hover:bg-${color}-700 text-white`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  'Créer mon cabinet'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
