import React, { useState, useCallback, memo } from 'react';
import { Module, Lesson } from '../../services/courses';
import { LessonList } from './LessonList';
import { EmptyState } from '../ui/EmptyState';

interface ModuleListProps {
  courseId: string;
  modules: Module[];
  lessons?: Record<string, Lesson[]>;
  onLoadLessons?: (courseId: string, moduleId: string) => void;
  isEnrolled?: boolean;
}

export const ModuleList: React.FC<ModuleListProps> = memo(({
  courseId,
  modules,
  lessons,
  onLoadLessons,
  isEnrolled = false,
}) => {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const handleModuleClick = useCallback((moduleId: string) => {
    setExpandedModule(prev => prev === moduleId ? null : moduleId);
    if (expandedModule !== moduleId && onLoadLessons && !lessons?.[moduleId]) {
      onLoadLessons(courseId, moduleId);
    }
  }, [courseId, expandedModule, onLoadLessons, lessons]);

  if (modules.length === 0) {
    return <EmptyState icon="📦" title="No modules available" />;
  }

  return (
    <div>
      {modules.map(module => (
        <div key={module.id} style={styles.moduleCard}>
          <div style={styles.moduleHeader} onClick={() => handleModuleClick(module.id)}>
            <span style={styles.moduleTitle}>{module.title}</span>
            <span style={styles.expandIcon}>
              {expandedModule === module.id ? '▼' : '▶'}
            </span>
          </div>

          {expandedModule === module.id && (
            <div style={styles.lessonsContainer}>
              {isEnrolled ? (
                <LessonList
                  lessons={lessons?.[module.id] || []}
                  courseId={courseId}
                  loading={!lessons?.[module.id]}
                  isEnrolled={isEnrolled}
                />
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

ModuleList.displayName = 'ModuleList';

const styles: { [key: string]: React.CSSProperties } = {
  moduleCard: {
    marginBottom: '1rem',
    border: '1px solid #eee',
    borderRadius: '4px',
  },
  moduleHeader: {
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    backgroundColor: '#f9f9f9',
  },
  moduleTitle: {
    fontWeight: '500',
    color: '#34495e',
  },
  expandIcon: {
    fontSize: '0.8rem',
    color: '#666',
  },
  lessonsContainer: {
    padding: '1rem',
    backgroundColor: 'white',
  },
};
