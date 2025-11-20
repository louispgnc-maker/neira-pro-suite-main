import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import emailjs from '@emailjs/browser';

export default function Contact() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });

  // Initialize EmailJS
  useEffect(() => {
    emailjs.init('5W-s-TGNKX6CkmGu3');
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Send email using EmailJS
      await emailjs.send(
        'service_pplgv88',
        'template_ss4jq2s',
        {
          from_name: `${formData.firstName} ${formData.lastName}`,
          from_email: formData.email,
          phone: formData.phone,
          company: formData.company,
          message: formData.message,
        }
      );

      toast.success("Message envoyé avec succès !", {
        description: "Nous vous répondrons dans les plus brefs délais.",
      });

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        message: "",
      });
    } catch (error) {
      console.error('EmailJS Error:', error);
      toast.error("Erreur lors de l'envoi", {
        description: "Veuillez réessayer plus tard.",
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
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50"
      style={{
        backgroundImage:
          'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Design%20sans%20titre-4.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 bg-white/70 backdrop-blur border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Retour</span>
            </button>
            <div className="flex items-center gap-2">
              <img
                src="https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Design_sans_titre-3-removebg-preview.png"
                alt="Neira"
                className="w-8 h-8 rounded-md object-cover"
              />
              <span className="font-bold text-gray-800">Neira</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left - Contact Info */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Contactez-nous
              </h1>
              <p className="text-gray-600 mb-8">
                Notre équipe est à votre disposition pour répondre à toutes vos questions sur Neira.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Email</h3>
                    <p className="text-gray-600">contact@neira.fr</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Téléphone</h3>
                    <p className="text-gray-600">+33 1 23 45 67 89</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Adresse</h3>
                    <p className="text-gray-600">
                      123 Avenue des Champs-Élysées
                      <br />
                      75008 Paris, France
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-3">Horaires d'ouverture</h3>
                <p className="text-gray-600 text-sm">
                  Lundi - Vendredi : 9h00 - 18h00
                  <br />
                  Samedi - Dimanche : Fermé
                </p>
              </div>
            </div>

            {/* Right - Contact Form */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Envoyez-nous un message
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Prénom *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Nom *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      placeholder="Dupont"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="jean.dupont@exemple.fr"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>

                <div>
                  <Label htmlFor="company">Cabinet / Entreprise</Label>
                  <Input
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Nom de votre cabinet"
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    placeholder="Décrivez votre besoin ou posez votre question..."
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isSubmitting ? "Envoi en cours..." : "Envoyer le message"}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  * Champs obligatoires
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
