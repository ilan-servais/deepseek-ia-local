import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const OLLAMA_API = process.env.OLLAMA_API_HOST || 'http://localhost:11434';
const EMBEDDING_MODEL = 'deepseek-r1:1.5b';

export interface EmbeddingResponse {
  embedding: number[];
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${OLLAMA_API}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${errorText}`);
    }

    const data = await response.json() as EmbeddingResponse;
    return data.embedding;
  } catch (error) {
    console.error('Erreur lors de la génération d\'embeddings:', error);
    throw error;
  }
}

export async function generateEmbeddingsForChunks(chunks: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  // Générer des embeddings pour chaque chunk
  for (const chunk of chunks) {
    try {
      const embedding = await generateEmbedding(chunk);
      embeddings.push(embedding);
    } catch (error) {
      console.error(`Erreur lors de la génération d'embedding pour un chunk: ${error}`);
      // Mettre un embedding vide en cas d'échec
      embeddings.push([]);
    }
  }
  
  return embeddings;
}
