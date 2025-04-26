import { query } from '@/lib/db/postgres';
import { formatEmbeddingForPgVector } from '@/lib/embeddings/utils';

/**
 * Script pour régénérer tous les embeddings manquants pour les chunks existants
 */
export async function regenerateEmbeddings() {
  console.log("Démarrage de la régénération des embeddings...");
  
  try {
    // 1. Récupérer tous les chunks qui n'ont pas d'embedding
    const chunks = await query(`
      SELECT c.id, c.content 
      FROM chunks c
      LEFT JOIN embeddings e ON c.id = e.chunk_id
      WHERE e.id IS NULL
    `);
    
    console.log(`Trouvé ${chunks.rows.length} chunks sans embeddings`);
    
    // 2. Pour chaque chunk, générer un embedding avec l'API Ollama
    let successCount = 0;
    
    for (const chunk of chunks.rows) {
      try {
        console.log(`Traitement du chunk ${chunk.id} (${chunk.content.length} caractères)...`);
        
        // Limiter la taille du texte pour éviter les erreurs
        const maxTextLength = 8000;
        const truncatedText = chunk.content.length > maxTextLength 
          ? chunk.content.substring(0, maxTextLength) 
          : chunk.content;
        
        // Appeler l'API Ollama pour obtenir l'embedding
        const response = await fetch(`${process.env.OLLAMA_API_HOST}/api/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek-r1:1.5b',
            prompt: truncatedText,
          }),
          signal: AbortSignal.timeout(60000) // 60 secondes timeout
        });
        
        if (!response.ok) {
          throw new Error(`Erreur lors de la génération de l'embedding: ${await response.text()}`);
        }
        
        const data = await response.json();
        
        if (!data.embedding || !Array.isArray(data.embedding)) {
          throw new Error(`Format d'embedding invalide: ${JSON.stringify(data)}`);
        }
        
        // Stocker l'embedding dans la base de données
        const formattedEmbedding = formatEmbeddingForPgVector(data.embedding);
        await query(
          'INSERT INTO embeddings (chunk_id, embedding, model_name) VALUES ($1, $2, $3)',
          [chunk.id, formattedEmbedding, 'deepseek-r1:1.5b']
        );
        
        console.log(`✅ Embedding généré avec succès pour le chunk ${chunk.id}`);
        successCount++;
        
        // Pause pour éviter de surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Erreur pour le chunk ${chunk.id}:`, error);
      }
    }
    
    console.log(`Opération terminée: ${successCount}/${chunks.rows.length} embeddings générés avec succès`);
    
  } catch (error) {
    console.error("Erreur lors de la régénération des embeddings:", error);
  }
}
