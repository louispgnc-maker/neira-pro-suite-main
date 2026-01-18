import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Scale, FileText, Users, Clock, Shield, Zap, CheckCircle } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';

export default function AvocatsMetier() {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Gestion des dossiers simplifiée",
      description: "Centralisez tous vos dossiers clients, documents et contrats au même endroit. Recherche instantanée et organisation intelligente.",
      color: "from-blue-600 to-blue-700"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Collaboration en équipe",
      description: "Travaillez ensemble sur les dossiers avec des rôles et permissions adaptés à chaque membre de votre cabinet.",
      color: "from-blue-700 to-blue-800"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Gain de temps considérable",
      description: "Automatisez les tâches répétitives : génération de documents, suivi des échéances, relances clients automatiques.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Conformité RGPD garantie",
      description: "Toutes vos données sont sécurisées et hébergées en France. Gestion automatique des droits d'accès et de la confidentialité.",
      color: "from-blue-600 to-indigo-600"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Signature électronique",
      description: "Faites signer vos clients en ligne avec une signature électronique juridiquement valable. Plus besoin d'impression ni de déplacement.",
      color: "from-blue-500 to-blue-700"
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      title: "Suivi client personnalisé",
      description: "Offrez à vos clients un espace dédié où ils peuvent suivre l'avancement de leurs dossiers en temps réel.",
      color: "from-blue-700 to-indigo-700"
    }
  ];

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
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                <Scale className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Neira pour les Avocats
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              La solution complète pour moderniser et simplifier la gestion de votre cabinet
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
      <section className="py-20 px-6 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Prêt à transformer votre cabinet ?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto">
            Rejoignez les avocats qui font déjà confiance à Neira pour simplifier leur quotidien.
          </p>
          <div className="flex items-center justify-center">
            <Button 
              size="lg" 
              className="text-lg px-10 py-7 bg-white text-blue-600 hover:bg-gray-100 shadow-2xl hover:shadow-3xl transition-all duration-200 font-bold"
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
