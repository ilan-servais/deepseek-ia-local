import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  console.log('Vérification de la connexion à la base de données...');
  console.log('Paramètres de connexion:', {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD ? '********' : 'postgres',
    database: process.env.POSTGRES_DB || 'postgres',
  });

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
      await client.query('SELECT version()');
      client.release();
      
      return NextResponse.json({ 
        success: true,
        message: 'Connexion à la base de données réussie',
        config: {
          host: process.env.POSTGRES_HOST || 'localhost',
          port: Number(process.env.POSTGRES_PORT || 5432),
          user: process.env.POSTGRES_USER || 'postgres',
          database: process.env.POSTGRES_DB || 'postgres',
        }
      });
    } catch (error) {
      client.release();
      console.error('Erreur lors de l\'exécution de la requête:', error);
      return NextResponse.json({ 
        success: false, 
        error: (error as Error).message
      }, { status: 500 });
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
