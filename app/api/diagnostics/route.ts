import { NextResponse } from 'next/server';
import { query, checkDatabaseState } from '@/lib/db/postgres';
import { formatEmbeddingForPgVector } from '@/lib/embeddings/utils';

export async function GET() {
  try {
    // Vérifier la connexion à la base de données
    const dbState = await checkDatabaseState();
    
    // Vérifier la connexion à Ollama
    let ollamaStatus = 'offline';
    let ollamaModels = [];
    try {
      const ollamaResponse = await fetch(`${process.env.OLLAMA_API_HOST}/api/tags`, {
        method: 'GET',
        cache: 'no-store'
      });
      
      if (ollamaResponse.ok) {
        const ollamaData = await ollamaResponse.json();
        ollamaStatus = 'online';
        ollamaModels = ollamaData.models || [];
      }
    } catch (error) {
      console.error('Erreur lors de la vérification d\'Ollama:', error);
    }
    
    // Compter les documents et embeddings par document
    const documentStats = await query(`
      SELECT 
        d.id AS document_id,
        d.filename,
        COUNT(DISTINCT c.id) AS chunk_count,
        COUNT(DISTINCT e.id) AS embedding_count
      FROM 
        documents d
      LEFT JOIN 
        chunks c ON d.id = c.document_id
      LEFT JOIN 
        embeddings e ON c.id = e.chunk_id
      GROUP BY 
        d.id, d.filename
      ORDER BY 
        d.id ASC
    `);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: {
        connected: dbState,
      },
      ollama: {
        status: ollamaStatus,
        models: ollamaModels
      },
      documents: documentStats.rows,
      env: {
        POSTGRES_HOST: process.env.POSTGRES_HOST,
        OLLAMA_API_HOST: process.env.OLLAMA_API_HOST
      }
    });
  } catch (error) {
    console.error('Erreur lors du diagnostic:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
