import React, { useEffect, useState, useCallback, memo } from 'react';
import { useAdminEnrollments } from '../hooks/useEnrollments';
import { EnrollmentTable } from './admin/EnrollmentTable';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Pagination } from './ui/Pagination';
import { getCurrentUser } from '../services/auth';

interface AdminHomeProps {
  refreshTrigger?: number;
}

export const AdminHome: React.FC<AdminHomeProps> = memo(({ refreshTrigger }) => {
  const user = getCurrentUser();
  const [currentPage, setCurrentPage] = useState(1);
  const isInitialMount = React.useRef(true);
  const {
    allEnrollments,
    pagination,
    loading,
    loadEnrollments,
  } = useAdminEnrollments(user?.id || null, user?.role || null);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadEnrollments(currentPage);
    }
  }, [refreshTrigger, currentPage, loadEnrollments]);

  useEffect(() => {
    // Skip initial mount (handled by hook), only load on page changes
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadEnrollments(currentPage);
  }, [currentPage, loadEnrollments]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div>
      <h2 style={styles.sectionTitle}>Enrollment Management</h2>
      {loading ? (
        <LoadingSpinner message="Loading enrollments..." />
      ) : (
        <>
          {pagination.total > 0 && (
            <div style={styles.paginationInfo}>
              Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, pagination.total)} of {pagination.total} enrollments
            </div>
          )}
          <EnrollmentTable enrollments={allEnrollments} />
          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
});

AdminHome.displayName = 'AdminHome';

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
};
