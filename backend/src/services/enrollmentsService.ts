import { db } from "../db";
import { enrollments, courses, users, notifications } from "../db/schema";
import { eq, and, or, isNull, desc } from "drizzle-orm";
import {
  emitAdminEnrollmentUpdate,
  emitNotificationUpdate,
  emitUserEnrollmentUpdate,
} from "../realtime";

export class EnrollmentsService {
  async createEnrollmentRequest(userId: string, courseId: string) {
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!course) {
      throw new Error("Course not found");
    }

    const existingEnrollment = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, userId),
          eq(enrollments.courseId, courseId)
        )
      )
      .limit(1);

    if (existingEnrollment.length > 0) {
      const enrollment = existingEnrollment[0];
      if (enrollment.status === "confirmed") {
        throw new Error("Already enrolled in this course");
      }
      if (enrollment.status === "pending") {
        throw new Error("Enrollment request already pending");
      }
      
      await db
        .update(enrollments)
        .set({ status: "pending" })
        .where(eq(enrollments.id, enrollment.id));
      
      await this.notifyAdmin(enrollment.id, userId, course);
      
      return { message: "Enrollment request updated", status: "pending", enrollment };
    }

    const [newEnrollment] = await db
      .insert(enrollments)
      .values({
        userId,
        courseId,
        status: "pending",
      })
      .returning();

    await this.notifyAdmin(newEnrollment.id, userId, course);

    return { message: "Enrollment request created", enrollment: newEnrollment };
  }

  private async notifyAdmin(enrollmentId: string, userId: string, course: any) {
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);

    if (adminUser) {
      const [enrollment] = await db
        .select()
        .from(enrollments)
        .where(eq(enrollments.id, enrollmentId))
        .limit(1);

      await db.insert(notifications).values({
        userId: adminUser.id,
        type: "enrollment_request",
        title: "New Enrollment Request",
        message: `A user has requested enrollment in "${course.title}"`,
        relatedId: enrollmentId,
        read: 0,
      });
      
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      emitNotificationUpdate(adminUser.id);
      emitAdminEnrollmentUpdate({
        type: 'new_request',
        enrollment: {
          id: enrollmentId,
          userId: userId,
          userEmail: user?.email || '',
          courseId: course.id,
          courseTitle: course.title,
          status: 'pending',
          requestedAt: enrollment?.enrolledAt || new Date(),
        },
      });
    }
  }

  async getEnrollmentRequests() {
    const allRequests = await db
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
      .orderBy(desc(enrollments.enrolledAt));

    return allRequests.map(r => ({
      id: r.enrollment.id,
      userId: r.user.id,
      userEmail: r.user.email,
      courseId: r.course.id,
      courseTitle: r.course.title,
      status: r.enrollment.status,
      requestedAt: r.enrollment.enrolledAt,
    }));
  }

  async getAllEnrollments(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;

    const allEnrollments = await db
      .select({
        enrollment: enrollments,
        course: courses,
        user: users,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .innerJoin(users, eq(enrollments.userId, users.id))
      .where(eq(enrollments.status, "confirmed"))
      .orderBy(desc(enrollments.enrolledAt));

    const total = allEnrollments.length;
    const paginatedEnrollments = allEnrollments.slice(offset, offset + limit);

    return {
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
    };
  }

  async approveEnrollment(enrollmentId: string, adminId: string) {
    const [enrollment] = await db
      .select({
        enrollment: enrollments,
        course: courses,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.id, enrollmentId))
      .limit(1);

    if (!enrollment) {
      throw new Error("Enrollment not found");
    }

    const [updated] = await db
      .update(enrollments)
      .set({
        status: "confirmed",
        enrolledBy: adminId,
      })
      .where(eq(enrollments.id, enrollmentId))
      .returning();

    await db.insert(notifications).values({
      userId: enrollment.enrollment.userId,
      type: "enrollment_approved",
      title: "Enrollment Approved",
      message: `Your enrollment request for "${enrollment.course.title}" has been approved!`,
      relatedId: enrollmentId,
      read: 0,
    });

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

    return { message: "Enrollment approved", enrollment: updated };
  }

  async rejectEnrollment(enrollmentId: string) {
    const [enrollment] = await db
      .select({
        enrollment: enrollments,
        course: courses,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.id, enrollmentId))
      .limit(1);

    if (!enrollment) {
      throw new Error("Enrollment not found");
    }

    await db.insert(notifications).values({
      userId: enrollment.enrollment.userId,
      type: "enrollment_rejected",
      title: "Enrollment Rejected",
      message: `Your enrollment request for "${enrollment.course.title}" has been rejected.`,
      relatedId: enrollmentId,
      read: 0,
    });

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

    await db
      .update(enrollments)
      .set({ status: "rejected" })
      .where(eq(enrollments.id, enrollmentId));

    return { message: "Enrollment request rejected", enrollment: enrollment.enrollment };
  }

  async getPendingCount() {
    const pendingRequests = await db
      .select()
      .from(enrollments)
      .where(
        or(
          eq(enrollments.status, "pending"),
          isNull(enrollments.status)
        )
      );

    return pendingRequests.length;
  }

  async getUserRequests(userId: string) {
    const userRequests = await db
      .select({
        enrollment: enrollments,
        course: courses,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.userId, userId))
      .orderBy(desc(enrollments.enrolledAt));

    return userRequests.map(r => ({
      courseId: r.course.id,
      status: r.enrollment.status,
      requestedAt: r.enrollment.enrolledAt,
    }));
  }
}

export const enrollmentsService = new EnrollmentsService();

