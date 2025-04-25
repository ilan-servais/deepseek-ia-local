const fs = require('fs');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Script d\'initialisation de l\'environnement DeepSeek RAG');
console.log('--------------------------------------------------------');

// 1. Vérifier si .env.local existe
if (!fs.existsSync('./.env.local')) {
  console.log('📝 Création du fichier .env.local à partir de .env.example...');
  
  if (fs.existsSync('./.env.example')) {
    fs.copyFileSync('./.env.example', './.env.local');
    console.log('✅ Fichier .env.local créé avec succès!');
  } else {
    console.error('❌ Fichier .env.example non trouvé!');
    createDefaultEnvFile();
  }
} else {
  console.log('✅ Fichier .env.local déjà existant.');
}

// 2. Vérifier Docker
console.log('\n🐳 Vérification de Docker...');

try {
  const dockerStatus = execSync('docker --version').toString();
  console.log(`✅ Docker est installé: ${dockerStatus.trim()}`);
  
  console.log('🔄 Démarrage du conteneur PostgreSQL...');
  try {
    execSync('docker-compose up -d');
    console.log('✅ Conteneur PostgreSQL démarré avec succès!');
  } catch (e) {
    console.error('❌ Erreur lors du démarrage du conteneur PostgreSQL:', e.message);
  }
  
} catch (e) {
  console.error('❌ Docker ne semble pas être installé ou n\'est pas disponible dans le PATH.');
  console.log('   Veuillez installer Docker: https://www.docker.com/get-started');
}

// 3. Vérifier Ollama
console.log('\n🤖 Vérification d\'Ollama...');

try {
  const ollamaOutput = execSync('ollama list').toString();
  console.log('✅ Ollama est installé et fonctionne!');
  
  if (!ollamaOutput.includes('deepseek-r1')) {
    console.log('\n📥 Le modèle deepseek-r1:1.5b semble ne pas être installé.');
    askInstallModel();
  } else {
    console.log('✅ Le modèle deepseek-r1:1.5b est déjà installé!');
    showCompleteMessage();
  }
} catch (e) {
  console.error('❌ Ollama ne semble pas être installé ou n\'est pas en cours d\'exécution.');
  console.log('   Veuillez installer Ollama: https://ollama.ai/');
  showCompleteMessage();
}

function askInstallModel() {
  rl.question('➡️ Voulez-vous installer le modèle deepseek-r1:1.5b maintenant? (Oui/Non): ', (answer) => {
    if (answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'o' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('\n📥 Installation du modèle deepseek-r1:1.5b (cela peut prendre plusieurs minutes)...');
      try {
        execSync('ollama pull deepseek-r1:1.5b', { stdio: 'inherit' });
        console.log('✅ Modèle installé avec succès!');
      } catch (e) {
        console.error('❌ Erreur lors de l\'installation du modèle:', e.message);
      }
    }
    showCompleteMessage();
    rl.close();
  });
}

function createDefaultEnvFile() {
  console.log('📝 Création d\'un fichier .env.local par défaut...');
  
  const defaultEnvContent = `# Configuration de l'API Ollama
OLLAMA_API_HOST=http://localhost:11434

# Configuration PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres`;

  try {
    fs.writeFileSync('./.env.local', defaultEnvContent);
    console.log('✅ Fichier .env.local créé avec des valeurs par défaut.');
  } catch (e) {
    console.error('❌ Impossible de créer le fichier .env.local:', e.message);
  }
}

function showCompleteMessage() {
  console.log('\n✨ Initialisation terminée! ✨');
  console.log('--------------------------------------------------------');
  console.log('Pour démarrer l\'application:');
  console.log('1. Assurez-vous que Docker et Ollama sont en cours d\'exécution');
  console.log('2. Exécutez: npm run dev');
  console.log('3. Ouvrez http://localhost:3000 dans votre navigateur');
  console.log('4. Accédez à l\'onglet "Documents" pour configurer la base de données');
  console.log('--------------------------------------------------------');
}
