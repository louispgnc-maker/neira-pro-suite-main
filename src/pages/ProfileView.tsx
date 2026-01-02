import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Edit, CreditCard, Mail, Phone, MapPin, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import emailjs from '@emailjs/browser';

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
  const [isFounder, setIsFounder] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [cabinetId, setCabinetId] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [signatureCreditsTotal, setSignatureCreditsTotal] = useState(0);
  const [signatureCreditsCount, setSignatureCreditsCount] = useState(0);
  
  // État pour le formulaire de contact
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: ''
  });
  const [sendingContact, setSendingContact] = useState(false);

  const loadUserCabinet = useCallback(async () => {
    if (!user) return;
    setLoadingCabinet(true);
    try {
      // D'abord vérifier quelles lignes existent pour cet utilisateur
      const { data: allMemberships, error: debugError } = await supabase
        .from('cabinet_members')
        .select('*')
        .eq('user_id', user.id);
      
      const { data, error } = await supabase
        .from('cabinet_members')
        .select('cabinets(nom, role, id, owner_id), role_cabinet, status')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('❌ Error loading cabinet:', error);
        setCabinetName(null);
        setCabinetFonction(null);
        setIsFounder(false);
      } else if (!data) {
        setCabinetName(null);
        setCabinetFonction(null);
        setIsFounder(false);
      } else {
        const cabinetData = data.cabinets as any;
        const cabinetRole = cabinetData?.role;
        
        if (cabinetRole === role) {
          setCabinetName(cabinetData?.nom || null);
          setCabinetFonction(data.role_cabinet || null);
          setCabinetId(cabinetData?.id || null);
          const foundateur = data.role_cabinet?.toLowerCase() === 'fondateur';
          setIsFounder(foundateur);
          
          // Charger les infos d'abonnement si fondateur
          if (foundateur && cabinetData?.id) {
            await loadSubscriptionInfo(cabinetData.id);
            await loadMemberCount(cabinetData.id);
            await loadSignatureCredits(cabinetData.id);
          }
        } else {
          setCabinetName(null);
          setCabinetFonction(null);
          setIsFounder(false);
        }
      }
    } catch (error) {
      console.error('Erreur chargement cabinet:', error);
      setCabinetName(null);
      setCabinetFonction(null);
      setIsFounder(false);
    } finally {
      setLoadingCabinet(false);
    }
  }, [user, role]);

  const loadSubscriptionInfo = async (cabinetId: string) => {
    try {
      const { data, error } = await supabase
        .from('cabinets')
        .select('subscription_tier, subscription_status, subscription_started_at')
        .eq('id', cabinetId)
        .single();
      
      if (!error && data) {
        setSubscriptionInfo(data);
      }
    } catch (error) {
      console.error('Erreur chargement abonnement:', error);
    }
  };

  const loadMemberCount = async (cabinetId: string) => {
    try {
      const { count, error } = await supabase
        .from('cabinet_members')
        .select('*', { count: 'exact', head: true })
        .eq('cabinet_id', cabinetId)
        .in('status', ['active', 'inactive']);
      
      if (!error && count !== null) {
        setMemberCount(count);
      }
    } catch (error) {
      console.error('Erreur chargement nombre de membres:', error);
    }
  };

  const loadSignatureCredits = async (cabinetId: string) => {
    try {
      const { data, error } = await supabase
        .from('cabinet_members')
        .select('signature_addon_quantity, signature_addon_price')
        .eq('cabinet_id', cabinetId)
        .in('status', ['active', 'inactive'])
        .not('signature_addon_quantity', 'is', null);
      
      if (!error && data) {
        const totalPrice = data.reduce((sum, member) => {
          return sum + (member.signature_addon_price || 0);
        }, 0);
        const totalQuantity = data.reduce((sum, member) => {
          return sum + (member.signature_addon_quantity || 0);
        }, 0);
        setSignatureCreditsTotal(totalPrice);
        setSignatureCreditsCount(totalQuantity);
      }
    } catch (error) {
      console.error('Erreur chargement crédits signatures:', error);
    }
  };

  useEffect(() => {
    loadUserCabinet();
  }, [loadUserCabinet]);

  // Initialize EmailJS
  useEffect(() => {
    emailjs.init('5W-s-TGNKX6CkmGu3');
  }, []);

  const handleEditProfile = () => {
    navigate(role === 'notaire' ? '/notaires/profile/edit' : '/avocats/profile/edit');
  };

  const handleSendContact = async () => {
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSendingContact(true);
    try {
      // D'abord, sauvegarder dans Supabase (prioritaire)
      const { error: dbError } = await supabase
        .from('contact_messages')
        .insert({
          user_id: user?.id,
          first_name: profile?.first_name || profile?.nom || '',
          last_name: profile?.last_name || profile?.prenom || '',
          email: user?.email || '',
          company: cabinetName || null,
          subject: contactForm.subject,
          message: contactForm.message,
          status: 'new'
        });

      if (dbError) {
        console.error('Error saving to database:', dbError);
        throw dbError;
      }

      // Ensuite, envoyer les emails via EmailJS
      try {
        // Send confirmation email to client
        await emailjs.send(
          'service_pplgv88',
          'template_ss4jq2s',
          {
            from_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`,
            from_email: user?.email || '',
            company: cabinetName || '',
            subject: contactForm.subject,
            message: contactForm.message,
          }
        );

        // Send notification email to Neira team
        await emailjs.send(
          'service_pplgv88',
          'template_u6upq8f',
          {
            from_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`,
            from_email: user?.email || '',
            company: cabinetName || '',
            subject: contactForm.subject,
            message: contactForm.message,
          }
        );
      } catch (emailError) {
        // L'email a échoué mais le message est sauvegardé dans la DB
        console.log('Email notification failed (non-critical):', emailError);
      }

      toast.success('Message envoyé avec succès !', {
        description: 'Nous vous répondrons dans les plus brefs délais.'
      });

      // Reset form
      setContactForm({ subject: '', message: '' });
    } catch (error) {
      console.error('Contact form error:', error);
      toast.error('Erreur lors de l\'envoi', {
        description: 'Veuillez réessayer plus tard ou nous contacter directement à contact@neira.fr'
      });
    } finally {
      setSendingContact(false);
    }
  };

  const getSubscriptionPrice = (tier: string) => {
    const prices: Record<string, number> = {
      'essentiel': 39,
      'professionnel': 59,
      'cabinet-plus': 89,
      'free': 0,
      'basic': 29,
      'pro': 79,
      'enterprise': 0
    };
    return prices[tier] || 0;
  };

  const calculateMonthlyTotal = () => {
    const tierPrice = getSubscriptionPrice(subscriptionInfo?.subscription_tier || 'free');
    const membersCost = tierPrice * memberCount;
    // Ajouter les crédits signatures payants (montant unique, pas mensuel)
    return membersCost + signatureCreditsTotal;
  };

  const getSubscriptionMonth = () => {
    if (!subscriptionInfo?.subscription_started_at) return 1;
    const startDate = new Date(subscriptionInfo.subscription_started_at);
    const now = new Date();
    const months = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()) + 1;
    return Math.max(1, months);
  };

  const getNextPaymentDate = () => {
    if (!subscriptionInfo?.subscription_started_at) return new Date();
    const startDate = new Date(subscriptionInfo.subscription_started_at);
    const nextDate = new Date(startDate);
    nextDate.setMonth(nextDate.getMonth() + getSubscriptionMonth());
    return nextDate;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }).format(date);
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Paramètres</h1>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className={`grid w-full ${isFounder ? 'grid-cols-3' : 'grid-cols-2'} mb-6`}>
            <TabsTrigger value="profile">Profil</TabsTrigger>
            {isFounder && (
              <TabsTrigger value="billing">
                <CreditCard className="w-4 h-4 mr-2" />
                Facturation
              </TabsTrigger>
            )}
            <TabsTrigger value="contact">
              <Mail className="w-4 h-4 mr-2" />
              Contact
            </TabsTrigger>
          </TabsList>

          {/* Onglet Profil */}
          <TabsContent value="profile" className="space-y-6">
            <div className="flex items-center justify-end">
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
          </TabsContent>

          {/* Onglet Facturation (seulement pour les fondateurs) */}
          {isFounder && (
            <TabsContent value="billing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Facturation du cabinet</CardTitle>
                  <CardDescription>
                    Détails de facturation mensuelle pour votre cabinet
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {/* Informations cabinet */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">Facturation mensuelle</h3>
                        <Badge className="bg-green-600">Actif</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{cabinetName}</p>
                    </div>

                    {/* Détails abonnement */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg bg-white">
                        <div className="text-sm font-medium text-muted-foreground mb-1">Formule d'abonnement</div>
                        <div className="text-2xl font-bold capitalize">
                          {subscriptionInfo?.subscription_tier || 'Free'}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {getSubscriptionPrice(subscriptionInfo?.subscription_tier || 'free')}€/mois par membre
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg bg-white">
                        <div className="text-sm font-medium text-muted-foreground mb-1">Nombre de membres</div>
                        <div className="text-2xl font-bold">
                          {memberCount}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {memberCount > 1 ? 'Membres actifs' : 'Membre actif'}
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg bg-white">
                        <div className="text-sm font-medium text-muted-foreground mb-1">Crédits signatures</div>
                        <div className="text-2xl font-bold">
                          {signatureCreditsCount > 0 ? signatureCreditsCount : '—'}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {signatureCreditsTotal > 0 ? `${signatureCreditsTotal}€ payés` : 'Aucun crédit acheté'}
                        </div>
                      </div>
                    </div>

                    {/* Informations de facturation - discret */}
                    <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                      <p>
                        Abonné depuis le {subscriptionInfo?.subscription_started_at 
                          ? formatDate(new Date(subscriptionInfo.subscription_started_at))
                          : '—'
                        } · {getSubscriptionMonth()}{getSubscriptionMonth() === 1 ? 'ère' : 'ème'} mensualité · Prochain paiement le <span className="font-bold underline">{formatDate(getNextPaymentDate())}</span>
                      </p>
                    </div>

                    {/* Total mensuel */}
                    <div className="p-6 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm opacity-90 mb-1">Total mensuel</div>
                          <div className="text-3xl font-bold">
                            {calculateMonthlyTotal()}€
                          </div>
                          <div className="text-sm opacity-90 mt-1">
                            {memberCount} × {getSubscriptionPrice(subscriptionInfo?.subscription_tier || 'free')}€{signatureCreditsTotal > 0 ? ` + ${signatureCreditsTotal}€ (signatures)` : ''}
                          </div>
                        </div>
                        <CreditCard className="w-12 h-12 opacity-50" />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                      <Button 
                        onClick={() => navigate(role === 'notaire' ? '/notaires/subscription' : '/avocats/subscription')}
                        className={role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}
                      >
                        Modifier l'abonnement
                      </Button>
                      <Button variant="outline">
                        Voir les factures
                      </Button>
                    </div>

                    {/* Note informative */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900">
                        💡 <strong>Note :</strong> Les crédits signatures seront ajoutés automatiquement
                        selon votre utilisation mensuelle. Vous serez facturé uniquement pour les signatures
                        effectuées au-delà de votre quota inclus dans l'abonnement.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Onglet Contact */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Nous contacter</CardTitle>
                <CardDescription>
                  Une question, un problème ou une suggestion ? N'hésitez pas à nous contacter
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input
                        id="firstName"
                        value={profile?.first_name || profile?.nom || ''}
                        disabled
                        className="mt-1 bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Nom</Label>
                      <Input
                        id="lastName"
                        value={profile?.last_name || profile?.prenom || ''}
                        disabled
                        className="mt-1 bg-gray-50"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="mt-1 bg-gray-50"
                    />
                  </div>

                  {cabinetName && (
                    <div>
                      <Label htmlFor="company">Cabinet / Entreprise</Label>
                      <Input
                        id="company"
                        value={cabinetName}
                        disabled
                        className="mt-1 bg-gray-50"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="subject">Titre / Objet *</Label>
                    <Input
                      id="subject"
                      placeholder="Objet de votre message"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      placeholder="Décrivez votre besoin ou posez votre question..."
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      className="mt-1 min-h-[150px]"
                      required
                      rows={6}
                    />
                  </div>

                  <Button 
                    onClick={handleSendContact}
                    disabled={sendingContact}
                    className={`w-full ${role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                  >
                    {sendingContact ? 'Envoi en cours...' : 'Envoyer le message'}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    * Champs obligatoires
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
