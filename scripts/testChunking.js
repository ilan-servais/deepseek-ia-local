const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Charger les variables d'environnement depuis .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration de la connexion à la base de données
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

// Fonction simplifiée de chunking sémantique pour test
function chunkTextSemantic(text, options = {}) {
  const { minSize = 200, targetSize = 500, maxSize = 800 } = options;
  
  // Nettoyer le texte
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
  
  // Découper par paragraphes
  const paragraphs = cleanedText.split(/\n{2,}/);
  const chunks = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    if (!trimmedPara) continue;
    
    // Si ajouter ce paragraphe dépasse la taille maximale, sauvegarder le chunk actuel
    if (currentChunk.length > 0 && 
        (currentChunk.length + trimmedPara.length + 2) > maxSize && 
        currentChunk.length >= minSize) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedPara;
    } else {
      // Ajouter le paragraphe au chunk actuel
      currentChunk = currentChunk 
        ? `${currentChunk}\n\n${trimmedPara}`
        : trimmedPara;
    }
  }
  
  // Ajouter le dernier chunk s'il existe
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

async function testChunking() {
  const client = await pool.connect();
  try {
    console.log('🔍 Analyse de la base de données...');
    
    // 1. Obtenir des stats sur les documents
    const docsResult = await client.query(`
      SELECT COUNT(*) as total_docs FROM documents
    `);
    console.log(`Total des documents : ${docsResult.rows[0].total_docs}`);
    
    // 2. Obtenir des stats sur les chunks
    const chunksResult = await client.query(`
      SELECT d.id, d.filename, COUNT(c.id) as chunk_count
      FROM documents d
      LEFT JOIN chunks c ON d.id = c.document_id
      GROUP BY d.id, d.filename
      ORDER BY d.id
    `);
    
    console.log('\n📄 Documents et leurs chunks :');
    chunksResult.rows.forEach(row => {
      console.log(`- Document ${row.id} (${row.filename}): ${row.chunk_count} chunks`);
    });
    
    // 3. Demander à l'utilisateur s'il veut tester le chunking sémantique sur un document
    console.log('\n🧪 Voulez-vous tester le chunking sémantique sur un document spécifique ?');
    console.log('   (Entrez l\'ID du document ou "n" pour quitter)');
    
    // Extraire l'ID proprement - corriger le parsing des arguments
    let documentId = 'n';
    if (process.argv.length > 2) {
      // Supprimer les crochets et convertir en nombre si présent
      documentId = process.argv[2].replace(/[\[\]]/g, '');
      
      // Si c'est un nombre, le convertir en entier
      if (!isNaN(documentId)) {
        documentId = parseInt(documentId, 10);
      }
    }
    
    console.log(`ID de document sélectionné: ${documentId}`);
    
    if (documentId !== 'n') {
      // Récupérer le document
      const docResult = await client.query(`
        SELECT * FROM documents WHERE id = $1
      `, [documentId]);
      
      if (docResult.rows.length === 0) {
        console.log(`❌ Document avec ID ${documentId} non trouvé.`);
      } else {
        const doc = docResult.rows[0];
        console.log(`\n📝 Test de chunking sur "${doc.filename}" (ID: ${doc.id})`);
        
        // Effectuer le chunking sémantique
        const semanticChunks = chunkTextSemantic(doc.content);
        console.log(`✅ Chunking sémantique terminé : ${semanticChunks.length} chunks créés`);
        
        // Afficher des exemples de chunks
        console.log('\n📊 Exemples de chunks sémantiques :');
        semanticChunks.slice(0, 3).forEach((chunk, i) => {
          console.log(`\nChunk ${i+1} (${chunk.length} caractères):`);
          console.log('--------------------------------------');
          console.log(chunk.substring(0, 200) + (chunk.length > 200 ? '...' : ''));
          console.log('--------------------------------------');
        });
        
        // Comparer avec les chunks existants
        const existingChunksResult = await client.query(`
          SELECT c.id, c.content, c.chunk_index
          FROM chunks c
          WHERE c.document_id = $1
          ORDER BY c.chunk_index
        `, [documentId]);
        
        console.log(`\n📊 Comparaison avec les ${existingChunksResult.rows.length} chunks existants :`);
        console.log(`- Chunks sémantiques : ${semanticChunks.length}`);
        console.log(`- Chunks actuels : ${existingChunksResult.rows.length}`);
        
        if (existingChunksResult.rows.length > 0) {
          console.log('\nExemple de chunk actuel :');
          console.log('--------------------------------------');
          console.log(existingChunksResult.rows[0].content.substring(0, 200) + '...');
          console.log('--------------------------------------');
        }
      }
    }
    
    console.log('\n🚀 Pour régénérer tous les embeddings avec le chunking sémantique :');
    console.log('1. Créez le fichier lib/services/textExtractor.ts avec la nouvelle fonction chunkTextSemantic');
    console.log('2. Modifiez app/api/documents/upload/route.ts pour utiliser cette fonction');
    console.log('3. Créez et exécutez un script de régénération des embeddings');
    
  } catch (error) {
    console.error('Erreur lors du test de chunking :', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Exécuter le test
testChunking();
