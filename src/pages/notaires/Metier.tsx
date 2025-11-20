import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Landmark, FileSignature, ClipboardCheck, UserCog, Archive, ShieldCheck, Users, ArrowRight } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';

export default function NotairesMetier() {
  const navigate = useNavigate();

  const roles = [
    {
      icon: <Landmark className="w-8 h-8" />,
      title: "Notaire Associé",
      color: "from-orange-900 to-orange-800",
      permissions: [
        "Accès complet à tous les actes et dossiers",
        "Gestion des membres et attribution des rôles",
        "Configuration de l'étude et paramètres",
        "Validation et signature des actes",
        "Supervision financière et reporting",
        "Droits d'administration totaux"
      ]
    },
    {
      icon: <ShieldCheck className="w-8 h-8" />,
      title: "Responsable Qualité / RGPD",
      color: "from-orange-800 to-orange-700",
      permissions: [
        "Audits internes et conformité",
        "Gestion des données personnelles",
        "Contrôle des processus qualité",
        "Formation des équipes",
        "Accès lecture à tous les dossiers"
      ]
    },
    {
      icon: <FileSignature className="w-8 h-8" />,
      title: "Notaire Adjoint",
      color: "from-orange-700 to-orange-600",
      permissions: [
        "Rédaction et contrôle des actes",
        "Relations directes avec les clients",
        "Accès aux modèles et bibliothèque d'actes",
        "Gestion des dossiers assignés"
      ]
    },
    {
      icon: <ClipboardCheck className="w-8 h-8" />,
      title: "Clerc / Formaliste",
      color: "from-orange-600 to-orange-500",
      permissions: [
        "Préparation et constitution des dossiers",
        "Enregistrement des formalités",
        "Collecte des pièces justificatives"
      ]
    },
    {
      icon: <Archive className="w-8 h-8" />,
      title: "Gestionnaire d'Actes",
      color: "from-orange-500 to-orange-400",
      permissions: [
        "Organisation et archivage des actes",
        "Suivi des signatures et envois"
      ]
    },
    {
      icon: <UserCog className="w-8 h-8" />,
      title: "Responsable Administratif",
      color: "from-orange-400 to-orange-300",
      permissions: [
        "Gestion de l'accueil et des rendez-vous"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50" style={{ backgroundImage: 'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/orange%20notaire.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <PublicHeader />

      <div className="p-6 pt-28">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md border border-border p-8 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center shadow-lg">
                <Landmark className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Études Notariales</h1>
                <p className="text-muted-foreground mt-1">Rôles et permissions dans l'espace collaboratif</p>
              </div>
            </div>
            <Button onClick={() => navigate('/')} className="bg-orange-600 hover:bg-orange-700 text-white">Retour</Button>
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
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl shadow-lg p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-3">Prêt à moderniser votre étude ?</h2>
          <p className="text-orange-100 mb-6 max-w-2xl mx-auto">
            Commencez à utiliser Neira pour gérer vos équipes, vos actes et vos clients de manière collaborative et sécurisée.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => navigate('/notaires/auth')}
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
