import { query } from '@/lib/db/postgres';
import { formatEmbeddingForPgVector, isValidEmbedding } from '@/lib/embeddings/utils';
import { chunkTextSemantic } from '@/lib/services/textExtractor';

/**
 * Script pour régénérer tous les embeddings avec le nouveau chunking sémantique
 */
export async function regenerateAllEmbeddings() {
  console.log("Démarrage de la régénération complète des chunks et embeddings...");
  
  try {
    // 1. Récupérer tous les documents
    const documents = await query(`
      SELECT id, filename, content, title, author, category, date, source_url
      FROM documents 
      ORDER BY id
    `);
    
    console.log(`Trouvé ${documents.rows.length} documents à retraiter`);
    
    let totalChunks = 0;
    let successfulEmbeddings = 0;
    let failedEmbeddings = 0;
    
    // 2. Pour chaque document, supprimer les chunks existants et recréer
    for (const doc of documents.rows) {
      console.log(`\nTraitement du document "${doc.filename}" (ID: ${doc.id})...`);
      
      // Supprimer les chunks existants (les embeddings seront supprimés en cascade)
      await query('DELETE FROM chunks WHERE document_id = $1', [doc.id]);
      console.log(`Chunks et embeddings existants supprimés pour le document ${doc.id}`);
      
      // Découper le texte en chunks sémantiques
      const chunks = chunkTextSemantic(doc.content, {
        minSize: 200,
        targetSize: 500,
        maxSize: 800,
        overlapSize: 50
      });
      
      console.log(`Texte redécoupé en ${chunks.length} chunks sémantiques`);
      totalChunks += chunks.length;
      
      // Vérifier que Ollama est disponible
      try {
        const ollamaCheck = await fetch(`${process.env.OLLAMA_API_HOST}/api/tags`);
        if (!ollamaCheck.ok) {
          throw new Error(`Ollama API n'est pas disponible. Code: ${ollamaCheck.status}`);
        }
        console.log('Connexion à Ollama vérifiée avec succès');
      } catch (error) {
        console.error('Erreur lors de la vérification de Ollama:', error);
        throw new Error('Impossible de se connecter à Ollama. Assurez-vous que le service est en cours d\'exécution.');
      }
      
      // Traiter chaque chunk
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Traitement du chunk ${i+1}/${chunks.length} (taille: ${chunks[i].length} caractères)...`);
        
        // Insérer le chunk
        const chunkResult = await query(
          'INSERT INTO chunks(document_id, content, chunk_index) VALUES($1, $2, $3) RETURNING id',
          [doc.id, chunks[i], i]
        );
        
        const chunkId = chunkResult.rows[0].id;
        
        try {
          // Limiter la taille du texte pour éviter les erreurs
          const maxTextLength = 8000;
          const truncatedText = chunks[i].length > maxTextLength 
            ? chunks[i].substring(0, maxTextLength) 
            : chunks[i];
          
          // Générer l'embedding pour ce chunk
          const embeddingResponse = await fetch(`${process.env.OLLAMA_API_HOST}/api/embeddings`, {
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
          
          if (!embeddingResponse.ok) {
            const errorText = await embeddingResponse.text();
            throw new Error(`Erreur lors de la génération de l'embedding: ${errorText}`);
          }
          
          const embeddingData = await embeddingResponse.json();
          
          if (!embeddingData.embedding || !Array.isArray(embeddingData.embedding)) {
            throw new Error(`Format d'embedding invalide: ${JSON.stringify(embeddingData)}`);
          }
          
          const embedding = embeddingData.embedding;
          console.log(`Embedding généré avec succès: ${embedding.length} dimensions`);
          
          // Vérifier la validité de l'embedding
          if (!isValidEmbedding(embedding)) {
            console.warn(`Embedding invalide pour le chunk ${i}`);
            failedEmbeddings++;
            continue;
          }
          
          // Insérer l'embedding dans la base de données
          const formattedEmbedding = formatEmbeddingForPgVector(embedding);
          await query(
            'INSERT INTO embeddings (chunk_id, embedding, model_name) VALUES ($1, $2, $3)',
            [chunkId, formattedEmbedding, 'deepseek-r1:1.5b']
          );
          
          console.log(`Embedding inséré avec succès pour le chunk ${i+1}`);
          successfulEmbeddings++;
          
        } catch (embeddingError) {
          console.error(`Erreur lors de la génération de l'embedding pour le chunk ${i}:`, embeddingError);
          failedEmbeddings++;
        }
        
        // Petite pause pour éviter de surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`\n===== Récapitulatif =====`);
    console.log(`Documents traités: ${documents.rows.length}`);
    console.log(`Total chunks créés: ${totalChunks}`);
    console.log(`Embeddings réussis: ${successfulEmbeddings}`);
    console.log(`Embeddings échoués: ${failedEmbeddings}`);
    
  } catch (error) {
    console.error("Erreur lors de la régénération des embeddings:", error);
  }
}

// Si exécuté directement
if (require.main === module) {
  // Charger les variables d'environnement
  require('dotenv').config({ path: '.env.local' });
  
  regenerateAllEmbeddings()
    .then(() => {
      console.log('Régénération terminée');
      process.exit(0);
    })
    .catch(err => {
      console.error('Erreur:', err);
      process.exit(1);
    });
}
