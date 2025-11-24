/**
 * RAG (Retrieval-Augmented Generation) Service
 * 
 * Performs semantic similarity search on course content using vector embeddings.
 * Only searches within courses the user is enrolled in.
 */

import { db } from '../db';
import { lessonChunks, lessons, modules, courses, enrollments } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { generateEmbedding } from './embeddings';
import sqlRaw from '../db/db';

export interface SearchResult {
  chunk: {
    id: string;
    content: string;
    chunkIndex: number;
  };
  lesson: {
    id: string;
    title: string;
  };
  module: {
    id: string;
    title: string;
  };
  course: {
    id: string;
    title: string;
  };
  similarity: number;
}

export interface SearchOptions {
  limit?: number;
  similarityThreshold?: number;
  courseId?: string;
}

/**
 * Searches course content by semantic similarity
 * Only searches within courses the user is enrolled in
 */
export async function searchCourseContent(
  query: string,
  userId: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) {
    throw new Error('Query cannot be empty');
  }

  const limit = options.limit || 10;
  const similarityThreshold = options.similarityThreshold || 0.7;

  const queryEmbedding = await generateEmbedding(query.trim());

  const enrolledCourses = await db
    .select({ courseId: enrollments.courseId })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, userId),
        eq(enrollments.status, 'confirmed')
      )
    );

  if (enrolledCourses.length === 0) {
    return [];
  }

  const enrolledCourseIds = enrolledCourses.map(e => e.courseId);
  
  let courseFilter = enrolledCourseIds;
  if (options.courseId) {
    if (!enrolledCourseIds.includes(options.courseId)) {
      throw new Error('You are not enrolled in this course');
    }
    courseFilter = [options.courseId];
  }

  const vectorString = `[${queryEmbedding.join(',')}]`;
  
  const results = await sqlRaw`
    SELECT 
      lc.id as chunk_id,
      lc.content as chunk_content,
      lc.chunk_index,
      l.id as lesson_id,
      l.title as lesson_title,
      m.id as module_id,
      m.title as module_title,
      c.id as course_id,
      c.title as course_title,
      1 - (lc.embedding <=> ${vectorString}::vector) as similarity
    FROM "LessonChunks" lc
    INNER JOIN "Lessons" l ON lc.lesson_id = l.id
    INNER JOIN "Modules" m ON l.module_id = m.id
    INNER JOIN "Courses" c ON m.course_id = c.id
    WHERE 
      lc.embedding IS NOT NULL
      AND c.id = ANY(${courseFilter}::uuid[])
      AND (1 - (lc.embedding <=> ${vectorString}::vector)) >= ${similarityThreshold}
    ORDER BY lc.embedding <=> ${vectorString}::vector
    LIMIT ${limit}
  `;

  return results.map((row: any) => ({
    chunk: {
      id: row.chunk_id,
      content: row.chunk_content,
      chunkIndex: row.chunk_index,
    },
    lesson: {
      id: row.lesson_id,
      title: row.lesson_title,
    },
    module: {
      id: row.module_id,
      title: row.module_title,
    },
    course: {
      id: row.course_id,
      title: row.course_title,
    },
    similarity: parseFloat(row.similarity),
  }));
}

/**
 * Gets full lesson content for a specific lesson
 * Verifies user is enrolled in the course
 */
export async function getLessonContent(
  lessonId: string,
  userId: string
): Promise<{
  lesson: {
    id: string;
    title: string;
    content: string;
    order: number;
  };
  module: {
    id: string;
    title: string;
    order: number;
  };
  course: {
    id: string;
    title: string;
  };
} | null> {
  const enrollmentCheck = await db
    .select()
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .innerJoin(enrollments, and(
      eq(enrollments.courseId, courses.id),
      eq(enrollments.userId, userId),
      eq(enrollments.status, 'confirmed')
    ))
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (enrollmentCheck.length === 0) {
    return null;
  }

  const [result] = enrollmentCheck;

  return {
    lesson: {
      id: result.Lessons.id,
      title: result.Lessons.title,
      content: result.Lessons.content,
      order: result.Lessons.order,
    },
    module: {
      id: result.Modules.id,
      title: result.Modules.title,
      order: result.Modules.order,
    },
    course: {
      id: result.Courses.id,
      title: result.Courses.title,
    },
  };
}

