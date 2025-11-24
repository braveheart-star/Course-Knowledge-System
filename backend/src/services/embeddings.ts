/**
 * Embedding Service
 * 
 * Generates vector embeddings for text using Supabase Edge Functions.
 */

import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'gte-small';
const EMBEDDING_DIMENSIONS = 384;

let lastRequestTime = Date.now() - 1000;

/**
 * Validates Supabase configuration
 */
function validateSupabaseConfig(): void {
  if (!SUPABASE_URL) {
    throw new Error('SUPABASE_URL is not set in environment variables');
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY is not set in environment variables');
  }
}

async function ensureRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const minDelay = 100;
  
  if (timeSinceLastRequest < minDelay) {
    const waitTime = minDelay - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
}

/**
 * Calls Supabase Edge Function for embeddings
 */
async function callSupabaseEmbedding(text: string): Promise<number[]> {
  validateSupabaseConfig();

  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/embed`;
  
  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ input: text }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase embedding failed: ${error}`);
    }

    const result: any = await response.json();
    
    if (result.embedding && Array.isArray(result.embedding)) {
      return result.embedding;
    } else if (Array.isArray(result)) {
      return result;
    } else {
      throw new Error('Unexpected response format from Supabase embedding function');
    }
  } catch (error: any) {
    throw new Error(`Failed to generate embedding via Supabase: ${error.message}`);
  }
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(
  text: string,
  model: string = EMBEDDING_MODEL
): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  await ensureRateLimit();

  try {
    const embedding = await callSupabaseEmbedding(text.trim());

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding format received from Supabase');
    }

    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Invalid embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`);
    }

    return embedding;
  } catch (error: any) {
    if (error.message?.includes('not set')) {
      throw error;
    }
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(
  texts: string[],
  model: string = EMBEDDING_MODEL,
  batchSize: number = 10
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  validateSupabaseConfig();
  const allEmbeddings: number[][] = [];
  let retryCount = 0;
  const maxRetries = 3;
  const delayBetweenRequests = 200;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    await ensureRateLimit();
    
    try {
      const batchPromises = batch.map(text => callSupabaseEmbedding(text.trim()));
      const batchEmbeddings = await Promise.all(batchPromises);

      allEmbeddings.push(...batchEmbeddings);
      retryCount = 0;

      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      }
    } catch (error: any) {
      if (batch.length > 1) {
        for (const text of batch) {
          try {
            await ensureRateLimit();
            const embedding = await callSupabaseEmbedding(text.trim());
            allEmbeddings.push(embedding);
          } catch (individualError: any) {
            retryCount++;
            if (retryCount > maxRetries) {
              throw new Error(`Failed to generate embedding after ${maxRetries} retries: ${individualError.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
        continue;
      }

      retryCount++;
      if (retryCount > maxRetries) {
        throw new Error(`Failed to generate embedding after ${maxRetries} retries: ${error.message}`);
      }
      
      const waitTime = 1000 * retryCount;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      i -= batchSize;
      continue;
    }
  }

  return allEmbeddings;
}

/**
 * Validate that an embedding has the correct dimensions
 */
export function validateEmbedding(embedding: number[]): boolean {
  return Array.isArray(embedding) && 
         embedding.length === EMBEDDING_DIMENSIONS &&
         embedding.every(val => typeof val === 'number' && !isNaN(val));
}

/**
 * Get embedding dimensions
 */
export function getEmbeddingDimensions(): number {
  return EMBEDDING_DIMENSIONS;
}

/**
 * Get default embedding model
 */
export function getDefaultModel(): string {
  return EMBEDDING_MODEL;
}

