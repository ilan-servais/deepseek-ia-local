import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { formatEmbeddingForPgVector } from '@/lib/embeddings/utils';

export async function POST(req: NextRequest) {
  try {
    // Récupérer le terme de recherche
    const { searchTerm, exact = false } = await req.json();

    if (!searchTerm) {
      return NextResponse.json({ error: 'Terme de recherche requis' }, { status: 400 });
    }

    console.log(`Recherche pour: "${searchTerm}"`);

    let results;

    // Si recherche exacte par nom de fichier (sans embedding)
    if (exact) {
      console.log('Mode de recherche: Correspondance exacte par nom de fichier');
      results = await query(`
        SELECT 
          d.id, 
          d.filename,
          d.content,
          COUNT(c.id) as chunk_count
        FROM 
          documents d
        LEFT JOIN 
          chunks c ON d.id = c.document_id
        WHERE 
          d.filename ILIKE $1
        GROUP BY 
          d.id
        ORDER BY 
          d.created_at DESC
      `, [`%${searchTerm}%`]);
      
      console.log(`${results.rows.length} documents trouvés par recherche exacte`);
      
      return NextResponse.json({
        searchType: 'exact',
        results: results.rows,
        searchTerm
      });
    }
    
    // Recherche sémantique avec embeddings
    console.log('Mode de recherche: Sémantique par embeddings');
    // Générer un embedding pour la requête
    const response = await fetch(`${process.env.OLLAMA_API_HOST}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-r1:1.5b',
        prompt: searchTerm,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Erreur lors de la génération de l\'embedding' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const queryEmbedding = data.embedding;

    // Rechercher dans la base de données avec l'embedding
    const embeddingResults = await query(`
      SELECT 
        d.id as document_id,
        d.filename,
        c.id as chunk_id,
        c.content,
        c.chunk_index,
        1 - (e.embedding <=> $1) as similarity
      FROM 
        documents d
      JOIN 
        chunks c ON d.id = c.document_id
      JOIN 
        embeddings e ON c.id = e.chunk_id
      ORDER BY 
        similarity DESC
      LIMIT 10;
    `, [formatEmbeddingForPgVector(queryEmbedding)]);

    console.log(`${embeddingResults.rows.length} chunks trouvés par recherche sémantique`);
    embeddingResults.rows.forEach((row: any, idx: number) => {
      console.log(`${idx + 1}. Document: ${row.filename}, Similarité: ${row.similarity}`);
    });

    // Regrouper par document pour avoir une vue d'ensemble
    const documentMap = new Map();
    embeddingResults.rows.forEach((row: any) => {
      if (!documentMap.has(row.document_id)) {
        documentMap.set(row.document_id, {
          id: row.document_id,
          filename: row.filename,
          chunks: [],
          maxSimilarity: row.similarity
        });
      }
      
      const docEntry = documentMap.get(row.document_id);
      docEntry.chunks.push({
        id: row.chunk_id,
        content: row.content,
        similarity: row.similarity,
        index: row.chunk_index
      });
      
      // Garder trace de la similarité maximale pour ce document
      if (row.similarity > docEntry.maxSimilarity) {
        docEntry.maxSimilarity = row.similarity;
      }
    });
    
    // Convertir la Map en tableau et trier par similarité
    const documentResults = Array.from(documentMap.values())
      .sort((a, b) => b.maxSimilarity - a.maxSimilarity);

    return NextResponse.json({
      searchType: 'semantic',
      results: embeddingResults.rows,
      documentResults,
      searchTerm,
      embeddingDimensions: queryEmbedding.length
    });
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    return NextResponse.json(
      { error: `Erreur lors de la recherche: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
