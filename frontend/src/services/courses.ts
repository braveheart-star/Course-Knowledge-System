import axiosInstance from './axios';

export interface Course {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CoursesResponse {
  courses: Course[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getCourses = async (page: number = 1, limit: number = 5): Promise<CoursesResponse> => {
  const response = await axiosInstance.get<CoursesResponse>(`/courses?page=${page}&limit=${limit}`);
  return response.data;
};

export const getModules = async (courseId: string): Promise<Module[]> => {
  const response = await axiosInstance.get<Module[]>(`/courses/${courseId}/modules`);
  return response.data;
};

export const getLessons = async (courseId: string, moduleId: string): Promise<Lesson[]> => {
  const response = await axiosInstance.get<Lesson[]>(`/courses/${courseId}/modules/${moduleId}/lessons`);
  return response.data;
};

export const getLessonContent = async (courseId: string, lessonId: string): Promise<Lesson | null> => {
  const response = await axiosInstance.get<Lesson | null>(`/courses/${courseId}/lessons/${lessonId}/content`);
  return response.data;
};

export const getEnrolledCourses = async (): Promise<Course[]> => {
  const response = await axiosInstance.get<Course[]>('/courses/enrolled');
  return response.data;
};

