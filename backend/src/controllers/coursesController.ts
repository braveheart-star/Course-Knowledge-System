import { Response } from "express";
import { db } from "../db";
import { courses, modules, lessons, enrollments } from "../db/schema";
import { eq, and, asc } from "drizzle-orm";
import { AuthRequest } from "../middleware/auth";
import { chunkLesson, chunkAllLessons, getLessonChunks } from "../services/lessonChunking";
import { embedLesson, reEmbedLesson, embedAllChunks, getEmbeddingStats } from "../services/lessonEmbedding";
import { searchCourseContent, getLessonContent as getLessonContentFromRAG } from "../services/rag";
import { withRetry } from "../db/retry";

export const getCourses = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const offset = (page - 1) * limit;

    const allCourses = await withRetry(() => db.select().from(courses));
    const total = allCourses.length;
    const paginatedCourses = allCourses.slice(offset, offset + limit);

    res.json({
      courses: paginatedCourses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getModules = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const courseModules = await withRetry(() =>
      db
        .select()
        .from(modules)
        .where(eq(modules.courseId, courseId))
        .orderBy(asc(modules.order))
    );
    res.json(courseModules);
  } catch (error) {
    console.error("Error fetching modules:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getLessons = async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId } = req.params;
    const moduleLessons = await withRetry(() =>
      db
        .select({
          id: lessons.id,
          moduleId: lessons.moduleId,
          title: lessons.title,
          order: lessons.order,
          createdAt: lessons.createdAt,
          updatedAt: lessons.updatedAt,
        })
        .from(lessons)
        .where(eq(lessons.moduleId, moduleId))
        .orderBy(lessons.order)
    );
    res.json(moduleLessons);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getLessonContent = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const enrollment = await withRetry(() =>
      db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, userId),
            eq(enrollments.courseId, courseId),
            eq(enrollments.status, "confirmed")
          )
        )
        .limit(1)
    );

    if (enrollment.length === 0) {
      return res.status(403).json({ error: "You are not enrolled in this course" });
    }

    const [lesson] = await withRetry(() =>
      db
        .select()
        .from(lessons)
        .where(eq(lessons.id, lessonId))
        .limit(1)
    );

    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    res.json(lesson);
  } catch (error) {
    console.error("Error fetching lesson content:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getEnrolledCourses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userEnrollments = await withRetry(() =>
      db
        .select({
          enrollment: enrollments,
          course: courses,
        })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(
          and(
            eq(enrollments.userId, userId),
            eq(enrollments.status, "confirmed")
          )
        )
    );

    res.json(userEnrollments.map(e => e.course));
  } catch (error) {
    console.error("Error fetching enrolled courses:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const chunkLessonById = async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const { lessonId } = req.params;
    const { chunkSize, chunkOverlap, minChunkSize, maxChunkSize } = req.body;

    const options: any = {};
    if (chunkSize) options.chunkSize = parseInt(chunkSize);
    if (chunkOverlap) options.chunkOverlap = parseInt(chunkOverlap);
    if (minChunkSize) options.minChunkSize = parseInt(minChunkSize);
    if (maxChunkSize) options.maxChunkSize = parseInt(maxChunkSize);

    const result = await chunkLesson(lessonId, options);

    res.json({
      message: "Lesson chunked successfully",
      ...result,
    });
  } catch (error: any) {
    console.error("Error chunking lesson:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const chunkAllLessonsHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const { chunkSize, chunkOverlap, minChunkSize, maxChunkSize, batchSize } = req.body;

    const options: any = {};
    if (chunkSize) options.chunkSize = parseInt(chunkSize);
    if (chunkOverlap) options.chunkOverlap = parseInt(chunkOverlap);
    if (minChunkSize) options.minChunkSize = parseInt(minChunkSize);
    if (maxChunkSize) options.maxChunkSize = parseInt(maxChunkSize);

    const batch = batchSize ? parseInt(batchSize) : 10;

    chunkAllLessons(options, batch)
      .then((summary) => {
        // Background processing
      })
      .catch((error) => {
        console.error("Error in background chunking:", error);
      });

    res.json({
      message: "Chunking process started. Check server logs for progress.",
      status: "processing",
    });
  } catch (error: any) {
    console.error("Error starting chunking process:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const getLessonChunksHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const { lessonId } = req.params;
    const chunks = await getLessonChunks(lessonId);

    res.json({
      lessonId,
      chunksCount: chunks.length,
      chunks: chunks.map(chunk => ({
        id: chunk.id,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        hasEmbedding: chunk.embedding !== null,
        createdAt: chunk.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching lesson chunks:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const embedLessonById = async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const { lessonId } = req.params;
    const { batchSize, reEmbed } = req.body;

    const batch = batchSize ? parseInt(batchSize) : 50;
    const shouldReEmbed = reEmbed === true || reEmbed === "true";

    let result;
    if (shouldReEmbed) {
      result = await reEmbedLesson(lessonId, batch);
    } else {
      result = await embedLesson(lessonId, batch);
    }

    res.json({
      message: "Embedding completed",
      ...result,
    });
  } catch (error: any) {
    console.error("Error embedding lesson:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const embedAllLessonsHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const { batchSize, lessonBatchSize } = req.body;

    const batch = batchSize ? parseInt(batchSize) : 50;
    const lessonBatch = lessonBatchSize ? parseInt(lessonBatchSize) : 10;

    embedAllChunks(batch, lessonBatch)
      .then((summary) => {
        // Background processing
      })
      .catch((error) => {
        console.error("Error in background embedding:", error);
      });

    res.json({
      message: "Embedding process started. Check server logs for progress.",
      status: "processing",
    });
  } catch (error: any) {
    console.error("Error starting embedding process:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const getEmbeddingStatsHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const { lessonId } = req.params;
    const stats = await getEmbeddingStats(lessonId);

    res.json({
      lessonId,
      ...stats,
    });
  } catch (error: any) {
    console.error("Error fetching embedding stats:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const searchCourses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { query, limit, similarityThreshold, courseId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: "Query is required" });
    }

    const results = await searchCourseContent(query, userId, {
      limit: limit || 10,
      similarityThreshold: similarityThreshold || 0.7,
      courseId: courseId || undefined,
    });

    res.json({ results });
  } catch (error: any) {
    console.error("Error searching course content:", error);
    if (error.message.includes('not enrolled')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getLessonContentById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { lessonId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const content = await getLessonContentFromRAG(lessonId, userId);

    if (!content) {
      return res.status(403).json({ error: "You are not enrolled in this course or lesson not found" });
    }

    res.json(content);
  } catch (error) {
    console.error("Error fetching lesson content:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

