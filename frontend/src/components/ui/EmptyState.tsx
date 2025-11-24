import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon = '📋', title, message }) => {
  return (
    <div style={styles.container}>
      {icon && <div style={styles.icon}>{icon}</div>}
      <div style={styles.title}>{title}</div>
      {message && <div style={styles.message}>{message}</div>}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    textAlign: 'center',
    padding: '3rem 2rem',
    color: '#666',
  },
  icon: {
    fontSize: '3rem',
    marginBottom: '1rem',
    opacity: 0.5,
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '0.5rem',
  },
  message: {
    fontSize: '0.9rem',
    color: '#999',
    fontStyle: 'italic',
  },
};

