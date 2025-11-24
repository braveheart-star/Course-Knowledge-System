import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getCurrentUser, logout } from '../services/auth';
import { useAdminEnrollments } from '../hooks/useEnrollments';
import { PageLayout } from '../components/layout/PageLayout';
import { ActionButton } from '../components/ui/ActionButton';

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  const { pendingCount } = useAdminEnrollments(user?.id || null, user?.role || null);

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

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <PageLayout
      user={user}
      pendingCount={user?.role === 'admin' ? pendingCount : undefined}
      showNotificationBanner={false}
      showNotificationDropdown={false}
      showUserDropdown={false}
      onLogout={handleLogout}
      onProfileClick={handleProfileClick}
      onNotificationClick={user?.role === 'admin' ? handleNotificationClick : undefined}
      onCloseNotificationBanner={() => {}}
      onCloseNotificationDropdown={() => {}}
      onCloseUserDropdown={() => {}}
    >
      <div style={styles.profileCard}>
        <h2 style={styles.title}>Profile</h2>
        <div style={styles.profileInfo}>
          <div style={styles.infoRow}>
            <span style={styles.label}>Name:</span>
            <span style={styles.value}>{user?.name || 'Not set'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Email:</span>
            <span style={styles.value}>{user?.email}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Role:</span>
            <span style={styles.value}>{user?.role}</span>
          </div>
        </div>
        <div style={styles.buttonContainer}>
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
  profileCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '500px',
    margin: '0 auto',
  },
  title: {
    marginTop: 0,
    marginBottom: '2rem',
    color: '#2c3e50',
  },
  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: '1rem',
    borderBottom: '1px solid #eee',
  },
  label: {
    fontWeight: '600',
    color: '#555',
  },
  value: {
    color: '#2c3e50',
  },
  buttonContainer: {
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
