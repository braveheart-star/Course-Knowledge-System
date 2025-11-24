/**
 * Chunking Service
 * 
 * Intelligently splits lesson content into chunks for embedding.
 * Uses sentence and paragraph boundaries to preserve context.
 */

export interface Chunk {
  content: string;
  chunkIndex: number;
  startChar: number;
  endChar: number;
}

export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  minChunkSize?: number;
  maxChunkSize?: number;
}

const DEFAULT_OPTIONS: Required<ChunkingOptions> = {
  chunkSize: 250,
  chunkOverlap: 50,
  minChunkSize: 50,
  maxChunkSize: 400,
};

/**
 * Splits text into chunks using intelligent boundaries
 */
export function chunkText(
  text: string,
  options: ChunkingOptions = {}
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: Chunk[] = [];

  if (!text || text.trim().length === 0) {
    return chunks;
  }

  const normalizedText = text.replace(/\s+/g, ' ').trim();

  if (normalizedText.length <= opts.minChunkSize) {
    return [{
      content: normalizedText,
      chunkIndex: 0,
      startChar: 0,
      endChar: normalizedText.length,
    }];
  }

  const sentenceMatches = Array.from(normalizedText.matchAll(/(.+?)([.!?])(?:\s+|$)/g));
  const sentencePositions: Array<{ start: number; end: number; text: string }> = [];
  
  for (const match of sentenceMatches) {
    const fullMatch = match[0];
    const start = match.index!;
    const end = start + fullMatch.length;
    const sentence = fullMatch.trim();
    sentencePositions.push({ start, end, text: sentence });
  }
  
  if (sentencePositions.length === 0) {
    sentencePositions.push({ start: 0, end: normalizedText.length, text: normalizedText });
  }

  let currentChunk = '';
  let currentStart = 0;
  let chunkIndex = 0;
  let sentencesInChunk: Array<{ start: number; end: number; text: string }> = [];

  for (let i = 0; i < sentencePositions.length; i++) {
    const sentenceInfo = sentencePositions[i];
    const sentence = sentenceInfo.text;
    const sentenceLength = sentence.length;
    const needsSpace = currentChunk.length > 0;
    const sentenceWithSpace = needsSpace ? ' ' + sentence : sentence;
    const newChunkLength = currentChunk.length + sentenceWithSpace.length;

    if (newChunkLength > opts.maxChunkSize && currentChunk.length > 0) {
      if (currentChunk.length < opts.minChunkSize) {
        currentChunk += sentenceWithSpace;
        sentencesInChunk.push(sentenceInfo);
        continue;
      }

      chunks.push({
        content: currentChunk.trim(),
        chunkIndex: chunkIndex++,
        startChar: currentStart,
        endChar: sentencesInChunk[sentencesInChunk.length - 1].end,
      });

      const overlapSentences = getLastSentencesForOverlap(sentencesInChunk, opts.chunkOverlap);
      if (overlapSentences.length > 0) {
        const overlapStart = overlapSentences[0].start;
        const overlapText = overlapSentences.map(s => s.text).join(' ');
        currentStart = overlapStart;
        sentencesInChunk = [...overlapSentences, sentenceInfo];
        currentChunk = overlapText + ' ' + sentence;
      } else {
        currentStart = sentenceInfo.start;
        currentChunk = sentence;
        sentencesInChunk = [sentenceInfo];
      }
    }
    else if (sentenceLength > opts.maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          chunkIndex: chunkIndex++,
          startChar: currentStart,
          endChar: sentencesInChunk[sentencesInChunk.length - 1].end,
        });
      }

      chunks.push({
        content: sentence.trim(),
        chunkIndex: chunkIndex++,
        startChar: sentenceInfo.start,
        endChar: sentenceInfo.end,
      });
      currentChunk = '';
      sentencesInChunk = [];
    }
    else if (newChunkLength > opts.chunkSize && currentChunk.length >= opts.minChunkSize) {
      chunks.push({
        content: currentChunk.trim(),
        chunkIndex: chunkIndex++,
        startChar: currentStart,
        endChar: sentencesInChunk[sentencesInChunk.length - 1].end,
      });

      const overlapSentences = getLastSentencesForOverlap(sentencesInChunk, opts.chunkOverlap);
      if (overlapSentences.length > 0) {
        const overlapStart = overlapSentences[0].start;
        const overlapText = overlapSentences.map(s => s.text).join(' ');
        currentStart = overlapStart;
        sentencesInChunk = [...overlapSentences, sentenceInfo];
        currentChunk = overlapText + ' ' + sentence;
      } else {
        currentStart = sentenceInfo.start;
        currentChunk = sentence;
        sentencesInChunk = [sentenceInfo];
      }
    }
    else {
      if (currentChunk.length === 0) {
        currentStart = sentenceInfo.start;
      }
      currentChunk += sentenceWithSpace;
      sentencesInChunk.push(sentenceInfo);
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      chunkIndex: chunkIndex,
      startChar: currentStart,
      endChar: sentencesInChunk.length > 0 ? sentencesInChunk[sentencesInChunk.length - 1].end : normalizedText.length,
    });
  }

  if (chunks.length > 1) {
    return chunks.filter(chunk => chunk.content.length >= opts.minChunkSize);
  }

  return chunks;
}

/**
 * Splits text into sentences, preserving sentence boundaries
 */
function splitIntoSentences(text: string): string[] {
  // Split by sentence endings (. ! ?) followed by space or end of string
  // Use positive lookbehind to include the punctuation
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  
  // If no sentence boundaries found, return the whole text as one sentence
  if (sentences.length === 0) {
    return [text];
  }
  
  return sentences;
}


/**
 * Gets the last 1-2 sentences from a chunk for overlap
 */
function getLastSentencesForOverlap(
  sentences: Array<{ start: number; end: number; text: string }>,
  overlapSize: number
): Array<{ start: number; end: number; text: string }> {
  if (sentences.length === 0) {
    return [];
  }

  const result: Array<{ start: number; end: number; text: string }> = [];
  let totalLength = 0;

  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentence = sentences[i];
    const sentenceWithSpace = result.length > 0 ? ' ' + sentence.text : sentence.text;
    
    if (totalLength + sentenceWithSpace.length <= overlapSize && result.length < 2) {
      result.unshift(sentence);
      totalLength += sentenceWithSpace.length;
    } else {
      break;
    }
  }

  if (result.length === 0 && sentences.length > 0) {
    return [sentences[sentences.length - 1]];
  }

  return result;
}

export function validateChunkingOptions(options: ChunkingOptions): ChunkingOptions {
  const validated = { ...options };

  if (validated.chunkSize !== undefined) {
      if (validated.chunkSize < 100) {
        validated.chunkSize = 100;
      }
      if (validated.chunkSize > 2000) {
        validated.chunkSize = 2000;
      }
  }

  if (validated.chunkOverlap !== undefined) {
    if (validated.chunkOverlap < 0) {
      validated.chunkOverlap = 0;
    }
        if (validated.chunkOverlap > (validated.chunkSize || DEFAULT_OPTIONS.chunkSize) * 0.5) {
          validated.chunkOverlap = Math.floor((validated.chunkSize || DEFAULT_OPTIONS.chunkSize) * 0.5);
        }
  }

  if (validated.minChunkSize !== undefined && validated.minChunkSize < 50) {
    validated.minChunkSize = 50;
  }

  if (validated.maxChunkSize !== undefined) {
    if (validated.maxChunkSize < (validated.chunkSize || DEFAULT_OPTIONS.chunkSize)) {
      validated.maxChunkSize = (validated.chunkSize || DEFAULT_OPTIONS.chunkSize) * 1.5;
    }
  }

  return validated;
}

