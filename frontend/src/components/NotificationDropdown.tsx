import React from 'react';
import { useRouter } from 'next/router';
import { EnrollmentRequest, Notification } from '../services/enrollments';

interface NotificationDropdownProps {
  requests?: EnrollmentRequest[];
  notifications?: Notification[];
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (enrollmentId: string) => void;
  onReject?: (enrollmentId: string) => void;
  processing?: string | null;
  isAdmin?: boolean;
  onMarkAsRead?: (notificationId: string) => void;
  totalUnreadCount?: number;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  requests,
  notifications,
  isOpen,
  onClose,
  onApprove,
  onReject,
  processing,
  isAdmin = false,
  onMarkAsRead,
  totalUnreadCount,
}) => {
  const router = useRouter();
  
  // For admin: show unhandled requests (pending status)
  const unhandledRequests = requests?.filter(r => r.status === 'pending' || r.status === null) || [];
  const displayedRequests = unhandledRequests.slice(0, 3);
  const hasMoreRequests = unhandledRequests.length > 3; // Show if more than 3 (i.e., 4+)
  
  // For user: show unread notifications
  const unreadNotifications = notifications?.filter(n => n.read === 0) || [];
  const displayedNotifications = unreadNotifications.slice(0, 3);
  // Show "Show More" if total unread count is more than 3 (i.e., 4+)
  const hasMoreNotifications = totalUnreadCount !== undefined && totalUnreadCount > 3;

  if (!isOpen) return null;

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.dropdown}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            {isAdmin ? 'Pending Enrollment Requests' : 'Notifications'}
          </h3>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div style={styles.content}>
          {isAdmin ? (
            displayedRequests.length === 0 ? (
              <div style={styles.emptyState}>No pending requests</div>
            ) : (
              <>
                <div style={styles.requestsList}>
                  {displayedRequests.map((request) => (
                    <div key={request.id} style={styles.requestItem}>
                      <div style={styles.requestInfo}>
                        <div style={styles.userEmail}>{request.userEmail}</div>
                        <div style={styles.courseTitle}>{request.courseTitle}</div>
                        <div style={styles.requestedAt}>
                          {new Date(request.requestedAt).toLocaleString()}
                        </div>
                      </div>
                      <div style={styles.actions}>
                        <button
                          style={{ ...styles.actionButton, ...styles.approveButton }}
                          onClick={() => onApprove && onApprove(request.id)}
                          disabled={processing === request.id}
                        >
                          {processing === request.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          style={{ ...styles.actionButton, ...styles.rejectButton }}
                          onClick={() => onReject && onReject(request.id)}
                          disabled={processing === request.id}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {hasMoreRequests && (
                  <div style={styles.showMoreContainer}>
                    <button
                      style={styles.showMoreButton}
                      onClick={() => {
                        onClose();
                        router.push('/notifications');
                      }}
                    >
                      Show More
                    </button>
                  </div>
                )}
              </>
            )
          ) : (
            displayedNotifications.length === 0 ? (
              <div style={styles.emptyState}>No new notifications</div>
            ) : (
              <>
                <div style={styles.notificationsList}>
                  {displayedNotifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      style={styles.notificationItem}
                    >
                      <div style={styles.notificationContent}>
                        <div style={styles.notificationTitle}>{notification.title}</div>
                        <div style={styles.notificationText}>{notification.message}</div>
                        <div style={styles.notificationTime}>
                          {new Date(notification.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {onMarkAsRead && (
                        <button
                          style={styles.markReadButton}
                          onClick={() => onMarkAsRead(notification.id)}
                          title="Mark as read"
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {hasMoreNotifications && (
                  <div style={styles.showMoreContainer}>
                    <button
                      style={styles.showMoreButton}
                      onClick={() => {
                        onClose();
                        router.push('/notifications');
                      }}
                    >
                      Show More
                    </button>
                  </div>
                )}
              </>
            )
          )}
        </div>
      </div>
    </>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  dropdown: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '1.5rem',
    borderBottom: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    color: '#2c3e50',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '2rem',
    color: '#666',
    cursor: 'pointer',
    padding: 0,
    width: '2rem',
    height: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: '1rem',
    overflowY: 'auto',
    flex: 1,
  },
  emptyState: {
    textAlign: 'center',
    color: '#999',
    padding: '2rem',
    fontStyle: 'italic',
  },
  requestsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  requestItem: {
    padding: '1rem',
    border: '1px solid #eee',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestInfo: {
    flex: 1,
  },
  userEmail: {
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '0.25rem',
  },
  courseTitle: {
    color: '#555',
    marginBottom: '0.25rem',
  },
  requestedAt: {
    fontSize: '0.85rem',
    color: '#999',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  actionButton: {
    padding: '0.5rem 1rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  approveButton: {
    backgroundColor: '#27ae60',
    color: 'white',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
    color: 'white',
  },
  notificationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  notificationItem: {
    padding: '1.25rem',
    border: '2px solid #2196f3',
    borderRadius: '8px',
    backgroundColor: '#e3f2fd',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
    boxShadow: '0 2px 4px rgba(33, 150, 243, 0.1)',
    transition: 'all 0.2s ease',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontWeight: '600',
    color: '#1565c0',
    marginBottom: '0.5rem',
    fontSize: '1rem',
  },
  notificationText: {
    color: '#424242',
    marginBottom: '0.5rem',
    lineHeight: '1.5',
  },
  notificationTime: {
    fontSize: '0.8rem',
    color: '#757575',
    fontStyle: 'italic',
  },
  markReadButton: {
    padding: '0.5rem 0.75rem',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#27ae60',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem',
    marginLeft: '1rem',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    minWidth: '40px',
  },
  showMoreContainer: {
    padding: '1rem 1.5rem',
    borderTop: '2px solid #eee',
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
    marginTop: '0.5rem',
  },
  showMoreButton: {
    padding: '0.75rem 2rem',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#3498db',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    boxShadow: '0 2px 4px rgba(52, 152, 219, 0.2)',
  },
};
