import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCircle, Lock, Mail, Eye, EyeOff, Scale, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function CreateAccountAfterPayment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const urlRole = searchParams.get('role') as 'avocat' | 'notaire' | null;
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'avocat' | 'notaire' | null>(urlRole);

  // Si pas de rôle dans l'URL, rediriger vers sélection profession
  useEffect(() => {
    if (!urlRole && !selectedRole) {
      // Stocker les params pour revenir après sélection
      if (sessionId) {
        sessionStorage.setItem('pending_account_session', sessionId);
      }
      navigate('/select-profession');
    } else if (urlRole && !selectedRole) {
      setSelectedRole(urlRole);
    }
  }, [urlRole, selectedRole, sessionId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (!selectedRole) {
      toast.error("Veuillez sélectionner votre profession");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      
      console.log('🔐 Création compte avec rôle:', selectedRole);
      
      // Créer le compte avec Supabase Auth avec le rôle
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: fullName,
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: selectedRole, // Ajouter le rôle dans les métadonnées
          },
          emailRedirectTo: undefined, // Pas de redirection email
          // Désactiver l'email de confirmation car déjà validé par paiement Stripe
          // L'utilisateur a payé, donc email valide
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Erreur lors de la création du compte");
      }

      // Créer l'utilisateur dans la table users
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: formData.email,
          full_name: fullName,
        });

      if (userError) {
        console.error('Erreur création user:', userError);
      }

      // Le profil est créé automatiquement par le trigger handle_new_user()
      // Vérifier que le profil existe et le créer/mettre à jour si nécessaire
      let retries = 0;
      let profileExists = false;
      
      while (retries < 5 && !profileExists) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', authData.user.id)
          .single();
        
        if (profile) {
          profileExists = true;
          console.log('✅ Profil créé automatiquement par trigger');
        } else {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Si après 5 tentatives le profil n'existe toujours pas, le créer manuellement
      if (!profileExists) {
        console.loselectedR('⚠️ Trigger n\'a pas créé le profil, création manuelle...');
        const { error: manualProfileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: formData.email,
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: role
          });
        
        if (manualProfileError) {
          console.error('❌ Erreur création manuelle profil:', manualProfileError);
        } else {
          console.log('✅ Profil créé manuellement');
        }
      } else {
        // Le profil existe : mettre à jour le rôle ET les infos
        console.log('🔄 Mise à jour du profil avec le rôle:', selectedRole);
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: selectedRole
          })
          .eq('id', authData.user.id);
        
        if (updateProfileError) {
          console.error('❌ Erreur mise à jour profil:', updateProfileError);
        } else {
          console.log('✅ Profil mis à jour avec rôle:', selectedRole);
        }
      }

      // Stocker le session_id et les infos de plan dans localStorage pour le lier au cabinet
      if (sessionId) {
        localStorage.setItem('pending_cabinet_session', sessionId);
        // Note: les infos de plan seront récupérées depuis le webhook Stripe
      }

      toast.success("Compte créé avec succès !", {
        description: "Vous allez être redirigé pour créer votre cabinet"
      });

      // Rediriger vers la création du cabinet avec le rôle
      setTimeout(() => {
        navigate(`/onboarding/create-cabinet?profession=${selectedRole}`);
      }, 1500);

    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error("Erreur lors de la création du compte", {
        description: error.message
      });
      setLoading(false);
    }
  };

  // Empêcher le retour arrière
  window.history.pushState(null, '', window.location.href);
  window.onpopstate = () => {
    window.history.pushState(null, '', window.location.href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <UserCircle className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          
          <CardTitle className="text-2xl font-bold text-gray-900">
            Créez votre compte professionnel
          </CardTitle>
          
          <p className="text-sm text-gray-600 mt-2">
            Dernière étape avant d'accéder à votre espace
          </p>
        </CardHeader>

        <CardContent>
          {/* Sélection de profession si pas dans l'URL */}
          {!selectedRole && (
            <div className="space-y-4 mb-6">
              <Label className="text-center block text-base font-semibold">
                Je suis...
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-500"
                  onClick={() => setSelectedRole('avocat')}
                >
                  <Scale className="w-8 h-8 text-blue-600" />
                  <span className="font-semibold">Avocat</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-orange-50 hover:border-orange-500"
                  onClick={() => setSelectedRole('notaire')}
                >
                  <Building2 className="w-8 h-8 text-orange-600" />
                  <span className="font-semibold">Notaire</span>
                </Button>
              </div>
            </div>
          )}

          {selectedRole && (
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <p className="text-sm text-center text-gray-700">
                Espace : <span className="font-bold capitalize">{selectedRole}</span>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-gray-700">
                  Prénom
                </Label>
                <div className="relative mt-1">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="firstName"
                    type="text"
                    required
                    placeholder="Jean"
                    className="pl-10"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="lastName" className="text-gray-700">
                  Nom
                </Label>
                <div className="relative mt-1">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="lastName"
                    type="text"
                    required
                    placeholder="Dupont"
                    className="pl-10"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-700">
                Email professionnel
              </Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="vous@cabinet.fr"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-700">
                Mot de passe
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Minimum 8 caractères"
                  className="pl-10 pr-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Minimum 8 caractères
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-gray-700">
                Confirmer le mot de passe
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Confirmez votre mot de passe"
                  className="pl-10"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                🔒 Vos données sont sécurisées et chiffrées
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
              disabled={loading}
            >
              {loading ? "Création du compte..." : "Créer mon compte →"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
