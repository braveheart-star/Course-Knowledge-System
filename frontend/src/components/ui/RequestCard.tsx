import React from 'react';
import { StatusBadge } from './StatusBadge';
import { ActionButton } from './ActionButton';

interface RequestCardProps {
  id: string;
  userEmail: string;
  courseTitle: string;
  requestedAt: string;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  processing?: boolean;
}

export const RequestCard: React.FC<RequestCardProps> = ({
  id,
  userEmail,
  courseTitle,
  requestedAt,
  onApprove,
  onReject,
  processing = false,
}) => {
  return (
    <div style={styles.card}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h3 style={styles.title}>Enrollment Request</h3>
          <StatusBadge status="pending" size="small" />
        </div>
        <p style={styles.message}>
          <strong>{userEmail}</strong> requested to enroll in <strong>{courseTitle}</strong>
        </p>
        <div style={styles.footer}>
          <span style={styles.date}>{new Date(requestedAt).toLocaleString()}</span>
          <div style={styles.actions}>
            {onApprove && (
              <ActionButton
                label="Approve"
                onClick={() => onApprove(id)}
                variant="success"
                size="small"
                disabled={processing}
                loading={processing}
              />
            )}
            {onReject && (
              <ActionButton
                label="Reject"
                onClick={() => onReject(id)}
                variant="danger"
                size="small"
                disabled={processing}
                loading={processing}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    borderRadius: '10px',
    padding: '1.5rem',
    backgroundColor: '#fff3cd',
    border: '2px solid #ff9800',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
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
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
};

