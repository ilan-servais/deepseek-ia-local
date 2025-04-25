import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

// Créer un pool de connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
});

// Tester la connexion et initialiser la base de données
export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Vérifier si l'extension pgvector est installée
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS vector;
    `);

    // Créer la table pour les documents
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    // Créer la table pour les embeddings
    await client.query(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id SERIAL PRIMARY KEY,
        chunk_id INTEGER REFERENCES chunks(id) ON DELETE CASCADE,
        embedding vector(1024) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Base de données initialisée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
  } finally {
    client.release();
  }
}

// Fonction d'exécution de requête
export async function query(text: string, params?: any[]) {
  try {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Exécution de requête:', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la requête:', error);
    throw error;
  }
}

export default {
  query,
  initializeDatabase,
  pool
};
