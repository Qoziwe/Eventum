import { create } from 'zustand';
import { apiClient } from '../api/apiClient';
import SocketManager from '../services/SocketManager';

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  pending?: boolean;
}

export interface Conversation {
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string;
  lastMessage: string;
  lastMessageTimestamp: string;
  isRead: boolean;
  isOnline?: boolean;
  lastSeen?: string;
}

interface ChatState {
  activeChatMessages: Message[];
  activeChatUser: string | null;
  activeChatTypingStatus: boolean;
  conversations: Conversation[];

  joinChat: (recipientId: string) => Promise<void>;
  leaveChat: () => void;
  sendMessage: (content: string, senderId: string) => void;

  fetchChatHistory: (recipientId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  confirmMessage: (message: Message) => void;
  setTypingStatus: (status: boolean) => void;

  fetchConversations: () => Promise<void>;
  updateConversationStatus: (
    userId: string,
    isOnline: boolean,
    lastSeen?: string
  ) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeChatMessages: [],
  activeChatUser: null,
  activeChatTypingStatus: false,
  conversations: [],

  joinChat: async (recipientId: string) => {
    set({ activeChatUser: recipientId, activeChatMessages: [], activeChatTypingStatus: false });
    await get().fetchChatHistory(recipientId);
    // Notify server we entered chat with this user
    SocketManager.emit('enter_chat', { targetUserId: recipientId });
  },

  leaveChat: () => {
    const { activeChatUser } = get();
    if (activeChatUser) {
      SocketManager.emit('leave_chat');
      SocketManager.emit('stop_typing', { recipientId: activeChatUser });
    }
    set({ activeChatUser: null, activeChatMessages: [], activeChatTypingStatus: false });
  },

  fetchChatHistory: async (recipientId: string) => {
    try {
      const msgs = await apiClient(`chat/${recipientId}`, { method: 'GET' });
      set({ activeChatMessages: msgs as any });

      // Mark as read
      await apiClient('chat/read', {
        method: 'POST',
        body: JSON.stringify({ senderId: recipientId }),
      });
    } catch (e) {
      console.error('Failed to fetch chat history', e);
    }
  },

  // Optimistic send: immediately add a pending message, then emit via socket
  sendMessage: (content: string, senderId: string) => {
    const { activeChatUser, activeChatMessages } = get();
    if (!activeChatUser) return;

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId,
      recipientId: activeChatUser,
      content,
      timestamp: new Date().toISOString(),
      isRead: false,
      pending: true,
    };

    // Instantly show in UI
    set({ activeChatMessages: [...activeChatMessages, tempMessage] });

    // Send to server via the single socket
    SocketManager.emit('private_message', {
      senderId,
      recipientId: activeChatUser,
      content,
    });
  },

  addMessage: (msg: Message) => {
    set(state => ({ activeChatMessages: [...state.activeChatMessages, msg] }));
    get().fetchConversations();
  },

  confirmMessage: (msg: Message) => {
    set(state => {
      const cleanMessages = state.activeChatMessages.filter(m => !m.pending);
      if (cleanMessages.some(m => m.id === msg.id)) return state;
      return { activeChatMessages: [...cleanMessages, msg] };
    });
    get().fetchConversations();
  },

  setTypingStatus: (status: boolean) => {
    set({ activeChatTypingStatus: status });
  },

  fetchConversations: async () => {
    try {
      const res = await apiClient('chats/conversations', { method: 'GET' });
      set({ conversations: (res as any) || [] });
    } catch (e) {
      console.error('Failed fetch conversations', e);
    }
  },

  updateConversationStatus: (userId, isOnline, lastSeen) => {
    set(state => ({
      conversations: state.conversations.map(c =>
        c.userId === userId ? { ...c, isOnline, lastSeen: lastSeen || c.lastSeen } : c
      ),
    }));
  },
}));
