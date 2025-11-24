import express from "express";
import { authenticate } from "../middleware/auth";
import { coursesController } from "../controllers/coursesController";

const router = express.Router();

// Public/User routes
router.get("/", authenticate, (req, res) => coursesController.getAllCourses(req as any, res));
router.get("/enrolled", authenticate, (req, res) => coursesController.getEnrolledCourses(req as any, res));
router.get("/:courseId/modules", authenticate, (req, res) => coursesController.getCourseModules(req as any, res));
router.get("/:courseId/modules/:moduleId/lessons", authenticate, (req, res) => coursesController.getModuleLessons(req as any, res));
router.get("/:courseId/lessons/:lessonId/content", authenticate, (req, res) => coursesController.getLessonContent(req as any, res));
router.get("/lessons/:lessonId/content", authenticate, (req, res) => coursesController.getLessonContentForUser(req as any, res));
router.post("/search", authenticate, (req, res) => coursesController.searchContent(req as any, res));

// Admin routes
router.post("/lessons/:lessonId/chunk", authenticate, (req, res) => coursesController.chunkLesson(req as any, res));
router.post("/lessons/chunk-all", authenticate, (req, res) => coursesController.chunkAllLessons(req as any, res));
router.get("/lessons/:lessonId/chunks", authenticate, (req, res) => coursesController.getLessonChunks(req as any, res));
router.post("/lessons/:lessonId/embed", authenticate, (req, res) => coursesController.embedLesson(req as any, res));
router.post("/lessons/embed-all", authenticate, (req, res) => coursesController.embedAllChunks(req as any, res));
router.get("/lessons/:lessonId/embedding-stats", authenticate, (req, res) => coursesController.getEmbeddingStats(req as any, res));

export default router;
