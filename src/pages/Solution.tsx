import { useNavigate } from 'react-router-dom';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Users, Clock, Shield, Zap, CheckCircle2, TrendingUp, Lock, Cloud, RefreshCw } from 'lucide-react';

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
      color: "from-green-500 to-green-600"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Sécurité maximale",
      description: "Chiffrement de bout en bout, conformité RGPD, hébergement en France. Vos données sont protégées.",
      color: "from-red-500 to-red-600"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Interface intuitive",
      description: "Conçue pour les professionnels du droit. Prise en main immédiate, sans formation complexe.",
      color: "from-yellow-500 to-yellow-600"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Reporting et analytics",
      description: "Suivez l'activité de votre cabinet en temps réel. Tableaux de bord personnalisables et exports détaillés.",
      color: "from-indigo-500 to-indigo-600"
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
    <div 
      className="min-h-screen bg-gradient-to-br from-primary/20 via-accent/10 to-background"
      style={{
        paddingLeft: '1cm',
        paddingRight: '1cm',
        backgroundImage: 'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Mix%20deux%20couleurs.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <PublicHeader />

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Vous êtes responsable de cabinet ?
          </h1>
          <p className="text-xl text-gray-700 mb-8 leading-relaxed">
            Choisissez la formule adaptée à la taille de votre équipe et équipez votre cabinet 
            d'une solution tout-en-un pour digitaliser et automatiser votre activité juridique.
          </p>
        </div>

        {/* Pricing Section */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Choisissez l'offre adaptée à votre équipe
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Offre Essentiel */}
            <Card className="p-6 bg-white/90 backdrop-blur transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-2 hover:border-blue-500">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">NEIRA ESSENTIEL</h3>
                <div className="text-4xl font-bold text-blue-600 mb-2">39€</div>
                <p className="text-sm text-gray-600">par mois / utilisateur</p>
                <p className="text-sm text-gray-500 mt-2">Idéal pour avocats et notaires indépendants</p>
              </div>
              
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Comprend :</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">1 utilisateur</span>
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
                    <span className="text-sm text-gray-700">15 signatures / mois</span>
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
              
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate('/auth?plan=essentiel')}>
                Choisir Essentiel
              </Button>
            </Card>

            {/* Offre Professionnel */}
            <Card className="p-6 bg-white/90 backdrop-blur transition-all duration-300 hover:scale-105 hover:shadow-2xl border-2 border-purple-500 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-4 py-1 rounded-full text-xs font-semibold">
                RECOMMANDÉ
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">NEIRA PROFESSIONNEL</h3>
                <div className="text-4xl font-bold text-purple-600 mb-2">59€</div>
                <p className="text-sm text-gray-600">par mois / utilisateur</p>
                <p className="text-sm text-gray-500 mt-2">Idéal pour cabinets de 2 à 10 utilisateurs</p>
              </div>
              
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Comprend :</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Jusqu'à 10 utilisateurs</span>
                  </div>
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
                    <span className="text-sm text-gray-700">80 signatures / mois</span>
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
                <p className="text-sm text-green-700 font-semibold">✨ Tout compris - Aucune limitation supplémentaire</p>
              </div>
              
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={() => navigate('/auth?plan=professionnel')}>
                Choisir Professionnel
              </Button>
            </Card>

            {/* Offre Cabinet+ */}
            <Card className="p-6 bg-white/90 backdrop-blur transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-2 hover:border-orange-500">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">NEIRA CABINET+</h3>
                <div className="text-4xl font-bold text-orange-600 mb-2">89€</div>
                <p className="text-sm text-gray-600">par mois / utilisateur</p>
                <p className="text-sm text-gray-500 mt-2">Idéal pour cabinets de 10 à 50+ utilisateurs</p>
              </div>
              
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Comprend :</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Utilisateurs illimités</span>
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
                    <span className="text-sm text-gray-700">Signatures illimitées</span>
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

              <div className="mb-4 pt-4 border-t">
                <p className="text-sm text-orange-700 font-semibold">🚀 Tout illimité - Solution premium complète</p>
              </div>
              
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white" onClick={() => navigate('/auth?plan=cabinet-plus')}>
                Choisir Cabinet+
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
