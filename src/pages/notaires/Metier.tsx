import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Landmark, FileSignature, ClipboardCheck, UserCog, Archive, ShieldCheck, Users, ArrowRight, Instagram, Linkedin } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export default function NotairesMetier() {
  const navigate = useNavigate();
  const [whoOpen, setWhoOpen] = useState(false);
  const [connOpen, setConnOpen] = useState(false);
  const whoRef = useRef<HTMLDivElement | null>(null);
  const connRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!whoOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (whoRef.current && !whoRef.current.contains(t)) setWhoOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [whoOpen]);

  useEffect(() => {
    if (!connOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (connRef.current && !connRef.current.contains(t)) setConnOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [connOpen]);

  const roles = [
    {
      icon: <Landmark className="w-8 h-8" />,
      title: "Notaire Associé",
      color: "from-orange-900 to-orange-800",
      permissions: [
        "Accès complet à tous les actes et dossiers",
        "Gestion des membres et attribution des rôles",
        "Configuration de l'étude et paramètres",
        "Validation et signature des actes",
        "Supervision financière et reporting",
        "Droits d'administration totaux"
      ]
    },
    {
      icon: <ShieldCheck className="w-8 h-8" />,
      title: "Responsable Qualité / RGPD",
      color: "from-orange-800 to-orange-700",
      permissions: [
        "Audits internes et conformité",
        "Gestion des données personnelles",
        "Contrôle des processus qualité",
        "Formation des équipes",
        "Accès lecture à tous les dossiers"
      ]
    },
    {
      icon: <FileSignature className="w-8 h-8" />,
      title: "Notaire Adjoint",
      color: "from-orange-700 to-orange-600",
      permissions: [
        "Rédaction et contrôle des actes",
        "Relations directes avec les clients",
        "Accès aux modèles et bibliothèque d'actes",
        "Gestion des dossiers assignés"
      ]
    },
    {
      icon: <ClipboardCheck className="w-8 h-8" />,
      title: "Clerc / Formaliste",
      color: "from-orange-600 to-orange-500",
      permissions: [
        "Préparation et constitution des dossiers",
        "Enregistrement des formalités",
        "Collecte des pièces justificatives"
      ]
    },
    {
      icon: <Archive className="w-8 h-8" />,
      title: "Gestionnaire d'Actes",
      color: "from-orange-500 to-orange-400",
      permissions: [
        "Organisation et archivage des actes",
        "Suivi des signatures et envois"
      ]
    },
    {
      icon: <UserCog className="w-8 h-8" />,
      title: "Responsable Administratif",
      color: "from-orange-400 to-orange-300",
      permissions: [
        "Gestion de l'accueil et des rendez-vous"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50" style={{ backgroundImage: 'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Design%20sans%20titre-4.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      {/* Fixed header */}
      <header className="fixed inset-x-0 top-0 z-50 bg-white/70 backdrop-blur border-b border-border">
        <div style={{ paddingLeft: '2.5cm', paddingRight: '2.5cm' }} className="w-full py-3 flex items-center justify-between gap-4">
          {/* Logo on the far left */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Design_sans_titre-3-removebg-preview.png" alt="Neira" className="w-10 h-10 rounded-md object-cover" />
            <div className="leading-tight">
              <div className="text-base font-bold text-foreground">Neira</div>
              <div className="text-xs text-muted-foreground">Espace Professionnel Automatisé</div>
            </div>
          </div>

          {/* Centered controls: Pour qui ? + Connexion + Contact */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-16">
            {/* Pour qui ? */}
            <div ref={whoRef} className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setWhoOpen((s) => !s); }}
                className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors"
              >
                Pour qui ?
              </button>
              {whoOpen && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <button
                    onClick={() => { setWhoOpen(false); navigate('/avocats/metier'); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                  >
                    Avocats
                  </button>
                  <button
                    onClick={() => { setWhoOpen(false); navigate('/notaires/metier'); }}
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
                type="button"
                onClick={(e) => { e.stopPropagation(); setConnOpen((s) => !s); }}
                className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors"
              >
                Connexion
              </button>
              {connOpen && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <button
                    onClick={() => { setConnOpen(false); navigate('/avocats/auth'); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                  >
                    Espace Avocats
                  </button>
                  <button
                    onClick={() => { setConnOpen(false); navigate('/notaires/auth'); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                  >
                    Espace Notaires
                  </button>
                </div>
              )}
            </div>

            {/* Contact */}
            <button
              type="button"
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

      <div className="p-6 pt-28">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md border border-border p-8 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center shadow-lg">
                <Landmark className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Études Notariales</h1>
                <p className="text-muted-foreground mt-1">Rôles et permissions dans l'espace collaboratif</p>
              </div>
            </div>
            <Button onClick={() => navigate('/')} className="bg-orange-600 hover:bg-orange-700 text-white">Retour</Button>
          </div>
        </div>

        {/* Roles Container */}
        <div className="bg-white rounded-xl shadow-md border border-border p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Rôles et permissions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className={`bg-gradient-to-r ${role.color} p-6 text-white`}>
                <div className="flex items-center gap-3">
                  {role.icon}
                  <h3 className="text-xl font-bold">{role.title}</h3>
                </div>
              </div>
              <div className="p-6">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  Permissions
                </h4>
                <ul className="space-y-2.5">
                  {role.permissions.map((permission, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{permission}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl shadow-lg p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-3">Prêt à moderniser votre étude ?</h2>
          <p className="text-orange-100 mb-6 max-w-2xl mx-auto">
            Commencez à utiliser Neira pour gérer vos équipes, vos actes et vos clients de manière collaborative et sécurisée.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => navigate('/notaires/auth')}
            className="gap-2"
          >
            Créer mon espace
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
