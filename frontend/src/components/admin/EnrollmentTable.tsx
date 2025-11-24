import React from 'react';
import { EnrollmentRequest, Enrollment } from '../../services/enrollments';

interface EnrollmentTableProps {
  requests?: EnrollmentRequest[];
  enrollments?: Enrollment[];
  processing?: string | null;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export const EnrollmentTable: React.FC<EnrollmentTableProps> = ({
  requests,
  enrollments,
  processing,
  onApprove,
  onReject,
}) => {
  if (requests && requests.length > 0) {
    return (
      <div style={styles.tableContainer}>
        <h3 style={styles.tableTitle}>Pending Enrollment Requests</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>User Email</th>
              <th style={styles.th}>Course</th>
              <th style={styles.th}>Requested At</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(request => (
              <tr key={request.id}>
                <td style={styles.td}>{request.userEmail}</td>
                <td style={styles.td}>{request.courseTitle}</td>
                <td style={styles.td}>
                  {new Date(request.requestedAt).toLocaleString()}
                </td>
                <td style={styles.td}>
                  {onApprove && (
                    <button
                      style={{ ...styles.actionButton, ...styles.approveButton }}
                      onClick={() => onApprove(request.id)}
                      disabled={processing === request.id}
                    >
                      {processing === request.id ? 'Processing...' : 'Approve'}
                    </button>
                  )}
                  {onReject && (
                    <button
                      style={{ ...styles.actionButton, ...styles.rejectButton }}
                      onClick={() => onReject(request.id)}
                      disabled={processing === request.id}
                    >
                      Reject
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (enrollments !== undefined) {
    return (
      <div style={styles.tableContainer}>
        <h3 style={styles.tableTitle}>All Enrollments</h3>
        {enrollments.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📋</div>
            <div style={styles.emptyText}>No enrollments found</div>
            <div style={styles.emptySubtext}>There are no confirmed enrollments to display.</div>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User Email</th>
                <th style={styles.th}>Course</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Enrolled At</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map(enrollment => (
                <tr key={enrollment.id}>
                  <td style={styles.td}>{enrollment.userEmail}</td>
                  <td style={styles.td}>{enrollment.courseTitle}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        ...(enrollment.status === 'confirmed'
                          ? styles.confirmedBadge
                          : styles.pendingBadge),
                      }}
                    >
                      {enrollment.status || 'pending'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {new Date(enrollment.enrolledAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  return null;
};

const styles: { [key: string]: React.CSSProperties } = {
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  tableTitle: {
    marginTop: 0,
    marginBottom: '1rem',
    color: '#2c3e50',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '0.75rem',
    borderBottom: '2px solid #ddd',
    color: '#2c3e50',
    fontWeight: '600',
  },
  td: {
    padding: '0.75rem',
    borderBottom: '1px solid #eee',
  },
  actionButton: {
    padding: '0.4rem 0.8rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    marginRight: '0.5rem',
  },
  approveButton: {
    backgroundColor: '#27ae60',
    color: 'white',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
    color: 'white',
  },
  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  confirmedBadge: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  pendingBadge: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 2rem',
    color: '#666',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '0.5rem',
  },
  emptySubtext: {
    fontSize: '0.9rem',
    color: '#999',
    fontStyle: 'italic',
  },
};

