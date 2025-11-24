import express from "express";
import { authenticate } from "../middleware/auth";
import { enrollmentsController } from "../controllers/enrollmentsController";

const router = express.Router();

// User routes
router.post("/request", authenticate, (req, res) => enrollmentsController.createEnrollmentRequest(req as any, res));
router.get("/my-requests", authenticate, (req, res) => enrollmentsController.getUserRequests(req as any, res));

// Admin routes
router.get("/requests", authenticate, (req, res) => enrollmentsController.getEnrollmentRequests(req as any, res));
router.get("/all", authenticate, (req, res) => enrollmentsController.getAllEnrollments(req as any, res));
router.get("/pending-count", authenticate, (req, res) => enrollmentsController.getPendingCount(req as any, res));
router.patch("/:enrollmentId/approve", authenticate, (req, res) => enrollmentsController.approveEnrollment(req as any, res));
router.patch("/:enrollmentId/reject", authenticate, (req, res) => enrollmentsController.rejectEnrollment(req as any, res));

export default router;
