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

      {/* Pricing Section */}
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-4 text-gray-900">
            ⭐ Grille Tarifaire Neira
          </h2>
          <p className="text-center text-gray-600 mb-12">Version cohérente & ultra-compétitive</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Offre Essentiel */}
            <Card className="p-6 bg-white/90 backdrop-blur hover:shadow-2xl transition-shadow">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">NEIRA ESSENTIEL</h3>
                <div className="text-4xl font-bold text-blue-600 mb-2">39€</div>
                <p className="text-sm text-gray-600">par mois / utilisateur</p>
                <p className="text-sm text-gray-500 mt-2">Pour indépendants & petits cabinets</p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Espace collaboratif complet</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Gestion documentaire intelligente</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Partage sécurisé + dépôt client</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Planning + tâches + rappels</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Signature électronique (5/mois)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">20 Go de stockage</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Suivi des dossiers / clients</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Support email</span>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-700 font-medium">🎯 Offre d'entrée attractive + simple à adopter</p>
              </div>
              
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate('/contact')}>
                Choisir Essentiel
              </Button>
            </Card>

            {/* Offre Professionnel */}
            <Card className="p-6 bg-white/90 backdrop-blur hover:shadow-2xl transition-shadow border-2 border-purple-500 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-4 py-1 rounded-full text-xs font-semibold">
                RECOMMANDÉ
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">NEIRA PROFESSIONNEL</h3>
                <div className="text-4xl font-bold text-purple-600 mb-2">59€</div>
                <p className="text-sm text-gray-600">par mois / utilisateur</p>
                <p className="text-sm text-gray-500 mt-2">Offre cœur de gamme</p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 font-medium">Tout ce qu'il y a dans Essentiel</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Automatisations & workflows</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Génération automatique de documents</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Modèles juridiques personnalisables</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Signature électronique illimitée</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">100 Go de stockage</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Gestion des droits utilisateurs</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Tableaux de bord & reporting</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Historique d'activité avancé</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Support prioritaire</span>
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-purple-700 font-medium">🎯 Le meilleur rapport qualité/prix du marché juridique</p>
              </div>
              
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={() => navigate('/contact')}>
                Choisir Professionnel
              </Button>
            </Card>

            {/* Offre Cabinet+ */}
            <Card className="p-6 bg-white/90 backdrop-blur hover:shadow-2xl transition-shadow">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">NEIRA CABINET+</h3>
                <div className="text-4xl font-bold text-orange-600 mb-2">129€</div>
                <p className="text-sm text-gray-600">par mois / utilisateur</p>
                <p className="text-sm text-gray-500 mt-2">Pour cabinets structurés (5-50 personnes)</p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 font-medium">Tout le Pro</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Automatisations illimitées</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Dossiers clients avancés</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">API + intégrations externes</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Stockage illimité</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Onboarding personnalisé</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Support 7j/7 + SLA</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Formation de l'équipe</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Accès anticipé aux futures features</span>
                </div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-orange-700 font-medium">🎯 Positionnement haut-de-gamme ultra rentable</p>
              </div>
              
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white" onClick={() => navigate('/contact')}>
                Choisir Cabinet+
              </Button>
            </Card>
          </div>
        </div>

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Découvrez Neira
          </h1>
          <p className="text-xl text-gray-700 mb-8 leading-relaxed">
            La solution complète pour digitaliser et automatiser votre cabinet juridique. 
            Gagnez du temps, améliorez votre productivité et concentrez-vous sur l'essentiel : votre métier.
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              onClick={() => navigate('/avocats/auth')}
            >
              Commencer gratuitement
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/contact')}
            >
              Demander une démo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Une plateforme complète et intuitive
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 bg-white/80 backdrop-blur hover:shadow-xl transition-shadow">
                <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="p-8 bg-white/90 backdrop-blur">
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">
              Pourquoi choisir Neira ?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <p className="text-gray-700">{benefit}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Technology Section */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Une technologie de pointe
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6 bg-white/80 backdrop-blur text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Cloud className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Cloud sécurisé</h3>
              <p className="text-sm text-gray-600">Hébergement en France, disponible partout, tout le temps</p>
            </Card>
            <Card className="p-6 bg-white/80 backdrop-blur text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Sécurité renforcée</h3>
              <p className="text-sm text-gray-600">Chiffrement, authentification à deux facteurs, sauvegardes quotidiennes</p>
            </Card>
            <Card className="p-6 bg-white/80 backdrop-blur text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                <RefreshCw className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Évolution continue</h3>
              <p className="text-sm text-gray-600">Nouvelles fonctionnalités régulières selon vos besoins</p>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto text-center">
          <Card className="p-12 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
            <h2 className="text-3xl font-bold mb-4">
              Prêt à transformer votre cabinet ?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Rejoignez les professionnels du droit qui font confiance à Neira
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-gray-100 px-8"
                onClick={() => navigate('/avocats/auth')}
              >
                Essayer gratuitement
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-white text-white hover:bg-white/10"
                onClick={() => navigate('/contact')}
              >
                Nous contacter
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
