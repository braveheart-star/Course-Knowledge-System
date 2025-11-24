import { useState, useEffect, useCallback } from 'react';
import { getNotifications, getUnreadNotificationCount, markNotificationAsRead, Notification } from '../services/enrollments';
import { connectSocket } from '../services/socket';

export const useNotifications = (
  userId: string | null, 
  role: string | null, 
  limit?: number, 
  unreadOnly?: boolean,
  onEnrollmentApproved?: () => void,
  onEnrollmentRejected?: () => void
) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!userId || role !== 'user') return;
    
    setLoading(true);
    setError(null);
    try {
      const [notifs, unread] = await Promise.all([
        getNotifications(limit, unreadOnly),
        getUnreadNotificationCount(),
      ]);
      
      setNotifications(prev => {
        const hasNewApproval = notifs.some(
          notif => 
            notif.type === 'enrollment_approved' && 
            !prev.find(p => p.id === notif.id)
        );
        
        const hasNewRejection = notifs.some(
          notif => 
            notif.type === 'enrollment_rejected' && 
            !prev.find(p => p.id === notif.id)
        );
        
        if (hasNewApproval && onEnrollmentApproved) {
          setTimeout(() => onEnrollmentApproved(), 0);
        }
        
        if (hasNewRejection && onEnrollmentRejected) {
          setTimeout(() => onEnrollmentRejected(), 0);
        }
        
        return notifs;
      });
      
      setUnreadCount(unread);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, role, limit, unreadOnly, onEnrollmentApproved, onEnrollmentRejected]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      await loadNotifications();
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId || role !== 'user') {
      return;
    }

    loadNotifications();

    const socket = connectSocket();
    if (!socket) {
      return;
    }

    const handleUpdate = async () => {
      try {
        const [notifs, unread] = await Promise.all([
          getNotifications(limit, unreadOnly),
          getUnreadNotificationCount(),
        ]);
        
        setNotifications(prev => {
          const hasNewApproval = notifs.some(
            notif => 
              notif.type === 'enrollment_approved' && 
              !prev.find(p => p.id === notif.id)
          );
          
          const hasNewRejection = notifs.some(
            notif => 
              notif.type === 'enrollment_rejected' && 
              !prev.find(p => p.id === notif.id)
          );
          
          if (hasNewApproval && onEnrollmentApproved) {
            setTimeout(() => onEnrollmentApproved(), 0);
          }
          
          if (hasNewRejection && onEnrollmentRejected) {
            setTimeout(() => onEnrollmentRejected(), 0);
          }
          
          return notifs;
        });
        
        setUnreadCount(unread);
      } catch (err: any) {
        console.error('Error updating notifications:', err);
      }
    };

    socket.on('notification:update', handleUpdate);

    return () => {
      socket.off('notification:update', handleUpdate);
    };
  }, [userId, role, limit, unreadOnly, onEnrollmentApproved, onEnrollmentRejected]);

  return { notifications, unreadCount, loading, error, loadNotifications, markAsRead };
};

