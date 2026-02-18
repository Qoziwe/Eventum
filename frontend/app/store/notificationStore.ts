import { create } from 'zustand';
import { apiClient } from '../api/apiClient';

interface NotificationItem {
  id: string;
  recipientId: string;
  type: string;
  content: string;
  relatedId?: string;
  isRead: boolean;
  timestamp: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;

  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId?: string) => Promise<void>;
  addNotification: (notification: NotificationItem) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const data = (await apiClient('notifications', { method: 'GET' })) as NotificationItem[];
      const unread = data.filter(n => !n.isRead).length;
      set({ notifications: data, unreadCount: unread });
    } catch (error) {
      console.log('Error fetching notifications', error);
    }
  },

  markAsRead: async (notificationId?: string) => {
    try {
      await apiClient('notifications/read', {
        method: 'PUT',
        body: JSON.stringify({ notificationId }),
      });

      set(state => {
        const updatedNotifications = state.notifications.map(n => {
          if (notificationId) {
            return n.id === notificationId ? { ...n, isRead: true } : n;
          } else {
            return { ...n, isRead: true };
          }
        });

        const unread = updatedNotifications.filter(n => !n.isRead).length;
        return { notifications: updatedNotifications, unreadCount: unread };
      });
    } catch (error) {
      console.log('Error marking as read', error);
    }
  },

  addNotification: notification => {
    set(state => {
      const exists = state.notifications.find(n => n.id === notification.id);
      if (exists) return state;

      const newNotifications = [notification, ...state.notifications];
      return {
        notifications: newNotifications,
        unreadCount: state.unreadCount + 1,
      };
    });
  },
}));
