import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Scale, FileText, Users, Clock, Shield, Zap, CheckCircle, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50" style={{ backgroundImage: 'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Fond%20bleu%20avocat.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <PublicHeader />

      <div className="p-6 pt-28">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md border border-border p-8 mb-12 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
              <Scale className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-3">Neira pour les Avocats</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            La solution complète pour moderniser et simplifier la gestion de votre cabinet
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {benefits.map((benefit, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className={`bg-gradient-to-r ${benefit.color} p-6 text-white`}>
                <div className="flex items-center gap-3 mb-3">
                  {benefit.icon}
                  <h3 className="text-xl font-bold">{benefit.title}</h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-700 leading-relaxed">{benefit.description}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Prêt à transformer votre cabinet ?</h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto text-lg">
            Rejoignez les centaines d'avocats qui font déjà confiance à Neira pour simplifier leur quotidien.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => navigate('/avocats/auth')}
            className="gap-2 text-lg px-8 py-6"
          >
            Créer mon espace gratuitement
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
