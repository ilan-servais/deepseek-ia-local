/**
 * Utilitaires pour la gestion des embeddings vectoriels
 */

// La dimension d'embeddings que nous utilisons
export const EMBEDDING_DIMENSION = 1536;

// Dimensions connues pour différents modèles
export const EMBEDDING_DIMENSIONS = {
  "deepseek-r1:1.5b": 1536,
  "default": 1536
};

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
  
  // Vérifier que la dimension correspond à celle attendue par la base de données
  if (embedding.length !== EMBEDDING_DIMENSION) {
    console.warn(`Attention: L'embedding a ${embedding.length} dimensions mais la base de données attend ${EMBEDDING_DIMENSION} dimensions.`);
    
    // Si l'embedding est plus court, le compléter avec des zéros
    if (embedding.length < EMBEDDING_DIMENSION) {
      const paddedEmbedding = [...embedding];
      while (paddedEmbedding.length < EMBEDDING_DIMENSION) {
        paddedEmbedding.push(0);
      }
      embedding = paddedEmbedding;
      console.log(`Embedding complété avec des zéros (${embedding.length} dimensions)`);
    }
    // Si l'embedding est plus long, le tronquer
    else if (embedding.length > EMBEDDING_DIMENSION) {
      embedding = embedding.slice(0, EMBEDDING_DIMENSION);
      console.log(`Embedding tronqué (${embedding.length} dimensions)`);
    }
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
  // Vérifier si c'est un tableau
  if (!Array.isArray(embedding)) {
    return false;
  }
  
  // Vérifier si le tableau est vide
  if (embedding.length === 0) {
    return false;
  }
  
  // Vérifier si tous les éléments sont des nombres finis
  return embedding.every(item => typeof item === 'number' && Number.isFinite(item));
}

/**
 * Normalise un vecteur d'embedding (optionnel, peut améliorer la similarité)
 * 
 * @param embedding - Le tableau de nombres représentant l'embedding
 * @returns Le vecteur normalisé
 */
export function normalizeEmbedding(embedding: number[]): number[] {
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  
  if (norm === 0) {
    return embedding.map(() => 0);
  }
  
  return embedding.map(val => val / norm);
}
