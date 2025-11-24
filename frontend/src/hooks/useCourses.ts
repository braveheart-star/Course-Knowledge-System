import { useState, useEffect, useCallback } from 'react';
import { getCourses, getModules, getLessons, Course, Module, Lesson } from '../services/courses';

export const useCourses = (page: number = 1, limit: number = 5) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async (currentPage: number, currentLimit: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCourses(currentPage, currentLimit);
      setCourses(data.courses);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load courses');
      console.error('Error loading courses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses(page, limit);
  }, [page, limit, loadCourses]);

  return { courses, pagination, loading, error, loadCourses };
};

export const useCourseModules = (courseId: string | null) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);

  const loadModules = useCallback(async () => {
    if (!courseId) return;
    
    setLoading(true);
    try {
      const data = await getModules(courseId);
      setModules(data);
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  return { modules, loading, loadModules };
};

export const useModuleLessons = (courseId: string | null, moduleId: string | null) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLessons = useCallback(async () => {
    if (!courseId || !moduleId) return;
    
    setLoading(true);
    try {
      const data = await getLessons(courseId, moduleId);
      setLessons(data);
    } catch (error) {
      console.error('Error loading lessons:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId, moduleId]);

  return { lessons, loading, loadLessons };
};

