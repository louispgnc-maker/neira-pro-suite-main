import { useState, FormEvent, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, Instagram, Linkedin } from "lucide-react";
import emailjs from '@emailjs/browser';

export default function Contact() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);
  const [connOpen, setConnOpen] = useState(false);
  const whoRef = useRef<HTMLDivElement>(null);
  const connRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    subject: "",
    message: "",
  });

  // Initialize EmailJS
  useEffect(() => {
    emailjs.init('5W-s-TGNKX6CkmGu3');
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (whoRef.current && !whoRef.current.contains(event.target as Node)) {
        setWhoOpen(false);
      }
      if (connRef.current && !connRef.current.contains(event.target as Node)) {
        setConnOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Send confirmation email to client
      await emailjs.send(
        'service_pplgv88',
        'template_ss4jq2s',
        {
          from_name: `${formData.firstName} ${formData.lastName}`,
          from_email: formData.email,
          company: formData.company,
          subject: formData.subject,
          message: formData.message,
        }
      );

      // Send notification email to you
      await emailjs.send(
        'service_pplgv88',
        'template_u6upq8f',
        {
          from_name: `${formData.firstName} ${formData.lastName}`,
          from_email: formData.email,
          company: formData.company,
          subject: formData.subject,
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
        company: "",
        subject: "",
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
        paddingLeft: '1cm',
        paddingRight: '1cm',
        backgroundImage:
          'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Design%20sans%20titre-4.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 bg-white/70 backdrop-blur border-b border-border">
        <div style={{ paddingLeft: '2.5cm', paddingRight: '2.5cm' }} className="w-full py-3 flex items-center justify-between gap-4 relative">
          {/* Logo on the far left - Clickable */}
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img src="https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Design_sans_titre-3-removebg-preview.png" alt="Neira" className="w-10 h-10 rounded-md object-cover" />
            <div className="leading-tight">
              <div className="text-base font-bold text-foreground">Neira</div>
              <div className="text-xs text-muted-foreground">Espace Professionnel Automatisé</div>
            </div>
          </div>

          {/* Center buttons */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-16">
            {/* Pour qui ? */}
            <div ref={whoRef} className="relative">
              <button
                onClick={() => setWhoOpen(!whoOpen)}
                className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors"
              >
                Pour qui ?
              </button>
              {whoOpen && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <button
                    onClick={() => {
                      navigate('/avocats/metier');
                      setWhoOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                  >
                    Avocats
                  </button>
                  <button
                    onClick={() => {
                      navigate('/notaires/metier');
                      setWhoOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                  >
                    Notaires
                  </button>
                </div>
              )}
            </div>

            {/* Connexion */}
            <div ref={connRef} className="relative">
              <button
                onClick={() => setConnOpen(!connOpen)}
                className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors"
              >
                Connexion
              </button>
              {connOpen && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <button
                    onClick={() => {
                      navigate('/avocats/auth');
                      setConnOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                  >
                    Espace Avocats
                  </button>
                  <button
                    onClick={() => {
                      navigate('/notaires/auth');
                      setConnOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                  >
                    Espace Notaires
                  </button>
                </div>
              )}
            </div>

            {/* À propos */}
            <button
              onClick={() => navigate('/about')}
              className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors"
            >
              À propos
            </button>

            {/* Contact */}
            <button
              onClick={() => navigate('/contact')}
              className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors"
            >
              Contact
            </button>
          </div>

          {/* Social icons on the far right */}
          <div className="flex items-center gap-2">
            <a
              href="https://www.instagram.com/neira.doc/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-8 h-8 rounded-md flex items-center justify-center text-white hover:scale-105 transition-transform duration-150 shadow-sm"
              style={{ background: 'linear-gradient(135deg,#f58529 0%,#dd2a7b 50%,#8134af 100%)' }}
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="https://www.linkedin.com/company/neira-doc"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="w-8 h-8 rounded-md flex items-center justify-center text-white hover:scale-105 transition-transform duration-150 shadow-sm"
              style={{ background: '#0A66C2' }}
            >
              <Linkedin className="w-4 h-4" />
            </a>
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
                  <Label htmlFor="subject">Titre / Objet *</Label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    placeholder="Objet de votre demande"
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
