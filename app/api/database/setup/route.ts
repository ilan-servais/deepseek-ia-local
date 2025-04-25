import { NextResponse } from 'next/server';
import { Pool } from 'pg';

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

      // Créer la table pour les embeddings
      await client.query(`
        CREATE TABLE IF NOT EXISTS embeddings (
          id SERIAL PRIMARY KEY,
          chunk_id INTEGER REFERENCES chunks(id) ON DELETE CASCADE,
          embedding vector(1024) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Table des embeddings créée');
      
      return NextResponse.json({
        success: true,
        message: 'Base de données initialisée avec succès'
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
