import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { formatEmbeddingForPgVector } from '@/lib/embeddings/utils';
import { generateEmbedding, testEmbeddingSimilarity, DEFAULT_EMBEDDING_MODEL } from '@/lib/services/embeddingService';

export async function POST(req: Request) {
  try {
    const { testQuery } = await req.json();
    
    if (!testQuery) {
      return NextResponse.json({ success: false, error: "Requête de test manquante" });
    }
    
    // Générer un embedding pour la requête de test
    const queryEmbedding = await generateEmbedding(testQuery, DEFAULT_EMBEDDING_MODEL);
    
    // Rechercher les chunks les plus similaires
    const result = await query(`
      SELECT 
        c.content, 
        d.filename,
        d.id as document_id,
        1 - (e.embedding <=> $1) as similarity
      FROM chunks c
      JOIN embeddings e ON c.id = e.chunk_id
      JOIN documents d ON c.document_id = d.id
      ORDER BY similarity DESC
      LIMIT 5;
    `, [formatEmbeddingForPgVector(queryEmbedding)]);
    
    // Calculer quelques statistiques
    const totalDocuments = await query('SELECT COUNT(*) FROM documents');
    const totalChunks = await query('SELECT COUNT(*) FROM chunks');
    const totalEmbeddings = await query('SELECT COUNT(*) FROM embeddings');
    
    return NextResponse.json({
      success: true,
      results: result.rows,
      stats: {
        documents: totalDocuments.rows[0].count,
        chunks: totalChunks.rows[0].count,
        embeddings: totalEmbeddings.rows[0].count,
      },
      embeddingDimension: queryEmbedding.length
    });
  } catch (error) {
    console.error('Erreur lors du test RAG:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
