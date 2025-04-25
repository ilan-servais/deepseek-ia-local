import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import pdfParse from 'pdf-parse';

const readFile = promisify(fs.readFile);

export interface ExtractedText {
  content: string;
  metadata: {
    filename: string;
    fileType: string;
    extractionDate: Date;
  };
}

export async function extractTextFromFile(filePath: string): Promise<ExtractedText> {
  // Déterminer l'extension du fichier
  const fileExt = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);
  
  console.log(`Extraction du texte depuis ${fileName} (extension: ${fileExt})`);
  
  let content = '';
  
  if (fileExt === '.pdf') {
    // Extraction du texte PDF
    const dataBuffer = await readFile(filePath);
    const data = await pdfParse(dataBuffer);
    content = data.text;
    console.log(`PDF extrait avec succès: ${content.length} caractères`);
  } else if (fileExt === '.txt' || fileExt === '.md') {
    // Extraction du texte brut ou markdown
    const data = await readFile(filePath, 'utf8');
    content = data;
    console.log(`Fichier texte/markdown extrait avec succès: ${content.length} caractères`);
  } else {
    throw new Error(`Format de fichier non pris en charge: ${fileExt}`);
  }
  
  return {
    content,
    metadata: {
      filename: fileName,
      fileType: fileExt.replace('.', ''),
      extractionDate: new Date()
    }
  };
}

export function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  // Diviser le texte en paragraphes
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // Si le paragraphe lui-même est plus grand que maxChunkSize,
    // le diviser en phrases
    if (paragraph.length > maxChunkSize) {
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length + 1 > maxChunkSize) {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          currentChunk = currentChunk 
            ? `${currentChunk} ${sentence}`
            : sentence;
        }
      }
    } else if (currentChunk.length + paragraph.length + 2 > maxChunkSize) {
      // Si l'ajout du paragraphe dépasse la taille maximale,
      // sauvegarder le chunk actuel et commencer un nouveau
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      // Sinon, ajouter le paragraphe au chunk actuel
      currentChunk = currentChunk 
        ? `${currentChunk}\n\n${paragraph}`
        : paragraph;
    }
  }
  
  // Ajouter le dernier chunk s'il existe
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}
