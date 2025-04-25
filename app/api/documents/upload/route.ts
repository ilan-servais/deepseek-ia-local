import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { parse } from 'path';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import * as fs from 'fs';
import { query } from '@/lib/db/postgres';
import { formatEmbeddingForPgVector, isValidEmbedding } from '@/lib/embeddings/utils';
import { extractTextFromFile, chunkText } from '@/lib/services/textExtractor';
import { initializeDatabase } from '@/lib/db/postgres';

// Définition d'interface pour les informations du fichier
interface FileInfo {
  filename: string;
  filePath: string;
  size: number;
  type: string;
}

// Types de fichiers acceptés
const ALLOWED_FILE_TYPES = [
  'application/pdf',  // PDF
  'text/plain',       // Texte
  'text/markdown',    // Markdown
  'text/x-markdown'   // Autre MIME type pour Markdown
];

// Extensions de fichiers acceptées (pour les cas où le type MIME n'est pas correctement détecté)
const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.txt', '.md'];

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

// Désactiver le body parser intégré pour gérer l'upload de fichiers
export const config = {
  api: {
    bodyParser: false,
  },
};

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

async function processAndStoreDocument(filePath: string, fileName: string): Promise<any> {
  try {
    // Afficher le type de fichier pour le débogage
    const extension = getFileExtension(fileName);
    console.log(`Traitement du fichier: ${fileName}, extension: ${extension}`);
    
    // Extraire le texte du fichier
    const extractedText = await extractTextFromFile(filePath);
    
    // Insérer le document dans la base de données
    const documentResult = await query(
      'INSERT INTO documents(filename, content) VALUES($1, $2) RETURNING id',
      [fileName, extractedText.content]
    );
    const documentId = documentResult.rows[0].id;
    
    // Découper le texte en chunks
    const chunks = chunkText(extractedText.content);
    
    // Pour stocker les infos du fichier à retourner
    let fileDetails = {
      name: fileName,
      size: 0,
      type: ''
    };

    // Insérer les chunks dans la base de données
    for (let i = 0; i < chunks.length; i++) {
      // Insérer le chunk
      const chunkResult = await query(
        'INSERT INTO chunks (document_id, content, chunk_index) VALUES ($1, $2, $3) RETURNING id',
        [documentId, chunks[i], i]
      );
      
      const chunkId = chunkResult.rows[0].id;
      
      // Générer un embedding pour ce chunk via Ollama
      const embeddingResponse = await fetch(`${process.env.OLLAMA_API_HOST}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-r1:1.5b',
          prompt: chunks[i],
        }),
      });
      
      if (!embeddingResponse.ok) {
        throw new Error(`Erreur lors de la génération de l'embedding pour le chunk ${i}`);
      }
      
      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.embedding;
      
      // Vérifier la validité de l'embedding
      if (!isValidEmbedding(embedding)) {
        console.warn(`Embedding invalide pour le chunk ${i}`);
        continue;
      }
      
      // Insérer l'embedding dans la base de données
      await query(
        'INSERT INTO embeddings (chunk_id, embedding) VALUES ($1, $2)',
        [chunkId, formatEmbeddingForPgVector(embedding)]
      );
    }
    
    // Supprimer le fichier temporaire
    await unlink(filePath);
    
    return {
      success: true,
      documentId,
      chunkCount: chunks.length,
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
    
    // Traiter le fichier
    const fileInfo = await handleFormData(req);
    
    try {
      // Insérer le document et ses chunks dans la base de données
      const result = await processAndStoreDocument(fileInfo.filePath, fileInfo.filename);
      
      // Ajouter les infos du fichier au résultat
      result.fileInfo = {
        name: fileInfo.filename,
        size: fileInfo.size,
        type: fileInfo.type
      };
      
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
