import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

export async function GET() {
  try {
    // Récupérer la liste des documents avec le nombre de chunks
    const result = await query(`
      SELECT 
        d.id, 
        d.filename, 
        d.created_at,
        COUNT(c.id) as chunk_count
      FROM 
        documents d
      LEFT JOIN 
        chunks c ON d.id = c.document_id
      GROUP BY 
        d.id
      ORDER BY 
        d.created_at DESC
    `);

    return NextResponse.json({ 
      documents: result.rows,
      success: true
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des documents' },
      { status: 500 }
    );
  }
}
