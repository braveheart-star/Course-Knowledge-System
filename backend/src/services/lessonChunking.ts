/**
 * Lesson Chunking Service
 * 
 * Handles chunking of lesson content and storing chunks in the database.
 */

import { db } from '../db';
import { lessons, lessonChunks } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { chunkText, ChunkingOptions, validateChunkingOptions } from './chunking';

export interface ChunkLessonResult {
  lessonId: string;
  chunksCreated: number;
  chunksDeleted: number;
}

/**
 * Chunks a lesson's content and stores the chunks in the database.
 */
export async function chunkLesson(
  lessonId: string,
  options: ChunkingOptions = {}
): Promise<ChunkLessonResult> {
  const validatedOptions = validateChunkingOptions(options);

  const [lesson] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!lesson) {
    throw new Error(`Lesson with ID ${lessonId} not found`);
  }

  if (!lesson.content || lesson.content.trim().length === 0) {
    throw new Error(`Lesson ${lessonId} has no content to chunk`);
  }

  const existingChunks = await db
    .select()
    .from(lessonChunks)
    .where(eq(lessonChunks.lessonId, lessonId));

  const chunksDeleted = existingChunks.length;

  if (chunksDeleted > 0) {
    await db
      .delete(lessonChunks)
      .where(eq(lessonChunks.lessonId, lessonId));
  }

  // Chunk the content
  const chunks = chunkText(lesson.content, validatedOptions);

  if (chunks.length === 0) {
    return {
      lessonId,
      chunksCreated: 0,
      chunksDeleted,
    };
  }

  const chunksToInsert = chunks.map(chunk => ({
    lessonId: lesson.id,
    content: chunk.content,
    chunkIndex: chunk.chunkIndex,
    embedding: null,
  }));

  await db.insert(lessonChunks).values(chunksToInsert);

  return {
    lessonId,
    chunksCreated: chunks.length,
    chunksDeleted,
  };
}

/**
 * Chunks multiple lessons in batch
 */
export async function chunkLessons(
  lessonIds: string[],
  options: ChunkingOptions = {}
): Promise<ChunkLessonResult[]> {
  const results: ChunkLessonResult[] = [];

  for (const lessonId of lessonIds) {
    try {
      const result = await chunkLesson(lessonId, options);
      results.push(result);
    } catch (error: any) {
      console.error(`Error chunking lesson ${lessonId}:`, error.message);
      results.push({
        lessonId,
        chunksCreated: 0,
        chunksDeleted: 0,
      });
    }
  }

  return results;
}

/**
 * Chunks all lessons in the database
 */
export async function chunkAllLessons(
  options: ChunkingOptions = {},
  batchSize: number = 10
): Promise<{
  totalLessons: number;
  successful: number;
  failed: number;
  totalChunksCreated: number;
  results: ChunkLessonResult[];
}> {
  const allLessons = await db.select().from(lessons);

  const totalLessons = allLessons.length;
  let successful = 0;
  let failed = 0;
  let totalChunksCreated = 0;
  const results: ChunkLessonResult[] = [];

  for (let i = 0; i < allLessons.length; i += batchSize) {
    const batch = allLessons.slice(i, i + batchSize);
    const lessonIds = batch.map(lesson => lesson.id);

    const batchResults = await chunkLessons(lessonIds, options);

    for (const result of batchResults) {
      results.push(result);
      if (result.chunksCreated > 0) {
        successful++;
        totalChunksCreated += result.chunksCreated;
      } else if (result.chunksDeleted > 0) {
        successful++;
      } else {
        failed++;
      }
    }
  }

  return {
    totalLessons,
    successful,
    failed,
    totalChunksCreated,
    results,
  };
}

/**
 * Gets chunks for a specific lesson
 */
export async function getLessonChunks(lessonId: string) {
  return await db
    .select()
    .from(lessonChunks)
    .where(eq(lessonChunks.lessonId, lessonId))
    .orderBy(asc(lessonChunks.chunkIndex));
}

/**
 * Checks if a lesson has been chunked
 */
export async function isLessonChunked(lessonId: string): Promise<boolean> {
  const chunks = await db
    .select()
    .from(lessonChunks)
    .where(eq(lessonChunks.lessonId, lessonId))
    .limit(1);

  return chunks.length > 0;
}

