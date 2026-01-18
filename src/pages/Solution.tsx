import { useNavigate } from 'react-router-dom';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Users, Clock, Shield, Zap, CheckCircle2, TrendingUp, Lock, Cloud, RefreshCw, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function Solution() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Gestion documentaire intelligente",
      description: "Centralisez, classez et retrouvez vos documents en un clic. Versioning automatique et historique complet.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Collaboration en temps réel",
      description: "Travaillez simultanément sur les mêmes dossiers avec votre équipe et vos clients. Commentaires et notifications instantanées.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Automatisation des tâches",
      description: "Gagnez plusieurs heures par semaine en automatisant les processus répétitifs : génération de documents, rappels, workflows.",
      color: "from-blue-500 to-purple-600"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Sécurité maximale",
      description: "Chiffrement de bout en bout, conformité RGPD, hébergement en France. Vos données sont protégées.",
      color: "from-purple-500 to-blue-600"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Interface intuitive",
      description: "Conçue pour les professionnels du droit. Prise en main immédiate, sans formation complexe.",
      color: "from-blue-500 to-purple-600"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Reporting et analytics",
      description: "Suivez l'activité de votre cabinet en temps réel. Tableaux de bord personnalisables et exports détaillés.",
      color: "from-purple-500 to-blue-600"
    }
  ];

  const benefits = [
    "Réduction de 60% du temps consacré aux tâches administratives",
    "Centralisation de tous vos outils en une seule plateforme",
    "Collaboration fluide entre associés, collaborateurs et clients",
    "Conformité RGPD et sécurité des données garanties",
    "Support réactif et accompagnement personnalisé",
    "Mises à jour régulières et nouvelles fonctionnalités"
  ];

  return (
    <TooltipProvider delayDuration={0}>
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 bg-gradient-to-br from-blue-100 via-purple-100 to-blue-100 overflow-hidden">
        {/* Barre de couleur en haut */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600"></div>
        
        {/* Cercles décoratifs */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
        <div className="absolute top-40 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 right-1/3 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Vous êtes responsable de cabinet ?
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-10 max-w-3xl mx-auto leading-relaxed">
              Choisissez la formule adaptée à la taille de votre équipe et équipez votre cabinet 
              d'une solution tout-en-un pour digitaliser et automatiser votre activité juridique.
            </p>
          </div>
        </div>
      </section>


      {/* Pricing Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-slate-50 via-blue-100 to-purple-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Choisissez l'offre adaptée à votre équipe
            </span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Offre Essentiel */}
            <Card className="p-6 bg-white transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-2 hover:border-blue-500 border border-gray-200 rounded-xl shadow-lg">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">NEIRA ESSENTIEL</h3>
                <div className="text-4xl font-bold text-blue-600 mb-2">39€</div>
                <p className="text-sm text-gray-600">par mois / utilisateur</p>
              </div>
              
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Comprend :</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Idéal pour avocats et notaires indépendants</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">20 Go de stockage</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">100 dossiers actifs</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">30 clients actifs</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-gray-700">15 signatures / mois / utilisateur</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-blue-600 transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-gradient-to-br from-blue-50 to-white border-blue-200">
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-blue-900">1 signature = 1 enveloppe</p>
                            <p className="text-xs text-gray-700">Nombre de signataires illimité par enveloppe</p>
                            <p className="text-xs text-gray-700">Quota personnel non mutualisé</p>
                            <div className="pt-2 border-t border-blue-200 mt-2">
                              <p className="text-xs font-semibold text-blue-800 mb-1.5">📦 Packs optionnels :</p>
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-600">+10 signatures</span>
                                  <span className="text-xs font-semibold text-blue-700">+7€/mois</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-600">+25 signatures</span>
                                  <span className="text-xs font-semibold text-blue-700">+15€/mois</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Gestion documentaire</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Partage sécurisé client</span>
                  </div>
                </div>
              </div>

              <div className="mb-4 pt-4 border-t">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Ne comprend pas :</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    </div>
                    <span className="text-sm text-gray-500">Espace collaboratif</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    </div>
                    <span className="text-sm text-gray-500">Données analysées</span>
                  </div>
                </div>
              </div>
              
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate('/checkout/essentiel')}>
                Choisir Essentiel
              </Button>
            </Card>

            {/* Offre Professionnel */}
            <Card className="p-6 bg-white transition-all duration-300 hover:scale-105 hover:shadow-2xl border-2 border-purple-500 relative rounded-xl shadow-lg">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-4 py-1 rounded-full text-xs font-semibold">
                RECOMMANDÉ
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">NEIRA PROFESSIONNEL</h3>
                <div className="text-4xl font-bold text-purple-600 mb-2">59€</div>
                <p className="text-sm text-gray-600">par mois / utilisateur</p>
              </div>
              
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Comprend :</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">100 Go de stockage</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">600 dossiers actifs</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">200 clients actifs</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-gray-700">80 signatures / mois / utilisateur</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-purple-600 transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-gradient-to-br from-purple-50 to-white border-purple-200">
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-purple-900">1 signature = 1 enveloppe</p>
                            <p className="text-xs text-gray-700">Nombre de signataires illimité par enveloppe</p>
                            <p className="text-xs text-gray-700">Quota personnel non mutualisé</p>
                            <div className="pt-2 border-t border-purple-200 mt-2">
                              <p className="text-xs font-semibold text-purple-800 mb-1.5">📦 Packs optionnels :</p>
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-600">+40 signatures</span>
                                  <span className="text-xs font-semibold text-purple-700">+15€/mois/utilisateur</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-600">+100 signatures ⭐</span>
                                  <span className="text-xs font-semibold text-purple-700">+29€/mois/utilisateur</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Espace collaboratif complet</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Gestion documentaire avancée</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Tableaux de bord</span>
                  </div>
                </div>
              </div>

              <div className="mb-4 pt-4 border-t">
                <p className="text-sm text-green-700 font-semibold">⚡ Pensé pour les cabinets en croissance</p>
              </div>
              
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={() => navigate('/checkout/professionnel')}>
                Choisir Professionnel
              </Button>
            </Card>

            {/* Offre Cabinet+ */}
            <Card className="p-6 bg-white transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-2 hover:border-orange-500 border border-gray-200 rounded-xl shadow-lg">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">NEIRA CABINET+</h3>
                <div className="text-4xl font-bold text-orange-600 mb-2">89€</div>
                <p className="text-sm text-gray-600">par mois / utilisateur</p>
              </div>
              
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Comprend :</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Idéal pour cabinets de 10 à 50+ utilisateurs</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Stockage illimité</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Dossiers illimités</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Clients illimités</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-gray-700">Signatures illimitées / utilisateur</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-orange-600 transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-gradient-to-br from-orange-50 to-white border-orange-200">
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-orange-900">1 signature = 1 enveloppe</p>
                            <p className="text-xs text-gray-700">Nombre de signataires illimité par enveloppe</p>
                            <div className="pt-1.5 border-t border-orange-200">
                              <p className="text-xs text-orange-700 font-medium">✨ Aucune limite mensuelle</p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Collaboration sans limite</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Tableaux de bord avancés</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Onboarding & formation de l'équipe</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Accès anticipé aux nouveautés</span>
                  </div>
                </div>
              </div>
              
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white" onClick={() => navigate('/checkout/cabinet-plus')}>
                Choisir Cabinet+
              </Button>
            </Card>
          </div>
        </div>
      </section>
    </div>
    </TooltipProvider>
  );
}
