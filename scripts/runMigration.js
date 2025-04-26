const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Charger les variables d'environnement depuis .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration de la connexion à la base de données avec les valeurs de docker-compose
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

// Fonction pour exécuter une commande SQL individuelle
async function executeSqlCommand(client, command) {
  if (!command.trim()) return;
  
  try {
    console.log(`Exécution: ${command.slice(0, 50)}${command.length > 50 ? '...' : ''}`);
    await client.query(command);
    console.log("✓ Commande exécutée avec succès");
  } catch (err) {
    console.error(`Erreur lors de l'exécution de la commande: ${err.message}`);
    throw err;
  }
}

async function runMigration() {
  const client = await pool.connect();
  try {
    // Lire le contenu du fichier SQL
    const migrationPath = path.join(__dirname, '..', 'migrations', '002-enhanced-document-metadata.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Exécution de la migration pour enrichir les métadonnées...');
    
    // Diviser le script SQL en commandes individuelles
    // Les commandes sont séparées par des points-virgules
    const commands = sqlContent
      .split(';')
      .filter(cmd => cmd.trim() !== '')
      .map(cmd => cmd.trim() + ';');
    
    // Exécuter chaque commande séparément
    for (const command of commands) {
      // Ignorer les commentaires
      if (command.trim().startsWith('--')) continue;
      
      await executeSqlCommand(client, command);
    }
    
    console.log('Migration terminée avec succès!');
    
    // Ajouter un rapport après la migration réussie
    console.log('\n✅ Migration réussie ! Voici ce qui a été fait :');
    console.log('1. Ajout des colonnes de métadonnées à la table documents (title, author, date, category, source_url)');
    console.log('2. Mise à jour des documents existants avec des valeurs par défaut');
    console.log('3. Création d\'index pour optimiser les recherches par date, catégorie et auteur');
    
    // Vérifier le nombre de documents qui ont été mis à jour
    const docsCount = await client.query(`SELECT COUNT(*) FROM documents`);
    console.log(`\n📊 Statistiques : ${docsCount.rows[0].count} documents ont été enrichis avec des métadonnées.`);
    
    console.log('\n🚀 Prochaines étapes :');
    console.log('1. Redémarrer le serveur Next.js (npm run dev)');
    console.log('2. Tester l\'upload d\'un nouveau document avec métadonnées');
    console.log('3. Vérifier que les chunks sont créés avec la méthode de chunking sémantique');
    console.log('4. Tester la recherche pour voir si les résultats sont plus pertinents');
    
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la migration:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
