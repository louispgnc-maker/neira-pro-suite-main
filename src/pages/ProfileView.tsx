import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Edit } from "lucide-react";

export default function ProfileView() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const [cabinetName, setCabinetName] = useState<string | null>(null);
  const [cabinetFonction, setCabinetFonction] = useState<string | null>(null);
  const [loadingCabinet, setLoadingCabinet] = useState(true);

  const loadUserCabinet = useCallback(async () => {
    if (!user) return;
    setLoadingCabinet(true);
    try {
      const { data, error } = await supabase
        .from('cabinet_members')
        .select('cabinets(nom, role), role_cabinet')
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error loading cabinet:', error);
        setCabinetName(null);
        setCabinetFonction(null);
      } else if (!data) {
        setCabinetName(null);
        setCabinetFonction(null);
      } else {
        const cabinetData = data.cabinets as any;
        const cabinetRole = cabinetData?.role;
        
        if (cabinetRole === role) {
          setCabinetName(cabinetData?.nom || null);
          setCabinetFonction(data.role_cabinet || null);
        } else {
          setCabinetName(null);
          setCabinetFonction(null);
        }
      }
    } catch (error) {
      console.error('Erreur chargement cabinet:', error);
      setCabinetName(null);
      setCabinetFonction(null);
    } finally {
      setLoadingCabinet(false);
    }
  }, [user, role]);

  useEffect(() => {
    loadUserCabinet();
  }, [loadUserCabinet]);

  const handleEditProfile = () => {
    navigate(role === 'notaire' ? '/notaires/profile/edit' : '/avocats/profile/edit');
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Mon profil</h1>
          <Button 
            onClick={handleEditProfile}
            className={role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}
          >
            <Edit className="w-4 h-4 mr-2" />
            Modifier mon profil
          </Button>
        </div>
        
        {/* Photo de profil */}
        <Card>
          <CardHeader>
            <CardTitle>Photo de profil</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            {profile?.photo_url ? (
              <img 
                src={profile.photo_url} 
                alt="Photo de profil" 
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-4xl font-bold border-4 border-gray-300">
                {profile?.first_name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informations personnelles */}
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Nom</div>
                <div className="text-base">{profile?.last_name || '—'}</div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Prénom</div>
                <div className="text-base">{profile?.first_name || '—'}</div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Email principal</div>
              <Badge variant="outline" className="text-sm">
                {user?.email || '—'}
              </Badge>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Espace</div>
              <Badge variant="outline" className={role === 'notaire' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                {role}
              </Badge>
            </div>

            {cabinetName && (
              <div>
                <div className="text-sm font-medium mb-2">Cabinet et fonction</div>
                {loadingCabinet ? (
                  <div className="text-sm text-muted-foreground">Chargement...</div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm bg-green-50 text-green-700 border-green-200">
                      {cabinetName}
                    </Badge>
                    {cabinetFonction && (
                      <Badge variant="outline" className={`text-sm ${role === 'notaire' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {cabinetFonction}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coordonnées professionnelles */}
        <Card>
          <CardHeader>
            <CardTitle>Coordonnées professionnelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Téléphone professionnel</div>
                <div className="text-base">{profile?.telephone_pro || '—'}</div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Email professionnel</div>
                <div className="text-base">{profile?.email_pro || '—'}</div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Adresse professionnelle</div>
              <div className="text-base whitespace-pre-line">{profile?.adresse_pro || '—'}</div>
            </div>
          </CardContent>
        </Card>

        {/* Signature */}
        <Card>
          <CardHeader>
            <CardTitle>Signature manuscrite / e-signature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.signature_url ? (
              <div className="border rounded-lg p-4 bg-gray-50">
                <img 
                  src={profile.signature_url} 
                  alt="Signature" 
                  className="max-h-32 object-contain"
                />
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                Aucune signature enregistrée
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
