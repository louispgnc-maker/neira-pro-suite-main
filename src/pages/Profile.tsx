import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Camera, Save } from "lucide-react";

export default function Profile() {
  const { user, profile } = useAuth();
  const location = useLocation();
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const [cabinetName, setCabinetName] = useState<string | null>(null);
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
      const { data: cabinetsData, error } = await supabase.rpc('get_user_cabinets');
      if (error) throw error;
      const cabinets = Array.isArray(cabinetsData) ? (cabinetsData as unknown[]) : [];
      const filtered = cabinets.filter((c) => ((c as Record<string, unknown>)['role'] === role));
      if (filtered && filtered.length > 0) {
        const nom = (filtered[0] as Record<string, unknown>)['nom'];
        setCabinetName(typeof nom === 'string' && nom.trim() ? nom : null);
      } else {
        setCabinetName(null);
      }
    } catch (error) {
      console.error('Erreur chargement cabinet:', error);
      setCabinetName(null);
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
      setFonction(profile.fonction || "");
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

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-photo-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName);

      setPhotoUrl(publicUrl);
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
      toast.success("Signature téléchargée");
    } catch (error: any) {
      console.error('Error uploading signature:', error);
      toast.error(error.message || "Erreur lors du téléchargement");
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
          fonction,
          telephone_pro: telephonePro,
          email_pro: emailPro,
          adresse_pro: adressePro,
          photo_url: photoUrl,
          signature_url: signatureUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Profil mis à jour");
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
            <div className="text-sm text-muted-foreground">
              <p>Format recommandé : JPG ou PNG</p>
              <p>Taille max : 5 MB</p>
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

            <div className="space-y-2">
              <Label htmlFor="fonction">Fonction</Label>
              <Select value={fonction} onValueChange={setFonction}>
                <SelectTrigger id="fonction">
                  <SelectValue placeholder="Sélectionnez votre fonction" />
                </SelectTrigger>
                <SelectContent className={role === 'notaire' ? 'bg-orange-50' : 'bg-blue-50'}>
                  <SelectItem value="Avocat">Avocat</SelectItem>
                  <SelectItem value="Notaire">Notaire</SelectItem>
                  <SelectItem value="Juriste">Juriste</SelectItem>
                  <SelectItem value="Stagiaire">Stagiaire</SelectItem>
                  <SelectItem value="Clerc">Clerc</SelectItem>
                  <SelectItem value="Collaborateur">Collaborateur</SelectItem>
                  <SelectItem value="Associé">Associé</SelectItem>
                </SelectContent>
              </Select>
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

            <div>
              <div className="text-sm font-medium mb-2">Cabinet</div>
              {loadingCabinet ? (
                <div className="text-sm text-muted-foreground">Chargement...</div>
              ) : cabinetName ? (
                <Badge variant="outline" className="text-sm bg-green-50 text-green-700 border-green-200">
                  {cabinetName}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-sm">
                  Aucun cabinet
                </Badge>
              )}
            </div>
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
