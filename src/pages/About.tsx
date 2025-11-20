import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Instagram, Linkedin } from "lucide-react";

export default function About() {
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
    <div
      className="min-h-screen bg-gradient-to-br from-primary/20 via-accent/10 to-background"
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

      {/* Content */}
      <div className="container mx-auto px-4 py-24 flex items-center justify-center min-h-screen">
        <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl p-12 my-8">
          <h1 className="text-4xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            À propos de Neira
          </h1>
          
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Simplifier le quotidien des professionnels du droit</h2>
              <p>
                Neira est une solution pensée pour un objectif simple : permettre aux avocats, notaires et juristes de se concentrer pleinement sur leur métier, sans être freinés par la gestion administrative, la désorganisation ou la multiplication des outils numériques.
              </p>
            </div>

            <p>
              Nous savons que le temps est la ressource la plus précieuse des professionnels du droit. Chaque minute consacrée à des tâches répétitives ou à chercher la bonne information est une minute qui n'est pas dédiée à la relation client, à l'analyse juridique ou à la stratégie.
            </p>

            <p className="font-semibold text-gray-900">Neira est née de ce constat.</p>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Notre mission</h2>
              <p className="mb-3">Créer un environnement de travail complet, moderne et intuitif, qui :</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>centralise l'intégralité de l'activité du cabinet,</li>
                <li>fluidifie le travail collaboratif,</li>
                <li>accélère les processus documentaires,</li>
                <li>améliore la communication interne et avec les clients,</li>
                <li>et redonne du temps aux professionnels du droit.</li>
              </ul>
              <p className="mt-3">Neira réunit tous les outils essentiels dans un espace unique, clair et cohérent.</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Pourquoi Neira ?</h2>
              <p className="mb-2">Parce que les métiers du droit évoluent rapidement.</p>
              <p className="mb-2">Parce que les attentes des clients augmentent.</p>
              <p className="mb-3">Parce que les professionnels du juridique méritent des outils à la hauteur de leurs exigences.</p>
              
              <p className="font-semibold text-gray-900 mb-2">Neira apporte :</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Une organisation simple et structurée</li>
                <li>Une gestion documentaire intelligente</li>
                <li>Un espace collaboratif dédié</li>
                <li>Des automatisations qui font gagner un temps précieux</li>
                <li>Une vision unifiée de chaque dossier, chaque client, chaque mission</li>
              </ul>
              
              <p className="mt-3">
                Notre volonté est de rendre le travail juridique plus fluide, plus agréable et plus performant, sans jamais sacrifier la rigueur nécessaire au métier.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Une solution conçue avec les professionnels du droit</h2>
              <p className="mb-3">
                Neira a été développée en collaboration avec des avocats, notaires et juristes, pour répondre à leurs besoins réels — pas à ceux imaginés derrière un bureau.
              </p>
              <p className="mb-3">Chaque fonctionnalité naît d'un échange, d'une problématique concrète, d'un retour terrain.</p>
              <p>
                Nous continuons d'améliorer Neira avec et pour ses utilisateurs, afin de proposer une solution en constante évolution : plus pertinente, plus complète, plus intuitive.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Notre vision</h2>
              <p className="mb-3">À long terme, nous souhaitons faire de Neira la plateforme de référence pour la gestion d'activité juridique :</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>une solution qui allège réellement la charge administrative,</li>
                <li>qui automatise ce qui peut l'être,</li>
                <li>qui sécurise les données sensibles,</li>
                <li>et qui s'intègre naturellement dans la routine professionnelle.</li>
              </ul>
              <p className="mt-3">Nous imaginons un futur où les professionnels du droit ne perdent plus leur temps à « gérer », mais à exercer.</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">L'humain au centre</h2>
              <p className="mb-3">La technologie n'a de sens que si elle sert l'humain.</p>
              <p className="mb-3">Neira est pensée comme un partenaire, pas comme un logiciel de plus.</p>
              <p className="font-semibold text-gray-900 mb-2">Nous voulons offrir :</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>plus de sérénité,</li>
                <li>plus de visibilité,</li>
                <li>plus de maîtrise,</li>
                <li>plus de liberté.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
