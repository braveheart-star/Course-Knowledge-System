import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { getCurrentUser, logout } from '../services/auth';
import { useNotifications } from '../hooks/useNotifications';
import { useAdminEnrollments } from '../hooks/useEnrollments';
import { PageLayout } from '../components/layout/PageLayout';
import { NotificationCard } from '../components/ui/NotificationCard';
import { RequestCard } from '../components/ui/RequestCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ActionButton } from '../components/ui/ActionButton';

export default function Notifications() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [processing, setProcessing] = useState<string | null>(null);

  const { notifications, unreadCount, markAsRead } = useNotifications(
    user?.id,
    user?.role
  );

  const {
    enrollmentRequests,
    pendingCount,
    approve: approveEnrollment,
    reject: rejectEnrollment,
  } = useAdminEnrollments(user?.id, user?.role);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = getCurrentUser();
        if (!userData) {
          router.push('/signin');
          return;
        }
        setUser(userData);
      } catch (error) {
        router.push('/signin');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const handleApprove = useCallback(async (enrollmentId: string) => {
    setProcessing(enrollmentId);
    try {
      await approveEnrollment(enrollmentId);
    } catch (error) {
      alert('Failed to approve enrollment');
    } finally {
      setProcessing(null);
    }
  }, [approveEnrollment]);

  const handleReject = useCallback(async (enrollmentId: string) => {
    setProcessing(enrollmentId);
    try {
      await rejectEnrollment(enrollmentId);
    } catch (error) {
      alert('Failed to reject enrollment');
    } finally {
      setProcessing(null);
    }
  }, [rejectEnrollment]);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [markAsRead]);

  const handleLogout = useCallback(() => {
    logout();
    router.push('/signin');
  }, [router]);

  const handleProfileClick = useCallback(() => {
    router.push('/profile');
  }, [router]);

  const handleNotificationClick = useCallback(() => {
    router.push('/home');
  }, [router]);

  const displayCount = useMemo(() => {
    return user?.role === 'admin' ? pendingCount : (unreadCount > 0 ? unreadCount : undefined);
  }, [user?.role, pendingCount, unreadCount]);

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <PageLayout
      user={user}
      pendingCount={pendingCount}
      unreadCount={unreadCount}
      enrollmentRequests={enrollmentRequests}
      notifications={notifications}
      showNotificationBanner={false}
      showNotificationDropdown={false}
      showUserDropdown={false}
      processing={processing}
      onLogout={handleLogout}
      onNotificationClick={handleNotificationClick}
      onProfileClick={handleProfileClick}
      onCloseNotificationBanner={() => {}}
      onCloseNotificationDropdown={() => {}}
      onCloseUserDropdown={() => {}}
      onApprove={handleApprove}
      onReject={handleReject}
      onMarkAsRead={handleMarkAsRead}
    >
      <div style={styles.notificationsCard}>
        <div style={styles.headerSection}>
          <h2 style={styles.title}>Notifications</h2>
          {user?.role === 'user' && unreadCount > 0 && (
            <div style={styles.unreadIndicator}>
              {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {user?.role === 'admin' ? (
          enrollmentRequests.length === 0 ? (
            <EmptyState icon="📋" title="No pending enrollment requests" />
          ) : (
            <div style={styles.notificationsContainer}>
              {enrollmentRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  id={request.id}
                  userEmail={request.userEmail}
                  courseTitle={request.courseTitle}
                  requestedAt={request.requestedAt}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  processing={processing === request.id}
                />
              ))}
            </div>
          )
        ) : (
          notifications.length === 0 ? (
            <EmptyState icon="🔔" title="No notifications" />
          ) : (
            <div style={styles.notificationsContainer}>
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  id={notification.id}
                  title={notification.title}
                  message={notification.message}
                  createdAt={notification.createdAt}
                  read={notification.read || 0}
                  onMarkAsRead={handleMarkAsRead}
                  variant="user"
                />
              ))}
            </div>
          )
        )}

        <div style={styles.footerSection}>
          <ActionButton
            label="Back to Home"
            onClick={() => router.push('/home')}
            variant="secondary"
            size="large"
          />
        </div>
      </div>
    </PageLayout>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  notificationsCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '1200px',
  },
  headerSection: {
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #eee',
  },
  title: {
    marginTop: 0,
    marginBottom: '0.5rem',
    color: '#2c3e50',
    fontSize: '1.75rem',
  },
  unreadIndicator: {
    fontSize: '0.9rem',
    color: '#2196f3',
    fontWeight: '500',
  },
  notificationsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2rem',
  },
  footerSection: {
    paddingTop: '1.5rem',
    borderTop: '2px solid #eee',
    textAlign: 'center',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '1.2rem',
  },
};
