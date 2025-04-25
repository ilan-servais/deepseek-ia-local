import { NextResponse } from 'next/server';
import { query, EMBEDDING_DIMENSION } from '@/lib/db/postgres';

export async function GET() {
  try {
    console.log('Réparation de la base de données en cours...');
    
    // Vérifier la dimension actuelle
    try {
      const columnInfo = await query(`
        SELECT a.atttypmod
        FROM pg_attribute a
        JOIN pg_class c ON a.attrelid = c.oid
        WHERE c.relname = 'embeddings' 
        AND a.attname = 'embedding';
      `);
      
      if (columnInfo.rows.length > 0) {
        const currentDimension = columnInfo.rows[0].atttypmod;
        console.log(`Dimension actuelle: ${currentDimension}, Dimension souhaitée: ${EMBEDDING_DIMENSION}`);
        
        if (currentDimension !== EMBEDDING_DIMENSION) {
          // Sauvegarder les relations chunk_id existantes
          const backupResult = await query(`
            SELECT id, chunk_id FROM embeddings;
          `);
          console.log(`${backupResult.rows.length} relations d'embeddings sauvegardées`);
          
          // Supprimer et recréer la table avec la bonne dimension
          await query(`DROP TABLE IF EXISTS embeddings;`);
          
          await query(`
            CREATE TABLE embeddings (
              id SERIAL PRIMARY KEY,
              chunk_id INTEGER REFERENCES chunks(id) ON DELETE CASCADE,
              embedding vector(${EMBEDDING_DIMENSION}) NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          console.log(`Table embeddings recréée avec dimension ${EMBEDDING_DIMENSION}`);
          
          return NextResponse.json({
            success: true,
            message: `Base de données réparée. La dimension des embeddings a été mise à jour de ${currentDimension} à ${EMBEDDING_DIMENSION}.`,
            backupCount: backupResult.rows.length,
            newDimension: EMBEDDING_DIMENSION
          });
        } else {
          return NextResponse.json({
            success: true,
            message: `Aucune réparation nécessaire. La dimension est déjà correcte (${EMBEDDING_DIMENSION}).`
          });
        }
      } else {
        return NextResponse.json({
          success: false,
          message: "Impossible de déterminer la dimension actuelle."
        });
      }
    } catch (error) {
      // La table n'existe probablement pas
      await query(`
        CREATE TABLE IF NOT EXISTS embeddings (
          id SERIAL PRIMARY KEY,
          chunk_id INTEGER REFERENCES chunks(id) ON DELETE CASCADE,
          embedding vector(${EMBEDDING_DIMENSION}) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      return NextResponse.json({
        success: true,
        message: `Table embeddings créée avec dimension ${EMBEDDING_DIMENSION}.`
      });
    }
    
  } catch (error) {
    console.error('Erreur lors de la réparation de la base de données:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
