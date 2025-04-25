import fs from 'fs';
import path from 'path';
import postgres from './postgres';
import { logger } from '@/lib/utils/logger';

/**
 * Exécute les scripts de migration SQL dans l'ordre numérique
 */
export async function runMigrations() {
  const migrationDir = path.join(process.cwd(), 'migrations');
  
  try {
    // Vérifie si le dossier de migrations existe
    if (!fs.existsSync(migrationDir)) {
      logger.error(`Le dossier de migrations n'existe pas: ${migrationDir}`);
      return;
    }

    // Récupère tous les fichiers SQL du dossier de migrations
    const migrationFiles = fs.readdirSync(migrationDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Trie les fichiers par nom pour l'exécution séquentielle

    logger.info(`Exécution de ${migrationFiles.length} scripts de migration...`);

    // Exécute chaque fichier de migration
    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationDir, file);
      const sqlContent = fs.readFileSync(migrationPath, 'utf8');
      
      logger.info(`Exécution de la migration: ${file}`);
      await postgres.pool.query(sqlContent);
      logger.info(`Migration terminée: ${file}`);
    }

    logger.info('Toutes les migrations ont été appliquées avec succès');
  } catch (error) {
    logger.error('Erreur lors de l\'exécution des migrations SQL:', error);
    throw error;
  }
}
