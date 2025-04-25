# 🤖 RAG DeepSeek Chat Interface

Une interface moderne pour interagir avec le modèle deepseek-r1:1.5b via Ollama, construite avec Next.js 15 et TailwindCSS.

![Interface Screenshot](https://placehold.co/600x400?text=DeepSeek+Chat+Interface)

## 🎯 Contexte général

Ce projet est une interface de chatbot développée avec:
- **Next.js 15** (App Router)
- **TypeScript**
- **TailwindCSS**
- **Vercel AI SDK** (`useChat`)

Le backend fonctionne via une API personnalisée `/api/chat`, connectée localement à **Ollama** (http://localhost:11434).
Le modèle utilisé est **`deepseek-r1:1.5b`**, accessible via l'API REST d'Ollama avec support complet du streaming des réponses.

## 🚀 Fonctionnalités principales

- **Interface moderne** inspirée de ChatGPT
- **Streaming de texte** en temps réel
- **Design responsive** avec TailwindCSS
- **Expérience utilisateur intuitive**:
  - Messages utilisateur à droite (bleu clair)
  - Messages IA à gauche (gris clair)
  - Indicateurs visuels de chargement
- **Raccourcis clavier**:
  - `Enter` : envoyer le message
  - `Shift + Enter` : retour à la ligne
- **Base prête pour RAG** avec conteneur Docker pour PostgreSQL + pgvector
- **Architecture modulaire** avec composants réutilisables

## 🛠️ Installation & Démarrage

### Prérequis
- Node.js 18+ et npm
- [Docker](https://www.docker.com/) pour le conteneur PostgreSQL
- [Ollama](https://ollama.ai/) installé localement
- Modèle deepseek-r1:1.5b installé sur Ollama

### Installation

```bash
# Cloner le dépôt
git clone <repo>

# Accéder au répertoire
cd rag-deepseek

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
```

### Configuration de la base de données

```bash
# Démarrer le conteneur PostgreSQL avec pgvector
docker-compose up -d

# Vérifier que le conteneur est bien démarré
docker ps
```

### Configuration d'Ollama

```bash
# Télécharger le modèle deepseek-r1:1.5b
ollama pull deepseek-r1:1.5b

# Vérifier que Ollama est en cours d'exécution
ollama list
```

### Lancement du projet

```bash
# Démarrer le serveur de développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur pour voir l'interface.

## 📄 Types de documents supportés

Le système RAG peut traiter les formats de fichiers suivants :

1. **PDF** (.pdf)
   - Documents textuels
   - Rapports, articles, livres
   - CV et documents professionnels

2. **Texte brut** (.txt)
   - Fichiers texte simple
   - Notes, transcriptions
   - Données structurées en texte

3. **Markdown** (.md)
   - Documentation technique
   - Notes formatées
   - Articles avec mise en forme légère

Le système extrait automatiquement le texte de ces documents, les découpe en segments plus petits ("chunks") et génère des embeddings vectoriels pour permettre la recherche sémantique.

**Limites actuelles :**
- Taille maximale de fichier : 10MB
- Les images dans les PDFs ne sont pas analysées (extraction de texte uniquement)
- Les tableaux complexes peuvent perdre leur structure lors de l'extraction

## 🔧 Configuration

Assurez-vous que votre fichier `.env.local` contient les variables d'environnement suivantes:

```
OLLAMA_API_HOST=http://localhost:11434

# Configuration PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres
```

## 🔍 Dépannage

Si vous rencontrez des erreurs:

1. Vérifiez qu'Ollama est bien lancé et que le modèle est installé:
   ```bash
   ollama list
   ```

2. Vérifiez que le conteneur Docker est en cours d'exécution:
   ```bash
   docker ps
   ```

3. Si vous rencontrez des erreurs d'authentification avec PostgreSQL:
   ```bash
   # Arrêter le conteneur existant
   docker-compose down
   
   # Supprimer le volume (ATTENTION: cette opération supprimera définitivement toutes les données 
   # stockées dans votre base PostgreSQL, y compris les documents et embeddings générés)
   docker volume rm rag-deepseek_pg_data
   
   # Redémarrer le conteneur
   docker-compose up -d
   ```

4. Initialisez la base de données depuis l'interface web:
   - Allez dans l'onglet "Documents"
   - Cliquez sur "Configurer la Base de Données"
   - Suivez les étapes pour vérifier la connexion et initialiser les tables

5. Pour des diagnostics, consultez la page `/api/diagnostics` dans votre navigateur.

## 📁 Structure du projet

```txt
rag-deepseek/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts      # Endpoint API pour le chat
│   ├── globals.css           # Styles globaux
│   ├── layout.tsx            # Layout principal
│   └── page.tsx              # Page d'accueil
├── components/
│   ├── base/
│   │   ├── Button.tsx        # Composant de bouton réutilisable
│   │   ├── Form.tsx          # Composant de formulaire
│   │   └── Input.tsx         # Composant d'input 
│   └── chat/
│       └── Client.tsx        # Interface principale du chat
├── public/
└── ... (fichiers de configuration)
```

## 🔍 Architecture technique

### Frontend
- **Next.js 15** avec App Router pour le routage et le rendu
- **TailwindCSS** pour le style
- **Vercel AI SDK** pour la gestion des conversations et du streaming
- **Composants React** modulaires et réutilisables

### Backend
- **API Route Next.js** pour l'endpoint `/api/chat`
- **Streaming** des réponses du modèle en temps réel
- **Intégration Ollama** via son API REST
- **Transformation des données** pour compatibilité avec le SDK Vercel AI

### Modèle IA
- **deepseek-r1:1.5b** - Un modèle de langage efficace et léger

