import { Response } from "express";
import { db } from "../db";
import { enrollments, courses, users, notifications } from "../db/schema";
import { eq, and, or, isNull, desc } from "drizzle-orm";
import { AuthRequest } from "../middleware/auth";
import {
  emitAdminEnrollmentUpdate,
  emitNotificationUpdate,
  emitUserEnrollmentUpdate,
} from "../realtime";
import { withRetry } from "../db/retry";

export const requestEnrollment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { courseId } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({ error: "User ID and course ID are required" });
    }

    const [course] = await withRetry(() =>
      db
        .select()
        .from(courses)
        .where(eq(courses.id, courseId))
        .limit(1)
    );

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const existingEnrollment = await withRetry(() =>
      db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, userId),
            eq(enrollments.courseId, courseId)
          )
        )
        .limit(1)
    );

    if (existingEnrollment.length > 0) {
      const enrollment = existingEnrollment[0];
      if (enrollment.status === "confirmed") {
        return res.status(400).json({ error: "Already enrolled in this course" });
      }
      if (enrollment.status === "pending") {
        return res.status(400).json({ error: "Enrollment request already pending" });
      }
      
      await withRetry(() =>
        db
          .update(enrollments)
          .set({ status: "pending" })
          .where(eq(enrollments.id, enrollment.id))
      );
      
      const [adminUser] = await withRetry(() =>
        db
          .select()
          .from(users)
          .where(eq(users.role, "admin"))
          .limit(1)
      );

      if (adminUser) {
        await withRetry(() =>
          db.insert(notifications).values({
            userId: adminUser.id,
            type: "enrollment_request",
            title: "New Enrollment Request",
            message: `A user has requested enrollment in "${course.title}"`,
            relatedId: enrollment.id,
            read: 0,
          })
        );
        
        const [user] = await withRetry(() =>
          db.select().from(users).where(eq(users.id, userId)).limit(1)
        );
        emitNotificationUpdate(adminUser.id);
        emitAdminEnrollmentUpdate({
          type: 'new_request',
          enrollment: {
            id: enrollment.id,
            userId: enrollment.userId,
            userEmail: user?.email || '',
            courseId: enrollment.courseId,
            courseTitle: course.title,
            status: 'pending',
            requestedAt: enrollment.enrolledAt,
          },
        });
      }
      
      return res.json({ message: "Enrollment request updated", status: "pending" });
    }

    const [newEnrollment] = await withRetry(() =>
      db
        .insert(enrollments)
        .values({
          userId,
          courseId,
          status: "pending",
        })
        .returning()
    );

    const [adminUser] = await withRetry(() =>
      db
        .select()
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(1)
    );

    if (adminUser) {
      await withRetry(() =>
        db.insert(notifications).values({
          userId: adminUser.id,
          type: "enrollment_request",
          title: "New Enrollment Request",
          message: `A user has requested enrollment in "${course.title}"`,
          relatedId: newEnrollment.id,
          read: 0,
        })
      );
      
      const [user] = await withRetry(() =>
        db.select().from(users).where(eq(users.id, userId)).limit(1)
      );
      emitNotificationUpdate(adminUser.id);
      emitAdminEnrollmentUpdate({
        type: 'new_request',
        enrollment: {
          id: newEnrollment.id,
          userId: newEnrollment.userId,
          userEmail: user?.email || '',
          courseId: newEnrollment.courseId,
          courseTitle: course.title,
          status: 'pending',
          requestedAt: newEnrollment.enrolledAt,
        },
      });
    }

    res.status(201).json({ message: "Enrollment request created", enrollment: newEnrollment });
  } catch (error) {
    console.error("Error creating enrollment request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getEnrollmentRequests = async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const allRequests = await withRetry(() =>
      db
        .select({
          enrollment: enrollments,
          course: courses,
          user: users,
        })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .innerJoin(users, eq(enrollments.userId, users.id))
        .where(
          or(
            eq(enrollments.status, "pending"),
            isNull(enrollments.status)
          )
        )
        .orderBy(desc(enrollments.enrolledAt))
    );

    res.json(allRequests.map(r => ({
      id: r.enrollment.id,
      userId: r.user.id,
      userEmail: r.user.email,
      courseId: r.course.id,
      courseTitle: r.course.title,
      status: r.enrollment.status,
      requestedAt: r.enrollment.enrolledAt,
    })));
  } catch (error) {
    console.error("Error fetching enrollment requests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllEnrollments = async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const allEnrollments = await withRetry(() =>
      db
        .select({
          enrollment: enrollments,
          course: courses,
          user: users,
        })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .innerJoin(users, eq(enrollments.userId, users.id))
        .where(eq(enrollments.status, "confirmed"))
        .orderBy(desc(enrollments.enrolledAt))
    );
    
    const total = allEnrollments.length;
    const paginatedEnrollments = allEnrollments.slice(offset, offset + limit);

    res.json({
      enrollments: paginatedEnrollments.map(e => ({
        id: e.enrollment.id,
        userId: e.user.id,
        userEmail: e.user.email,
        courseId: e.course.id,
        courseTitle: e.course.title,
        status: e.enrollment.status,
        enrolledAt: e.enrollment.enrolledAt,
        enrolledBy: e.enrollment.enrolledBy,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching all enrollments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const approveEnrollment = async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const { enrollmentId } = req.params;
    const adminId = req.userId;

    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [enrollment] = await withRetry(() =>
      db
        .select({
          enrollment: enrollments,
          course: courses,
        })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(eq(enrollments.id, enrollmentId))
        .limit(1)
    );

    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    const [updated] = await withRetry(() =>
      db
        .update(enrollments)
        .set({
          status: "confirmed",
          enrolledBy: adminId,
        })
        .where(eq(enrollments.id, enrollmentId))
        .returning()
    );

    await withRetry(() =>
      db.insert(notifications).values({
        userId: enrollment.enrollment.userId,
        type: "enrollment_approved",
        title: "Enrollment Approved",
        message: `Your enrollment request for "${enrollment.course.title}" has been approved!`,
        relatedId: enrollmentId,
        read: 0,
      })
    );

    emitNotificationUpdate(enrollment.enrollment.userId);
    emitUserEnrollmentUpdate(enrollment.enrollment.userId, {
      type: 'approved',
      courseId: enrollment.enrollment.courseId,
    });
    emitAdminEnrollmentUpdate({
      type: 'status_changed',
      enrollmentId: enrollmentId,
      status: 'confirmed',
    });

    res.json({ message: "Enrollment approved", enrollment: updated });
  } catch (error) {
    console.error("Error approving enrollment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const rejectEnrollment = async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const { enrollmentId } = req.params;

    const [enrollment] = await withRetry(() =>
      db
        .select({
          enrollment: enrollments,
          course: courses,
        })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(eq(enrollments.id, enrollmentId))
        .limit(1)
    );

    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    await withRetry(() =>
      db.insert(notifications).values({
        userId: enrollment.enrollment.userId,
        type: "enrollment_rejected",
        title: "Enrollment Rejected",
        message: `Your enrollment request for "${enrollment.course.title}" has been rejected.`,
        relatedId: enrollmentId,
        read: 0,
      })
    );

    emitNotificationUpdate(enrollment.enrollment.userId);
    emitUserEnrollmentUpdate(enrollment.enrollment.userId, {
      type: 'rejected',
      courseId: enrollment.enrollment.courseId,
    });
    emitAdminEnrollmentUpdate({
      type: 'status_changed',
      enrollmentId: enrollmentId,
      status: 'rejected',
    });

    await withRetry(() =>
      db
        .update(enrollments)
        .set({ status: "rejected" })
        .where(eq(enrollments.id, enrollmentId))
    );

    res.json({ message: "Enrollment request rejected", enrollment: enrollment.enrollment });
  } catch (error) {
    console.error("Error rejecting enrollment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPendingCount = async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const pendingRequests = await withRetry(() =>
      db
        .select()
        .from(enrollments)
        .where(
          or(
            eq(enrollments.status, "pending"),
            isNull(enrollments.status)
          )
        )
    );

    res.json({ count: pendingRequests.length });
  } catch (error) {
    console.error("Error fetching pending count:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMyRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userRequests = await withRetry(() =>
      db
        .select({
          enrollment: enrollments,
          course: courses,
        })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(eq(enrollments.userId, userId))
        .orderBy(desc(enrollments.enrolledAt))
    );

    res.json(userRequests.map(r => ({
      courseId: r.course.id,
      status: r.enrollment.status,
      requestedAt: r.enrollment.enrolledAt,
    })));
  } catch (error) {
    console.error("Error fetching user requests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

