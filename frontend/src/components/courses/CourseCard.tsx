import React, { useState, useEffect, useCallback, memo } from 'react';
import { Course, Module, Lesson } from '../../services/courses';
import { useCourseModules } from '../../hooks/useCourses';
import { ModuleList } from './ModuleList';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';

interface CourseCardProps {
  course: Course;
  lessons?: Record<string, Lesson[]>;
  onRequestEnrollment: (courseId: string) => void;
  onLoadLessons?: (courseId: string, moduleId: string) => void;
  isRequesting?: boolean;
  isEnrolled?: boolean;
  isRequested?: boolean;
}

export const CourseCard: React.FC<CourseCardProps> = memo(({
  course,
  lessons,
  onRequestEnrollment,
  onLoadLessons,
  isRequesting = false,
  isEnrolled = false,
  isRequested = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const { modules, loading: modulesLoading, loadModules } = useCourseModules(
    expanded ? course.id : null
  );

  useEffect(() => {
    if (expanded && !modules.length) {
      loadModules();
    }
  }, [expanded, modules.length, loadModules]);

  const handleToggle = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  const handleRequest = useCallback(() => {
    if (!isRequested && !isRequesting) {
      onRequestEnrollment(course.id);
    }
  }, [isRequested, isRequesting, onRequestEnrollment, course.id]);

  return (
    <div style={styles.courseCard}>
      <div style={styles.courseHeader} onClick={handleToggle}>
        <div>
          <h3 style={styles.courseTitle}>{course.title}</h3>
          {course.description && (
            <p style={styles.courseDescription}>{course.description}</p>
          )}
        </div>
        <span style={styles.expandIcon}>{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div style={styles.expandedContent}>
          {modulesLoading ? (
            <LoadingSpinner message="Loading modules..." size="small" />
          ) : modules.length > 0 ? (
            <ModuleList
              courseId={course.id}
              modules={modules}
              lessons={lessons}
              onLoadLessons={onLoadLessons}
              isEnrolled={isEnrolled}
            />
          ) : (
            <EmptyState icon="📦" title="No modules available" />
          )}

          {!isEnrolled && (
            <div style={styles.buttonContainer}>
              <ActionButton
                label={
                  isRequested 
                    ? 'Applied' 
                    : isRequesting 
                    ? 'Pending...' 
                    : 'Request Enrollment'
                }
                onClick={handleRequest}
                variant={isRequested ? 'secondary' : 'primary'}
                disabled={isRequesting || isRequested}
                loading={isRequesting}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

CourseCard.displayName = 'CourseCard';

const styles: { [key: string]: React.CSSProperties } = {
  courseCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  courseHeader: {
    padding: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    borderBottom: '1px solid #eee',
  },
  courseTitle: {
    margin: 0,
    fontSize: '1.25rem',
    color: '#2c3e50',
  },
  courseDescription: {
    margin: '0.5rem 0 0 0',
    color: '#666',
    fontSize: '0.9rem',
  },
  expandIcon: {
    fontSize: '0.8rem',
    color: '#666',
  },
  expandedContent: {
    padding: '1.5rem',
  },
  buttonContainer: {
    marginTop: '1rem',
  },
};
