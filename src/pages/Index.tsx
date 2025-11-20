
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Instagram, Linkedin } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function Index() {
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
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [whoOpen]);

  useEffect(() => {
    if (!connOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (connRef.current && !connRef.current.contains(t)) setConnOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [connOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/20 via-accent/10 to-background"
      style={{
        paddingLeft: '1cm',
        paddingRight: '1cm',
        backgroundImage: 'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Design%20sans%20titre-4.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Fixed header */}
      <header className="fixed inset-x-0 top-0 z-50 bg-white/70 backdrop-blur border-b border-border">
        <div style={{ paddingLeft: '2.5cm', paddingRight: '2.5cm' }} className="w-full py-3 flex items-center justify-between gap-4 relative">
          <div onClick={() => navigate('/')} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            <img src="https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Design_sans_titre-3-removebg-preview.png" alt="Neira" className="w-10 h-10 rounded-md object-cover" />
            <div className="leading-tight">
              <div className="text-base font-bold text-foreground">Neira</div>
              <div className="text-xs text-muted-foreground">Espace Professionnel Automatisé</div>
            </div>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-16">
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

            <button
              onClick={() => navigate('/about')}
              className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors"
            >
              À propos
            </button>

            <button
              onClick={() => navigate('/contact')}
              className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors"
            >
              Contact
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a href="https://www.instagram.com/neira.doc/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-8 h-8 rounded-md flex items-center justify-center text-white hover:scale-105 transition-transform duration-150 shadow-sm" style={{ background: 'linear-gradient(135deg,#f58529 0%,#dd2a7b 50%,#8134af 100%)' }}>
              <Instagram className="w-4 h-4" />
            </a>
            <a href="https://www.linkedin.com/company/neira-doc" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-8 h-8 rounded-md flex items-center justify-center text-white hover:scale-105 transition-transform duration-150 shadow-sm" style={{ background: '#0A66C2' }}>
              <Linkedin className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto pt-24 pb-12 px-6">
        <header className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">Automatisez votre activité juridique</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">La plateforme tout-en-un qui simplifie votre quotidien de professionnel du juridique.</p>
        </header>

        {/* Role buttons */}
        <div className="flex items-center justify-center gap-6 mb-12">
          <Button size="lg" className="text-lg px-6 py-3 bg-blue-600 text-white hover:bg-blue-800 shadow-md ring-1 ring-blue-700 border border-blue-800/20 whitespace-nowrap transition-colors duration-150" onClick={() => navigate("/avocats/auth")}>
            Espace Avocats
          </Button>
          <Button size="lg" className="text-lg px-6 py-3 bg-orange-600 text-white hover:bg-orange-800 shadow-md ring-1 ring-orange-700 border border-orange-800/20 whitespace-nowrap transition-colors duration-150" onClick={() => navigate("/notaires/auth")}>
            Espace Notaires
          </Button>
        </div>

        {/* Features: 4 blocks */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="flex flex-col items-start p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-border shadow-sm">
            <div className="text-2xl mb-3">🔄</div>
            <h3 className="font-semibold text-lg mb-2">Automatiser vos tâches répétitives</h3>
            <p className="text-sm text-muted-foreground">Gagnez plusieurs heures par semaine en automatisant vos workflows juridiques.</p>
          </div>

          <div className="flex flex-col items-start p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-border shadow-sm">
            <div className="text-2xl mb-3">📁</div>
            <h3 className="font-semibold text-lg mb-2">Gérer vos documents en toute sécurité</h3>
            <p className="text-sm text-muted-foreground">Classement, partage, versionning, historique complet.</p>
          </div>

          <div className="flex flex-col items-start p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-border shadow-sm">
            <div className="text-2xl mb-3">👥</div>
            <h3 className="font-semibold text-lg mb-2">Collaborer avec vos clients et vos équipes</h3>
            <p className="text-sm text-muted-foreground">Espace partagé, messages, échanges sécurisés.</p>
          </div>

          <div className="flex flex-col items-start p-6 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-border shadow-sm">
            <div className="text-2xl mb-3">📊</div>
            <h3 className="font-semibold text-lg mb-2">Piloter votre activité</h3>
            <p className="text-sm text-muted-foreground">Agenda, statistiques, indicateurs et suivi des dossiers.</p>
          </div>
        </section>

        {/* Pour qui ? */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold text-foreground mb-6 text-center">Pour qui ?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white/60 rounded-xl border border-border shadow-sm">
              <h4 className="text-lg font-semibold mb-3">👩‍⚖️ Avocats</h4>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                <li>Gestion de dossiers</li>
                <li>Collaboration client</li>
                <li>Automatisation de modèles</li>
                <li>Communication simplifiée</li>
              </ul>
            </div>

            <div className="p-6 bg-white/60 rounded-xl border border-border shadow-sm">
              <h4 className="text-lg font-semibold mb-3">🏛️ Notaires</h4>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                <li>Gestion d’actes</li>
                <li>Collecte sécurisée de documents</li>
                <li>Automatisation administrative</li>
                <li>Collaboration en équipe</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center mt-6">
          <p className="mb-4 text-lg text-muted-foreground">Découvrez tous nos outils et débloquez l’ensemble de nos fonctionnalités avancées dès maintenant</p>
          <div className="flex items-center justify-center">
            <Button size="lg" onClick={() => navigate('/avocats/auth')}>Découvrir</Button>
          </div>
        </section>
      </main>
    </div>
  );
}
