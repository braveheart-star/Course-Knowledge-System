import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { UserDropdown } from './UserDropdown';

interface HeaderProps {
  userName: string;
  pendingCount?: number;
  unreadNotificationCount?: number;
  onLogout: () => void;
  onNotificationClick?: () => void;
  onProfileClick: () => void;
  isAdmin?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  userName, 
  pendingCount,
  unreadNotificationCount,
  onLogout,
  onNotificationClick,
  onProfileClick,
  isAdmin = false,
}) => {
  const router = useRouter();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  const displayCount = isAdmin ? pendingCount : unreadNotificationCount;

  return (
    <header style={styles.header}>
      <h1 
        style={styles.title}
        onClick={() => router.push('/home')}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        title="Go to Home"
      >
        Course Knowledge System
      </h1>
      <div style={styles.userInfo}>
        {onNotificationClick && (
          <div style={styles.iconButtonContainer}>
            <button 
              onClick={onNotificationClick} 
              style={styles.iconButton}
              title="Notifications"
            >
              🔔
              {displayCount !== undefined && displayCount > 0 && (
                <span style={styles.badge}>{displayCount}</span>
              )}
            </button>
          </div>
        )}
        <div style={styles.userNameContainer} ref={userDropdownRef}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            style={styles.userNameButton}
          >
            {userName || 'User'}
          </button>
          <UserDropdown
            isOpen={showUserDropdown}
            onClose={() => setShowUserDropdown(false)}
            onProfileClick={onProfileClick}
            onLogout={onLogout}
          />
        </div>
      </div>
    </header>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    userSelect: 'none',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  iconButtonContainer: {
    position: 'relative',
  },
  iconButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0.5rem',
    position: 'relative',
    color: 'white',
  },
  userNameContainer: {
    position: 'relative',
  },
  userNameButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '0.9rem',
    cursor: 'pointer',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
  },
  badge: {
    position: 'absolute',
    top: '0',
    right: '0',
    backgroundColor: '#e74c3c',
    color: 'white',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #2c3e50',
  },
};

