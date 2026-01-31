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
  const [firstName, setFirstName] = useState('');
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

  useEffect(() => {
    const loadUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, prenom')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setFirstName(profile.first_name || profile.prenom || 'Utilisateur');
        }
      }
    };
    loadUserProfile();
  }, []);

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

      console.log('🔐 Utilisateur connecté:', user.id);
      console.log('📋 Données du formulaire:', formData);

      // Nettoyer complètement les anciennes données de test
      console.log('🧹 Nettoyage complet des anciennes données...');
      
      // 1. Récupérer tous les cabinets de cet utilisateur pour ce rôle
      const { data: oldCabinets } = await supabase
        .from('cabinets')
        .select('id')
        .eq('owner_id', user.id)
        .eq('role', profession || 'avocat');

      if (oldCabinets && oldCabinets.length > 0) {
        console.log('📦 Anciens cabinets trouvés:', oldCabinets.length);
        
        // 2. Supprimer d'abord les membres de ces cabinets (évite les contraintes)
        for (const cabinet of oldCabinets) {
          await supabase
            .from('cabinet_members')
            .delete()
            .eq('cabinet_id', cabinet.id);
        }
        
        // 3. Puis supprimer les cabinets
        await supabase
          .from('cabinets')
          .delete()
          .eq('owner_id', user.id)
          .eq('role', profession || 'avocat');
          
        console.log('✅ Nettoyage terminé');
      }

      // 4. Créer le nouveau cabinet via la fonction RPC
      console.log('🏢 Création du nouveau cabinet...');
      const { data: cabinetId, error: cabinetError } = await supabase.rpc('create_cabinet', {
        nom_param: formData.name,
        raison_sociale_param: formData.name,
        siret_param: formData.siret,
        adresse_param: formData.address,
        code_postal_param: '',
        ville_param: '',
        telephone_param: formData.phone,
        email_param: formData.email,
        role_param: profession || 'avocat'
      });

      if (cabinetError) {
        console.error('❌ Erreur création cabinet:', cabinetError);
        throw cabinetError;
      }

      console.log('✅ Cabinet créé avec ID:', cabinetId);

      // Stocker le cabinet_id pour le webhook Stripe
      const sessionId = localStorage.getItem('pending_cabinet_session');
      if (sessionId && cabinetId) {
        localStorage.setItem(`cabinet_for_session_${sessionId}`, cabinetId);
        localStorage.removeItem('pending_cabinet_session');
      }

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
            {firstName && (
              <div className="mb-4">
                <p className="text-xl font-semibold text-gray-800">
                  Bienvenue {firstName} 👋
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Veuillez maintenant créer votre cabinet
                </p>
              </div>
            )}
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
