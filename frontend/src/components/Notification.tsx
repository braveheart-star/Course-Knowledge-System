import React from 'react';

interface NotificationProps {
  message: string;
  onClose?: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, onClose }) => {
  return (
    <div style={styles.notification}>
      {message}
      {onClose && (
        <button onClick={onClose} style={styles.closeButton}>
          ×
        </button>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  notification: {
    backgroundColor: '#3498db',
    color: 'white',
    padding: '1rem 2rem',
    textAlign: 'center',
    fontWeight: 'bold',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0 0.5rem',
  },
};

