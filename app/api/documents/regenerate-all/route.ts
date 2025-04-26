import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { formatEmbeddingForPgVector, isValidEmbedding } from '@/lib/embeddings/utils';
import { chunkTextSemantic } from '@/lib/services/textExtractor';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    console.log('Démarrage du processus de régénération complète...');
    
    // 1. Compter les documents et les chunks actuels
    const documentCount = await query('SELECT COUNT(*) as count FROM documents');
    const chunkCount = await query('SELECT COUNT(*) as count FROM chunks');
    const embeddingCount = await query('SELECT COUNT(*) as count FROM embeddings');
    
    console.log(`État initial: ${documentCount.rows[0].count} documents, ${chunkCount.rows[0].count} chunks, ${embeddingCount.rows[0].count} embeddings`);
    
    // 2. Récupérer tous les documents
    const documents = await query(`
      SELECT id, filename, content, title, author, category, date, source_url
      FROM documents 
      ORDER BY id
    `);
    
    // Début du traitement asynchrone (non-bloquant)
    console.log(`Lancement du retraitement de ${documents.rows.length} documents...`);
    
    // Créer une entrée dans une table de tâches pour suivre l'avancement
    const jobResult = await query(`
      INSERT INTO jobs (type, status, total_items, processed_items) 
      VALUES ('regenerate_embeddings', 'running', $1, 0) 
      RETURNING id
    `, [documents.rows.length]);
    
    const jobId = jobResult.rows[0].id;
    
    // Lancer le processus en arrière-plan
    (async () => {
      let totalChunks = 0;
      let successfulEmbeddings = 0;
      let failedEmbeddings = 0;
      let processedDocs = 0;
      
      try {
        for (const doc of documents.rows) {
          console.log(`Traitement du document "${doc.filename}" (ID: ${doc.id})...`);
          
          // Supprimer les chunks existants
          await query('DELETE FROM chunks WHERE document_id = $1', [doc.id]);
          
          // Découper le texte en chunks sémantiques
          const chunks = chunkTextSemantic(doc.content, {
            minSize: 200,
            targetSize: 500,
            maxSize: 800,
            overlapSize: 50
          });
          
          console.log(`Document découpé en ${chunks.length} chunks sémantiques`);
          totalChunks += chunks.length;
          
          // Traiter chaque chunk
          for (let i = 0; i < chunks.length; i++) {
            // Insérer le chunk
            const chunkResult = await query(
              'INSERT INTO chunks(document_id, content, chunk_index) VALUES($1, $2, $3) RETURNING id',
              [doc.id, chunks[i], i]
            );
            
            const chunkId = chunkResult.rows[0].id;
            
            try {
              // Limiter la taille du texte
              const maxTextLength = 8000;
              const truncatedText = chunks[i].length > maxTextLength 
                ? chunks[i].substring(0, maxTextLength) 
                : chunks[i];
              
              // Générer l'embedding
              const embeddingResponse = await fetch(`${process.env.OLLAMA_API_HOST}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: 'deepseek-r1:1.5b',
                  prompt: truncatedText,
                }),
                signal: AbortSignal.timeout(60000)
              });
              
              if (!embeddingResponse.ok) {
                throw new Error(`Erreur API: ${await embeddingResponse.text()}`);
              }
              
              const embeddingData = await embeddingResponse.json();
              const embedding = embeddingData.embedding;
              
              if (!isValidEmbedding(embedding)) {
                throw new Error(`Embedding invalide`);
              }
              
              // Insérer l'embedding
              const formattedEmbedding = formatEmbeddingForPgVector(embedding);
              await query(
                'INSERT INTO embeddings (chunk_id, embedding, model_name) VALUES ($1, $2, $3)',
                [chunkId, formattedEmbedding, 'deepseek-r1:1.5b']
              );
              
              successfulEmbeddings++;
            } catch (error) {
              console.error(`Erreur pour le chunk ${i}:`, error);
              failedEmbeddings++;
            }
          }
          
          // Mettre à jour l'avancement
          processedDocs++;
          await query(`
            UPDATE jobs SET processed_items = $1, last_updated = NOW() 
            WHERE id = $2
          `, [processedDocs, jobId]);
          
          // Petite pause entre les documents
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Marquer la tâche comme terminée
        await query(`
          UPDATE jobs SET 
          status = 'completed', 
          result = $1,
          completed_at = NOW()
          WHERE id = $2
        `, [JSON.stringify({
          totalDocuments: documents.rows.length,
          totalChunks,
          successfulEmbeddings,
          failedEmbeddings
        }), jobId]);
        
      } catch (error) {
        console.error('Erreur lors de la régénération:', error);
        
        // Marquer la tâche comme échouée
        await query(`
          UPDATE jobs SET 
          status = 'failed', 
          result = $1,
          completed_at = NOW()
          WHERE id = $2
        `, [JSON.stringify({
          error: (error as Error).message,
          processedDocuments: processedDocs,
          totalChunks,
          successfulEmbeddings,
          failedEmbeddings
        }), jobId]);
      }
    })();
    
    return NextResponse.json({
      success: true,
      message: 'Processus de régénération lancé en arrière-plan',
      jobId,
      totalDocuments: documents.rows.length
    });
    
  } catch (error) {
    console.error('Erreur lors du lancement de la régénération:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
