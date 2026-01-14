import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Landmark, FileSignature, Users, Clock, Shield, Zap, CheckCircle, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50" style={{ backgroundImage: 'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Fond%20orange.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <PublicHeader />

      <div className="p-6 pt-28">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md border border-border p-8 mb-12 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center shadow-lg">
              <Landmark className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-3">Neira pour les Notaires</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            La plateforme digitale conçue spécialement pour moderniser votre étude notariale
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
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl shadow-lg p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Prêt à digitaliser votre étude ?</h2>
          <p className="text-orange-100 mb-8 max-w-2xl mx-auto text-lg">
            Rejoignez les études notariales qui modernisent leur pratique avec Neira.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => navigate('/notaires/auth')}
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
