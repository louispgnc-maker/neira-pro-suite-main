import { Target, Users, Zap, TrendingUp, Heart, CheckCircle2, Lightbulb } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";

export default function About() {

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 bg-gradient-to-br from-blue-100 via-purple-100 to-blue-100 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(59 130 246 / 0.3) 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              À propos de Neira
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Simplifier le quotidien des professionnels du droit
            </p>
            <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200">
              <p className="text-lg text-gray-700 leading-relaxed">
                Neira est une solution pensée pour un objectif simple : permettre aux avocats, notaires et juristes de se concentrer pleinement sur leur métier, sans être freinés par la gestion administrative, la désorganisation ou la multiplication des outils numériques.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          {/* Le Constat */}
          <div className="bg-white rounded-2xl shadow-xl p-10 mb-8 border border-gray-200">
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
          <div className="bg-white rounded-2xl shadow-xl p-10 mb-8 border border-gray-200">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Target className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Notre mission</h2>
                <p className="text-gray-600 mt-2">Un environnement de travail complet et moderne</p>
              </div>
            </div>
            <p className="text-lg mb-6 pl-16 text-gray-700">Créer un environnement de travail complet, moderne et intuitif, qui :</p>
            <div className="grid md:grid-cols-2 gap-4 pl-16">
              <div className="flex items-start gap-3 text-gray-700">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1 text-green-600" />
                <p>Centralise l'intégralité de l'activité du cabinet</p>
              </div>
              <div className="flex items-start gap-3 text-gray-700">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1 text-green-600" />
                <p>Fluidifie le travail collaboratif</p>
              </div>
              <div className="flex items-start gap-3 text-gray-700">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1 text-green-600" />
                <p>Accélère les processus documentaires</p>
              </div>
              <div className="flex items-start gap-3 text-gray-700">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1 text-green-600" />
                <p>Améliore la communication interne et avec les clients</p>
              </div>
              <div className="flex items-start gap-3 md:col-span-2 text-gray-700">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1 text-green-600" />
                <p>Redonne du temps aux professionnels du droit</p>
              </div>
            </div>
            <p className="text-lg mt-6 pl-16 text-gray-600">
              Neira réunit tous les outils essentiels dans un espace unique, clair et cohérent.
            </p>
          </div>

          {/* Ce que Neira apporte */}
          <div className="bg-white rounded-2xl shadow-xl p-10 mb-8 border border-gray-200">
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
                <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                  <h3 className="font-bold text-blue-900 mb-2">📋 Organisation structurée</h3>
                  <p className="text-sm text-gray-700">Une gestion simple et efficace</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                  <h3 className="font-bold text-purple-900 mb-2">📁 Gestion documentaire</h3>
                  <p className="text-sm text-gray-700">Intelligente et intuitive</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-200 rounded-xl">
                  <h3 className="font-bold text-blue-900 mb-2">👥 Espace collaboratif</h3>
                  <p className="text-sm text-gray-700">Dédié et performant</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-200 rounded-xl">
                  <h3 className="font-bold text-blue-900 mb-2">⚡ Automatisations</h3>
                  <p className="text-sm text-gray-700">Gagnez un temps précieux</p>
                </div>
                <div className="md:col-span-2 p-4 bg-gradient-to-br from-purple-100 to-blue-200 rounded-xl">
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
          <div className="bg-white rounded-2xl shadow-xl p-10 mb-8 border border-gray-200">
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
                <div className="flex-1 h-1 bg-gradient-to-r from-blue-400 to-purple-600 rounded"></div>
                <span className="text-purple-600 font-semibold">Échange</span>
                <div className="flex-1 h-1 bg-gradient-to-r from-purple-600 to-blue-400 rounded"></div>
              </div>
              <p>Chaque fonctionnalité naît d'un échange, d'une problématique concrète, d'un retour terrain.</p>
              <p className="font-semibold text-purple-700">
                Nous continuons d'améliorer Neira avec et pour ses utilisateurs, afin de proposer une solution en constante évolution : plus pertinente, plus complète, plus intuitive.
              </p>
            </div>
          </div>

          {/* Notre Vision */}
          <div className="bg-white rounded-2xl shadow-xl p-10 mb-8 border border-gray-200">
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
          <div className="bg-white rounded-2xl shadow-xl p-10 border border-gray-200">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-pink-100 rounded-lg">
                <Heart className="w-8 h-8 text-pink-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">L'humain au centre</h2>
                <p className="text-gray-600 mt-2">La technologie au service de l'humain</p>
              </div>
            </div>
            <div className="space-y-4 pl-16 text-gray-700">
              <p className="text-lg">La technologie n'a de sens que si elle sert l'humain.</p>
              <p className="text-lg">Neira est pensée comme un partenaire, pas comme un logiciel de plus.</p>
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg border-2 border-blue-200">
                  <p className="text-lg font-semibold text-gray-900">✨ Plus de sérénité</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg border-2 border-purple-200">
                  <p className="text-lg font-semibold text-gray-900">👁️ Plus de visibilité</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg border-2 border-blue-200">
                  <p className="text-lg font-semibold text-gray-900">🎯 Plus de maîtrise</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg border-2 border-purple-200">
                  <p className="text-lg font-semibold text-gray-900">🚀 Plus de liberté</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
