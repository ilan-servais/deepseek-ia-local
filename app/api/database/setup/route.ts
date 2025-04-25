import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { EMBEDDING_DIMENSION, EMBEDDING_DIMENSIONS } from '@/lib/embeddings/utils';

// Initialiser la connexion à la base de données
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

// On utilise la plus grande dimension connue pour créer la table
const MAX_EMBEDDING_DIMENSION = 1536; // Valeur par défaut sécurisée

export async function GET() {
  const client = await pool.connect();
  try {
    // Désactiver les notifications pour ce bloc
    await client.query('SET client_min_messages TO WARNING');
    
    // Activer l'extension pgvector si elle n'est pas déjà activée
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('Extension pgvector activée');

    // Créer la table pour les documents s'ils n'existent pas
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        normalized_filename TEXT,
        content TEXT,
        title TEXT,
        author TEXT,
        category TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table des documents créée');

    // Mise à jour des documents existants pour ajouter la version normalisée du nom de fichier
    await client.query(`
      UPDATE documents SET normalized_filename = LOWER(filename) WHERE normalized_filename IS NULL;
    `);

    // Créer la table pour les chunks s'ils n'existent pas
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

    // Table des tags
    await client.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table des tags créée');

    // Table de jointure entre documents et tags
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_tags (
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (document_id, tag_id)
      );
    `);
    console.log('Table des associations document-tag créée');

    // Vérifier si la table embeddings existe déjà
    const tableExistsResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'embeddings'
      );
    `);

    if (tableExistsResult.rows[0].exists) {
      // La table existe, ajoutons la colonne model_name si elle n'existe pas
      try {
        await client.query(`
          ALTER TABLE embeddings 
          ADD COLUMN IF NOT EXISTS model_name TEXT DEFAULT 'unknown';
        `);
        console.log('Colonne model_name ajoutée à la table embeddings');
      } catch (error) {
        console.error('Erreur lors de la modification de la table embeddings:', error);
      }
    } else {
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
    }
    
    // Créer un index pour la recherche de similarité
    await client.query(`
      CREATE INDEX IF NOT EXISTS embeddings_vector_idx 
      ON embeddings 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
    console.log('Index de similarité créé');
    
    // Créer d'autres index pour l'optimisation
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_normalized_filename ON documents(normalized_filename);
      CREATE INDEX IF NOT EXISTS idx_document_tags_document_id ON document_tags(document_id);
      CREATE INDEX IF NOT EXISTS idx_document_tags_tag_id ON document_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
    `);
    console.log('Index supplémentaires créés');
    
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
    // Ne pas fermer le pool ici, car il pourrait être réutilisé
    // await pool.end();
  }
}
