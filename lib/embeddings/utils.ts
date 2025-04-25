/**
 * Utilitaires pour la gestion des embeddings vectoriels
 */

/**
 * Formate un tableau d'embeddings pour le stocker dans pgvector
 * pgvector attend un format très spécifique: '[n1,n2,n3,...]'
 * 
 * @param embedding - Le tableau de nombres représentant l'embedding
 * @returns Une chaîne formatée correctement pour pgvector
 */
export function formatEmbeddingForPgVector(embedding: number[]): string {
  // Vérifier que l'entrée est bien un tableau
  if (!Array.isArray(embedding)) {
    throw new Error('L\'embedding doit être un tableau de nombres');
  }
  
  // Construire la chaîne au format attendu par pgvector: [n1,n2,n3,...]
  return `[${embedding.join(',')}]`;
}

/**
 * Valide si un tableau d'embeddings est valide pour pgvector
 * 
 * @param embedding - Le tableau de nombres représentant l'embedding
 * @returns true si valide, sinon false
 */
export function isValidEmbedding(embedding: any): boolean {
  // Vérifier que c'est un tableau
  if (!Array.isArray(embedding)) {
    return false;
  }
  
  // Vérifier que tous les éléments sont des nombres
  if (!embedding.every(item => typeof item === 'number')) {
    return false;
  }
  
  // Vérifier une taille raisonnable (dépend du modèle utilisé, ici pour deepseek)
  // Modifiez cette valeur selon les spécifications de votre modèle
  if (embedding.length !== 1024) {
    console.warn(`Attention: Taille d'embedding inattendue (${embedding.length}), attendu 1024 dimensions`);
    // On ne rejette pas mais on log un avertissement
  }
  
  return true;
}

/**
 * Normalise un vecteur d'embedding (utile pour certains algorithmes de similarité)
 * 
 * @param embedding - Le tableau de nombres représentant l'embedding
 * @returns Le vecteur normalisé
 */
export function normalizeEmbedding(embedding: number[]): number[] {
  // Calculer la norme euclidienne (longueur) du vecteur
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  
  // Éviter la division par zéro
  if (norm === 0) {
    return embedding.map(() => 0);
  }
  
  // Normaliser chaque élément
  return embedding.map(val => val / norm);
}

/**
 * Découpe un embedding en plus petits morceaux si nécessaire
 * Utile si le modèle utilise des dimensions différentes de celles attendues par pgvector
 * 
 * @param embedding - L'embedding original
 * @param chunkSize - La taille de chaque morceau
 * @returns Un tableau de morceaux d'embedding
 */
export function chunkEmbedding(embedding: number[], chunkSize: number): number[][] {
  const chunks = [];
  for (let i = 0; i < embedding.length; i += chunkSize) {
    chunks.push(embedding.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Calcule la similarité cosinus entre deux embeddings
 * 
 * @param a - Premier embedding
 * @param b - Second embedding
 * @returns Score de similarité entre -1 et 1 (1 étant identique)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Les embeddings doivent avoir la même dimension');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}
