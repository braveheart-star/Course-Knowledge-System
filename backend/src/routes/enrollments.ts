import express from "express";
import * as enrollmentsController from "../controllers/enrollmentsController";

const router = express.Router();

router.post("/request", enrollmentsController.requestEnrollment);
router.get("/requests", enrollmentsController.getEnrollmentRequests);
router.get("/all", enrollmentsController.getAllEnrollments);
router.patch("/:enrollmentId/approve", enrollmentsController.approveEnrollment);
router.patch("/:enrollmentId/reject", enrollmentsController.rejectEnrollment);
router.get("/pending-count", enrollmentsController.getPendingCount);
router.get("/my-requests", enrollmentsController.getMyRequests);

export default router;
