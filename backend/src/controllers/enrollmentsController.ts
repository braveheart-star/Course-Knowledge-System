import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { enrollmentsService } from "../services/enrollmentsService";

export class EnrollmentsController {
  async createEnrollmentRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { courseId } = req.body;

      if (!userId || !courseId) {
        res.status(400).json({ error: "User ID and course ID are required" });
        return;
      }

      const result = await enrollmentsService.createEnrollmentRequest(userId, courseId);
      res.status(201).json(result);
    } catch (error: any) {
      console.error("Error creating enrollment request:", error);
      if (error.message === "Course not found") {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message === "Already enrolled in this course" || error.message === "Enrollment request already pending") {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getEnrollmentRequests(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({ error: "Forbidden: Admin access required" });
        return;
      }

      const requests = await enrollmentsService.getEnrollmentRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching enrollment requests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getAllEnrollments(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({ error: "Forbidden: Admin access required" });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await enrollmentsService.getAllEnrollments(page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching all enrollments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async approveEnrollment(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({ error: "Forbidden: Admin access required" });
        return;
      }

      const { enrollmentId } = req.params;
      const adminId = req.userId;

      if (!adminId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const result = await enrollmentsService.approveEnrollment(enrollmentId, adminId);
      res.json(result);
    } catch (error: any) {
      console.error("Error approving enrollment:", error);
      if (error.message === "Enrollment not found") {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async rejectEnrollment(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({ error: "Forbidden: Admin access required" });
        return;
      }

      const { enrollmentId } = req.params;

      const result = await enrollmentsService.rejectEnrollment(enrollmentId);
      res.json(result);
    } catch (error: any) {
      console.error("Error rejecting enrollment:", error);
      if (error.message === "Enrollment not found") {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getPendingCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const count = await enrollmentsService.getPendingCount();
      res.json({ count });
    } catch (error) {
      console.error("Error fetching pending count:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getUserRequests(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const requests = await enrollmentsService.getUserRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching user requests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export const enrollmentsController = new EnrollmentsController();

