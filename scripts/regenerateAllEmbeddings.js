const { Pool } = require('pg');
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

// Fonction de chunking sémantique améliorée
function chunkTextSemantic(text, options = {}) {
  const { minSize = 200, targetSize = 500, maxSize = 800 } = options;
  
  // Nettoyer le texte
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
  
  // 1. Découper par sections (titres, sous-titres)
  const sectionPattern = /(?:^|\n)(#{1,3} .+?)(?:\n|$)/g;
  const sections = [];
  let lastIndex = 0;
  let match;
  
  // Extraire les sections avec leurs entêtes
  while ((match = sectionPattern.exec(cleanedText)) !== null) {
    const heading = match[1];
    const startIdx = match.index;
    
    if (startIdx > lastIndex) {
      // Ajouter le texte précédent comme une section sans titre
      sections.push({
        heading: '',
        text: cleanedText.substring(lastIndex, startIdx)
      });
    }
    
    // Trouver la fin de la section (prochain titre ou fin de texte)
    const nextMatch = sectionPattern.exec(cleanedText);
    sectionPattern.lastIndex = match.index + match[0].length; // Reset pour revenir au bon endroit
    
    const endIdx = nextMatch ? nextMatch.index : cleanedText.length;
    
    sections.push({
      heading,
      text: cleanedText.substring(startIdx, endIdx)
    });
    
    lastIndex = endIdx;
  }
  
  // Ajouter le reste du texte s'il y en a
  if (lastIndex < cleanedText.length) {
    sections.push({
      heading: '',
      text: cleanedText.substring(lastIndex)
    });
  }
  
  // 2. Pour chaque section, découper en paragraphes
  const chunks = [];
  
  for (const section of sections) {
    // Sauter les sections vides
    if (!section.text.trim()) continue;
    
    // Découper en paragraphes
    const paragraphs = section.text.split(/\n{2,}/);
    let currentChunk = section.heading ? section.heading + '\n\n' : '';
    
    for (const paragraph of paragraphs) {
      const trimmedPara = paragraph.trim();
      if (!trimmedPara) continue;
      
      const paraWithNewline = currentChunk.length > 0 ? '\n\n' + trimmedPara : trimmedPara;
      
      // Si ajouter ce paragraphe dépasse la taille maximale, on sauvegarde le chunk actuel
      if (currentChunk.length > 0 && 
          (currentChunk.length + paraWithNewline.length) > maxSize && 
          currentChunk.length >= minSize) {
        
        chunks.push(currentChunk);
        
        // Commencer un nouveau chunk, potentiellement avec un chevauchement
        if (section.heading) {
          currentChunk = section.heading + '\n\n' + trimmedPara;
        } else {
          currentChunk = trimmedPara;
        }
      } else {
        // Ajouter le paragraphe au chunk actuel
        currentChunk += paraWithNewline;
      }
    }
    
    // Si après avoir traité tous les paragraphes il reste du contenu, l'ajouter comme chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk);
    }
  }
  
  return chunks;
}

// Fonction pour formater les embeddings pour pgvector
function formatEmbeddingForPgVector(embedding) {
  return `[${embedding.join(',')}]`;
}

async function regenerateAllEmbeddings() {
  const client = await pool.connect();
  try {
    console.log("🚀 Démarrage de la régénération complète des chunks et embeddings...");
    
    // Vérifier si la colonne model_name existe dans la table embeddings
    let hasModelNameColumn = false;
    try {
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'embeddings' AND column_name = 'model_name'
      `);
      hasModelNameColumn = columnCheck.rows.length > 0;
      console.log(`Vérification de la colonne model_name: ${hasModelNameColumn ? 'présente' : 'absente'}`);
      
      // Si la colonne n'existe pas, l'ajouter
      if (!hasModelNameColumn) {
        console.log("🔧 Ajout de la colonne model_name à la table embeddings...");
        await client.query(`
          ALTER TABLE embeddings 
          ADD COLUMN IF NOT EXISTS model_name TEXT DEFAULT 'unknown'
        `);
        console.log("✅ Colonne model_name ajoutée avec succès");
        hasModelNameColumn = true;
      }
    } catch (error) {
      console.error("❌ Erreur lors de la vérification de la structure de la table:", error);
      hasModelNameColumn = false; // En cas d'erreur, supposer que la colonne n'existe pas
    }
    
    // 1. Récupérer tous les documents
    const documents = await client.query(`
      SELECT id, filename, content, title, author, category, date, source_url
      FROM documents 
      ORDER BY id
    `);
    
    console.log(`📚 Trouvé ${documents.rows.length} documents à retraiter`);
    
    let totalChunks = 0;
    let successfulEmbeddings = 0;
    let failedEmbeddings = 0;
    
    // 2. Pour chaque document, supprimer les chunks existants et recréer
    for (const doc of documents.rows) {
      console.log(`\n📄 Traitement du document "${doc.filename}" (ID: ${doc.id})...`);
      
      // Supprimer les chunks existants (les embeddings seront supprimés en cascade)
      await client.query('DELETE FROM chunks WHERE document_id = $1', [doc.id]);
      console.log(`🗑️ Chunks et embeddings existants supprimés pour le document ${doc.id}`);
      
      // Découper le texte en chunks sémantiques
      const chunks = chunkTextSemantic(doc.content, {
        minSize: 200,
        targetSize: 500,
        maxSize: 800,
        overlapSize: 50
      });
      
      console.log(`✂️ Texte redécoupé en ${chunks.length} chunks sémantiques`);
      totalChunks += chunks.length;
      
      // Vérifier que Ollama est disponible
      try {
        const ollamaCheck = await fetch(`${process.env.OLLAMA_API_HOST}/api/tags`);
        if (!ollamaCheck.ok) {
          throw new Error(`Ollama API n'est pas disponible. Code: ${ollamaCheck.status}`);
        }
        console.log('✅ Connexion à Ollama vérifiée avec succès');
      } catch (error) {
        console.error('❌ Erreur lors de la vérification de Ollama:', error);
        throw new Error('Impossible de se connecter à Ollama. Assurez-vous que le service est en cours d\'exécution.');
      }
      
      // Traiter chaque chunk
      for (let i = 0; i < chunks.length; i++) {
        console.log(`🧩 Traitement du chunk ${i+1}/${chunks.length} (taille: ${chunks[i].length} caractères)...`);
        
        // Insérer le chunk
        const chunkResult = await client.query(
          'INSERT INTO chunks(document_id, content, chunk_index) VALUES($1, $2, $3) RETURNING id',
          [doc.id, chunks[i], i]
        );
        
        const chunkId = chunkResult.rows[0].id;
        
        try {
          // Limiter la taille du texte pour éviter les erreurs
          const maxTextLength = 8000;
          const truncatedText = chunks[i].length > maxTextLength 
            ? chunks[i].substring(0, maxTextLength) 
            : chunks[i];
          
          // Générer l'embedding pour ce chunk
          const embeddingResponse = await fetch(`${process.env.OLLAMA_API_HOST}/api/embeddings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'deepseek-r1:1.5b',
              prompt: truncatedText,
            })
          });
          
          if (!embeddingResponse.ok) {
            const errorText = await embeddingResponse.text();
            throw new Error(`Erreur lors de la génération de l'embedding: ${errorText}`);
          }
          
          const embeddingData = await embeddingResponse.json();
          
          if (!embeddingData.embedding || !Array.isArray(embeddingData.embedding)) {
            throw new Error(`Format d'embedding invalide: ${JSON.stringify(embeddingData)}`);
          }
          
          const embedding = embeddingData.embedding;
          console.log(`🧠 Embedding généré avec succès: ${embedding.length} dimensions`);
          
          // Insérer l'embedding dans la base de données - Adapter la requête en fonction de la présence de model_name
          const formattedEmbedding = formatEmbeddingForPgVector(embedding);
          
          if (hasModelNameColumn) {
            await client.query(
              'INSERT INTO embeddings (chunk_id, embedding, model_name) VALUES ($1, $2, $3)',
              [chunkId, formattedEmbedding, 'deepseek-r1:1.5b']
            );
          } else {
            await client.query(
              'INSERT INTO embeddings (chunk_id, embedding) VALUES ($1, $2)',
              [chunkId, formattedEmbedding]
            );
          }
          
          console.log(`💾 Embedding inséré avec succès pour le chunk ${i+1}`);
          successfulEmbeddings++;
          
        } catch (embeddingError) {
          console.error(`❌ Erreur lors de la génération de l'embedding pour le chunk ${i}:`, embeddingError);
          failedEmbeddings++;
        }
        
        // Petite pause pour éviter de surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`\n===== 📊 Récapitulatif =====`);
    console.log(`📚 Documents traités: ${documents.rows.length}`);
    console.log(`🧩 Total chunks créés: ${totalChunks}`);
    console.log(`✅ Embeddings réussis: ${successfulEmbeddings}`);
    console.log(`❌ Embeddings échoués: ${failedEmbeddings}`);
    
  } catch (error) {
    console.error("❌ Erreur lors de la régénération des embeddings:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Exécuter la régénération
regenerateAllEmbeddings().then(() => {
  console.log('🎉 Régénération terminée !');
}).catch(error => {
  console.error('❌ Erreur fatale:', error);
}).finally(() => {
  process.exit(0);
});
