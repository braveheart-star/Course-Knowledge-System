import React from 'react';
import { StatusBadge } from './StatusBadge';
import { ActionButton } from './ActionButton';

interface NotificationCardProps {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: number;
  onMarkAsRead?: (id: string) => void;
  variant?: 'user' | 'admin';
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  id,
  title,
  message,
  createdAt,
  read,
  onMarkAsRead,
  variant = 'user',
}) => {
  const isUnread = read === 0;
  const cardStyle = variant === 'admin' 
    ? styles.adminCard 
    : (isUnread ? styles.unreadCard : styles.readCard);

  return (
    <div style={{ ...styles.card, ...cardStyle }}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          {variant === 'user' && (
            <StatusBadge status={isUnread ? 'unread' : 'read'} size="small" />
          )}
          {variant === 'admin' && (
            <StatusBadge status="pending" size="small" />
          )}
        </div>
        <p style={styles.message}>{message}</p>
        <div style={styles.footer}>
          <span style={styles.date}>{new Date(createdAt).toLocaleString()}</span>
          {variant === 'user' && isUnread && onMarkAsRead && (
            <ActionButton
              label="Mark as Read"
              onClick={() => onMarkAsRead(id)}
              variant="success"
              size="small"
            />
          )}
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    borderRadius: '10px',
    padding: '1.5rem',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
  },
  adminCard: {
    backgroundColor: '#fff3cd',
    border: '2px solid #ff9800',
  },
  unreadCard: {
    backgroundColor: '#e3f2fd',
    border: '2px solid #2196f3',
  },
  readCard: {
    backgroundColor: '#f9f9f9',
    border: '1px solid #e0e0e0',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1565c0',
  },
  message: {
    color: '#424242',
    lineHeight: '1.6',
    margin: 0,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.5rem',
  },
  date: {
    fontSize: '0.85rem',
    color: '#757575',
    fontStyle: 'italic',
  },
};

