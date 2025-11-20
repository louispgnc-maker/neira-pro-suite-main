import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Instagram, Linkedin, Target, Users, Zap, Shield, TrendingUp, Heart, CheckCircle2, Lightbulb } from "lucide-react";

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
      <div className="container mx-auto px-4 py-24 min-h-screen">
        <div className="max-w-6xl mx-auto my-8">
          {/* Hero Section */}
          <div className="bg-white rounded-2xl shadow-xl p-12 mb-8 text-center">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              À propos de Neira
            </h1>
            <p className="text-2xl text-gray-600 font-light">
              Simplifier le quotidien des professionnels du droit
            </p>
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
              <p className="text-lg text-gray-700 leading-relaxed">
                Neira est une solution pensée pour un objectif simple : permettre aux avocats, notaires et juristes de se concentrer pleinement sur leur métier, sans être freinés par la gestion administrative, la désorganisation ou la multiplication des outils numériques.
              </p>
            </div>
          </div>

          {/* Le Constat */}
          <div className="bg-white rounded-2xl shadow-xl p-10 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Lightbulb className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Le constat</h2>
                <p className="text-gray-600 mt-2">L'origine de Neira</p>
              </div>
            </div>
            <div className="space-y-4 text-gray-700 leading-relaxed pl-16">
              <p>
                Nous savons que le temps est la ressource la plus précieuse des professionnels du droit. Chaque minute consacrée à des tâches répétitives ou à chercher la bonne information est une minute qui n'est pas dédiée à la relation client, à l'analyse juridique ou à la stratégie.
              </p>
              <p className="text-xl font-semibold text-blue-600">Neira est née de ce constat.</p>
            </div>
          </div>

          {/* Notre Mission */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-xl p-10 mb-8 text-white">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
                <Target className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Notre mission</h2>
                <p className="text-blue-100 mt-2">Un environnement de travail complet et moderne</p>
              </div>
            </div>
            <p className="text-lg mb-6 pl-16">Créer un environnement de travail complet, moderne et intuitif, qui :</p>
            <div className="grid md:grid-cols-2 gap-4 pl-16">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
                <p>Centralise l'intégralité de l'activité du cabinet</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
                <p>Fluidifie le travail collaboratif</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
                <p>Accélère les processus documentaires</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
                <p>Améliore la communication interne et avec les clients</p>
              </div>
              <div className="flex items-start gap-3 md:col-span-2">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
                <p>Redonne du temps aux professionnels du droit</p>
              </div>
            </div>
            <p className="text-lg mt-6 pl-16 text-blue-100">
              Neira réunit tous les outils essentiels dans un espace unique, clair et cohérent.
            </p>
          </div>

          {/* Ce que Neira apporte */}
          <div className="bg-white rounded-2xl shadow-xl p-10 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Pourquoi Neira ?</h2>
                <p className="text-gray-600 mt-2">Des outils à la hauteur de vos exigences</p>
              </div>
            </div>
            <div className="pl-16 space-y-6">
              <div className="space-y-2 text-gray-700">
                <p>✦ Parce que les métiers du droit évoluent rapidement.</p>
                <p>✦ Parce que les attentes des clients augmentent.</p>
                <p>✦ Parce que les professionnels du juridique méritent des outils à la hauteur de leurs exigences.</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <h3 className="font-bold text-blue-900 mb-2">📋 Organisation structurée</h3>
                  <p className="text-sm text-gray-700">Une gestion simple et efficace</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                  <h3 className="font-bold text-purple-900 mb-2">📁 Gestion documentaire</h3>
                  <p className="text-sm text-gray-700">Intelligente et intuitive</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl">
                  <h3 className="font-bold text-indigo-900 mb-2">👥 Espace collaboratif</h3>
                  <p className="text-sm text-gray-700">Dédié et performant</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-100 rounded-xl">
                  <h3 className="font-bold text-blue-900 mb-2">⚡ Automatisations</h3>
                  <p className="text-sm text-gray-700">Gagnez un temps précieux</p>
                </div>
                <div className="md:col-span-2 p-4 bg-gradient-to-br from-purple-50 to-blue-100 rounded-xl">
                  <h3 className="font-bold text-purple-900 mb-2">🎯 Vision unifiée</h3>
                  <p className="text-sm text-gray-700">Chaque dossier, chaque client, chaque mission en un coup d'œil</p>
                </div>
              </div>

              <p className="text-gray-700 italic mt-6 text-center p-4 bg-gray-50 rounded-lg">
                Notre volonté est de rendre le travail juridique plus fluide, plus agréable et plus performant, sans jamais sacrifier la rigueur nécessaire au métier.
              </p>
            </div>
          </div>

          {/* Conçue avec les professionnels */}
          <div className="bg-white rounded-2xl shadow-xl p-10 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Conçue avec les professionnels</h2>
                <p className="text-gray-600 mt-2">Une approche terrain et collaborative</p>
              </div>
            </div>
            <div className="space-y-4 text-gray-700 leading-relaxed pl-16">
              <p>
                Neira a été développée en collaboration avec des avocats, notaires et juristes, pour répondre à leurs besoins réels — pas à ceux imaginés derrière un bureau.
              </p>
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-1 bg-gradient-to-r from-green-200 to-green-500 rounded"></div>
                <span className="text-green-600 font-semibold">Échange</span>
                <div className="flex-1 h-1 bg-gradient-to-r from-green-500 to-green-200 rounded"></div>
              </div>
              <p>Chaque fonctionnalité naît d'un échange, d'une problématique concrète, d'un retour terrain.</p>
              <p className="font-semibold text-green-700">
                Nous continuons d'améliorer Neira avec et pour ses utilisateurs, afin de proposer une solution en constante évolution : plus pertinente, plus complète, plus intuitive.
              </p>
            </div>
          </div>

          {/* Notre Vision */}
          <div className="bg-white rounded-2xl shadow-xl p-10 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Notre vision</h2>
                <p className="text-gray-600 mt-2">La plateforme de référence</p>
              </div>
            </div>
            <div className="space-y-4 text-gray-700 leading-relaxed pl-16">
              <p>À long terme, nous souhaitons faire de Neira la plateforme de référence pour la gestion d'activité juridique :</p>
              <div className="grid md:grid-cols-2 gap-3 my-4">
                <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
                  <span className="text-orange-600 font-bold">→</span>
                  <p>Une solution qui allège réellement la charge administrative</p>
                </div>
                <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
                  <span className="text-orange-600 font-bold">→</span>
                  <p>Qui automatise ce qui peut l'être</p>
                </div>
                <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
                  <span className="text-orange-600 font-bold">→</span>
                  <p>Qui sécurise les données sensibles</p>
                </div>
                <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
                  <span className="text-orange-600 font-bold">→</span>
                  <p>Qui s'intègre naturellement dans la routine professionnelle</p>
                </div>
              </div>
              <p className="text-xl font-semibold text-orange-600 text-center p-4 bg-orange-50 rounded-lg">
                Nous imaginons un futur où les professionnels du droit ne perdent plus leur temps à « gérer », mais à exercer.
              </p>
            </div>
          </div>

          {/* L'humain au centre */}
          <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl shadow-xl p-10 text-white">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">L'humain au centre</h2>
                <p className="text-pink-100 mt-2">La technologie au service de l'humain</p>
              </div>
            </div>
            <div className="space-y-4 pl-16">
              <p className="text-lg">La technologie n'a de sens que si elle sert l'humain.</p>
              <p className="text-lg">Neira est pensée comme un partenaire, pas comme un logiciel de plus.</p>
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-white/10 backdrop-blur rounded-lg border border-white/20">
                  <p className="text-lg font-semibold">✨ Plus de sérénité</p>
                </div>
                <div className="p-4 bg-white/10 backdrop-blur rounded-lg border border-white/20">
                  <p className="text-lg font-semibold">👁️ Plus de visibilité</p>
                </div>
                <div className="p-4 bg-white/10 backdrop-blur rounded-lg border border-white/20">
                  <p className="text-lg font-semibold">🎯 Plus de maîtrise</p>
                </div>
                <div className="p-4 bg-white/10 backdrop-blur rounded-lg border border-white/20">
                  <p className="text-lg font-semibold">🚀 Plus de liberté</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
