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

// Types de fichiers acceptés
const ALLOWED_FILE_TYPES = [
  'application/pdf',  
  'text/plain',       
  'text/markdown',    
  'text/x-markdown'   // MIME type pour Markdown
];

// Extensions de fichiers acceptées
const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.txt', '.md'];

// Interface pour les informations du fichier
interface FileInfo {
  filename: string;
  filePath: string;
  size: number;
  type: string;
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

// Fonction pour gérer l'upload de fichier
async function handleFormData(req: NextRequest): Promise<FileInfo> {
  // S'assurer que le répertoire existe
  const uploadDir = await ensureUploadDir();
  
  const formData = await req.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    throw new Error('Aucun fichier n\'a été téléchargé');
  }
  
  // Vérifier le type de fichier
  if (!isAllowedFileType(file.name, file.type)) {
    throw new Error('Type de fichier non supporté. Seuls les fichiers PDF, texte et Markdown sont acceptés.');
  }
  
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name;
  const uniqueFilename = `${Date.now()}_${filename}`;
  const filePath = join(uploadDir, uniqueFilename);
  
  await writeFile(filePath, buffer);
  
  return {
    filename,
    filePath,
    size: file.size,
    type: file.type
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

// Fonction pour extraire l'extension du fichier
function getFileExtension(filename: string): string {
  return filename.substring(filename.lastIndexOf('.')).toLowerCase();
}

// Fonction pour insérer un document et ses chunks dans la base de données
async function processAndStoreDocument(filePath: string, fileName: string): Promise<any> {
  try {
    // Afficher le type de fichier pour le débogage
    const extension = getFileExtension(fileName);
    console.log(`Traitement du fichier: ${fileName}, extension: ${extension}`);
    
    // Extraire le texte du fichier
    const extractedText = await extractTextFromFile(filePath);
    console.log(`Texte extrait avec succès: ${extractedText.content.length} caractères`);
    
    // Insérer le document dans la base de données
    const documentResult = await query(
      'INSERT INTO documents(filename, content) VALUES($1, $2) RETURNING id',
      [fileName, extractedText.content]
    );
    const documentId = documentResult.rows[0].id;
    console.log(`Document inséré avec l'ID: ${documentId}`);
    
    // Découper le texte en chunks
    const chunks = chunkText(extractedText.content);
    console.log(`Texte découpé en ${chunks.length} chunks`);
    
    // Pour stocker les infos du fichier à retourner
    let fileDetails = {
      name: fileName,
      size: 0,
      type: ''
    };

    // Vérifier que Ollama est disponible
    try {
      const ollamaCheck = await fetch(`${process.env.OLLAMA_API_HOST}/api/tags`);
      if (!ollamaCheck.ok) {
        throw new Error(`Ollama API n'est pas disponible. Code: ${ollamaCheck.status}`);
      }
      console.log('Connexion à Ollama vérifiée avec succès');
    } catch (error) {
      console.error('Erreur lors de la vérification de Ollama:', error);
      throw new Error('Impossible de se connecter à Ollama. Assurez-vous que le service est en cours d\'exécution.');
    }

    let successfulEmbeddings = 0;
    let failedEmbeddings = 0;

    // Insérer les chunks dans la base de données
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Traitement du chunk ${i+1}/${chunks.length} (taille: ${chunks[i].length} caractères)`);
      
      const chunkResult = await query(
        'INSERT INTO chunks(document_id, content, chunk_index) VALUES($1, $2, $3) RETURNING id',
        [documentId, chunks[i], i]
      );
      const chunkId = chunkResult.rows[0].id;
      console.log(`Chunk inséré avec l'ID: ${chunkId}`);
      
      // Générer l'embedding pour ce chunk
      try {
        // Limiter la taille du texte pour éviter les erreurs
        const maxTextLength = 8000; // Limiter à 8000 caractères pour éviter les problèmes avec l'API
        const truncatedText = chunks[i].length > maxTextLength 
          ? chunks[i].substring(0, maxTextLength) 
          : chunks[i];
          
        console.log(`Génération de l'embedding pour le chunk ${i+1} (longueur: ${truncatedText.length})...`);
        
        const embeddingResponse = await fetch(`${process.env.OLLAMA_API_HOST}/api/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek-r1:1.5b',
            prompt: truncatedText,
          }),
          // Augmenter le timeout pour les chunks plus longs
          signal: AbortSignal.timeout(60000) // 60 secondes de timeout
        });
        
        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          throw new Error(`Erreur lors de la génération de l'embedding pour le chunk ${i}: ${errorText}`);
        }
        
        const embeddingData = await embeddingResponse.json();
        
        if (!embeddingData.embedding || !Array.isArray(embeddingData.embedding)) {
          throw new Error(`Format d'embedding invalide: ${JSON.stringify(embeddingData)}`);
        }
        
        const embedding = embeddingData.embedding;
        console.log(`Embedding généré avec succès: ${embedding.length} dimensions`);
        
        // Vérifier la validité de l'embedding
        if (!isValidEmbedding(embedding)) {
          console.warn(`Embedding invalide pour le chunk ${i}`);
          failedEmbeddings++;
          continue;
        }
        
        // Insérer l'embedding dans la base de données
        const formattedEmbedding = formatEmbeddingForPgVector(embedding);
        await query(
          'INSERT INTO embeddings (chunk_id, embedding) VALUES ($1, $2)',
          [chunkId, formattedEmbedding]
        );
        console.log(`Embedding inséré avec succès pour le chunk ${i+1}`);
        successfulEmbeddings++;
      } catch (embeddingError) {
        console.error(`Erreur lors de la génération de l'embedding pour le chunk ${i}:`, embeddingError);
        failedEmbeddings++;
      }
    }
    
    console.log(`Traitement terminé: ${successfulEmbeddings} embeddings réussis, ${failedEmbeddings} échecs`);
    
    // Supprimer le fichier temporaire
    await unlink(filePath);
    console.log(`Fichier temporaire supprimé: ${filePath}`);
    
    return {
      success: true,
      documentId,
      chunkCount: chunks.length,
      embeddingsGenerated: successfulEmbeddings,
      embeddingsFailed: failedEmbeddings,
      message: 'Document traité avec succès',
      fileInfo: fileDetails
    };
    
  } catch (error) {
    console.error('Erreur lors du traitement du document:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Initialiser la base de données
    await initializeDatabase();
    console.log('Base de données initialisée');
    
    // Uploader le fichier
    console.log('Traitement de la requête d\'upload...');
    const fileInfo = await handleFormData(req);
    console.log(`Fichier uploadé avec succès: ${fileInfo.filename}`);
    
    try {
      // Traiter le document et ses chunks dans la base de données
      const result = await processAndStoreDocument(fileInfo.filePath, fileInfo.filename);
      
      // Ajouter les infos du fichier au résultat
      result.fileInfo = {
        name: fileInfo.filename,
        size: fileInfo.size,
        type: fileInfo.type
      };
      
      // Vérifier l'état final de la base de données
      await checkDatabaseState();
      
      return NextResponse.json(result);
      
    } catch (error) {
      console.error('Erreur lors du traitement du fichier:', error);
      
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
    console.error('Erreur lors de la gestion de la requête:', error);
    return NextResponse.json(
      { error: `Erreur interne du serveur: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
