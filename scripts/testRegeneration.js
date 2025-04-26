async function testRegeneration() {
  try {
    console.log('Lancement de la régénération des embeddings...');
    
    // Vérifier d'abord la connexion à la base de données
    try {
      const checkResponse = await fetch('http://localhost:3000/api/database/check-connection');
      const checkData = await checkResponse.json();
      
      if (!checkData.success) {
        console.error('❌ Problème de connexion à la base de données:', checkData.error || 'Erreur inconnue');
        return;
      }
      console.log('✅ Connexion à la base de données établie');
    } catch (error) {
      console.warn('⚠️ Impossible de vérifier l\'état de la base de données');
    }
    
    // Utiliser l'endpoint de régénération des embeddings manquants qui fonctionne déjà
    const response = await fetch('http://localhost:3000/api/regenerate-embeddings');
    const data = await response.json();
    
    console.log('Résultat:', data);
    
    if (data.success) {
      console.log(`✅ Vérification des embeddings réussie`);
      console.log(`${data.processedChunks || 0} chunks traités`);
      console.log(`${data.generatedEmbeddings || 0} embeddings générés`);
    } else if (data.error) {
      console.error(`❌ Erreur: ${data.error}`);
      console.log('💡 Conseil: Vérifiez l\'état de la base de données via /diagnostics');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la connexion à l\'API:', error);
    console.log('💡 Assurez-vous que le serveur Next.js est bien lancé sur le port 3000');
  }
}

async function testDiagnostics() {
  try {
    console.log('🔍 Diagnostic du système RAG...');
    
    const response = await fetch('http://localhost:3000/api/diagnostics');
    const data = await response.json();
    
    console.log('\n📊 État du système:');
    console.log(`Base de données: ${data.database.connected ? '✅ Connectée' : '❌ Déconnectée'}`);
    console.log(`Ollama: ${data.ollama.status === 'online' ? '✅ En ligne' : '❌ Hors ligne'}`);
    console.log(`Modèle deepseek-r1:1.5b: ${data.ollama.models.some(m => m.name.includes('deepseek')) ? '✅ Installé' : '❌ Non installé'}`);
    
    console.log('\n📄 Documents indexés:');
    if (data.documents && data.documents.length > 0) {
      data.documents.forEach(doc => {
        console.log(`- ${doc.filename}: ${doc.chunk_count} chunks, ${doc.embedding_count} embeddings`);
      });
    } else {
      console.log('Aucun document trouvé dans la base de données.');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
    console.log('💡 Assurez-vous que le serveur Next.js est bien lancé sur le port 3000');
  }
}

async function testSearch(query, exact = false) {
  try {
    console.log(`🔍 ${exact ? 'Recherche exacte' : 'Recherche sémantique'} pour: "${query}"...`);
    
    // Vérifier que le terme de recherche n'est pas vide
    if (!query || query.trim() === '') {
      console.error('❌ Erreur: Le terme de recherche ne peut pas être vide');
      return;
    }
    
    // Corriger le format de la requête selon ce qui est attendu par l'API
    const requestBody = {
      searchTerm: query, // Utiliser searchTerm au lieu de query
      exact: exact
    };
    
    const response = await fetch('http://localhost:3000/api/documents/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur HTTP ${response.status}: ${response.statusText}`);
      try {
        // Tenter de parser l'erreur JSON
        const errorJson = JSON.parse(errorText);
        console.error(`Message d'erreur: ${errorJson.error || 'Inconnu'}`);
      } catch {
        console.error(`Réponse d'erreur: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`);
      }
      
      // Si c'est une erreur 400, c'est probablement lié à la requête
      if (response.status === 400) {
        console.log('\n💡 Suggestions:');
        console.log('- Vérifiez que le terme de recherche n\'est pas vide');
        console.log('- Essayez d\'utiliser un terme plus spécifique');
        console.log('- Consultez les logs du serveur pour plus de détails');
      }
      return;
    }
    
    const data = await response.json();
    
    console.log('\n📊 Résultats de recherche:');
    if (data.results && data.results.length > 0) {
      data.results.forEach((doc, index) => {
        console.log(`\n${index + 1}. Document: ${doc.filename} (Pertinence: ${(doc.similarity * 100).toFixed(2)}%)`);
        console.log(`   Extrait: ${doc.content.substring(0, 150)}...`);
        
        if (doc.content.includes('http') || doc.content.includes('www')) {
          // Extraire les URLs potentielles
          const urlMatch = doc.content.match(/\[([^\]]+)\]\(([^)]+)\)/);
          if (urlMatch) {
            console.log(`   🔗 URL trouvée: ${urlMatch[2]} (${urlMatch[1]})`);
          } else {
            const simpleUrlMatch = doc.content.match(/(https?:\/\/[^\s]+)/);
            if (simpleUrlMatch) {
              console.log(`   🔗 URL trouvée: ${simpleUrlMatch[1]}`);
            }
          }
        }
      });
    } else {
      console.log('Aucun résultat trouvé.');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la recherche:', error);
  }
}

// Fonction principale
async function main() {
  // Déterminer l'action à partir des arguments de ligne de commande
  const args = process.argv.slice(2);
  const action = args[0] || 'regenerate';
  
  if (action === 'search' && args[1]) {
    const exactSearch = args.includes('--exact');
    await testSearch(args[1], exactSearch);
  } else if (action === 'search') {
    console.log('❌ Veuillez fournir un terme de recherche.');
    console.log('Usage: node scripts/testRegeneration.js search "terme" [--exact]');
    console.log('  --exact  Active la recherche par nom de fichier au lieu de la recherche sémantique');
  } else if (action === 'diagnose') {
    await testDiagnostics();
  } else if (action === 'help' || action === '--help' || action === '-h') {
    console.log('\n📚 Aide - Utilitaire de test RAG');
    console.log('---------------------------------');
    console.log('Commandes disponibles:');
    console.log('  diagnose       Affiche l\'état du système (base de données, Ollama, documents)');
    console.log('  search "terme" Effectue une recherche sémantique');
    console.log('    Options:');
    console.log('      --exact    Recherche exacte par nom de fichier');
    console.log('  regenerate     Vérifie et régénère les embeddings manquants');
    console.log('  help          Affiche cette aide');
    console.log('\nExemples:');
    console.log('  node scripts/testRegeneration.js diagnose');
    console.log('  node scripts/testRegeneration.js search "développeur web" --exact');
  } else {
    await testRegeneration();
  }
}

// Exécuter le script
main();
