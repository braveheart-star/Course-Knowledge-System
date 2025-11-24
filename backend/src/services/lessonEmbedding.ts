/**
 * Lesson Embedding Service
 * 
 * Handles embedding generation for lesson chunks and storing them in the database.
 */

import { db } from '../db';
import { lessonChunks, lessons } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { generateEmbedding, generateEmbeddings } from './embeddings';
import sql from '../db/db';

export interface EmbedLessonResult {
  lessonId: string;
  chunksEmbedded: number;
  chunksSkipped: number;
  chunksFailed: number;
}

/**
 * Embeds a single chunk and updates it in the database
 */
export async function embedChunk(chunkId: string): Promise<boolean> {
  try {
    // Fetch the chunk
    const [chunk] = await db
      .select()
      .from(lessonChunks)
      .where(eq(lessonChunks.id, chunkId))
      .limit(1);

    if (!chunk) {
      throw new Error(`Chunk with ID ${chunkId} not found`);
    }

    // Skip if already embedded
    if (chunk.embedding !== null) {
      return true;
    }

    const embedding = await generateEmbedding(chunk.content);
    const vectorString = `[${embedding.join(',')}]`;
    await sql`
      UPDATE "LessonChunks"
      SET embedding = ${vectorString}::vector
      WHERE id = ${chunkId}
    `;

    return true;
  } catch (error: any) {
    console.error(`Error embedding chunk ${chunkId}:`, error.message);
    return false;
  }
}

/**
 * Embeds all chunks for a specific lesson
 */
export async function embedLesson(
  lessonId: string,
  batchSize: number = 1
): Promise<EmbedLessonResult> {
  const [lesson] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!lesson) {
    throw new Error(`Lesson with ID ${lessonId} not found`);
  }

  const chunksToEmbed = await db
    .select()
    .from(lessonChunks)
    .where(
      and(
        eq(lessonChunks.lessonId, lessonId),
        isNull(lessonChunks.embedding)
      )
    );

  if (chunksToEmbed.length === 0) {
    return {
      lessonId,
      chunksEmbedded: 0,
      chunksSkipped: 0,
      chunksFailed: 0,
    };
  }

  let chunksEmbedded = 0;
  let chunksFailed = 0;

  for (let i = 0; i < chunksToEmbed.length; i += batchSize) {
    const batch = chunksToEmbed.slice(i, i + batchSize);
    
    try {
      const texts = batch.map(chunk => chunk.content);
      const embeddings = await generateEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        try {
          const vectorString = `[${embeddings[j].join(',')}]`;
          await sql`
            UPDATE "LessonChunks"
            SET embedding = ${vectorString}::vector
            WHERE id = ${batch[j].id}
          `;
          chunksEmbedded++;
        } catch (error: any) {
          console.error(`Error updating chunk ${batch[j].id}:`, error.message);
          chunksFailed++;
        }
      }

    } catch (error: any) {
      console.error(`Error embedding batch for lesson ${lessonId}:`, error.message);
      chunksFailed += batch.length;
    }
  }

  return {
    lessonId,
    chunksEmbedded,
    chunksSkipped: 0,
    chunksFailed,
  };
}

/**
 * Re-embeds all chunks for a lesson
 */
export async function reEmbedLesson(
  lessonId: string,
  batchSize: number = 1
): Promise<EmbedLessonResult> {
  const allChunks = await db
    .select()
    .from(lessonChunks)
    .where(eq(lessonChunks.lessonId, lessonId));

  if (allChunks.length === 0) {
    return {
      lessonId,
      chunksEmbedded: 0,
      chunksSkipped: 0,
      chunksFailed: 0,
    };
  }

  let chunksEmbedded = 0;
  let chunksFailed = 0;

  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    
    try {
      const texts = batch.map(chunk => chunk.content);
      const embeddings = await generateEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        try {
          const vectorString = `[${embeddings[j].join(',')}]`;
          await sql`
            UPDATE "LessonChunks"
            SET embedding = ${vectorString}::vector
            WHERE id = ${batch[j].id}
          `;
          chunksEmbedded++;
        } catch (error: any) {
          console.error(`Error updating chunk ${batch[j].id}:`, error.message);
          chunksFailed++;
        }
      }

    } catch (error: any) {
      console.error(`Error re-embedding batch for lesson ${lessonId}:`, error.message);
      chunksFailed += batch.length;
    }
  }

  return {
    lessonId,
    chunksEmbedded,
    chunksSkipped: 0,
    chunksFailed,
  };
}

/**
 * Embeds all chunks that don't have embeddings yet
 */
export async function embedAllChunks(
  batchSize: number = 1,
  lessonBatchSize: number = 10
): Promise<{
  totalChunks: number;
  chunksEmbedded: number;
  chunksFailed: number;
  lessonsProcessed: number;
}> {
  const chunksToEmbed = await db
    .select()
    .from(lessonChunks)
    .where(isNull(lessonChunks.embedding));

  const totalChunks = chunksToEmbed.length;

  if (totalChunks === 0) {
    return {
      totalChunks: 0,
      chunksEmbedded: 0,
      chunksFailed: 0,
      lessonsProcessed: 0,
    };
  }

  const chunksByLesson = new Map<string, typeof chunksToEmbed>();
  for (const chunk of chunksToEmbed) {
    if (!chunksByLesson.has(chunk.lessonId)) {
      chunksByLesson.set(chunk.lessonId, []);
    }
    chunksByLesson.get(chunk.lessonId)!.push(chunk);
  }

  let chunksEmbedded = 0;
  let chunksFailed = 0;
  let lessonsProcessed = 0;

  for (const [lessonId, chunks] of chunksByLesson.entries()) {
    try {
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        try {
          const texts = batch.map(chunk => chunk.content);
          const embeddings = await generateEmbeddings(texts);

          for (let j = 0; j < batch.length; j++) {
            try {
              const vectorString = `[${embeddings[j].join(',')}]`;
              await sql`
                UPDATE "LessonChunks"
                SET embedding = ${vectorString}::vector
                WHERE id = ${batch[j].id}
              `;
              chunksEmbedded++;
            } catch (error: any) {
              console.error(`Error updating chunk ${batch[j].id}:`, error.message);
              chunksFailed++;
            }
          }
        } catch (error: any) {
          console.error(`Error embedding batch for lesson ${lessonId}:`, error.message);
          chunksFailed += batch.length;
        }
      }

      lessonsProcessed++;
    } catch (error: any) {
      console.error(`Error processing lesson ${lessonId}:`, error.message);
      chunksFailed += chunks.length;
    }
  }

  return {
    totalChunks,
    chunksEmbedded,
    chunksFailed,
    lessonsProcessed,
  };
}

/**
 * Gets statistics about embeddings for a lesson
 */
export async function getEmbeddingStats(lessonId: string): Promise<{
  totalChunks: number;
  embeddedChunks: number;
  unembeddedChunks: number;
  percentageComplete: number;
}> {
  const allChunks = await db
    .select()
    .from(lessonChunks)
    .where(eq(lessonChunks.lessonId, lessonId));

  const totalChunks = allChunks.length;
  const embeddedChunks = allChunks.filter(chunk => chunk.embedding !== null).length;
  const unembeddedChunks = totalChunks - embeddedChunks;
  const percentageComplete = totalChunks > 0 ? Math.round((embeddedChunks / totalChunks) * 100) : 0;

  return {
    totalChunks,
    embeddedChunks,
    unembeddedChunks,
    percentageComplete,
  };
}

