import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function AvocatsMetier() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background p-6 pt-28">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md border border-border p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Avocats — Ce que nous apportons</h1>
            <p className="text-sm text-muted-foreground mt-2">Solutions pour optimiser la rédaction, la collaboration et le pilotage de votre cabinet.</p>
          </div>
          <div>
            <Button onClick={() => navigate(-1)} variant="ghost">Retour</Button>
          </div>
        </div>

        <section className="space-y-4 mb-6">
          <h2 className="text-xl font-semibold">Nos apports au métier</h2>
          <ul className="list-disc list-inside text-sm space-y-2 text-muted-foreground">
            <li>Automatisation de la rédaction d'actes et contrats (modèles paramétrables, clauses réutilisables).</li>
            <li>Gestion centralisée des dossiers clients et des pièces (recherche, OCR, métadonnées).</li>
            <li>Processus de signature sécurisée et d'archivage conforme.</li>
            <li>Permissions granulaires pour gérer accès et responsabilités par rôle.</li>
            <li>Tableaux de bord métier pour suivre chiffre d'affaires, charge et délais.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Postes et rôles dans le cabinet</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div className="space-y-3">
              <h3 className="font-medium">Direction & avocats</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Associés / Fondateurs — pilotage stratégique, conformité, business development.</li>
                <li>Collaborateurs / Avocats — gestion des dossiers clients et représentation.</li>
                <li>Juristes seniors — relecture, validation des modèles et encadrement.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium">Support & opérations</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Paralegals / Assistants juridiques — préparation des dossiers, contacts clients.</li>
                <li>Chargé(e) de facturation & administratif — suivi des factures et paiements.</li>
                <li>Responsable qualité & conformité — audits internes et gestion RGPD.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">Comment Neira s'intègre</h2>
          <p className="text-sm text-muted-foreground mt-2">Neira se connecte aux processus existants et propose des points d'automatisation progressifs : modèles de documents partagés, workflows de validation, notifications d'échéances, et rapports métiers. L'objectif est de réduire le temps passé sur les tâches répétitives et d'améliorer la traçabilité.</p>
        </section>
      </div>
    </div>
  );
}
