import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/apiClient';
import { useChatStore } from '../store/chatStore';
import { useNotificationStore } from '../store/notificationStore';
import { useDiscussionStore } from '../store/discussionStore';
import { useUserStore } from '../store/userStore';

const SOCKET_URL = BASE_URL.replace('/api', '');

class SocketManagerClass {
  private socket: Socket | null = null;
  private userId: string | null = null;

  /**
   * Connect to the server with a single WebSocket connection.
   * Must be called after user authentication.
   */
  async connect(): Promise<void> {
    // Don't create duplicate connections
    if (this.socket?.connected) return;

    const token = await AsyncStorage.getItem('user-token');
    if (!token) {
      console.warn('[SocketManager] No token found, aborting connection');
      return;
    }

    // Store userId for later use
    const userState = useUserStore.getState();
    this.userId = userState.user?.id || null;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      forceNew: true,
      query: { token },
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.registerGlobalListeners();
  }

  /**
   * Disconnect the socket and clean up.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
    }
  }

  /**
   * Emit an event through the single socket connection.
   */
  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.warn(`[SocketManager] Cannot emit '${event}': socket not connected`);
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * Get the raw socket instance for screens that need to add
   * temporary, per-screen listeners (e.g. typing indicators).
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if the socket is currently connected.
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ── Private ────────────────────────────────────────────────

  private registerGlobalListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[SocketManager] Connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketManager] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[SocketManager] Connection error:', err.message);
    });

    // ── Chat Messages ──────────────────────────────────────

    this.socket.on('message_received', (msg: any) => {
      const chatState = useChatStore.getState();
      const { activeChatUser, activeChatMessages } = chatState;

      // If message belongs to the active chat, add it
      if (activeChatUser === msg.senderId || activeChatUser === msg.recipientId) {
        const exists = activeChatMessages.some((m: any) => m.id === msg.id);
        if (!exists) {
          useChatStore.setState({
            activeChatMessages: [...activeChatMessages, msg],
          });
        }

        // If I'm viewing a chat with the sender, mark as read
        if (msg.senderId === activeChatUser) {
          const { apiClient } = require('../api/apiClient');
          apiClient('chat/read', {
            method: 'POST',
            body: JSON.stringify({ senderId: activeChatUser }),
          }).catch(() => {});
        }
      }

      chatState.fetchConversations();
    });

    this.socket.on('message_sent', (msg: any) => {
      const chatState = useChatStore.getState();
      const { activeChatUser, activeChatMessages } = chatState;

      if (activeChatUser === msg.recipientId) {
        // Replace pending messages with the confirmed version
        const cleanMessages = activeChatMessages.filter((m: any) => !m.pending);
        if (!cleanMessages.some((m: any) => m.id === msg.id)) {
          useChatStore.setState({
            activeChatMessages: [...cleanMessages, msg],
          });
        }
      }

      chatState.fetchConversations();
    });

    // ── Typing Indicators ──────────────────────────────────

    this.socket.on('user_typing', (data: { userId: string }) => {
      const { activeChatUser } = useChatStore.getState();
      if (activeChatUser === data.userId) {
        useChatStore.setState({ activeChatTypingStatus: true });
      }
    });

    this.socket.on('user_stop_typing', (data: { userId: string }) => {
      const { activeChatUser } = useChatStore.getState();
      if (activeChatUser === data.userId) {
        useChatStore.setState({ activeChatTypingStatus: false });
      }
    });

    // ── User Status ────────────────────────────────────────

    this.socket.on('user_status_update', (data: { userId: string; isOnline: boolean; lastSeen?: string }) => {
      useChatStore.getState().updateConversationStatus(data.userId, data.isOnline, data.lastSeen);
      useUserStore.getState().updateFriendStatus(data.userId, data.isOnline, data.lastSeen);
    });

    // ── Friend Requests ────────────────────────────────────

    this.socket.on('friend_request', () => {
      useUserStore.getState().fetchFriends();
    });

    // ── Notifications ──────────────────────────────────────

    this.socket.on('new_notification', (notification: any) => {
      console.log('[SocketManager] New notification:', notification);
      useNotificationStore.getState().addNotification(notification);
    });

    // ── Discussion / Comments ──────────────────────────────

    this.socket.on('new_comment', (comment: any) => {
      useDiscussionStore.getState().handleIncomingComment(comment.postId, comment);
    });

    this.socket.on('vote_update', (data: any) => {
      useDiscussionStore.getState().handleVoteUpdate(data);
    });
  }
}

// Export a single global instance
const SocketManager = new SocketManagerClass();
export default SocketManager;
