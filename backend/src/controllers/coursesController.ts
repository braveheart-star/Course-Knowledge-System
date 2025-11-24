import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { coursesService } from "../services/coursesService";

export class CoursesController {
  async getAllCourses(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;

      const result = await coursesService.getAllCourses(page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getCourseModules(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const modules = await coursesService.getCourseModules(courseId);
      res.json(modules);
    } catch (error) {
      console.error("Error fetching modules:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getModuleLessons(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { moduleId } = req.params;
      const lessons = await coursesService.getModuleLessons(moduleId);
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getLessonContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { courseId, lessonId } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const lesson = await coursesService.getLessonContent(courseId, lessonId, userId);
      res.json(lesson);
    } catch (error: any) {
      console.error("Error fetching lesson content:", error);
      if (error.message === "You are not enrolled in this course") {
        res.status(403).json({ error: error.message });
        return;
      }
      if (error.message === "Lesson not found") {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getEnrolledCourses(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const enrolledCourses = await coursesService.getEnrolledCourses(userId);
      res.json(enrolledCourses);
    } catch (error) {
      console.error("Error fetching enrolled courses:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async chunkLesson(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({ error: "Forbidden: Admin access required" });
        return;
      }

      const { lessonId } = req.params;
      const { chunkSize, chunkOverlap, minChunkSize, maxChunkSize } = req.body;

      const options: any = {};
      if (chunkSize) options.chunkSize = parseInt(chunkSize);
      if (chunkOverlap) options.chunkOverlap = parseInt(chunkOverlap);
      if (minChunkSize) options.minChunkSize = parseInt(minChunkSize);
      if (maxChunkSize) options.maxChunkSize = parseInt(maxChunkSize);

      const result = await coursesService.chunkLesson(lessonId, options);
      res.json({
        message: "Lesson chunked successfully",
        ...result,
      });
    } catch (error: any) {
      console.error("Error chunking lesson:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async chunkAllLessons(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({ error: "Forbidden: Admin access required" });
        return;
      }

      const { chunkSize, chunkOverlap, minChunkSize, maxChunkSize, batchSize } = req.body;

      const options: any = {};
      if (chunkSize) options.chunkSize = parseInt(chunkSize);
      if (chunkOverlap) options.chunkOverlap = parseInt(chunkOverlap);
      if (minChunkSize) options.minChunkSize = parseInt(minChunkSize);
      if (maxChunkSize) options.maxChunkSize = parseInt(maxChunkSize);

      const batch = batchSize ? parseInt(batchSize) : 10;
      const result = await coursesService.chunkAllLessons(options, batch);
      res.json(result);
    } catch (error: any) {
      console.error("Error starting chunking process:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async getLessonChunks(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({ error: "Forbidden: Admin access required" });
        return;
      }

      const { lessonId } = req.params;
      const chunks = await coursesService.getLessonChunks(lessonId);

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
  }

  async embedLesson(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({ error: "Forbidden: Admin access required" });
        return;
      }

      const { lessonId } = req.params;
      const { batchSize, reEmbed } = req.body;

      const batch = batchSize ? parseInt(batchSize) : 50;
      const shouldReEmbed = reEmbed === true || reEmbed === "true";

      const result = await coursesService.embedLesson(lessonId, batch, shouldReEmbed);
      res.json({
        message: "Embedding completed",
        ...result,
      });
    } catch (error: any) {
      console.error("Error embedding lesson:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async embedAllChunks(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({ error: "Forbidden: Admin access required" });
        return;
      }

      const { batchSize, lessonBatchSize } = req.body;

      const batch = batchSize ? parseInt(batchSize) : 50;
      const lessonBatch = lessonBatchSize ? parseInt(lessonBatchSize) : 10;

      const result = await coursesService.embedAllChunks(batch, lessonBatch);
      res.json(result);
    } catch (error: any) {
      console.error("Error starting embedding process:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async getEmbeddingStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({ error: "Forbidden: Admin access required" });
        return;
      }

      const { lessonId } = req.params;
      const stats = await coursesService.getEmbeddingStats(lessonId);

      res.json({
        lessonId,
        ...stats,
      });
    } catch (error: any) {
      console.error("Error fetching embedding stats:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async searchContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { query, limit, similarityThreshold, courseId } = req.body;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: "Query is required" });
        return;
      }

      const results = await coursesService.searchContent(query, userId, {
        limit: limit || 10,
        similarityThreshold: similarityThreshold || 0.7,
        courseId: courseId || undefined,
      });

      res.json({ results });
    } catch (error: any) {
      console.error("Error searching course content:", error);
      if (error.message.includes('not enrolled')) {
        res.status(403).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getLessonContentForUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { lessonId } = req.params;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const content = await coursesService.getLessonContentForUser(lessonId, userId);

      if (!content) {
        res.status(403).json({ error: "You are not enrolled in this course or lesson not found" });
        return;
      }

      res.json(content);
    } catch (error) {
      console.error("Error fetching lesson content:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export const coursesController = new CoursesController();

