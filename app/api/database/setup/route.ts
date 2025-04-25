import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { EMBEDDING_DIMENSIONS } from '@/lib/embeddings/utils';

// On utilise la plus grande dimension connue pour créer la table
const MAX_EMBEDDING_DIMENSION = Math.max(...Object.values(EMBEDDING_DIMENSIONS));

export async function GET() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'postgres',
  });

  try {
    const client = await pool.connect();
    
    try {
      console.log('Initialisation de la base de données...');
      
      // Vérifier si l'extension pgvector est installée
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS vector;
      `);
      console.log('Extension pgvector installée');

      // Créer la table pour les documents
      await client.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id SERIAL PRIMARY KEY,
          filename TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Table des documents créée');

      // Créer la table pour les chunks de texte
      await client.query(`
        CREATE TABLE IF NOT EXISTS chunks (
          id SERIAL PRIMARY KEY,
          document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          chunk_index INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Table des chunks créée');

      // Vérifier si la table embeddings existe déjà
      const tableExistsResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'embeddings'
        );
      `);

      if (tableExistsResult.rows[0].exists) {
        // La table existe, essayons de modifier la colonne vector
        try {
          // On drop la table existante pour la recréer avec la bonne dimensionalité
          await client.query(`
            DROP TABLE IF EXISTS embeddings;
          `);
          console.log('Table des embeddings supprimée pour modification');
        } catch (error) {
          console.error('Erreur lors de la modification de la table embeddings:', error);
        }
      }

      // Créer la table pour les embeddings avec la dimension maximale
      await client.query(`
        CREATE TABLE IF NOT EXISTS embeddings (
          id SERIAL PRIMARY KEY,
          chunk_id INTEGER REFERENCES chunks(id) ON DELETE CASCADE,
          embedding vector(${MAX_EMBEDDING_DIMENSION}) NOT NULL,
          model_name TEXT DEFAULT 'unknown',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log(`Table des embeddings créée avec dimension ${MAX_EMBEDDING_DIMENSION}`);
      
      // Créer un index pour la recherche de similarité
      await client.query(`
        CREATE INDEX IF NOT EXISTS embeddings_vector_idx 
        ON embeddings 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
      `);
      console.log('Index de similarité créé');
      
      return NextResponse.json({
        success: true,
        message: 'Base de données initialisée avec succès',
        embeddingDimension: MAX_EMBEDDING_DIMENSION
      });
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la base de données:', error);
      return NextResponse.json({ 
        success: false, 
        error: (error as Error).message 
      }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erreur lors de la connexion à la base de données:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}
