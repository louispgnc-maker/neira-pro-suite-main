import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, CreditCard, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export default function NoCabinetOptions() {
  const navigate = useNavigate();
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserEmail(session.user.email || '');
        setUserId(session.user.id);
      }
    };
    loadUser();
  }, []);

  const handleJoinCabinet = async () => {
    if (!accessCode.trim()) {
      toast.error('Code d\'accès requis');
      return;
    }

    setLoading(true);
    try {
      // Récupérer la session actuelle
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Session expirée');
        return;
      }

      const currentUserId = session.user.id;
      
      // Récupérer l'email depuis auth.users directement
      const { data: userData, error: userError } = await supabase
        .from('auth.users')
        .select('email')
        .eq('id', currentUserId)
        .single();

      const currentEmail = userData?.email || session.user.email;

      console.log('🔍 Session user:', session.user);
      console.log('🔍 Email trouvé:', currentEmail);

      if (!currentEmail) {
        toast.error('Email introuvable dans votre compte');
        return;
      }

      // Vérifier le code d'accès
      const { data, error } = await supabase.rpc('verify_access_code', {
        code_param: accessCode.trim(),
        email_param: currentEmail
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; cabinet?: any };

      if (!result.success) {
        toast.error(result.error || 'Code invalide');
        return;
      }

      // Supprimer l'ancien membre s'il existe
      await supabase
        .from('cabinet_members')
        .delete()
        .eq('cabinet_id', result.cabinet.id)
        .eq('email', currentEmail);

      // Créer le nouveau membre directement
      console.log('📝 Tentative insertion avec:', {
        cabinet_id: result.cabinet.id,
        user_id: currentUserId,
        email: currentEmail
      });

      const { data: insertData, error: insertError } = await supabase
        .from('cabinet_members')
        .insert({
          cabinet_id: result.cabinet.id,
          user_id: currentUserId,
          email: currentEmail,
          nom: '',
          status: 'active',
          joined_at: new Date().toISOString()
        })
        .select();

      if (insertError) {
        console.error('❌ Erreur insert complète:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        });
        throw new Error(`Erreur: ${insertError.message} (${insertError.code})`);
      }

      console.log('✅ Insertion réussie:', insertData);

      toast.success('Cabinet rejoint !');
      
      // Attendre 500ms puis recharger
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.reload();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 py-12">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenue !</h1>
          <p className="text-gray-600">Vous n'êtes actuellement rattaché à aucun cabinet</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Option 1: Rejoindre un cabinet */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Rejoindre un cabinet</CardTitle>
              <CardDescription>
                Vous avez reçu un code d'accès de votre cabinet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Pas d'abonnement requis
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Accès immédiat aux outils du cabinet
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Collaborez avec votre équipe
                </li>
              </ul>
              
              {!showCodeInput ? (
                <Button className="w-full" onClick={() => setShowCodeInput(true)}>
                  Entrer mon code d'accès
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="accessCode">Code d'accès</Label>
                    <Input
                      id="accessCode"
                      placeholder="D87714..."
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      disabled={loading}
                      onKeyPress={(e) => e.key === 'Enter' && !loading && accessCode.trim() && handleJoinCabinet()}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      onClick={handleJoinCabinet}
                      disabled={loading || !accessCode.trim()}
                    >
                      {loading ? 'Connexion...' : 'Valider'}
                    </Button>
                    <Button 
                      variant="outline"
                      className="bg-white hover:bg-gray-50"
                      onClick={() => {
                        setShowCodeInput(false);
                        setAccessCode('');
                      }}
                      disabled={loading}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Option 2: Créer un cabinet */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-200" onClick={() => navigate('/test-subscription')}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Créer mon cabinet</CardTitle>
              <CardDescription>
                Souscrire à un abonnement pour votre cabinet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span>
                  Gestion complète de votre cabinet
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span>
                  Invitez des collaborateurs
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span>
                  Essai gratuit 14 jours
                </li>
              </ul>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" onClick={() => navigate('/test-subscription')}>
                Voir nos offres
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Vous rencontrez un problème ?{' '}
            <a href="mailto:contact@neira.fr" className="text-blue-600 hover:underline">
              Contactez-nous
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
