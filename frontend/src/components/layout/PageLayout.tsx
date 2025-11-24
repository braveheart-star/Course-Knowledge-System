import React from 'react';
import { Header } from '../Header';
import { UserDropdown } from '../UserDropdown';
import { NotificationDropdown } from '../NotificationDropdown';
import { Notification as NotificationBanner } from '../Notification';
import { ChatBot } from '../ChatBot';

interface PageLayoutProps {
  user: any;
  children: React.ReactNode;
  pendingCount?: number;
  unreadCount?: number;
  enrollmentRequests?: any[];
  notifications?: any[];
  showNotificationBanner?: boolean;
  showNotificationDropdown?: boolean;
  showUserDropdown?: boolean;
  processing?: string | null;
  onLogout: () => void;
  onNotificationClick?: () => void;
  onProfileClick: () => void;
  onCloseNotificationBanner: () => void;
  onCloseNotificationDropdown: () => void;
  onCloseUserDropdown: () => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  user,
  children,
  pendingCount,
  unreadCount,
  enrollmentRequests,
  notifications,
  showNotificationBanner,
  showNotificationDropdown,
  showUserDropdown,
  processing,
  onLogout,
  onNotificationClick,
  onProfileClick,
  onCloseNotificationBanner,
  onCloseNotificationDropdown,
  onCloseUserDropdown,
  onApprove,
  onReject,
  onMarkAsRead,
}) => {
  return (
    <div style={styles.container}>
      <Header
        userName={user?.name || user?.email || 'User'}
        pendingCount={user?.role === 'admin' ? pendingCount : undefined}
        unreadNotificationCount={user?.role === 'user' ? unreadCount : undefined}
        onLogout={onLogout}
        onNotificationClick={onNotificationClick}
        onProfileClick={onProfileClick}
        isAdmin={user?.role === 'admin'}
      />

      {showNotificationBanner && (
        <NotificationBanner
          message={`You have ${pendingCount} pending enrollment request${pendingCount && pendingCount > 1 ? 's' : ''}!`}
          onClose={onCloseNotificationBanner}
        />
      )}

      {showNotificationDropdown && (
        <NotificationDropdown
          requests={user?.role === 'admin' ? enrollmentRequests : undefined}
          notifications={user?.role === 'user' ? notifications : undefined}
          isOpen={showNotificationDropdown}
          onClose={onCloseNotificationDropdown}
          onApprove={onApprove}
          onReject={onReject}
          processing={processing}
          isAdmin={user?.role === 'admin'}
          onMarkAsRead={user?.role === 'user' ? onMarkAsRead : undefined}
          totalUnreadCount={user?.role === 'user' ? unreadCount : undefined}
        />
      )}

      {showUserDropdown && (
        <UserDropdown
          onLogout={onLogout}
          isOpen={showUserDropdown}
          onClose={onCloseUserDropdown}
          onProfileClick={onProfileClick}
        />
      )}

      <main style={styles.main}>{children}</main>
      
      {user?.role === 'user' && user?.id && (
        <ChatBot userId={user.id} />
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  main: {
    flex: 1,
    padding: '2rem',
    backgroundColor: '#f5f5f5',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
};

