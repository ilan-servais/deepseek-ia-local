import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import pdfParse from 'pdf-parse';

const readFile = promisify(fs.readFile);

export interface ExtractedText {
  content: string;
  metadata?: {
    title?: string;
    author?: string;
    date?: string;
    pageCount?: number;
  };
}

export async function extractTextFromFile(filePath: string): Promise<ExtractedText> {
  // Déterminer l'extension du fichier
  const fileExt = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);
  
  console.log(`Extraction du texte depuis ${fileName} (extension: ${fileExt})`);
  
  let content = '';
  let metadata = {};
  
  if (fileExt === '.pdf') {
    // Extraction du texte PDF
    const dataBuffer = await readFile(filePath);
    const data = await pdfParse(dataBuffer);
    content = data.text;
    
    // Extraire des métadonnées du PDF
    metadata = {
      title: data.info?.Title || path.basename(filePath, '.pdf'),
      author: data.info?.Author || 'Inconnu',
      date: data.info?.CreationDate ? new Date(data.info.CreationDate).toISOString().split('T')[0] : null,
      pageCount: data.numpages || 0
    };
    
    console.log(`PDF extrait avec succès: ${content.length} caractères, ${data.numpages} pages`);
  } else if (fileExt === '.txt' || fileExt === '.md') {
    // Extraction du texte brut ou markdown
    const data = await readFile(filePath, 'utf8');
    content = data;
    
    // Pour les fichiers .md, essayer d'extraire le titre à partir de l'en-tête
    if (fileExt === '.md') {
      const titleMatch = content.match(/^#\s+(.+)$/m);
      if (titleMatch && titleMatch[1]) {
        metadata = {
          ...metadata,
          title: titleMatch[1].trim()
        };
      }
    }
    
    console.log(`Fichier texte/markdown extrait avec succès: ${content.length} caractères`);
  } else {
    throw new Error(`Format de fichier non pris en charge: ${fileExt}`);
  }
  
  return {
    content,
    metadata
  };
}

/**
 * Découpe le texte en chunks sémantiques et cohérents
 * @param text Texte à découper
 * @param options Options de découpage
 * @returns Liste des chunks
 */
export function chunkTextSemantic(
  text: string,
  options: {
    minSize?: number;
    targetSize?: number;
    maxSize?: number;
    overlapSize?: number;
  } = {}
): string[] {
  const {
    minSize = 100,
    targetSize = 500,
    maxSize = 1000,
    overlapSize = 50
  } = options;
  
  // Nettoyer le texte
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
  
  // 1. Découper par sections (titres, sous-titres)
  const sectionPattern = /(?:^|\n)(#{1,3} .+?)(?:\n|$)/g;
  const sections: { heading: string, text: string }[] = [];
  let lastIndex = 0;
  let match;
  
  // Extraire les sections avec leurs entêtes
  while ((match = sectionPattern.exec(cleanedText)) !== null) {
    const heading = match[1];
    const startIdx = match.index;
    
    if (startIdx > lastIndex) {
      // Ajouter le texte précédent comme une section sans titre
      sections.push({
        heading: '',
        text: cleanedText.substring(lastIndex, startIdx)
      });
    }
    
    // Trouver la fin de la section (prochain titre ou fin de texte)
    const nextMatch = sectionPattern.exec(cleanedText);
    sectionPattern.lastIndex = match.index + match[0].length; // Reset pour revenir au bon endroit
    
    const endIdx = nextMatch ? nextMatch.index : cleanedText.length;
    
    sections.push({
      heading,
      text: cleanedText.substring(startIdx, endIdx)
    });
    
    lastIndex = endIdx;
  }
  
  // Ajouter le reste du texte s'il y en a
  if (lastIndex < cleanedText.length) {
    sections.push({
      heading: '',
      text: cleanedText.substring(lastIndex)
    });
  }
  
  // 2. Pour chaque section, découper en paragraphes
  const chunks: string[] = [];
  
  for (const section of sections) {
    // Sauter les sections vides
    if (!section.text.trim()) continue;
    
    // Découper en paragraphes
    const paragraphs = section.text.split(/\n{2,}/);
    let currentChunk = section.heading ? section.heading + '\n\n' : '';
    
    for (const paragraph of paragraphs) {
      const trimmedPara = paragraph.trim();
      if (!trimmedPara) continue;
      
      const paraWithNewline = currentChunk.length > 0 ? '\n\n' + trimmedPara : trimmedPara;
      
      // Si ajouter ce paragraphe dépasse la taille maximale, on sauvegarde le chunk actuel
      if (currentChunk.length > 0 && 
          (currentChunk.length + paraWithNewline.length) > maxSize && 
          currentChunk.length >= minSize) {
        
        chunks.push(currentChunk);
        
        // Commencer un nouveau chunk, potentiellement avec un chevauchement
        if (section.heading) {
          currentChunk = section.heading + '\n\n' + trimmedPara;
        } else {
          currentChunk = trimmedPara;
        }
      } else {
        // Ajouter le paragraphe au chunk actuel
        currentChunk += paraWithNewline;
      }
    }
    
    // Si après avoir traité tous les paragraphes il reste du contenu, l'ajouter comme chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk);
    }
  }
  
  // 3. Fusion des chunks trop petits
  const mergedChunks: string[] = [];
  let accumulatedChunk = '';
  
  for (const chunk of chunks) {
    if (chunk.length < minSize && mergedChunks.length > 0) {
      // Si le chunk est trop petit, essayer de le fusionner avec le précédent
      const lastChunk = mergedChunks[mergedChunks.length - 1];
      if (lastChunk.length + chunk.length <= maxSize) {
        mergedChunks[mergedChunks.length - 1] = lastChunk + '\n\n' + chunk;
      } else {
        mergedChunks.push(chunk);
      }
    } else if (accumulatedChunk.length + chunk.length <= targetSize) {
      // Accumuler dans le chunk courant
      accumulatedChunk += (accumulatedChunk.length > 0 ? '\n\n' : '') + chunk;
    } else {
      // Ajouter le chunk accumulé s'il existe
      if (accumulatedChunk.length > 0) {
        mergedChunks.push(accumulatedChunk);
      }
      // Commencer une nouvelle accumulation
      accumulatedChunk = chunk;
    }
  }
  
  // Ajouter le dernier chunk accumulé
  if (accumulatedChunk.length > 0) {
    mergedChunks.push(accumulatedChunk);
  }
  
  console.log(`Texte découpé en ${mergedChunks.length} chunks sémantiques (min: ${minSize}, target: ${targetSize}, max: ${maxSize})`);
  return mergedChunks;
}

// Alias pour rétrocompatibilité
export function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  console.log("Utilisation de la nouvelle méthode de découpage sémantique");
  return chunkTextSemantic(text, {
    minSize: Math.floor(maxChunkSize * 0.3),
    targetSize: maxChunkSize * 0.7,
    maxSize: maxChunkSize
  });
}
