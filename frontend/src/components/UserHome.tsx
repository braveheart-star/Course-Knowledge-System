import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { getCurrentUser } from '../services/auth';
import { useCourses } from '../hooks/useCourses';
import { useUserEnrollments } from '../hooks/useEnrollments';
import { useToast } from '../hooks/useToast';
import { CourseCard } from './courses/CourseCard';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { EmptyState } from './ui/EmptyState';
import { ToastContainer } from './ui/Toast';
import { Pagination } from './ui/Pagination';
import { Lesson, getLessons } from '../services/courses';

interface UserHomeProps {
  refreshTrigger?: number;
}

export const UserHome: React.FC<UserHomeProps> = React.memo(({ refreshTrigger }) => {
  const user = getCurrentUser();
  const [currentPage, setCurrentPage] = useState(1);
  const { courses, pagination, loading: coursesLoading } = useCourses(currentPage, 5);
  const { enrolledCourseIds, myRequests, requestEnrollment, loadMyRequests, loadEnrolledCourses } = useUserEnrollments(user?.id || null);
  const { toasts, showSuccess, showError, removeToast } = useToast();
  const [requestingCourses, setRequestingCourses] = useState<Set<string>>(new Set());
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [loadingLessons, setLoadingLessons] = useState<Record<string, boolean>>({});

  const handleRequestEnrollment = useCallback(async (courseId: string) => {
    setRequestingCourses(prev => new Set([...prev, courseId]));
    
    try {
      await requestEnrollment(courseId);
      setRequestingCourses(prev => {
        const next = new Set(prev);
        next.delete(courseId);
        return next;
      });
      await loadMyRequests();
      showSuccess('Enrollment request sent! Waiting for admin approval.');
    } catch (error: any) {
      setRequestingCourses(prev => {
        const next = new Set(prev);
        next.delete(courseId);
        return next;
      });
      const errorMessage = error.response?.data?.error || 'Failed to request enrollment';
      showError(errorMessage);
    }
  }, [requestEnrollment, loadMyRequests, showSuccess, showError]);

  const handleLoadLessons = useCallback(async (courseId: string, moduleId: string) => {
    if (lessons[moduleId] || loadingLessons[moduleId]) return;
    
    setLoadingLessons(prev => ({ ...prev, [moduleId]: true }));
    try {
      const lessonData = await getLessons(courseId, moduleId);
      setLessons(prev => ({ ...prev, [moduleId]: lessonData }));
    } catch (error) {
      console.error('Error loading lessons:', error);
    } finally {
      setLoadingLessons(prev => ({ ...prev, [moduleId]: false }));
    }
  }, [lessons, loadingLessons]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadEnrolledCourses();
      loadMyRequests();
    }
  }, [refreshTrigger, loadEnrolledCourses, loadMyRequests]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const requestedCourseIds = useMemo(() => {
    return new Set(
      Object.values(myRequests)
        .filter(r => r.status === 'pending' || r.status === null)
        .map(r => r.courseId)
    );
  }, [myRequests]);

  if (coursesLoading) {
    return <LoadingSpinner message="Loading courses..." />;
  }

  if (courses.length === 0) {
    return <EmptyState icon="📚" title="No courses available" />;
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div>
        <h2 style={styles.sectionTitle}>Available Courses</h2>
        {pagination.total > 0 && (
          <div style={styles.paginationInfo}>
            Showing {((currentPage - 1) * 5) + 1} to {Math.min(currentPage * 5, pagination.total)} of {pagination.total} courses
          </div>
        )}
        <div style={styles.coursesList}>
          {courses.map(course => {
            const isRequesting = requestingCourses.has(course.id);
            const isApplied = requestedCourseIds.has(course.id);
            
            return (
              <CourseCard
                key={course.id}
                course={course}
                onRequestEnrollment={handleRequestEnrollment}
                onLoadLessons={handleLoadLessons}
                lessons={lessons}
                isEnrolled={enrolledCourseIds.has(course.id)}
                isRequested={isApplied}
                isRequesting={isRequesting}
              />
            );
          })}
        </div>
        {pagination.totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </>
  );
});

UserHome.displayName = 'UserHome';

const styles: { [key: string]: React.CSSProperties } = {
  sectionTitle: {
    marginTop: 0,
    marginBottom: '1.5rem',
    color: '#2c3e50',
  },
  paginationInfo: {
    marginBottom: '1rem',
    color: '#666',
    fontSize: '0.9rem',
  },
  coursesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
};
