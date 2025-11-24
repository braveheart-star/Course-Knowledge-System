import React, { useState, useCallback, memo } from 'react';
import { Lesson, getLessonContent } from '../../services/courses';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';

interface LessonListProps {
  lessons: Lesson[];
  courseId: string;
  loading?: boolean;
  isEnrolled?: boolean;
}

export const LessonList: React.FC<LessonListProps> = memo(({ 
  lessons, 
  courseId, 
  loading = false,
  isEnrolled = false,
}) => {
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [lessonContent, setLessonContent] = useState<Record<string, string>>({});
  const [loadingContent, setLoadingContent] = useState<Record<string, boolean>>({});

  const handleLessonClick = useCallback(async (lessonId: string) => {
    if (expandedLesson === lessonId) {
      setExpandedLesson(null);
      return;
    }

    setExpandedLesson(lessonId);
    if (isEnrolled && !lessonContent[lessonId]) {
      setLoadingContent(prev => ({ ...prev, [lessonId]: true }));
      try {
        const lesson = await getLessonContent(courseId, lessonId);
        if (lesson?.content) {
          setLessonContent(prev => ({ ...prev, [lessonId]: lesson.content! }));
        }
      } catch (error) {
        console.error('Error loading lesson content:', error);
      } finally {
        setLoadingContent(prev => ({ ...prev, [lessonId]: false }));
      }
    }
  }, [expandedLesson, isEnrolled, lessonContent, courseId]);

  if (loading) {
    return <LoadingSpinner message="Loading lessons..." size="small" />;
  }

  if (lessons.length === 0) {
    return <EmptyState icon="📝" title="No lessons available" />;
  }

  return (
    <div style={styles.lessonsList}>
      {lessons.map(lesson => (
        <div key={lesson.id} style={styles.lessonItem}>
          <div style={styles.lessonHeader} onClick={() => handleLessonClick(lesson.id)}>
            <span style={styles.lessonTitle}>{lesson.title}</span>
            <span style={styles.expandIcon}>
              {expandedLesson === lesson.id ? '▼' : '▶'}
            </span>
          </div>
          {expandedLesson === lesson.id && (
            <div style={styles.lessonContent}>
              {isEnrolled ? (
                loadingContent[lesson.id] ? (
                  <LoadingSpinner message="Loading content..." size="small" />
                ) : lessonContent[lesson.id] ? (
                  <p style={styles.contentText}>{lessonContent[lesson.id]}</p>
                ) : (
                  <EmptyState icon="📄" title="Content not available" />
                )
              ) : (
                <EmptyState
                  icon="🔒"
                  title="Enrollment Required"
                  message="Please enroll in this course to view lesson content."
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

LessonList.displayName = 'LessonList';

const styles: { [key: string]: React.CSSProperties } = {
  lessonsList: {
    padding: '1rem',
    backgroundColor: 'white',
  },
  lessonItem: {
    borderBottom: '1px solid #f0f0f0',
  },
  lessonHeader: {
    padding: '0.75rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    color: '#555',
  },
  lessonTitle: {
    fontWeight: '500',
  },
  expandIcon: {
    fontSize: '0.8rem',
    color: '#666',
  },
  lessonContent: {
    padding: '1rem',
    backgroundColor: '#fafafa',
    borderTop: '1px solid #eee',
  },
  contentText: {
    margin: 0,
    color: '#333',
    lineHeight: '1.6',
  },
};
