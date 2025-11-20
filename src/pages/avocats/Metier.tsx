import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Scale, Briefcase, FileText, UserCheck, Calculator, ShieldCheck, Users, ArrowRight } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';

export default function AvocatsMetier() {
  const navigate = useNavigate();

  const roles = [
    {
      icon: <Scale className="w-8 h-8" />,
      title: "Associé / Fondateur",
      color: "from-blue-900 to-blue-800",
      permissions: [
        "Accès complet à tous les dossiers et documents",
        "Gestion des membres et attribution des rôles",
        "Configuration du cabinet et paramètres",
        "Validation des contrats et signatures",
        "Supervision financière et reporting",
        "Droits d'administration totaux"
      ]
    },
    {
      icon: <ShieldCheck className="w-8 h-8" />,
      title: "Responsable Qualité / RGPD",
      color: "from-blue-800 to-blue-700",
      permissions: [
        "Audits internes et conformité",
        "Gestion des données personnelles",
        "Contrôle des processus qualité",
        "Formation des équipes",
        "Accès lecture à tous les dossiers"
      ]
    },
    {
      icon: <Briefcase className="w-8 h-8" />,
      title: "Avocat Collaborateur",
      color: "from-blue-700 to-blue-600",
      permissions: [
        "Gestion de ses propres dossiers clients",
        "Rédaction et modification de contrats",
        "Accès aux modèles et bibliothèque juridique",
        "Communication avec les clients"
      ]
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Juriste Senior",
      color: "from-blue-600 to-blue-500",
      permissions: [
        "Relecture et validation des documents",
        "Création et modification des modèles",
        "Accès aux dossiers de son équipe"
      ]
    },
    {
      icon: <UserCheck className="w-8 h-8" />,
      title: "Assistant Juridique / Paralegal",
      color: "from-blue-500 to-blue-400",
      permissions: [
        "Préparation des dossiers clients",
        "Collecte et organisation des pièces"
      ]
    },
    {
      icon: <Calculator className="w-8 h-8" />,
      title: "Chargé de Facturation",
      color: "from-blue-400 to-blue-300",
      permissions: [
        "Accès lecture aux dossiers"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50" style={{ backgroundImage: 'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Fond%20bleu%20avocat.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <PublicHeader />

      <div className="p-6 pt-28">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md border border-border p-8 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                <Scale className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Cabinets d'Avocats</h1>
                <p className="text-muted-foreground mt-1">Rôles et permissions dans l'espace collaboratif</p>
              </div>
            </div>
            <Button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700 text-white">Retour</Button>
          </div>
        </div>

        {/* Roles Container */}
        <div className="bg-white rounded-xl shadow-md border border-border p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Rôles et permissions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className={`bg-gradient-to-r ${role.color} p-6 text-white`}>
                <div className="flex items-center gap-3">
                  {role.icon}
                  <h3 className="text-xl font-bold">{role.title}</h3>
                </div>
              </div>
              <div className="p-6">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  Permissions
                </h4>
                <ul className="space-y-2.5">
                  {role.permissions.map((permission, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{permission}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-3">Prêt à optimiser votre cabinet ?</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Commencez à utiliser Neira pour gérer vos équipes, vos dossiers et vos clients de manière collaborative et sécurisée.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => navigate('/avocats/auth')}
            className="gap-2"
          >
            Créer mon espace
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
