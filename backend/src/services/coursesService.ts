import { db } from "../db";
import { courses, modules, lessons, enrollments } from "../db/schema";
import { eq, and, asc } from "drizzle-orm";
import { chunkLesson, chunkAllLessons, getLessonChunks } from "./lessonChunking";
import { embedLesson, reEmbedLesson, embedAllChunks, getEmbeddingStats } from "./lessonEmbedding";
import { searchCourseContent, getLessonContent } from "./rag";

export class CoursesService {
  async getAllCourses(page: number = 1, limit: number = 5) {
    const offset = (page - 1) * limit;

    const allCourses = await db.select().from(courses);
    const total = allCourses.length;
    const paginatedCourses = allCourses.slice(offset, offset + limit);

    return {
      courses: paginatedCourses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCourseModules(courseId: string) {
    const courseModules = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, courseId))
      .orderBy(asc(modules.order));
    
    return courseModules;
  }

  async getModuleLessons(moduleId: string) {
    const moduleLessons = await db
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
      .orderBy(lessons.order);
    
    return moduleLessons;
  }

  async getLessonContent(courseId: string, lessonId: string, userId: string) {
    const enrollment = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, userId),
          eq(enrollments.courseId, courseId),
          eq(enrollments.status, "confirmed")
        )
      )
      .limit(1);

    if (enrollment.length === 0) {
      throw new Error("You are not enrolled in this course");
    }

    const [lesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);

    if (!lesson) {
      throw new Error("Lesson not found");
    }

    return lesson;
  }

  async getEnrolledCourses(userId: string) {
    const userEnrollments = await db
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
      );

    return userEnrollments.map(e => e.course);
  }

  async chunkLesson(lessonId: string, options: any) {
    return await chunkLesson(lessonId, options);
  }

  async chunkAllLessons(options: any, batchSize: number) {
    // Run in background
    chunkAllLessons(options, batchSize)
      .then((summary) => {
        console.log("Chunking completed:", summary);
      })
      .catch((error) => {
        console.error("Error in background chunking:", error);
      });

    return {
      message: "Chunking process started. Check server logs for progress.",
      status: "processing",
    };
  }

  async getLessonChunks(lessonId: string) {
    return await getLessonChunks(lessonId);
  }

  async embedLesson(lessonId: string, batchSize: number, shouldReEmbed: boolean) {
    if (shouldReEmbed) {
      return await reEmbedLesson(lessonId, batchSize);
    } else {
      return await embedLesson(lessonId, batchSize);
    }
  }

  async embedAllChunks(batchSize: number, lessonBatchSize: number) {
    // Run in background
    embedAllChunks(batchSize, lessonBatchSize)
      .then((summary) => {
        console.log("Embedding completed:", summary);
      })
      .catch((error) => {
        console.error("Error in background embedding:", error);
      });

    return {
      message: "Embedding process started. Check server logs for progress.",
      status: "processing",
    };
  }

  async getEmbeddingStats(lessonId: string) {
    return await getEmbeddingStats(lessonId);
  }

  async searchContent(query: string, userId: string, options: {
    limit?: number;
    similarityThreshold?: number;
    courseId?: string;
  }) {
    return await searchCourseContent(query, userId, {
      limit: options.limit || 10,
      similarityThreshold: options.similarityThreshold || 0.7,
      courseId: options.courseId || undefined,
    });
  }

  async getLessonContentForUser(lessonId: string, userId: string) {
    return await getLessonContent(lessonId, userId);
  }
}

export const coursesService = new CoursesService();

