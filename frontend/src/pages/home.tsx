import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { getCurrentUser, logout } from '../services/auth';
import { useNotifications } from '../hooks/useNotifications';
import { useAdminEnrollments } from '../hooks/useEnrollments';
import { useUserEnrollments } from '../hooks/useEnrollments';
import { PageLayout } from '../components/layout/PageLayout';
import { UserHome } from '../components/UserHome';
import { AdminHome } from '../components/AdminHome';
import { disconnectSocket } from '../services/socket';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [adminRefreshTrigger, setAdminRefreshTrigger] = useState(0);
  const [userRefreshTrigger, setUserRefreshTrigger] = useState(0);
  const [processing, setProcessing] = useState<string | null>(null);
  const userEnrollmentsRef = useRef<{ loadEnrolledCourses: () => Promise<void>; loadMyRequests: () => Promise<void> } | null>(null);

  const userEnrollments = useUserEnrollments(user?.id || null);
  userEnrollmentsRef.current = userEnrollments;

  const handleEnrollmentApproved = useCallback(async () => {
    if (userEnrollmentsRef.current) {
      await Promise.all([
        userEnrollmentsRef.current.loadEnrolledCourses(),
        userEnrollmentsRef.current.loadMyRequests(),
      ]);
      setUserRefreshTrigger(prev => prev + 1);
    }
  }, []);

  const handleEnrollmentRejected = useCallback(async () => {
    if (userEnrollmentsRef.current) {
      await userEnrollmentsRef.current.loadMyRequests();
      setUserRefreshTrigger(prev => prev + 1);
    }
  }, []);

  //notifications hook
  const { notifications, unreadCount, loadNotifications, markAsRead } = useNotifications(
    user?.id,
    user?.role,
    3,
    true,
    handleEnrollmentApproved,
    handleEnrollmentRejected
  );

  const {
    enrollmentRequests,
    pendingCount,
    loadEnrollments: loadAdminEnrollments,
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

  useEffect(() => {
    if (user?.role === 'admin' && pendingCount > 0) {
      const prevCount = localStorage.getItem('prevPendingCount');
      if (prevCount && parseInt(prevCount) < pendingCount) {
        setShowNotificationBanner(true);
        setTimeout(() => setShowNotificationBanner(false), 5000);
      }
      localStorage.setItem('prevPendingCount', pendingCount.toString());
    }
  }, [pendingCount, user?.role]);

  const handleApprove = useCallback(async (enrollmentId: string) => {
    setProcessing(enrollmentId);
    try {
      await approveEnrollment(enrollmentId);
      setAdminRefreshTrigger(prev => prev + 1);
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
      setAdminRefreshTrigger(prev => prev + 1);
    } catch (error) {
      alert('Failed to reject enrollment');
    } finally {
      setProcessing(null);
    }
  }, [rejectEnrollment]);

  const handleNotificationClick = useCallback(() => {
    setShowNotificationDropdown(true);
    if (user?.role === 'user') {
      loadNotifications();
    }
  }, [user?.role, loadNotifications]);

  const handleLogout = useCallback(() => {
    disconnectSocket();
    logout();
    router.push('/signin');
  }, [router]);

  const handleProfileClick = useCallback(() => {
    router.push('/profile');
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
      showNotificationBanner={showNotificationBanner}
      showNotificationDropdown={showNotificationDropdown}
      showUserDropdown={showUserDropdown}
      processing={processing}
      onLogout={handleLogout}
      onNotificationClick={handleNotificationClick}
      onProfileClick={handleProfileClick}
      onCloseNotificationBanner={() => setShowNotificationBanner(false)}
      onCloseNotificationDropdown={() => setShowNotificationDropdown(false)}
      onCloseUserDropdown={() => setShowUserDropdown(false)}
      onApprove={handleApprove}
      onReject={handleReject}
      onMarkAsRead={markAsRead}
    >
      {user?.role === 'user' && <UserHome refreshTrigger={userRefreshTrigger} />}
      {user?.role === 'admin' && <AdminHome refreshTrigger={adminRefreshTrigger} />}
    </PageLayout>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '1.2rem',
  },
};
