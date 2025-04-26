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
    console.log('Recherche de documents pour la requête:', userQuery);
    
    // Vérifier d'abord si nous avons des documents dans la base
    const docsCheck = await query('SELECT COUNT(*) as count FROM documents');
    console.log(`Nombre total de documents dans la base: ${docsCheck.rows[0].count}`);
    
    const chunksCheck = await query('SELECT COUNT(*) as count FROM chunks');
    console.log(`Nombre total de chunks dans la base: ${chunksCheck.rows[0].count}`);
    
    const embeddingsCheck = await query('SELECT COUNT(*) as count FROM embeddings');
    console.log(`Nombre total d'embeddings dans la base: ${embeddingsCheck.rows[0].count}`);
    
    if (embeddingsCheck.rows[0].count === 0) {
      console.log('Aucun embedding trouvé dans la base de données');
      return [];
    }

    // Recherche pour des noms propres spécifiques mentionnés dans la requête
    const nameMatches = findNamedEntities(userQuery);
    if (nameMatches.length > 0) {
      console.log(`Noms propres détectés dans la requête: ${nameMatches.join(', ')}`);

      // Recherche directe dans le contenu des documents pour ces noms propres
      const nameResults = [];

      for (const name of nameMatches) {
        console.log(`Recherche de documents contenant "${name}"...`);
        const contentResults = await query(`
          SELECT DISTINCT
            d.id,
            d.filename,
            c.content,
            1 as priority
          FROM 
            documents d
          JOIN 
            chunks c ON d.id = c.document_id
          WHERE 
            c.content ILIKE $1
          ORDER BY
            d.id
          LIMIT 3;
        `, [`%${name}%`]);

        if (contentResults.rows.length > 0) {
          console.log(`${contentResults.rows.length} documents trouvés contenant "${name}"`);
          nameResults.push(...contentResults.rows.map((row: any) => 
            `Extrait du document "${row.filename}" (correspondance directe pour "${name}"):
${row.content}`
          ));
        }
      }

      if (nameResults.length > 0) {
        // Poursuivre avec la recherche sémantique standard pour compléter les résultats
        const semanticResults = await performSemanticSearch(userQuery);
        return [...nameResults, ...semanticResults];
      }
    }

    // Rechercher spécifiquement pour Ilan Servais si mentionné dans la requête
    if (userQuery.toLowerCase().includes('ilan') || userQuery.toLowerCase().includes('servais')) {
      console.log(`Mention d'Ilan Servais détectée, recherche directe dans les documents CV...`);
      
      const cvResults = await query(`
        SELECT 
          d.id,
          d.filename, 
          c.content
        FROM 
          documents d
        JOIN 
          chunks c ON d.id = c.document_id
        WHERE 
          d.filename ILIKE '%cv%' 
          AND d.filename ILIKE '%ilan%'
        LIMIT 2;
      `);
      
      if (cvResults.rows.length > 0) {
        console.log(`${cvResults.rows.length} CV d'Ilan Servais trouvés`);
        const cvContents = cvResults.rows.map((row: any) => 
          `Extrait du CV "${row.filename}" (correspondance directe):
${row.content}`
        );
        
        // Ajouter les résultats de la recherche sémantique standard
        const semanticResults = await performSemanticSearch(userQuery);
        return [...cvContents, ...semanticResults];
      }
    }

    // Si aucun nom ou pas de correspondances, continuer avec la recherche standard
    return await performSemanticSearch(userQuery);

  } catch (error) {
    console.error('Erreur lors de la recherche de documents:', error);
    return [];
  }
}

// Fonction pour extraire des noms propres potentiels de la requête
function findNamedEntities(text: string): string[] {
  // Recherche de mots commençant par une majuscule suivis d'un autre mot avec majuscule (noms complets)
  const namedEntities = [];
  
  // Extraire les noms propres complets (Prénom Nom)
  const fullNamePattern = /[A-Z][a-zÀ-ÿ]+\s+[A-Z][a-zÀ-ÿ]+/g;
  const fullNames = text.match(fullNamePattern) || [];
  
  // Extraire les mots isolés commençant par une majuscule (potentiellement des noms propres)
  const singleNamePattern = /\b[A-Z][a-zÀ-ÿ]{2,}\b/g;
  const singleNames = text.match(singleNamePattern) || [];
  
  // Filtrer les mots communs qui pourraient commencer par une majuscule
  const commonWords = ['Je', 'Tu', 'Il', 'Elle', 'On', 'Nous', 'Vous', 'Ils', 'Elles', 
                       'Bonjour', 'Salut', 'Merci', 'Est', 'Oui', 'Non'];
                       
  // Combiner et filtrer les résultats
  return [...fullNames, ...singleNames]
    .filter(word => !commonWords.includes(word))
    .map(match => match.trim());
}

// Fonction pour effectuer la recherche sémantique standard
async function performSemanticSearch(userQuery: string): Promise<string[]> {
  // Recherche par mots-clés pour des fichiers spécifiques (si mentionnés explicitement)
  const fileNameMatch = userQuery.match(/document\s+["']([^"']+)["']/i);
  if (fileNameMatch) {
    const fileName = fileNameMatch[1];
    console.log(`Détection d'une demande explicite pour le document: "${fileName}"`);
    
    // Recherche directe par nom de fichier
    const fileResults = await query(`
      SELECT d.id, d.filename
      FROM documents d
      WHERE d.filename ILIKE $1
    `, [`%${fileName}%`]);
    
    if (fileResults.rows.length > 0) {
      console.log(`Document trouvé par correspondance de nom: ${fileResults.rows[0].filename}`);
      
      // Récupérer les chunks de ce document
      const chunks = await query(`
        SELECT c.content
        FROM chunks c
        WHERE c.document_id = $1
        ORDER BY c.chunk_index ASC
      `, [fileResults.rows[0].id]);
      
      console.log(`${chunks.rows.length} chunks récupérés du document ${fileResults.rows[0].filename}`);
      
      // Retourner le contenu des chunks
      return chunks.rows.map(row => row.content);
    }
  }
  
  // Recherche sémantique standard
  console.log('Génération de l\'embedding pour la requête utilisateur...');
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
    console.error('Erreur lors de la génération de l\'embedding pour la requête:', await response.text());
    return [];
  }

  const data = await response.json();
  const queryEmbedding = data.embedding;
  console.log(`Embedding généré avec ${queryEmbedding.length} dimensions`);

  // Rechercher les chunks les plus similaires dans la base de données
  console.log('Recherche des chunks similaires...');
  const result = await query(`
    SELECT 
      c.content, 
      d.filename,
      1 - (e.embedding <=> $1) as similarity
    FROM chunks c
    JOIN embeddings e ON c.id = e.chunk_id
    JOIN documents d ON c.document_id = d.id
    ORDER BY similarity DESC
    LIMIT 5;
  `, [formatEmbeddingForPgVector(queryEmbedding)]);

  console.log(`${result.rows.length} chunks trouvés avec ces similarités:`);
  result.rows.forEach((row: any, idx: number) => {
    console.log(`Chunk ${idx+1} - Fichier: ${row.filename}, Similarité: ${row.similarity}`);
  });

  // Retourner le contenu des chunks les plus pertinents
  return result.rows.map((row: any) => 
    `Extrait du document "${row.filename}" (similarité: ${Math.round(row.similarity * 100)}%):
${row.content}`
  );
}

// Réponse POST envoyée par useChat (client)
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
  const prompt = `Tu es une IA utile nommée DeepSeek, basée sur le modèle deepseek-r1:1.5b. ${context}

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
        // Ollama peut envoyer des réponses partielles, donc on split par ligne
        const jsonLines = text.trim().split('\n');
        for (const line of jsonLines) {
          if (line.trim()) {
            try {
              const jsonData = JSON.parse(line);
              if (jsonData.response) {
                const formattedData = `0:${JSON.stringify(jsonData.response)}\n`;
                controller.enqueue(new TextEncoder().encode(formattedData));
              }
            } catch (e) {
              // Ignorer les lignes qui ne sont pas du JSON valide
              console.debug("Ligne JSON non valide ignorée");
            }
          }
        }
      } catch (error) {
        console.error('Erreur de parsing JSON:', error);
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
