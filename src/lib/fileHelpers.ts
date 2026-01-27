/**
 * Nettoie un nom de fichier pour le rendre compatible avec Supabase Storage
 * Supprime les accents, espaces et caractères spéciaux
 */
export function sanitizeFileName(fileName: string): string {
  // Séparer le nom et l'extension
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  const ext = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';
  
  // Nettoyer le nom : remplacer espaces et caractères spéciaux par des underscores
  const cleanName = name
    .normalize('NFD') // Décomposer les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Remplacer caractères spéciaux par underscore
    .replace(/_+/g, '_') // Éviter les underscores multiples
    .replace(/^_|_$/g, ''); // Enlever underscores au début/fin
  
  return cleanName + ext;
}

/**
 * Génère un nom de fichier unique avec timestamp
 */
export function generateUniqueFileName(originalFileName: string): string {
  const sanitized = sanitizeFileName(originalFileName);
  return `${Date.now()}-${sanitized}`;
}
