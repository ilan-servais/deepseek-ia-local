import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import * as fs from 'fs';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { query, checkDatabaseState } from '@/lib/db/postgres';
import { formatEmbeddingForPgVector, isValidEmbedding } from '@/lib/embeddings/utils';
import { extractTextFromFile, chunkText } from '@/lib/services/textExtractor';
import { initializeDatabase } from '@/lib/db/postgres';
import { sanitizeFilename, validateFileType } from '@/lib/utils/fileUtils';

// Logger simplifié intégré directement dans le fichier
const logger = {
  debug: (message: string, ...args: any[]) => console.debug(`[DEBUG] ${message}`, ...args),
  info: (message: string, ...args: any[]) => console.info(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
};

// Types de fichiers acceptés
const ALLOWED_FILE_TYPES = [
  'application/pdf',  
  'text/plain',       
  'text/markdown',    
  'text/x-markdown'   
];

// Extensions de fichiers acceptées
const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.txt', '.md'];

// Interface pour les informations du fichier
interface FileInfo {
  filename: string;
  filePath: string;
  size: number;
  type: string;
  sanitizedName: string; // Ajout du nom sanitisé
  tags?: string[]; // Support pour les tags
}

// Interface pour les métadonnées du document
interface DocumentMetadata {
  title: string;
  author?: string;
  category?: string;
  tags?: string[];
  description?: string;
}

// Fonction pour vérifier si un type de fichier est autorisé
function isAllowedFileType(filename: string, mimeType: string): boolean {
  // Vérifier l'extension
  const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  if (ALLOWED_FILE_EXTENSIONS.includes(extension)) {
    return true;
  }
  
  // Vérifier le type MIME
  if (ALLOWED_FILE_TYPES.includes(mimeType)) {
    return true;
  }
  
  return false;
}

/**
 * Gère l'upload d'un fichier avec gestion du remplacement
 * @param formData FormData contenant le fichier et les métadonnées
 * @returns Informations sur le fichier traité
 */
async function uploadAndReplaceFile(formData: FormData): Promise<FileInfo> {
  // S'assurer que le répertoire existe
  const uploadDir = await ensureUploadDir();
  
  const file = formData.get('file') as File;
  const tags = formData.get('tags') as string || '';
  const metadataRaw = formData.get('metadata') as string || '{}';
  
  if (!file) {
    throw new Error('Aucun fichier n\'a été téléchargé');
  }
  
  // Vérifier le type de fichier
  if (!validateFileType(file.name, file.type, ALLOWED_FILE_TYPES, ALLOWED_FILE_EXTENSIONS)) {
    throw new Error('Type de fichier non supporté. Seuls les fichiers PDF, texte et Markdown sont acceptés.');
  }
  
  // Sanitiser le nom du fichier
  const originalName = file.name;
  const sanitizedName = sanitizeFilename(originalName);
  
  if (originalName !== sanitizedName) {
    logger.info(`Nom de fichier sanitisé: "${originalName}" -> "${sanitizedName}"`);
  }
  
  // Vérifier si un document avec le même nom existe déjà - MODIFIÉ ICI
  // Utilise LOWER() pour normaliser lors de la comparaison au lieu d'utiliser une colonne spécifique
  const existingDoc = await query(
    'SELECT id FROM documents WHERE LOWER(filename) = $1',
    [sanitizedName.toLowerCase()]
  );
  
  let documentId: number | null = null;
  
  if (existingDoc.rows.length > 0) {
    documentId = existingDoc.rows[0].id;
    logger.info(`Document existant trouvé avec l'ID: ${documentId}, préparation au remplacement...`);
    
    // Supprimer les chunks et embeddings associés
    await query('DELETE FROM chunks WHERE document_id = $1', [documentId]);
    logger.info(`Chunks associés au document ${documentId} supprimés`);
    
    // Note: les embeddings seront supprimés en cascade grâce à la contrainte ON DELETE CASCADE
  }
  
  // Créer un nom de fichier unique pour le stockage
  const uniqueFilename = `${Date.now()}_${sanitizedName}`;
  const filePath = join(uploadDir, uniqueFilename);
  
  // Convertir en buffer et écrire sur le disque
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);
  logger.info(`Fichier écrit sur le disque: ${filePath}`);
  
  // Traiter les métadonnées et les tags
  let metadata: DocumentMetadata = { title: sanitizedName };
  
  try {
    metadata = JSON.parse(metadataRaw);
    metadata.title = metadata.title || sanitizedName;
  } catch (error) {
    logger.warn('Erreur lors du parsing des métadonnées, utilisation des valeurs par défaut');
  }
  
  // Préparer les tags (séparés par des virgules)
  const tagArray = tags.split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
  
  return {
    filename: originalName,
    sanitizedName,
    filePath,
    size: file.size,
    type: file.type,
    tags: tagArray
  };
}

// S'assurer que le répertoire d'uploads existe
const ensureUploadDir = async () => {
  const uploadDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// Fonction pour traiter et stocker un document avec gestion du remplacement
async function processAndStoreDocument(fileInfo: FileInfo, metadata: DocumentMetadata = { title: '' }): Promise<any> {
  try {
    // Extraire le texte du fichier
    const extractedText = await extractTextFromFile(fileInfo.filePath);
    logger.info(`Texte extrait avec succès: ${extractedText.content.length} caractères`);
    
    let documentId: number;
    const normalizedFilename = fileInfo.sanitizedName.toLowerCase();
    
    // Vérifier si le document existe déjà - MODIFIÉ ICI
    const existingDoc = await query(
      'SELECT id FROM documents WHERE LOWER(filename) = $1',
      [normalizedFilename]
    );
    
    if (existingDoc.rows.length > 0) {
      // Mise à jour du document existant
      documentId = existingDoc.rows[0].id;
      
      await query(
        `UPDATE documents SET 
         filename = $1,
         content = $2,
         title = $3,
         author = $4,
         category = $5,
         description = $6,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [
          fileInfo.filename,
          extractedText.content,
          metadata.title || fileInfo.filename,
          metadata.author || null,
          metadata.category || null,
          metadata.description || null,
          documentId
        ]
      );
      
      logger.info(`Document mis à jour avec l'ID: ${documentId}`);
    } else {
      // Insertion d'un nouveau document - MODIFIÉ ICI
      const documentResult = await query(
        `INSERT INTO documents(
          filename,
          content,
          title,
          author,
          category,
          description
        ) VALUES($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          fileInfo.filename,
          extractedText.content,
          metadata.title || fileInfo.filename,
          metadata.author || null,
          metadata.category || null,
          metadata.description || null
        ]
      );
      
      documentId = documentResult.rows[0].id;
      logger.info(`Nouveau document inséré avec l'ID: ${documentId}`);
    }
    
    // Gérer les tags
    if (fileInfo.tags && fileInfo.tags.length > 0) {
      // Supprimer les tags existants
      await query('DELETE FROM document_tags WHERE document_id = $1', [documentId]);
      
      // Insérer les nouveaux tags
      for (const tag of fileInfo.tags) {
        // Vérifier si le tag existe déjà
        const existingTag = await query('SELECT id FROM tags WHERE name = $1', [tag.toLowerCase()]);
        
        let tagId: number;
        
        if (existingTag.rows.length > 0) {
          tagId = existingTag.rows[0].id;
        } else {
          // Créer le tag
          const newTag = await query(
            'INSERT INTO tags(name) VALUES($1) RETURNING id',
            [tag.toLowerCase()]
          );
          tagId = newTag.rows[0].id;
        }
        
        // Associer le tag au document
        await query(
          'INSERT INTO document_tags(document_id, tag_id) VALUES($1, $2)',
          [documentId, tagId]
        );
      }
      
      logger.info(`${fileInfo.tags.length} tags associés au document ${documentId}`);
    }
    
    // Découper le texte en chunks
    const chunks = chunkText(extractedText.content);
    logger.info(`Texte découpé en ${chunks.length} chunks`);
    
    // Vérifier que Ollama est disponible
    try {
      const ollamaCheck = await fetch(`${process.env.OLLAMA_API_HOST}/api/tags`);
      if (!ollamaCheck.ok) {
        throw new Error(`Ollama API n'est pas disponible. Code: ${ollamaCheck.status}`);
      }
      logger.info('Connexion à Ollama vérifiée avec succès');
    } catch (error) {
      logger.error('Erreur lors de la vérification de Ollama:', error);
      throw new Error('Impossible de se connecter à Ollama. Assurez-vous que le service est en cours d\'exécution.');
    }

    let successfulEmbeddings = 0;
    let failedEmbeddings = 0;

    // Insérer les chunks dans la base de données
    for (let i = 0; i < chunks.length; i++) {
      logger.info(`Traitement du chunk ${i+1}/${chunks.length} (taille: ${chunks[i].length} caractères)`);
      
      const chunkResult = await query(
        'INSERT INTO chunks(document_id, content, chunk_index) VALUES($1, $2, $3) RETURNING id',
        [documentId, chunks[i], i]
      );
      
      const chunkId = chunkResult.rows[0].id;
      logger.info(`Chunk inséré avec l'ID: ${chunkId}`);
      
      // Générer l'embedding pour ce chunk
      try {
        // Limiter la taille du texte pour éviter les erreurs
        const maxTextLength = 8000;
        const truncatedText = chunks[i].length > maxTextLength 
          ? chunks[i].substring(0, maxTextLength) 
          : chunks[i];
          
        logger.info(`Génération de l'embedding pour le chunk ${i+1} (longueur: ${truncatedText.length})...`);
        
        const embeddingResponse = await fetch(`${process.env.OLLAMA_API_HOST}/api/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek-r1:1.5b',
            prompt: truncatedText,
          }),
          signal: AbortSignal.timeout(60000) // 60 secondes timeout
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
        logger.info(`Embedding généré avec succès: ${embedding.length} dimensions`);
        
        // Vérifier la validité de l'embedding
        if (!isValidEmbedding(embedding)) {
          logger.warn(`Embedding invalide pour le chunk ${i}`);
          failedEmbeddings++;
          continue;
        }
        
        // Insérer l'embedding dans la base de données
        const formattedEmbedding = formatEmbeddingForPgVector(embedding);
        await query(
          'INSERT INTO embeddings (chunk_id, embedding, model_name) VALUES ($1, $2, $3)',
          [chunkId, formattedEmbedding, 'deepseek-r1:1.5b']
        );
        
        logger.info(`Embedding inséré avec succès pour le chunk ${i+1}`);
        successfulEmbeddings++;
      } catch (embeddingError) {
        logger.error(`Erreur lors de la génération de l'embedding pour le chunk ${i}:`, embeddingError);
        failedEmbeddings++;
      }
    }
    
    logger.info(`Traitement terminé: ${successfulEmbeddings} embeddings réussis, ${failedEmbeddings} échecs`);
    
    // Supprimer le fichier temporaire
    await unlink(fileInfo.filePath);
    logger.info(`Fichier temporaire supprimé: ${fileInfo.filePath}`);
    
    return {
      success: true,
      documentId,
      chunkCount: chunks.length,
      embeddingsGenerated: successfulEmbeddings,
      embeddingsFailed: failedEmbeddings,
      message: existingDoc.rows.length > 0 ? 'Document mis à jour avec succès' : 'Document traité avec succès',
      fileInfo: {
        name: fileInfo.filename,
        size: fileInfo.size,
        type: fileInfo.type,
        tags: fileInfo.tags
      }
    };
  } catch (error) {
    logger.error('Erreur lors du traitement du document:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Initialiser la base de données
    await initializeDatabase();
    logger.info('Base de données initialisée');
    
    // Récupérer le FormData une seule fois au début
    const formData = await req.formData();
    
    // Uploader le fichier avec gestion du remplacement
    logger.info('Traitement de la requête d\'upload...');
    const fileInfo = await uploadAndReplaceFile(formData);
    logger.info(`Fichier uploadé avec succès: ${fileInfo.filename}`);
    
    // Récupérer les métadonnées à partir du formData déjà existant
    const metadataRaw = formData.get('metadata') as string || '{}';
    let metadata: DocumentMetadata = { title: fileInfo.filename };
    
    try {
      metadata = JSON.parse(metadataRaw);
    } catch (error) {
      logger.warn('Erreur lors du parsing des métadonnées, utilisation des valeurs par défaut');
    }
    
    try {
      // Traiter le document et ses chunks dans la base de données
      const result = await processAndStoreDocument(fileInfo, metadata);
      
      // Vérifier l'état final de la base de données
      await checkDatabaseState();
      
      return NextResponse.json(result);
    } catch (error) {
      logger.error('Erreur lors du traitement du fichier:', error);
      
      // Nettoyer les fichiers temporaires en cas d'erreur
      if (fs.existsSync(fileInfo.filePath)) {
        await unlink(fileInfo.filePath);
      }
      
      return NextResponse.json(
        { error: `Erreur lors du traitement du fichier: ${(error as Error).message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Erreur lors de la gestion de la requête:', error);
    return NextResponse.json(
      { error: `Erreur interne du serveur: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
