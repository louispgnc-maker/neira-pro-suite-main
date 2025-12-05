import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Camera, Save } from "lucide-react";

export default function Profile() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const [cabinetName, setCabinetName] = useState<string | null>(null);
  const [cabinetFonction, setCabinetFonction] = useState<string | null>(null);
  const [loadingCabinet, setLoadingCabinet] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // États du formulaire
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [fonction, setFonction] = useState("");
  const [telephonePro, setTelephonePro] = useState("");
  const [emailPro, setEmailPro] = useState("");
  const [adressePro, setAdressePro] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const loadUserCabinet = useCallback(async () => {
    if (!user) return;
    setLoadingCabinet(true);
    try {
      // Récupérer le cabinet et la fonction (role_cabinet) de l'utilisateur
      const { data, error } = await supabase
        .from('cabinet_members')
        .select('cabinets(nom, role), role_cabinet')
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .limit(1)
        .single();
      
      if (error || !data) {
        setCabinetName(null);
        setCabinetFonction(null);
      } else {
        const cabinetData = data.cabinets as any;
        const cabinetRole = cabinetData?.role;
        
        // Vérifier si le rôle correspond à l'espace actuel
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

  useEffect(() => {
    // Charger les données du profil
    if (profile) {
      setNom(profile.last_name || "");
      setPrenom(profile.first_name || "");
      // Ne pas charger fonction depuis profile, on l'affiche depuis le cabinet
      setTelephonePro(profile.telephone_pro || "");
      setEmailPro(profile.email_pro || user?.email || "");
      setAdressePro(profile.adresse_pro || "");
      setPhotoUrl(profile.photo_url || "");
      setSignatureUrl(profile.signature_url || "");
    }
  }, [profile, user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Vérifier la taille du fichier (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La photo ne doit pas dépasser 5 MB");
      return;
    }

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      toast.error("Le fichier doit être une image");
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-photo-${Date.now()}.${fileExt}`;
      
      console.log('Uploading file:', fileName, 'Size:', file.size, 'Type:', file.type);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(fileName, file, { 
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName);

      console.log('Public URL:', publicUrl);

      setPhotoUrl(publicUrl);
      
      // Sauvegarder immédiatement dans la base
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }
      
      toast.success("Photo téléchargée");
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error(error.message || "Erreur lors du téléchargement");
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-signature-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName);

      setSignatureUrl(publicUrl);
      
      // Sauvegarder immédiatement dans la base
      await supabase
        .from('profiles')
        .update({ signature_url: publicUrl })
        .eq('id', user.id);
      
      toast.success("Signature téléchargée");
    } catch (error: any) {
      console.error('Error uploading signature:', error);
      toast.error(error.message || "Erreur lors du téléchargement");
    }
  };

  const handleDeletePhoto = async () => {
    if (!user || !photoUrl) return;
    
    try {
      setPhotoUrl("");
      
      await supabase
        .from('profiles')
        .update({ photo_url: null })
        .eq('id', user.id);
      
      toast.success("Photo supprimée");
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          last_name: nom,
          first_name: prenom,
          telephone_pro: telephonePro,
          email_pro: emailPro,
          adresse_pro: adressePro,
          photo_url: photoUrl,
          signature_url: signatureUrl
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Profil mis à jour");
      
      // Rediriger vers la page de profil en lecture seule
      navigate(role === 'notaire' ? '/notaires/profile' : '/avocats/profile');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Mon profil</h1>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className={role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
        
        {/* Photo de profil */}
        <Card>
          <CardHeader>
            <CardTitle>Photo de profil</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="relative">
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt="Photo de profil" 
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-4xl font-bold border-4 border-gray-300">
                  {prenom?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <button
                onClick={() => photoInputRef.current?.click()}
                className={`absolute bottom-0 right-0 p-2 rounded-full ${role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} text-white shadow-lg`}
              >
                <Camera className="w-5 h-5" />
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <p>Format recommandé : JPG ou PNG</p>
                <p>Taille max : 5 MB</p>
              </div>
              {photoUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeletePhoto}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Supprimer la photo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informations personnelles */}
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Votre nom"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <Input
                  id="prenom"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Votre prénom"
                />
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
              <div className="space-y-2">
                <Label htmlFor="telephonePro">Téléphone professionnel</Label>
                <Input
                  id="telephonePro"
                  type="tel"
                  value={telephonePro}
                  onChange={(e) => setTelephonePro(e.target.value)}
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emailPro">Email professionnel</Label>
                <Input
                  id="emailPro"
                  type="email"
                  value={emailPro}
                  onChange={(e) => setEmailPro(e.target.value)}
                  placeholder="nom@cabinet.fr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adressePro">Adresse professionnelle</Label>
              <Textarea
                id="adressePro"
                value={adressePro}
                onChange={(e) => setAdressePro(e.target.value)}
                placeholder="Adresse du cabinet..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Signature */}
        <Card>
          <CardHeader>
            <CardTitle>Signature manuscrite / e-signature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {signatureUrl ? (
              <div className="border rounded-lg p-4 bg-gray-50">
                <img 
                  src={signatureUrl} 
                  alt="Signature" 
                  className="max-h-32 object-contain"
                />
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                Aucune signature enregistrée
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => signatureInputRef.current?.click()}
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" />
              {signatureUrl ? "Changer la signature" : "Ajouter une signature"}
            </Button>
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleSignatureUpload}
            />
            <p className="text-xs text-muted-foreground">
              Téléchargez une image de votre signature manuscrite ou une signature électronique
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
