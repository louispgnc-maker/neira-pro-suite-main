import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Landmark, FileSignature, Users, Clock, Shield, Zap, CheckCircle } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';

export default function NotairesMetier() {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: <FileSignature className="w-8 h-8" />,
      title: "Gestion complète des actes",
      description: "Centralisez la rédaction, le suivi et l'archivage de tous vos actes notariés. Modèles personnalisables et conformes.",
      color: "from-orange-600 to-orange-700"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Organisation de l'étude",
      description: "Gérez votre équipe avec des rôles adaptés : notaires, clercs, formalistes. Chacun accède à ce dont il a besoin.",
      color: "from-orange-700 to-orange-800"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Automatisation des tâches",
      description: "Réduisez le temps passé sur les tâches administratives : génération automatique de documents, relances, suivis d'échéances.",
      color: "from-orange-500 to-orange-600"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Sécurité et conformité",
      description: "Respect total du RGPD et des normes notariales. Données hébergées en France avec chiffrement de bout en bout.",
      color: "from-orange-600 to-red-600"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Signature électronique certifiée",
      description: "Signature électronique qualifiée conforme aux exigences notariales. Valeur juridique garantie pour tous vos actes.",
      color: "from-orange-500 to-orange-700"
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      title: "Portail client dédié",
      description: "Vos clients accèdent à leurs dossiers en ligne, signent électroniquement et suivent l'avancement en temps réel.",
      color: "from-orange-700 to-red-700"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(249 115 22 / 0.3) 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center shadow-lg">
                <Landmark className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Neira pour les Notaires
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              La plateforme digitale conçue spécialement pour moderniser votre étude notariale
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="group">
                <div className={`bg-gradient-to-r ${benefit.color} p-6 rounded-t-xl`}>
                  <div className="flex items-center gap-3 text-white">
                    {benefit.icon}
                    <h3 className="text-xl font-bold">{benefit.title}</h3>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-b-xl border-2 border-t-0 border-gray-100 group-hover:shadow-xl transition-shadow duration-300">
                  <p className="text-gray-700 leading-relaxed">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-orange-600 via-red-600 to-orange-700">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Prêt à digitaliser votre étude ?
          </h2>
          <p className="text-xl text-orange-100 mb-10 max-w-3xl mx-auto">
            Rejoignez ceux qui modernisent déjà leur pratique avec Neira.
          </p>
          <div className="flex items-center justify-center">
            <Button 
              size="lg" 
              className="text-lg px-10 py-7 bg-white text-orange-600 hover:bg-gray-100 shadow-2xl hover:shadow-3xl transition-all duration-200 font-bold"
              onClick={() => window.location.href = 'https://www.neira.fr/solution'}
            >
              Découvrir les offres
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
