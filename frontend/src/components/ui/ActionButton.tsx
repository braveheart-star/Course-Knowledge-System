import React from 'react';

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'success' | 'danger' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  size = 'medium',
}) => {
  const variantStyles = {
    primary: { bg: '#3498db', hover: '#2980b9' },
    success: { bg: '#27ae60', hover: '#229954' },
    danger: { bg: '#e74c3c', hover: '#c0392b' },
    secondary: { bg: '#95a5a6', hover: '#7f8c8d' },
  };

  const sizeStyles = {
    small: { padding: '0.4rem 0.8rem', fontSize: '0.85rem' },
    medium: { padding: '0.5rem 1.25rem', fontSize: '0.9rem' },
    large: { padding: '0.75rem 1.5rem', fontSize: '1rem' },
  };

  const style = {
    ...styles.button,
    ...sizeStyles[size],
    backgroundColor: variantStyles[variant].bg,
    opacity: disabled || loading ? 0.6 : 1,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
  };

  return (
    <button
      style={style}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? 'Processing...' : label}
    </button>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  button: {
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontWeight: '500',
    transition: 'background-color 0.2s, opacity 0.2s',
  },
};

