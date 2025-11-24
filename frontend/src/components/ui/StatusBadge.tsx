import React from 'react';

interface StatusBadgeProps {
  status: 'pending' | 'confirmed' | 'rejected' | 'unread' | 'read';
  size?: 'small' | 'medium';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'medium' }) => {
  const statusConfig = {
    pending: { bg: '#fff3cd', color: '#856404', text: 'Pending' },
    confirmed: { bg: '#d4edda', color: '#155724', text: 'Confirmed' },
    rejected: { bg: '#f8d7da', color: '#721c24', text: 'Rejected' },
    unread: { bg: '#2196f3', color: '#ffffff', text: 'Unread' },
    read: { bg: '#95a5a6', color: '#ffffff', text: 'Read' },
  };

  const config = statusConfig[status];
  const sizeStyles = size === 'small' ? styles.small : styles.medium;

  return (
    <span style={{ ...styles.badge, ...sizeStyles, backgroundColor: config.bg, color: config.color }}>
      {config.text}
    </span>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  badge: {
    padding: '0.35rem 0.85rem',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'inline-block',
  },
  small: {
    padding: '0.25rem 0.75rem',
    fontSize: '0.75rem',
  },
  medium: {
    padding: '0.35rem 0.85rem',
    fontSize: '0.8rem',
  },
};

