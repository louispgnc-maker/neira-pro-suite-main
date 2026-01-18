import { PublicHeader } from '@/components/layout/PublicHeader';

export default function CGU() {
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
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Conditions Générales d'Utilisation
            </h1>
            <p className="text-lg text-gray-600 italic">
              Dernière mise à jour : 20 novembre 2025
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-12 border border-gray-200">

          <p className="text-gray-700 mb-8">
            Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et l'utilisation de la plateforme Neira, accessible via le site <strong>neira.fr</strong>, éditée par Louis POIGNONEC, micro-entrepreneur.
          </p>
          <p className="text-gray-700 mb-8 font-semibold">
            En utilisant Neira, l'utilisateur reconnaît avoir pris connaissance des CGU et les accepter sans réserve.
          </p>

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">1. Définitions</h2>
            <ul className="space-y-2 text-gray-700">
              <li><strong>« Plateforme »</strong> : désigne la solution Neira et l'ensemble de ses fonctionnalités.</li>
              <li><strong>« Éditeur »</strong> : Louis POIGNONEC, micro-entrepreneur exploitant Neira.</li>
              <li><strong>« Utilisateur »</strong> : toute personne disposant d'un compte sur Neira et utilisant le service.</li>
              <li><strong>« Client »</strong> : l'entité ou le professionnel ayant souscrit un accès à Neira.</li>
              <li><strong>« Contenus »</strong> : documents, fichiers, données et informations importées, créées ou partagées sur la plateforme.</li>
              <li><strong>« Service »</strong> : l'ensemble des fonctionnalités proposées par Neira.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">2. Objet des CGU</h2>
            <p className="text-gray-700">
              Les présentes CGU ont pour objet de définir les modalités d'accès, d'utilisation et de fonctionnement de la plateforme Neira, ainsi que les droits et obligations des Utilisateurs.
            </p>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">3. Accès au service</h2>
            
            <h3 className="text-xl font-semibold mb-3 text-gray-900">3.1. Création de compte</h3>
            <p className="text-gray-700 mb-2">
              L'accès au service nécessite la création d'un compte utilisateur. L'utilisateur doit fournir :
            </p>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>une adresse email valide,</li>
              <li>un mot de passe,</li>
              <li>des informations professionnelles facultatives.</li>
            </ul>
            <p className="text-gray-700 mb-4">Il garantit l'exactitude des informations fournies.</p>

            <h3 className="text-xl font-semibold mb-3 text-gray-900">3.2. Sécurité des identifiants</h3>
            <p className="text-gray-700 mb-2">
              Les identifiants sont strictement personnels. L'utilisateur s'engage à :
            </p>
            <ul className="list-disc ml-8 text-gray-700">
              <li>les conserver confidentiels,</li>
              <li>ne pas les partager,</li>
              <li>informer l'Éditeur en cas d'usage suspect ou non autorisé.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">4. Utilisation de la plateforme</h2>
            <p className="text-gray-700 mb-4">
              L'utilisateur s'engage à utiliser Neira conformément aux lois en vigueur et à son usage professionnel.
            </p>
            <p className="text-gray-700 mb-2">Il est interdit de :</p>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>détourner la plateforme de son usage prévu,</li>
              <li>accéder ou tenter d'accéder aux données d'autres utilisateurs,</li>
              <li>contourner les mesures de sécurité,</li>
              <li>importer ou partager des contenus illicites, offensants ou contrefaisants,</li>
              <li>utiliser Neira pour du spam, des attaques, ou toute activité malveillante.</li>
            </ul>
            <p className="text-gray-700 font-semibold">
              L'Éditeur peut suspendre ou supprimer un compte immédiatement en cas de non-respect de ces règles.
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">5. Description du service</h2>
            <p className="text-gray-700 mb-2">Neira propose notamment :</p>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>un espace collaboratif,</li>
              <li>un gestionnaire de documents,</li>
              <li>des outils d'organisation,</li>
              <li>des workflows automatisés,</li>
              <li>un système de stockage sécurisé.</li>
            </ul>
            <p className="text-gray-700 italic">
              Les fonctionnalités peuvent évoluer à tout moment dans le cadre de l'amélioration du service.
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">6. Disponibilité du service</h2>
            <p className="text-gray-700 mb-2">
              L'Éditeur met tout en œuvre pour assurer une haute disponibilité. Cependant :
            </p>
            <ul className="list-disc ml-8 text-gray-700 mb-2">
              <li>des interruptions peuvent survenir (maintenance, mises à jour),</li>
              <li>des défaillances indépendantes de l'Éditeur peuvent intervenir (hébergeur, réseau…),</li>
              <li>aucune disponibilité permanente n'est garantie.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">7. Responsabilité</h2>
            <p className="text-gray-700 mb-2">L'Éditeur n'est pas responsable :</p>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>de l'utilisation faite de la plateforme par l'utilisateur,</li>
              <li>des contenus importés ou partagés par l'utilisateur (dont il reste seul responsable),</li>
              <li>des dommages indirects (perte de données, perte d'exploitation, etc.),</li>
              <li>en cas de mauvaise utilisation du service.</li>
            </ul>
            <p className="text-gray-700 font-semibold">
              Neira est un outil d'organisation et de gestion, non un service de conseil juridique.
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">8. Données personnelles</h2>
            <p className="text-gray-700">
              L'Éditeur traite les données personnelles conformément au RGPD et à sa Politique de Confidentialité, disponible sur le site.
            </p>
          </section>

          {/* Section 9 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">9. Propriété intellectuelle</h2>
            <p className="text-gray-700 mb-2">
              Sont la propriété exclusive de Louis POIGNONEC :
            </p>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>les éléments graphiques,</li>
              <li>l'interface,</li>
              <li>les textes,</li>
              <li>le code source,</li>
              <li>la marque,</li>
              <li>le logo,</li>
              <li>l'identité visuelle.</li>
            </ul>
            <p className="text-gray-700 mb-2">
              L'Utilisateur conserve la propriété des documents et contenus qu'il importe.
            </p>
            <p className="text-gray-700 font-semibold">
              Toute reproduction ou distribution non autorisée est interdite.
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">10. Stockage et sécurité des données</h2>
            <p className="text-gray-700 mb-2">Les données sont :</p>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>stockées au sein de l'Union Européenne,</li>
              <li>protégées par des mesures de sécurité renforcées,</li>
              <li>accessibles uniquement aux utilisateurs autorisés.</li>
            </ul>
            <p className="text-gray-700 mb-2">
              L'Éditeur ne peut accéder aux données d'un utilisateur que :
            </p>
            <ul className="list-disc ml-8 text-gray-700">
              <li>sur demande de celui-ci,</li>
              <li>dans le cadre du support technique,</li>
              <li>pour des raisons de sécurité,</li>
              <li>sur réquisition légale.</li>
            </ul>
          </section>

          {/* Section 11 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">11. Suppression du compte</h2>
            <p className="text-gray-700 mb-2">
              L'utilisateur peut demander la suppression de son compte :<br />
              📧 <a href="mailto:contact@neira.fr" className="text-blue-600 hover:underline">contact@neira.fr</a>
            </p>
            <p className="text-gray-700">
              Les données seront supprimées dans un délai maximum de 30 jours (hors obligations légales).
            </p>
          </section>

          {/* Section 12 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">12. Résiliation</h2>
            <p className="text-gray-700 mb-2">
              L'Éditeur peut suspendre ou résilier un compte en cas de :
            </p>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>violation des CGU,</li>
              <li>utilisation frauduleuse,</li>
              <li>comportement nuisant à la sécurité ou au bon fonctionnement de Neira.</li>
            </ul>
            <p className="text-gray-700 font-semibold">
              Aucune indemnité ne pourra être réclamée.
            </p>
          </section>

          {/* Section 13 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">13. Modification des CGU</h2>
            <p className="text-gray-700 mb-2">
              L'Éditeur peut modifier les CGU à tout moment.
            </p>
            <p className="text-gray-700 mb-2">
              Une notification pourra être envoyée en cas de changement important.
            </p>
            <p className="text-gray-700">
              L'utilisation du service après modification vaut acceptation des nouvelles CGU.
            </p>
          </section>

          {/* Section 14 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">14. Droit applicable et juridiction compétente</h2>
            <p className="text-gray-700 mb-2">
              Les présentes CGU sont soumises au droit français.
            </p>
            <p className="text-gray-700">
              En cas de litige et à défaut d'accord amiable, les tribunaux français seront compétents.
            </p>
          </section>

          {/* Section 15 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">15. Contact</h2>
            <p className="text-gray-700">
              Pour toute question concernant les CGU ou la plateforme :<br />
              📧 <a href="mailto:contact@neira.fr" className="text-blue-600 hover:underline">contact@neira.fr</a>
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
