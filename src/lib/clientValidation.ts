/**
 * Calcule les informations manquantes d'un client
 * Retourne un objet avec kyc_status et missing_info
 */
export function calculateClientCompleteness(client: any): {
  kyc_status: 'Complet' | 'Partiel';
  missing_info: string | null;
} {
  const requiredFields = [
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
    { key: 'date_naissance', label: 'Date de naissance' },
    { key: 'lieu_naissance', label: 'Lieu de naissance' },
    { key: 'adresse', label: 'Adresse' },
    { key: 'telephone', label: 'Téléphone' },
    { key: 'email', label: 'Email' },
    { key: 'nationalite', label: 'Nationalité' },
    { key: 'sexe', label: 'Sexe' },
    { key: 'type_identite', label: 'Type d\'identité' },
    { key: 'numero_identite', label: 'Numéro d\'identité' },
  ];

  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = client[field.key];
    if (!value || value === '' || value === null) {
      missingFields.push(field.label);
    }
  }

  if (missingFields.length === 0) {
    return {
      kyc_status: 'Complet',
      missing_info: null,
    };
  } else {
    return {
      kyc_status: 'Partiel',
      missing_info: missingFields.join(', '),
    };
  }
}
