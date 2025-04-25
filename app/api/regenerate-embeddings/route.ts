import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { formatEmbeddingForPgVector, isValidEmbedding } from '@/lib/embeddings/utils';

export async function GET(req: NextRequest) {
  try {
    console.log('Démarrage de la régénération des embeddings pour tous les chunks sans embeddings...');
    
    // Récupérer tous les chunks qui n'ont pas d'embeddings
    const chunksWithoutEmbeddings = await query(`
      SELECT c.id, c.content, d.filename
      FROM chunks c
      LEFT JOIN embeddings e ON c.id = e.chunk_id
      JOIN documents d ON c.document_id = d.id
      WHERE e.id IS NULL
      ORDER BY c.id
    `);
    
    console.log(`${chunksWithoutEmbeddings.rows.length} chunks trouvés sans embeddings`);
    
    if (chunksWithoutEmbeddings.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tous les chunks ont déjà des embeddings',
        processedChunks: 0
      });
    }
    
    let successCount = 0;
    let failureCount = 0;
    
    // Traiter chaque chunk
    for (const chunk of chunksWithoutEmbeddings.rows) {
      try {
        console.log(`Génération d'embedding pour le chunk ${chunk.id} du document "${chunk.filename}"`);
        
        // Limiter la taille du texte
        const maxTextLength = 8000;
        const truncatedText = chunk.content.length > maxTextLength 
          ? chunk.content.substring(0, maxTextLength) 
          : chunk.content;
        
        // Générer l'embedding
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
          throw new Error(`Erreur API: ${errorText}`);
        }
        
        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.embedding;
        
        // Vérifier la validité de l'embedding
        if (!isValidEmbedding(embedding)) {
          throw new Error(`Embedding invalide généré`);
        }
        
        // Insérer l'embedding dans la base de données
        await query(
          'INSERT INTO embeddings (chunk_id, embedding) VALUES ($1, $2)',
          [chunk.id, formatEmbeddingForPgVector(embedding)]
        );
        
        console.log(`✓ Embedding généré et stocké avec succès pour le chunk ${chunk.id}`);
        successCount++;
      } catch (error) {
        console.error(`✗ Erreur pour le chunk ${chunk.id}:`, error);
        failureCount++;
      }
      
      // Petite pause pour éviter de surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return NextResponse.json({
      success: true,
      totalChunks: chunksWithoutEmbeddings.rows.length,
      successful: successCount,
      failed: failureCount,
      message: `${successCount} embeddings générés avec succès, ${failureCount} échecs`
    });
    
  } catch (error) {
    console.error('Erreur lors de la régénération des embeddings:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
