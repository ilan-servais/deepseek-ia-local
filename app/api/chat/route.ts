import { type CoreMessage } from 'ai';

// Type des messages que le frontend envoie
interface ChatRequest {
  messages: {
    role: string
    content: string
  }[]
}

// Réponse POST envoyée par useChat (client)
export async function POST(req: Request) {
  const body = await req.json() as ChatRequest
  const messages = body.messages as CoreMessage[]
  
  // On récupère le dernier message
  const lastMessage = messages[messages.length - 1]?.content || ''

  // Création du prompt
  const prompt = `Tu es une IA utile. Réponds à la question suivante :\n\n"${lastMessage}"`

  // Configuration de la requête vers Ollama
  const response = await fetch('http://localhost:11434/api/generate', {
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
          // Renvoie uniquement le texte de la réponse
          controller.enqueue(new TextEncoder().encode(jsonData.response));
        }
      } catch (error) {
        console.error('Erreur de parsing JSON:', error);
        // En cas d'erreur, on passe le chunk tel quel
        controller.enqueue(chunk);
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
