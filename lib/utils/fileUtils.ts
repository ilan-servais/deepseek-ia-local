/**
 * Utilitaires pour la gestion des fichiers et la validation
 */

/**
 * Sanitise un nom de fichier pour éviter les problèmes de sécurité et de compatibilité
 * @param filename Nom de fichier à sanitiser
 * @returns Nom de fichier sanitisé
 */
export function sanitizeFilename(filename: string): string {
  // Extraire l'extension
  const lastDotIndex = filename.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? filename.slice(lastDotIndex) : '';
  const nameWithoutExt = lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename;
  
  // Remplacer les caractères non alphanumériques par des tirets
  const sanitized = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '-') // Remplacer les caractères non alphanumériques par des tirets
    .replace(/-+/g, '-')         // Remplacer plusieurs tirets consécutifs par un seul
    .replace(/^-|-$/g, '')       // Supprimer les tirets au début et à la fin
    .slice(0, 100);              // Limiter la longueur du nom
  
  return sanitized + extension.toLowerCase();
}

/**
 * Valide le type de fichier en fonction de l'extension et du type MIME
 * @param filename Nom du fichier
 * @param mimeType Type MIME du fichier
 * @param allowedMimeTypes Types MIME autorisés
 * @param allowedExtensions Extensions autorisées
 * @returns true si le fichier est d'un type autorisé, false sinon
 */
export function validateFileType(
  filename: string,
  mimeType: string,
  allowedMimeTypes: string[],
  allowedExtensions: string[]
): boolean {
  // Vérifier l'extension
  const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  if (allowedExtensions.includes(extension)) {
    return true;
  }
  
  // Vérifier le type MIME
  if (allowedMimeTypes.includes(mimeType)) {
    return true;
  }
  
  return false;
}

/**
 * Génère un identifiant unique pour un fichier
 * @param filename Nom du fichier
 * @returns Identifiant unique
 */
export function generateUniqueFileId(filename: string): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
