import axiosInstance from './axios';

export interface EnrollmentRequest {
  id: string;
  userId: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  status: string | null;
  requestedAt: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  status: string | null;
  enrolledAt: string;
  enrolledBy: string | null;
}

export const requestEnrollment = async (courseId: string): Promise<void> => {
  await axiosInstance.post('/enrollments/request', { courseId });
};

export const getEnrollmentRequests = async (): Promise<EnrollmentRequest[]> => {
  const response = await axiosInstance.get<EnrollmentRequest[]>('/enrollments/requests');
  return response.data;
};

export interface EnrollmentsResponse {
  enrollments: Enrollment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getAllEnrollments = async (page: number = 1, limit: number = 10): Promise<EnrollmentsResponse> => {
  const response = await axiosInstance.get<EnrollmentsResponse>(`/enrollments/all?page=${page}&limit=${limit}`);
  return response.data;
};

export const approveEnrollment = async (enrollmentId: string): Promise<void> => {
  await axiosInstance.patch(`/enrollments/${enrollmentId}/approve`, {});
};

export const rejectEnrollment = async (enrollmentId: string): Promise<void> => {
  await axiosInstance.patch(`/enrollments/${enrollmentId}/reject`, {});
};

export const getPendingCount = async (): Promise<number> => {
  const response = await axiosInstance.get<{ count: number }>('/enrollments/pending-count');
  return response.data.count;
};

export interface UserEnrollmentRequest {
  courseId: string;
  status: string | null;
  requestedAt: string;
}

export const getMyRequests = async (): Promise<UserEnrollmentRequest[]> => {
  const response = await axiosInstance.get<UserEnrollmentRequest[]>('/enrollments/my-requests');
  return response.data;
};

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string | null;
  read?: number;
  createdAt: string;
}

export const getNotifications = async (limit?: number, unreadOnly?: boolean): Promise<Notification[]> => {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (unreadOnly) params.append('unreadOnly', 'true');
  const queryString = params.toString();
  const response = await axiosInstance.get<Notification[]>(`/notifications${queryString ? `?${queryString}` : ''}`);
  return response.data;
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  await axiosInstance.patch(`/notifications/${notificationId}/read`, {});
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await axiosInstance.get<{ count: number }>('/notifications/unread-count');
  return response.data.count;
};

