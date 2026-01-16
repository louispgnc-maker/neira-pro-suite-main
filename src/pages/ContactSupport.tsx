import { useState, FormEvent, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function ContactSupport() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const role: 'avocat' | 'notaire' = location.pathname.includes('/notaires') ? 'notaire' : 'avocat';
  const prefix = role === 'notaire' ? '/notaires' : '/avocats';

  const [formData, setFormData] = useState({
    firstName: profile?.first_name || "",
    lastName: profile?.last_name || "",
    email: user?.email || "",
    company: "",
    subject: "",
    message: "",
  });

  // Update form data when profile loads
  useEffect(() => {
    if (profile && user) {
      setFormData(prev => ({
        ...prev,
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
        email: user.email || "",
      }));
    }
  }, [profile, user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // D'abord, sauvegarder dans Supabase (prioritaire)
      const { error: dbError } = await supabase
        .from('contact_messages')
        .insert({
          user_id: user?.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          company: formData.company || null,
          subject: formData.subject,
          message: formData.message,
          status: 'new'
        });

      if (dbError) {
        console.error('Error saving to database:', dbError);
        throw dbError;
      }

      // Ensuite, envoyer les emails via Resend
      try {
        const { error: emailError } = await supabase.functions.invoke('send-support-email', {
          body: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            company: formData.company || null,
            subject: formData.subject,
            message: formData.message,
            userId: user?.id,
          }
        });

        if (emailError) {
          console.log('Email notification failed (non-critical):', emailError);
        }
      } catch (emailError) {
        // L'email a échoué mais le message est sauvegardé dans la DB
        console.log('Email notification failed (non-critical):', emailError);
      }

      toast.success('Message envoyé avec succès !', {
        description: 'Nous vous répondrons dans les plus brefs délais.'
      });

      // Reset form
      setFormData({
        firstName: profile?.first_name || "",
        lastName: profile?.last_name || "",
        email: user?.email || "",
        company: "",
        subject: "",
        message: "",
      });

    } catch (error) {
      console.error('Contact form error:', error);
      toast.error('Erreur lors de l\'envoi', {
        description: 'Veuillez réessayer plus tard ou nous contacter directement à contact@neira.fr'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-8 max-w-4xl">
        {/* Bouton retour */}
        <div className="mb-8">
          <Button
            onClick={() => navigate(-1)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">
            Contactez notre équipe
          </h1>
          <p className="text-black text-lg">
            Une question sur votre abonnement ou besoin d'aide ? Remplissez le formulaire ci-dessous et nous vous répondrons rapidement.
          </p>
        </div>

        {/* Formulaire de contact */}
        <Card className="bg-card border-2 border-primary/30">
          <CardHeader>
            <CardTitle className="text-2xl text-black flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Formulaire de contact
            </CardTitle>
            <CardDescription className="text-black">
              Tous les champs sont obligatoires
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-black">Prénom</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-black">Nom</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-black">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="text-black">Cabinet / Entreprise</Label>
                <Input
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  required
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-black">Sujet</Label>
                <Input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Question sur mon abonnement"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-black">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  placeholder="Décrivez votre demande en détail..."
                  className="bg-background resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                {isSubmitting ? (
                  "Envoi en cours..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer le message
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Informations complémentaires */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border border-primary/30">
            <CardHeader>
              <CardTitle className="text-lg text-black">Temps de réponse</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-black text-sm">
                Nous nous engageons à répondre à toutes les demandes sous 24h ouvrées.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-primary/30">
            <CardHeader>
              <CardTitle className="text-lg text-black">Support prioritaire</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-black text-sm">
                Les abonnés Cabinet+ bénéficient d'un support prioritaire 7j/7.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
