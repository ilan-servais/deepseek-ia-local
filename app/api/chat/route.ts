import { type CoreMessage } from 'ai';
import { query } from '@/lib/db/postgres';
import { formatEmbeddingForPgVector } from '@/lib/embeddings/utils';

// Type des messages que le frontend envoie
interface ChatRequest {
  messages: {
    role: string
    content: string | any // Support pour les formats de contenu complexes
  }[]
}

// Fonction pour rechercher les documents pertinents
async function searchRelevantDocuments(userQuery: string): Promise<string[]> {
  try {
    // Générer un embedding pour la requête de l'utilisateur
    const response = await fetch(`${process.env.OLLAMA_API_HOST}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-r1:1.5b',
        prompt: userQuery,
      }),
    });

    if (!response.ok) {
      console.error('Erreur lors de la génération de l\'embedding pour la requête');
      return [];
    }

    const data = await response.json();
    const queryEmbedding = data.embedding;

    // Rechercher les chunks les plus similaires dans la base de données
    const result = await query(`
      SELECT c.content, 1 - (e.embedding <=> $1) as similarity
      FROM chunks c
      JOIN embeddings e ON c.id = e.chunk_id
      ORDER BY similarity DESC
      LIMIT 3;
    `, [formatEmbeddingForPgVector(queryEmbedding)]);

    // Retourner le contenu des chunks les plus pertinents
    return result.rows.map((row: any) => row.content);
  } catch (error) {
    console.error('Erreur lors de la recherche de documents:', error);
    return [];
  }
}

export async function POST(req: Request) {
  const body = await req.json() as ChatRequest
  const messages = body.messages as CoreMessage[]
  
  // On récupère le dernier message et on s'assure qu'il est converti en chaîne de caractères
  const lastMessageContent = messages[messages.length - 1]?.content || '';
  // Convertir le contenu complexe en string si nécessaire
  const lastMessage = typeof lastMessageContent === 'string' 
    ? lastMessageContent 
    : Array.isArray(lastMessageContent)
      ? lastMessageContent.map(part => {
          if (typeof part === 'string') return part;
          if (typeof part === 'object' && part && 'text' in part) return part.text;
          return '';
        }).join(' ')
      : JSON.stringify(lastMessageContent);

  // Rechercher des informations pertinentes dans les documents
  const relevantDocs = await searchRelevantDocuments(lastMessage);
  
  // Construire un contexte à partir des documents pertinents
  let context = '';
  if (relevantDocs.length > 0) {
    context = `Voici des informations pertinentes extraites de documents: 
${relevantDocs.join('\n\n')}

Utilise ces informations pour répondre à la question.`;
  }

  // Création du prompt augmenté avec le contexte documentaire
  const prompt = `Tu es une IA utile. ${context}

Question: "${lastMessage}"

Réponds en te basant sur le contexte fourni quand c'est pertinent, sinon réponds avec tes connaissances générales.`;

  // Configuration de la requête vers Ollama
  const response = await fetch(`${process.env.OLLAMA_API_HOST}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-r1:1.5b',
      prompt: prompt,
      stream: true,
      options: {
        temperature: 0.2,
      }
    }),
  });

  // Vérifie si la réponse est OK
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Ollama API error:', errorText);
    return new Response(`Erreur d'API Ollama: ${errorText}`, { status: 500 });
  }

  // Renvoie la réponse en streaming après transformation
  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      // Décodage du chunk Ollama
      const decoder = new TextDecoder();
      const text = decoder.decode(chunk);
      
      try {
        // Ollama envoie des objets JSON délimités par des sauts de ligne
        const jsonData = JSON.parse(text);
        
        // Extrait uniquement le texte généré
        if (jsonData.response) {
          // Format spécial pour vercel/ai - on préfixe avec "0:" et on encode en JSON
          // Le format attendu est "0:message" où 0 est le code pour un message texte
          const formattedData = `0:${JSON.stringify(jsonData.response)}\n`;
          controller.enqueue(new TextEncoder().encode(formattedData));
        }
      } catch (error) {
        console.error('Erreur de parsing JSON:', error);
        // En cas d'erreur, on passe simplement à l'itération suivante
      }
    }
  });

  // Pipe la réponse à travers notre transformateur
  return new Response(response.body?.pipeThrough(transformStream), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
