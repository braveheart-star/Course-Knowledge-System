import React from 'react';

interface UserDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileClick: () => void;
  onLogout: () => void;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({
  isOpen,
  onClose,
  onProfileClick,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.dropdown}>
        <button
          style={styles.dropdownItem}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          onClick={() => {
            onProfileClick();
            onClose();
          }}
        >
          Profile
        </button>
        <button
          style={styles.dropdownItem}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          onClick={() => {
            onLogout();
            onClose();
          }}
        >
          Logout
        </button>
      </div>
    </>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '0.5rem',
    backgroundColor: 'white',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    minWidth: '150px',
    zIndex: 999,
    overflow: 'hidden',
  },
  dropdownItem: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: 'none',
    background: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: '#333',
    transition: 'background-color 0.2s',
  },
};

// Add hover effect via inline style
const dropdownItemStyle: React.CSSProperties = {
  ...styles.dropdownItem,
};

// Note: Hover styles should be added via CSS or inline onMouseEnter/onMouseLeave

