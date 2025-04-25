import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

// Créer un pool de connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
});

// Constante pour la dimension des embeddings (mise à jour à 1536)
export const EMBEDDING_DIMENSION = 1536;

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

    // Vérifier si la table embeddings existe déjà
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'embeddings'
      );
    `);
    
    // Si la table existe, la supprimer pour la recréer avec la bonne dimension
    if (tableExists.rows[0].exists) {
      await client.query(`DROP TABLE IF EXISTS embeddings;`);
      console.log('Table embeddings supprimée pour mise à jour des dimensions');
    }

    // Créer la table pour les embeddings avec la dimension actualisée
    await client.query(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id SERIAL PRIMARY KEY,
        chunk_id INTEGER REFERENCES chunks(id) ON DELETE CASCADE,
        embedding vector(${EMBEDDING_DIMENSION}) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log(`Base de données initialisée avec succès (dimension d'embedding: ${EMBEDDING_DIMENSION})`);
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
  } finally {
    client.release();
  }
}

// Vérifier l'état de la base de données
export async function checkDatabaseState() {
  try {
    console.log('Vérification de l\'état de la base de données...');
    
    // Vérifier si les tables existent
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tables = tablesResult.rows.map((row: any) => row.table_name);
    console.log('Tables existantes:', tables);
    
    // Compter les entrées dans chaque table
    for (const table of tables) {
      const countResult = await query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`Table ${table}: ${countResult.rows[0].count} entrées`);
    }
    
    // Vérifier la structure de la table embeddings
    if (tables.includes('embeddings')) {
      try {
        const dimensionResult = await query(`
          SELECT typelem, typndims, typlen 
          FROM pg_type 
          WHERE typname = 'vector';
        `);
        console.log('Information sur le type vector:', dimensionResult.rows[0]);
        
        // Vérifier la dimension des embeddings dans la table
        const columnResult = await query(`
          SELECT a.atttypmod
          FROM pg_attribute a
          JOIN pg_class c ON a.attrelid = c.oid
          WHERE c.relname = 'embeddings' 
          AND a.attname = 'embedding';
        `);
        
        if (columnResult.rows.length > 0) {
          const dimension = columnResult.rows[0].atttypmod;
          console.log(`Dimension configurée pour la colonne embedding: ${dimension}`);
          
          if (dimension !== EMBEDDING_DIMENSION) {
            console.warn(`ATTENTION: La dimension configurée (${dimension}) ne correspond pas à celle attendue (${EMBEDDING_DIMENSION})`);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de la structure de la table embeddings:', error);
      }
    }
    
    // Vérifier l'extension pgvector
    try {
      const vectorResult = await query(`SELECT * FROM pg_extension WHERE extname = 'vector'`);
      console.log('Extension pgvector installée:', vectorResult.rows.length > 0);
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'extension pgvector:', error);
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'état de la base de données:', error);
    return false;
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
  checkDatabaseState,
  pool,
  EMBEDDING_DIMENSION
};
