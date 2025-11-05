// Options possibles pour la situation familiale (utilisées dans Create/Edit fiche client Notaire)
// Chaque entrée: label affiché et une clé normalisée si besoin future logique.

export interface FamilyOption {
  key: string;
  label: string;
}

export const FAMILY_OPTIONS: FamilyOption[] = [
  { key: 'mariage_regime_communautaire', label: 'Mariage - régime communauté réduite aux acquêts' },
  { key: 'mariage_separation_biens', label: 'Mariage - séparation de biens' },
  { key: 'mariage_regime_universelle', label: 'Mariage - communauté universelle' },
  { key: 'pacs', label: 'PACS' },
  { key: 'concubinage', label: 'Concubinage' },
  { key: 'divorce_en_cours', label: 'Divorce en cours' },
  { key: 'divorce_prononce', label: 'Divorce prononcé' },
  { key: 'veuf', label: 'Veuf / Veuve' },
  { key: 'separation', label: 'Séparation' },
  { key: 'enfants_communs', label: 'Enfants communs' },
  { key: 'enfants_précédente_union', label: 'Enfants d’une précédente union' },
  { key: 'tutelle_curatelle', label: 'Sous tutelle / curatelle' },
  { key: 'handicap_reconnu', label: 'Handicap reconnu (enfant ou conjoint)' }
];
