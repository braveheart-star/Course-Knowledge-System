import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getEnrollmentRequests,
  getAllEnrollments,
  getPendingCount,
  getMyRequests,
  approveEnrollment,
  rejectEnrollment,
  requestEnrollment,
  EnrollmentRequest,
  Enrollment,
  UserEnrollmentRequest,
} from '../services/enrollments';
import { getEnrolledCourses } from '../services/courses';
import { connectSocket } from '../services/socket';

export const useAdminEnrollments = (userId: string | null, role: string | null) => {
  const [enrollmentRequests, setEnrollmentRequests] = useState<EnrollmentRequest[]>([]);
  const [allEnrollments, setAllEnrollments] = useState<Enrollment[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const currentPageRef = useRef(1);

  const loadEnrollments = useCallback(async (page: number) => {
    if (!userId || role !== 'admin') return;
    
    setLoading(true);
    setError(null);
    try {
      const [requests, enrollmentsData, count] = await Promise.all([
        getEnrollmentRequests(),
        getAllEnrollments(page, 10),
        getPendingCount(),
      ]);
      setEnrollmentRequests(requests.filter(r => r.status === 'pending' || r.status === null));
      setAllEnrollments(enrollmentsData.enrollments);
      setPagination(enrollmentsData.pagination);
      currentPageRef.current = page;
      setPendingCount(count);
    } catch (err: any) {
      setError(err.message || 'Failed to load enrollments');
      console.error('Error loading enrollments:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  useEffect(() => {
    if (!userId || role !== 'admin') {
      return;
    }

    loadEnrollments(1);

    const socket = connectSocket();
    if (!socket) {
      return;
    }

    const handleEnrollmentUpdate = (data?: any) => {
      if (!data) {
        loadEnrollments(currentPageRef.current);
        return;
      }

      if (data.type === 'new_request') {
        setEnrollmentRequests(prev => {
          const exists = prev.find(r => r.id === data.enrollment.id);
          if (exists) return prev;
          return [data.enrollment, ...prev];
        });
        setPendingCount(prev => prev + 1);
      } else if (data.type === 'status_changed') {
        setEnrollmentRequests(prev => prev.filter(r => r.id !== data.enrollmentId));
        setAllEnrollments(prev => {
          const updated = prev.map(e => 
            e.id === data.enrollmentId ? { ...e, status: data.status } : e
          );
          if (data.status === 'confirmed' && !updated.find(e => e.id === data.enrollmentId)) {
            loadEnrollments(currentPageRef.current);
          }
          return updated;
        });
        if (data.status === 'confirmed' || data.status === 'rejected') {
          setPendingCount(prev => Math.max(0, prev - 1));
        }
      }
    };

    const handleNotificationUpdate = () => {
      getPendingCount().then(count => setPendingCount(count));
    };

    socket.on('admin:enrollment:update', handleEnrollmentUpdate);
    socket.on('notification:update', handleNotificationUpdate);

    return () => {
      socket.off('admin:enrollment:update', handleEnrollmentUpdate);
      socket.off('notification:update', handleNotificationUpdate);
    };
  }, [userId, role]);

  const approve = useCallback(async (enrollmentId: string) => {
    try {
      await approveEnrollment(enrollmentId);
      setEnrollmentRequests(prev => prev.filter(r => r.id !== enrollmentId));
      setPendingCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error approving enrollment:', err);
      throw err;
    }
  }, []);

  const reject = useCallback(async (enrollmentId: string) => {
    try {
      await rejectEnrollment(enrollmentId);
      setEnrollmentRequests(prev => prev.filter(r => r.id !== enrollmentId));
      setPendingCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error rejecting enrollment:', err);
      throw err;
    }
  }, []);

  return {
    enrollmentRequests,
    allEnrollments,
    pagination,
    pendingCount,
    loading,
    error,
    loadEnrollments,
    approve,
    reject,
  };
};

export const useUserEnrollments = (userId: string | null) => {
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [myRequests, setMyRequests] = useState<Record<string, UserEnrollmentRequest>>({});
  const [loading, setLoading] = useState(false);

  const loadEnrolledCourses = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const enrolled = await getEnrolledCourses();
      setEnrolledCourseIds(new Set(enrolled.map(c => c.id)));
    } catch (error) {
      console.error('Error loading enrolled courses:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadMyRequests = useCallback(async () => {
    if (!userId) return;
    
    try {
      const requests = await getMyRequests();
      const requestsMap = requests.reduce((acc, req) => {
        acc[req.courseId] = req;
        return acc;
      }, {} as Record<string, UserEnrollmentRequest>);
      setMyRequests(requestsMap);
    } catch (error) {
      console.error('Error loading my requests:', error);
    }
  }, [userId]);

  const request = useCallback(async (courseId: string) => {
    try {
      await requestEnrollment(courseId);
      await loadMyRequests();
      await loadEnrolledCourses();
    } catch (err: any) {
      console.error('Error requesting enrollment:', err);
      throw err;
    }
  }, [loadMyRequests, loadEnrolledCourses]);

  useEffect(() => {
    if (userId) {
      loadEnrolledCourses();
      loadMyRequests();
    }
  }, [userId, loadEnrolledCourses, loadMyRequests]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const socket = connectSocket();
    if (!socket) {
      return;
    }

    const handleUpdate = (data?: any) => {
      if (!data) {
        loadEnrolledCourses();
        loadMyRequests();
        return;
      }

      if (data.type === 'approved') {
        setEnrolledCourseIds(prev => new Set([...Array.from(prev), data.courseId]));
        setMyRequests(prev => {
          const updated = { ...prev };
          if (updated[data.courseId]) {
            updated[data.courseId] = { ...updated[data.courseId], status: 'confirmed' };
          }
          return updated;
        });
      } else if (data.type === 'rejected') {
        setMyRequests(prev => {
          const updated = { ...prev };
          if (updated[data.courseId]) {
            updated[data.courseId] = { ...updated[data.courseId], status: 'rejected' };
          }
          return updated;
        });
      }
    };

    socket.on('user:enrollment:update', handleUpdate);

    return () => {
      socket.off('user:enrollment:update', handleUpdate);
    };
  }, [userId, loadEnrolledCourses, loadMyRequests]);

  return {
    enrolledCourseIds,
    myRequests,
    loading,
    loadEnrolledCourses,
    loadMyRequests,
    requestEnrollment: request,
  };
};

