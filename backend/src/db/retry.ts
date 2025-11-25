/**
 * Retry utility for database operations
 * Handles connection resets and transient errors
 */

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      const isConnectionError = 
        error.code === 'ECONNRESET' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('connection') ||
        error.message?.includes('ECONNRESET');

      if (isConnectionError && attempt < maxRetries) {
        const waitTime = delayMs * attempt;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

