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

## 📁 Structure du projet
