import { PublicHeader } from '@/components/layout/PublicHeader';

export default function RGPD() {
  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-primary/20 via-accent/10 to-background"
      style={{
        paddingLeft: '1cm',
        paddingRight: '1cm',
        backgroundImage: 'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Design%20sans%20titre-4.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <PublicHeader />

      <div className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto bg-white/90 backdrop-blur rounded-2xl shadow-xl p-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">
            Politique de Confidentialité – Neira
          </h1>
          <p className="text-gray-600 mb-8 italic">
            (Conforme RGPD & Loi Informatique et Libertés)
          </p>

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">1. Responsable du traitement</h2>
            <p className="text-gray-700 mb-2">
              Le traitement des données personnelles collectées sur le site <strong>neira.fr</strong> et via l'utilisation de la solution Neira est effectué par :
            </p>
            <div className="ml-4 text-gray-700">
              <p><strong>Louis POIGNONEC</strong></p>
              <p>Micro-entrepreneur</p>
              <p>36 Chemin d'Artigues, 33150 Cenon, France</p>
              <p>Email : <a href="mailto:contact@neira.fr" className="text-blue-600 hover:underline">contact@neira.fr</a></p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">2. Données collectées</h2>
            <p className="text-gray-700 mb-4">
              Nous collectons uniquement les données nécessaires au fonctionnement de Neira et à l'amélioration du service.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-gray-900">2.1. Données fournies par l'utilisateur</h3>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>Nom, prénom</li>
              <li>Adresse email</li>
              <li>Mot de passe (chiffré)</li>
              <li>Informations renseignées dans les formulaires (contact, création de compte, demandes d'assistance)</li>
              <li>Données professionnelles (cabinet, rôle, préférences)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-gray-900">2.2. Données générées lors de l'utilisation de Neira</h3>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>Fichiers et documents déposés par les utilisateurs</li>
              <li>Informations liées aux espaces collaboratifs</li>
              <li>Informations liées aux actions effectuées dans la plateforme</li>
              <li>Métadonnées techniques (ex. date de création, format, interactions)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-gray-900">2.3. Données techniques</h3>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>Adresse IP</li>
              <li>Type d'appareil</li>
              <li>Navigateur</li>
              <li>Logs techniques</li>
              <li>Cookies (voir section dédiée)</li>
            </ul>

            <p className="text-gray-700 italic">
              Aucune donnée sensible (ex : opinions politiques, santé…) n'est collectée volontairement.
            </p>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">3. Finalités du traitement</h2>
            <p className="text-gray-700 mb-4">Les données collectées sont utilisées pour :</p>

            <h3 className="text-xl font-semibold mb-3 text-gray-900">3.1. Exécution du service</h3>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>Création et gestion des comptes utilisateurs</li>
              <li>Accès à l'espace collaboratif</li>
              <li>Gestion des documents, dossiers et workflows</li>
              <li>Notifications liées au fonctionnement de la solution</li>
              <li>Sécurisation des accès</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-gray-900">3.2. Support & relation utilisateur</h3>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>Réponses aux demandes effectuées via les formulaires</li>
              <li>Assistance technique ou fonctionnelle</li>
              <li>Amélioration continue de la plateforme</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-gray-900">3.3. Amélioration du produit</h3>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>Analyse des usages (anonyme ou pseudonymisée)</li>
              <li>Développement de nouvelles fonctionnalités</li>
              <li>Prévention des erreurs et bugs</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-gray-900">3.4. Obligations légales</h3>
            <ul className="list-disc ml-8 text-gray-700">
              <li>Conformité aux lois françaises et européennes</li>
              <li>Gestion d'éventuelles réquisitions administratives ou judiciaires</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">4. Base légale du traitement</h2>
            <p className="text-gray-700 mb-2">Les traitements reposent sur :</p>
            <ul className="list-disc ml-8 text-gray-700">
              <li><strong>L'exécution d'un contrat</strong> (article 6.1.b RGPD) – utilisation de Neira</li>
              <li><strong>Le consentement</strong> (article 6.1.a RGPD) – cookies, formulaires</li>
              <li><strong>L'intérêt légitime</strong> (article 6.1.f RGPD) – sécurité, amélioration du service</li>
              <li><strong>L'obligation légale</strong> (article 6.1.c RGPD) – conservation comptable, conformité</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">5. Destinataires des données</h2>
            <p className="text-gray-700 mb-2">Les données peuvent être transmises uniquement à :</p>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>l'éditeur du site (Louis POIGNONEC)</li>
              <li>les prestataires techniques essentiels à la fourniture du service (hébergeur Hostinger, services emails, outils d'analyse anonymisée)</li>
              <li>les autorités administratives/judiciaires si la loi l'exige</li>
            </ul>
            <p className="text-gray-700 mb-2">
              <strong>Aucune donnée n'est vendue.</strong>
            </p>
            <p className="text-gray-700">
              Tous les sous-traitants sont conformes au RGPD et situés en France, dans l'UE, ou disposent de garanties adéquates (ex : Clauses Contractuelles Types).
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">6. Durées de conservation</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">Type de données</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">Durée</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Compte utilisateur</td>
                    <td className="border border-gray-300 px-4 py-2">Tant que le compte est actif</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Données du compte supprimé</td>
                    <td className="border border-gray-300 px-4 py-2">30 jours avant suppression définitive</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Données contractuelles / facturation</td>
                    <td className="border border-gray-300 px-4 py-2">10 ans (obligation légale)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Logs techniques</td>
                    <td className="border border-gray-300 px-4 py-2">12 mois maximum</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Emails & demandes de contact</td>
                    <td className="border border-gray-300 px-4 py-2">36 mois</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Cookies</td>
                    <td className="border border-gray-300 px-4 py-2">6 à 13 mois selon le type</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">7. Vos droits (RGPD)</h2>
            <p className="text-gray-700 mb-2">
              Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>Droit d'accès</li>
              <li>Droit de rectification</li>
              <li>Droit d'opposition</li>
              <li>Droit à l'effacement</li>
              <li>Droit à la limitation du traitement</li>
              <li>Droit à la portabilité</li>
              <li>Droit de retirer votre consentement à tout moment</li>
              <li>Droit d'introduire une réclamation auprès de la CNIL</li>
            </ul>
            <p className="text-gray-700">
              Pour exercer vos droits :<br />
              📧 <a href="mailto:contact@neira.fr" className="text-blue-600 hover:underline">contact@neira.fr</a>
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">8. Sécurité des données</h2>
            <p className="text-gray-700 mb-2">Nous mettons en œuvre des mesures strictes :</p>
            <ul className="list-disc ml-8 text-gray-700">
              <li>chiffrement des données en transit (HTTPS / TLS)</li>
              <li>mots de passe chiffrés et jamais visibles</li>
              <li>sauvegardes régulières</li>
              <li>isolation des environnements</li>
              <li>contrôle d'accès par rôles</li>
              <li>surveillance des anomalies</li>
              <li>hébergement sécurisé chez Hostinger (UE)</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">9. Localisation des données</h2>
            <p className="text-gray-700 mb-2">
              Les données sont hébergées au sein de l'Union Européenne.
            </p>
            <p className="text-gray-700">
              Hostinger exploite des infrastructures situées en Europe (principalement en Lituanie, France, Pays-Bas).
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">10. Cookies et traceurs</h2>
            <p className="text-gray-700 mb-2">Nous utilisons des cookies pour :</p>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>le fonctionnement technique du site</li>
              <li>la mesure d'audience</li>
              <li>l'amélioration de l'expérience utilisateur</li>
            </ul>
            <p className="text-gray-700 mb-2">
              Lors de votre première visite, un bandeau de consentement permet :
            </p>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>d'accepter les cookies</li>
              <li>de refuser</li>
              <li>de personnaliser</li>
            </ul>
            <p className="text-gray-700 italic">
              Certains cookies techniques sont indispensables et ne peuvent être désactivés.
            </p>
          </section>

          {/* Section 11 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">11. Modification de la politique</h2>
            <p className="text-gray-700 mb-2">
              Nous nous réservons le droit de mettre à jour cette politique à tout moment.
            </p>
            <p className="text-gray-700">
              La dernière version est toujours disponible sur cette page.
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">12. Contact</h2>
            <p className="text-gray-700">
              Pour toute question concernant la protection des données :<br />
              📧 <a href="mailto:contact@neira.fr" className="text-blue-600 hover:underline">contact@neira.fr</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
