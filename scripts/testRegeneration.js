const fetch = require('node-fetch');

async function testRegeneration() {
  try {
    console.log('Lancement de la régénération des embeddings...');
    
    const response = await fetch('http://localhost:3000/api/documents/regenerate-all');
    const data = await response.json();
    
    console.log('Résultat:', data);
    
    if (data.jobId) {
      console.log(`Tâche de régénération lancée avec l'ID: ${data.jobId}`);
      console.log(`Total de documents à traiter: ${data.totalDocuments}`);
      console.log('La régénération se déroule en arrière-plan, consultez les logs du serveur pour suivre la progression.');
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
}

testRegeneration();
