
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Index() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-primary/20 via-accent/10 to-background py-24 px-6">
      {/* Top-left logo */}
      <div className="absolute top-6 left-6">
        <img src="https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Design_sans_titre-3-removebg-preview.png" alt="Neira" className="w-12 h-12 rounded-lg object-cover" />
      </div>

      <main className="w-full max-w-5xl mx-auto">
        <header className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">Automatisez votre activité juridique</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">La plateforme tout-en-un qui simplifie votre quotidien de professionnel du juridique.</p>
        </header>

        {/* Role buttons */}
        <div className="flex items-center justify-center gap-6 mb-12">
          <Button size="lg" className="text-lg px-8 py-4 bg-blue-600 text-white hover:bg-blue-700 shadow-md ring-1 ring-blue-700" onClick={() => navigate("/avocats/auth")}>Espace Avocats</Button>
          <Button size="lg" className="text-lg px-8 py-4 bg-orange-600 text-white hover:bg-orange-700 shadow-md ring-1 ring-orange-700" onClick={() => navigate("/notaires/auth")}>Espace Notaires</Button>
        </div>

        {/* Features: 4 blocks */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="flex flex-col items-start p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-border shadow-sm">
            <div className="text-2xl mb-3">🔄</div>
            <h3 className="font-semibold text-lg mb-2">Automatiser vos tâches répétitives</h3>
            <p className="text-sm text-muted-foreground">Gagnez plusieurs heures par semaine en automatisant vos workflows juridiques.</p>
          </div>

          <div className="flex flex-col items-start p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-border shadow-sm">
            <div className="text-2xl mb-3">📁</div>
            <h3 className="font-semibold text-lg mb-2">Gérer vos documents en toute sécurité</h3>
            <p className="text-sm text-muted-foreground">Classement, partage, versionning, historique complet.</p>
          </div>

          <div className="flex flex-col items-start p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-border shadow-sm">
            <div className="text-2xl mb-3">👥</div>
            <h3 className="font-semibold text-lg mb-2">Collaborer avec vos clients et vos équipes</h3>
            <p className="text-sm text-muted-foreground">Espace partagé, messages, échanges sécurisés.</p>
          </div>

          <div className="flex flex-col items-start p-6 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-border shadow-sm">
            <div className="text-2xl mb-3">📊</div>
            <h3 className="font-semibold text-lg mb-2">Piloter votre activité</h3>
            <p className="text-sm text-muted-foreground">Agenda, statistiques, indicateurs et suivi des dossiers.</p>
          </div>
        </section>

        {/* Pour qui ? */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold text-foreground mb-6 text-center">Pour qui ?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white/60 rounded-xl border border-border shadow-sm">
              <h4 className="text-lg font-semibold mb-3">👩‍⚖️ Avocats</h4>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                <li>Gestion de dossiers</li>
                <li>Collaboration client</li>
                <li>Automatisation de modèles</li>
                <li>Communication simplifiée</li>
              </ul>
            </div>

            <div className="p-6 bg-white/60 rounded-xl border border-border shadow-sm">
              <h4 className="text-lg font-semibold mb-3">🏛️ Notaires</h4>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                <li>Gestion d’actes</li>
                <li>Collecte sécurisée de documents</li>
                <li>Automatisation administrative</li>
                <li>Collaboration en équipe</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center mt-6">
          <p className="mb-4 text-lg text-muted-foreground">Découvrez tous nos outils et débloquez l’ensemble de nos fonctionnalités avancées dès maintenant</p>
          <div className="flex items-center justify-center">
            <Button size="lg" onClick={() => navigate('/avocats/auth')}>Découvrir</Button>
          </div>
        </section>
      </main>
    </div>
  );
}
