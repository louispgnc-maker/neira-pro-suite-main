import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { CheckCircle2, FileText, Users, Clock, Shield, BarChart3, Zap, ArrowRight, CheckCheck, Scale, Building2 } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />

      {/* 1. HERO SECTION */}
      <section className="relative pt-32 pb-24 px-6 bg-gradient-to-br from-blue-100 via-purple-100 to-blue-100 overflow-hidden">
        {/* Decorative shapes removed as requested */}
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="text-gray-900">
                Pilotez votre cabinet juridique
              </span>
              <br />
              <span className="text-gray-900">en toute simplicité</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              La plateforme tout-en-un qui automatise vos tâches, sécurise vos documents et optimise votre collaboration client
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 group"
                onClick={() => navigate("/solution")}
              >
                Découvrir la solution
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 py-6 border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white shadow-md hover:shadow-lg transition-all duration-200"
                onClick={() => navigate("/contact")}
              >
                Demander une démo
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <span>Conforme RGPD</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
                <span>Données hébergées en France</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
                <span>Support dédié</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROBLÈME → SOLUTION */}
      <section className="py-20 px-6 bg-gradient-to-br from-slate-50 via-blue-100 to-purple-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 min-h-[100px]">
                Les défis quotidiens de votre cabinet
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-5 bg-red-50 rounded-xl border border-red-100 hover:shadow-md transition-shadow">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700"><strong>Tâches répétitives</strong> qui vous font perdre un temps précieux</p>
                </div>
                <div className="flex items-start gap-4 p-5 bg-red-50 rounded-xl border border-red-100 hover:shadow-md transition-shadow">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700"><strong>Documents éparpillés</strong> difficiles à retrouver et à partager</p>
                </div>
                <div className="flex items-start gap-4 p-5 bg-red-50 rounded-xl border border-red-100 hover:shadow-md transition-shadow">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700"><strong>Communication client</strong> fragmentée entre emails, appels et messages</p>
                </div>
                <div className="flex items-start gap-4 p-5 bg-red-50 rounded-xl border border-red-100 hover:shadow-md transition-shadow">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700"><strong>Manque de visibilité</strong> sur l'avancement de vos dossiers</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-8 min-h-[100px]">
                <span className="text-gray-900">
                  Neira transforme votre quotidien
                </span>
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 hover:shadow-md transition-shadow">
                  <CheckCircle2 className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700"><strong>Automatisation intelligente</strong> de vos workflows juridiques</p>
                </div>
                <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-purple-200 hover:shadow-md transition-shadow">
                  <CheckCircle2 className="h-6 w-6 text-purple-600 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700"><strong>Gestion centralisée</strong> de tous vos documents en toute sécurité</p>
                </div>
                <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 hover:shadow-md transition-shadow">
                  <CheckCircle2 className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700"><strong>Espace collaboratif</strong> unique pour échanger avec votre équipe</p>
                </div>
                <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-purple-200 hover:shadow-md transition-shadow">
                  <CheckCircle2 className="h-6 w-6 text-purple-600 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700"><strong>Tableau de bord complet</strong> pour piloter votre activité</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CE QUE FAIT NEIRA */}
      <section className="py-20 px-6 bg-gradient-to-br from-purple-100 via-blue-100 to-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gray-900">
                Une plateforme complète
              </span>
              <br />
              <span className="text-gray-900">pour votre cabinet</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Neira réunit tous les outils essentiels pour gérer efficacement votre activité juridique
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 group border border-blue-100">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Gestion documentaire</h3>
              <p className="text-gray-600">Stockage sécurisé, organisation intelligente, versionning et partage simplifié de tous vos documents</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 group border border-purple-100">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Automatisation</h3>
              <p className="text-gray-600">Génération automatique de documents, workflows personnalisables et rappels intelligents</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 group border border-purple-100">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Collaboration d'équipe</h3>
              <p className="text-gray-600">Espace partagé sécurisé, messagerie intégrée et suivi en temps réel des dossiers</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 group border border-blue-100">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Clock className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Suivi des échéances</h3>
              <p className="text-gray-600">Calendrier intelligent, notifications automatiques et gestion des délais critiques</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 group border border-purple-100">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Sécurité & Conformité</h3>
              <p className="text-gray-600">Chiffrement des données, conformité RGPD et hébergement sécurisé en France</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 group border border-blue-100">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Pilotage & Statistiques</h3>
              <p className="text-gray-600">Tableaux de bord personnalisés, indicateurs clés et rapports d'activité détaillés</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. VALEUR APPORTÉE */}
      <section className="py-20 px-6 bg-gradient-to-br from-slate-50 via-purple-100 to-blue-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Des résultats concrets pour votre cabinet
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Neira vous fait gagner du temps et améliore votre efficacité au quotidien
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-10 rounded-2xl border-2 border-blue-200 hover:shadow-lg transition-shadow">
              <div className="text-5xl md:text-6xl font-bold text-blue-600 mb-4">-70%</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Jusqu'à -70% de temps administratif</h3>
              <p className="text-gray-600 text-lg">Concentrez-vous sur votre cœur de métier en automatisant les tâches répétitives</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-10 rounded-2xl border-2 border-purple-200 hover:shadow-lg transition-shadow">
              <div className="text-5xl md:text-6xl font-bold text-purple-600 mb-4">+45%</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Jusqu'à +45% de productivité</h3>
              <p className="text-gray-600 text-lg">Optimisez l'organisation et la collaboration au sein de votre cabinet</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-10 rounded-2xl border-2 border-purple-200 hover:shadow-lg transition-shadow">
              <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">100%</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Sécurité renforcée & confidentialité</h3>
              <p className="text-gray-600 text-lg">Chiffrement & accès contrôlés pour garantir la protection de vos données</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-10 rounded-2xl border-2 border-blue-200 hover:shadow-lg transition-shadow">
              <div className="text-5xl md:text-6xl font-bold text-blue-600 mb-4">24/7</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Suivi en temps réel 24/7</h3>
              <p className="text-gray-600 text-lg">Suivez en temps réel l'avancement de vos dossiers</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. COMMENT ÇA FONCTIONNE */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-100 via-purple-100 to-blue-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Comment fonctionne Neira ?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Une solution pensée pour simplifier chaque aspect de votre activité juridique
            </p>
          </div>

          <div className="space-y-6">
            {[
              { num: 1, color: "blue", title: "Automatisation intelligente", desc: "Créez des modèles personnalisés et générez automatiquement vos documents. Définissez des workflows sur mesure." },
              { num: 2, color: "purple", title: "Collaboration simplifiée", desc: "Partagez des espaces sécurisés avec vos clients et équipes. Communiquez en temps réel." },
              { num: 3, color: "green", title: "Gestion documentaire centralisée", desc: "Stockez, classez et retrouvez instantanément tous vos documents avec gestion des versions." },
              { num: 4, color: "orange", title: "Suivi des échéances", desc: "Ne manquez plus de deadline. Neira vous alerte automatiquement des échéances critiques." },
              { num: 5, color: "red", title: "Sécurité maximale", desc: "Données chiffrées, hébergées en France et conformes RGPD. Traçabilité complète." }
            ].map((step) => (
              <div key={step.num} className="bg-white p-8 rounded-2xl shadow-md hover:shadow-lg transition-shadow flex items-start gap-6">
                <div className={`w-12 h-12 bg-${step.color}-600 text-white rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0`} style={{backgroundColor: step.color === "blue" ? "#2563eb" : step.color === "purple" ? "#9333ea" : step.color === "green" ? "#16a34a" : step.color === "orange" ? "#ea580c" : "#dc2626"}}>
                  {step.num}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600 text-lg">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. POUR QUI */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Une solution adaptée à votre métier
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Neira accompagne les professionnels du droit dans leur transformation digitale
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-10 rounded-2xl border-2 border-blue-200 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <Scale className="h-12 w-12 text-blue-600" />
                <h3 className="text-3xl font-bold text-gray-900">Avocats</h3>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCheck className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-lg">Gestion complète de vos dossiers clients</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCheck className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-lg">Automatisation des actes et contrats</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCheck className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-lg">Espace client sécurisé</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCheck className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-lg">Suivi des procédures et échéances</span>
                </li>
              </ul>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
                onClick={() => navigate("/avocats/auth")}
              >
                Accéder à l'espace Avocats
              </Button>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-amber-100 p-10 rounded-2xl border-2 border-orange-200 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <Building2 className="h-12 w-12 text-orange-600" />
                <h3 className="text-3xl font-bold text-gray-900">Notaires</h3>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCheck className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-lg">Gestion des actes authentiques</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCheck className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-lg">Collecte sécurisée des pièces</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCheck className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-lg">Automatisation administrative</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCheck className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-lg">Conformité réglementaire</span>
                </li>
              </ul>
              <Button 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 text-lg"
                onClick={() => navigate("/notaires/auth")}
              >
                Accéder à l'espace Notaires
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CAS D'USAGE */}
      <section className="py-20 px-6 bg-gradient-to-br from-gray-50 to-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Neira en action au quotidien
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Découvrez comment Neira simplifie concrètement votre travail
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { icon: FileText, color: "blue", title: "Gestion des dossiers", desc: "Créez et suivez tous vos dossiers depuis une interface unique", items: ["Création automatisée", "Templates personnalisables", "Suivi temps réel"] },
              { icon: Users, color: "purple", title: "Collaboration client", desc: "Offrez un accès sécurisé pour consulter et déposer des documents", items: ["Portail client", "Messagerie sécurisée", "Documents chiffrés"] },
              { icon: Clock, color: "orange", title: "Suivi des échéances", desc: "Respectez tous vos délais grâce aux alertes automatiques", items: ["Rappels configurables", "Calendrier partagé", "Notifications multi-canaux"] },
              { icon: BarChart3, color: "green", title: "Pilotage du cabinet", desc: "Vue d'ensemble et analyse de vos performances", items: ["Tableaux de bord", "Indicateurs KPI", "Rapports détaillés"] }
            ].map((useCase, idx) => (
              <div key={idx} className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                <div className={`w-16 h-16 bg-${useCase.color}-100 rounded-2xl flex items-center justify-center mb-6`} style={{backgroundColor: useCase.color === "blue" ? "#dbeafe" : useCase.color === "purple" ? "#f3e8ff" : useCase.color === "orange" ? "#ffedd5" : "#dcfce7"}}>
                  <useCase.icon className="h-8 w-8" style={{color: useCase.color === "blue" ? "#2563eb" : useCase.color === "purple" ? "#9333ea" : useCase.color === "orange" ? "#ea580c" : "#16a34a"}} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{useCase.title}</h3>
                <p className="text-gray-600 mb-4">{useCase.desc}</p>
                <ul className="space-y-2 text-gray-600">
                  {useCase.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{backgroundColor: useCase.color === "blue" ? "#2563eb" : useCase.color === "purple" ? "#9333ea" : useCase.color === "orange" ? "#ea580c" : "#16a34a"}}></div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. OFFRES */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Choisissez l'offre adaptée à vos besoins
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Des formules flexibles pour accompagner la croissance de votre cabinet
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white border-2 border-blue-200 rounded-2xl p-8 hover:shadow-2xl transition-all hover:border-blue-400">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">NEIRA ESSENTIEL</h3>
                <p className="text-gray-600 mb-6">Idéal pour avocats et notaires indépendants</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-blue-600">45€</span>
                  <span className="text-gray-600">/mois/utilisateur</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                {["20 Go de stockage", "100 dossiers actifs", "30 clients actifs", "15 signatures/mois/utilisateur", "Gestion documentaire", "Partage sécurisé client"].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6"
                onClick={() => navigate("/checkout-essentiel")}
              >
                Choisir Essentiel
              </Button>
            </div>

            <div className="bg-white rounded-2xl p-8 relative hover:shadow-2xl transition-shadow border-2 border-purple-500 transform scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                RECOMMANDÉ
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">NEIRA PROFESSIONNEL</h3>
                <p className="text-gray-600 mb-6">⚡ Pensé pour les cabinets en croissance</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-purple-600">59€</span>
                  <span className="text-gray-600">/mois/utilisateur</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                {["100 Go de stockage", "600 dossiers actifs", "200 clients actifs", "80 signatures/mois/utilisateur", "Espace collaboratif complet", "Gestion documentaire avancée", "Tableaux de bord"].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 font-bold"
                onClick={() => navigate("/checkout-professionnel")}
              >
                Choisir Professionnel
              </Button>
            </div>

            <div className="bg-white border-2 border-orange-200 rounded-2xl p-8 hover:shadow-2xl transition-all hover:border-orange-400">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">NEIRA CABINET+</h3>
                <p className="text-gray-600 mb-6">Idéal pour cabinets de 10 à 50+ utilisateurs</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-orange-600">99€</span>
                  <span className="text-gray-600">/mois/utilisateur</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                {["Stockage illimité", "Dossiers illimités", "Clients illimités", "Signatures illimitées", "Collaboration sans limite", "Tableaux de bord avancés", "Onboarding & formation", "Accès anticipé aux nouveautés"].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <p className="text-gray-600 mb-6">🚀 Pour les cabinets recherchant une solution sans limite, quelle que soit leur taille</p>
              <Button 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6"
                onClick={() => navigate("/checkout-cabinet-plus")}
              >
                Choisir Cabinet+
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. CTA FINAL */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Prêt à transformer votre cabinet ?
          </h2>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto">
            Rejoignez les centaines de professionnels du droit qui font confiance à Neira
          </p>

          <div className="flex items-center justify-center">
            <Button 
              size="lg" 
              className="text-lg px-10 py-7 bg-white text-blue-600 hover:bg-gray-100 shadow-2xl hover:shadow-3xl transition-all duration-200 font-bold"
              onClick={() => navigate("/contact")}
            >
              Demander une démo gratuite
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="mb-4">© 2026 Neira - Tous droits réservés</p>
          <div className="flex items-center justify-center gap-6 text-sm">
            {[
              { label: "Mentions légales", href: "/mentions-legales" },
              { label: "RGPD", href: "/rgpd" },
              { label: "CGU", href: "/cgu" },
              { label: "Contact", href: "/contact" }
            ].map((link, i) => (
              <a key={i} href={link.href} className="hover:text-white transition-colors">{link.label}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}