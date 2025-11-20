import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotairesMetier() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background p-6 pt-28">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md border border-border p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Notaires — Ce que nous apportons</h1>
            <p className="text-sm text-muted-foreground mt-2">Outils conçus pour sécuriser les actes, rationaliser les formalités et faciliter le travail des équipes notariales.</p>
          </div>
          <div>
            <Button onClick={() => navigate(-1)} variant="ghost">Retour</Button>
          </div>
        </div>

        <section className="space-y-4 mb-6">
          <h2 className="text-xl font-semibold">Nos apports au métier</h2>
          <ul className="list-disc list-inside text-sm space-y-2 text-muted-foreground">
            <li>Gestion des modèles d'actes et automatisation des clauses usuelles.</li>
            <li>Suivi des formalités et pièces justificatives avec checklist paramétrable.</li>
            <li>Signature sécurisée et archivage conforme des actes notariés.</li>
            <li>Portail client pour dépôt de pièces et communication sécurisée.</li>
            <li>Reporting pour suivre activité, volumes d'actes et délais de traitement.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Postes et rôles dans l'étude</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div className="space-y-3">
              <h3 className="font-medium">Direction & notaires</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Notaires associés — garantie de conformité et supervision des actes.</li>
                <li>Adjoints notariaux — rédaction, contrôle et relations avec les clients.</li>
                <li>Notaires remplaçants — gestion ponctuelle et continuité des services.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium">Support administratif</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Clercs / Formalistes — préparation des dossiers et enregistrement des formalités.</li>
                <li>Gestionnaires d'actes — suivi des signatures, envois et archivage.</li>
                <li>Responsable qualité & conformité — audits et RGPD.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">Comment Neira s'intègre</h2>
          <p className="text-sm text-muted-foreground mt-2">Neira facilite la constitution du dossier, l'ordonnancement des étapes et la conservation des actes. Nous proposons des workflows adaptables pour chaque type d'acte et un portail client sécurisé pour la collecte des pièces.</p>
        </section>
      </div>
    </div>
  );
}
