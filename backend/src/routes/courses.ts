import express from "express";
import * as coursesController from "../controllers/coursesController";

const router = express.Router();

router.get("/", coursesController.getCourses);
router.get("/enrolled", coursesController.getEnrolledCourses);
router.get("/:courseId/modules", coursesController.getModules);
router.get("/:courseId/modules/:moduleId/lessons", coursesController.getLessons);
router.get("/:courseId/lessons/:lessonId/content", coursesController.getLessonContent);
router.post("/search", coursesController.searchCourses);
router.get("/lessons/:lessonId/content", coursesController.getLessonContentById);

// Admin endpoints
router.post("/lessons/:lessonId/chunk", coursesController.chunkLessonById);
router.post("/lessons/chunk-all", coursesController.chunkAllLessonsHandler);
router.get("/lessons/:lessonId/chunks", coursesController.getLessonChunksHandler);
router.post("/lessons/:lessonId/embed", coursesController.embedLessonById);
router.post("/lessons/embed-all", coursesController.embedAllLessonsHandler);
router.get("/lessons/:lessonId/embedding-stats", coursesController.getEmbeddingStatsHandler);

export default router;
