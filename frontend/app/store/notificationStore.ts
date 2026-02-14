import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, apiClient } from '../api/apiClient';

interface NotificationItem {
  id: string;
  recipientId: string;
  type: string; // 'new_event', etc.
  content: string;
  relatedId?: string; // event ID
  isRead: boolean;
  timestamp: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  socket: Socket | null;

  initializeSocket: (userId: string) => Promise<void>;
  disconnectSocket: () => void;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId?: string) => Promise<void>;
  addNotification: (notification: NotificationItem) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  socket: null,

  initializeSocket: async (userId: string) => {
    const currentSocket = get().socket;
    if (currentSocket && currentSocket.connected) return;

    const token = await AsyncStorage.getItem('user-token');
    if (!token) return;

    // Remove /api from BASE_URL for socket connection
    const socketUrl = BASE_URL.replace('/api', '');

    const socket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      query: { userId, token },
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('Notification socket connected');
      // Join specific user room
      socket.emit('join_user_room', { userId });
    });

    socket.on('new_notification', (notification: NotificationItem) => {
      console.log('Received notification:', notification);
      get().addNotification(notification);
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  fetchNotifications: async () => {
    try {
      const data = (await apiClient('notifications', { method: 'GET' })) as NotificationItem[];
      // data is array of notifications
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
