import { PublicHeader } from '@/components/layout/PublicHeader';

export default function MentionsLegales() {
  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-primary/20 via-accent/10 to-background"
      style={{
        paddingLeft: '1cm',
        paddingRight: '1cm',
        backgroundImage: 'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Mix%20deux%20fonds.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <PublicHeader />

      <div className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto bg-white/90 backdrop-blur rounded-2xl shadow-xl p-12">
          <h1 className="text-4xl font-bold mb-8 text-gray-900">
            Mentions légales – Neira (Micro-entreprise)
          </h1>

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">1. Éditeur du site</h2>
            <div className="text-gray-700 space-y-2">
              <p>Le site <strong>neira.fr</strong> est édité par :</p>
              <p className="ml-4">
                <strong>Louis POIGNONEC</strong>, micro-entrepreneur<br />
                Siège social : 36 Chemin d'Artigues, 33150 Cenon, France<br />
                Numéro SIRET : 988 651 709 00012<br />
                Activité déclarée : [non précisée]<br />
                Email : <a href="mailto:contact@neira.fr" className="text-blue-600 hover:underline">contact@neira.fr</a><br />
                Directeur de la publication : Louis POIGNONEC
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">2. Hébergeur</h2>
            <div className="text-gray-700 space-y-2">
              <p>Le site est hébergé par :</p>
              <p className="ml-4">
                <strong>Hostinger International Ltd.</strong> (opéré par Hostinger Operations, UAB)<br />
                Siège social : Švitrigailos str. 34, 03230 Vilnius, Lituanie<br />
                Téléphone : +370 645 03378<br />
                Email : <a href="mailto:domains@hostinger.com" className="text-blue-600 hover:underline">domains@hostinger.com</a>
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">3. Propriété intellectuelle</h2>
            <p className="text-gray-700">
              Tous les éléments (textes, images, graphismes, logo, structure, codes, contenus) présents sur le site <strong>neira.fr</strong> sont la propriété exclusive de Louis POIGNONEC (ou de la micro-entreprise qu'il représente), sauf indication contraire explicite.
            </p>
            <p className="text-gray-700 mt-2">
              Toute reproduction, diffusion ou modification sans autorisation écrite est interdite.
            </p>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">4. Responsabilité</h2>
            <p className="text-gray-700 mb-2">
              L'éditeur du site s'efforce de fournir des informations exactes et à jour, mais ne peut garantir l'absence d'erreurs ou d'omissions.
            </p>
            <p className="text-gray-700 mb-2">
              En conséquence, la responsabilité de l'éditeur ne pourra être engagée pour tout dommage direct ou indirect, quelle qu'en soit la cause, survenu suite à l'accès ou l'utilisation du site.
            </p>
            <p className="text-gray-700">
              Les liens vers des sites externes (et leur contenu) ne sont pas sous la responsabilité de l'éditeur.
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">5. Données personnelles (RGPD)</h2>
            <p className="text-gray-700 mb-4">
              Le responsable du traitement est : <strong>Louis POIGNONEC</strong> (micro-entrepreneur)
            </p>
            <p className="text-gray-700 mb-2">
              Les données collectées via le site (formulaires, création de compte utilisateur, utilisation de la solution Neira) sont utilisées pour :
            </p>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>la gestion du service,</li>
              <li>la relation client,</li>
              <li>la sécurité des comptes et de la plateforme,</li>
              <li>et l'amélioration continue de la solution.</li>
            </ul>
            <p className="text-gray-700 mb-4">
              <strong>Les données ne sont jamais revendues.</strong>
            </p>

            <h3 className="text-xl font-semibold mb-3 text-gray-900">Droits des utilisateurs</h3>
            <p className="text-gray-700 mb-2">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>droit d'accès</li>
              <li>droit de rectification</li>
              <li>droit d'opposition</li>
              <li>droit de suppression</li>
              <li>droit à la portabilité</li>
              <li>droit à la limitation du traitement</li>
            </ul>
            <p className="text-gray-700 mb-4">
              Pour exercer ces droits :<br />
              📧 <a href="mailto:contact@neira.fr" className="text-blue-600 hover:underline">contact@neira.fr</a>
            </p>

            <h3 className="text-xl font-semibold mb-3 text-gray-900">Durée de conservation</h3>
            <p className="text-gray-700">
              Les données sont conservées pendant [durée à préciser — par exemple « le temps de la relation contractuelle + 3 ans »], sauf obligation légale contraire.
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">6. Cookies</h2>
            <p className="text-gray-700 mb-2">
              Le site peut utiliser des cookies pour :
            </p>
            <ul className="list-disc ml-8 text-gray-700 mb-4">
              <li>assurer son bon fonctionnement,</li>
              <li>mesurer la fréquentation du site,</li>
              <li>améliorer l'expérience utilisateur.</li>
            </ul>
            <p className="text-gray-700">
              Vous pouvez gérer ou refuser les cookies via les paramètres de votre navigateur, ou via le bandeau de gestion des cookies présent lors de votre première visite.
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">7. Conditions d'utilisation</h2>
            <p className="text-gray-700 mb-2">
              L'utilisation du site <strong>neira.fr</strong> implique l'acceptation pleine et entière :
            </p>
            <ul className="list-disc ml-8 text-gray-700">
              <li>des présentes mentions légales,</li>
              <li>de la politique de confidentialité,</li>
              <li>et de toutes les conditions d'utilisation liées à la solution Neira.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">8. Contact</h2>
            <p className="text-gray-700">
              Pour toute question concernant le site, son fonctionnement, ou pour signaler un contenu :<br />
              📧 <a href="mailto:contact@neira.fr" className="text-blue-600 hover:underline">contact@neira.fr</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
