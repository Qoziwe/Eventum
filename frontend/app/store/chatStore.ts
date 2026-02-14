import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, BASE_URL } from '../api/apiClient';

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
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
  socket: Socket | null;
  activeChatMessages: Message[];
  activeChatUser: string | null; // userId of the person we are chatting with
  activeChatTypingStatus: boolean;
  
  connectSocket: (userId: string) => Promise<void>;
  disconnectSocket: () => void;
  
  joinChat: (recipientId: string) => Promise<void>;
  sendMessage: (content: string) => void;
  leaveChat: () => void;
  
  fetchChatHistory: (recipientId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  
  conversations: Conversation[];
  fetchConversations: () => Promise<void>;
  updateConversationStatus: (userId: string, isOnline: boolean, lastSeen?: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  activeChatMessages: [],
  activeChatUser: null,
  activeChatTypingStatus: false,
  conversations: [],

  connectSocket: async (userId: string) => {
    const { socket } = get();
    if (socket && socket.connected) return;

    const token = await AsyncStorage.getItem('user-token');
    if (!token) {
        console.warn('Socket connection aborted: No token');
        return;
    }

    // Adjust URL if needed. Usually API_URL is base (e.g. http://localhost:5000/api), 
    // but socket needs host (http://localhost:5000)
    const socketUrl = BASE_URL.replace('/api', ''); 
    
    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      query: { userId, token },
      auth: { token } // Some libraries use auth, some query. Sending both for compatibility.
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      newSocket.emit('join_user_room', { userId });
    });

    newSocket.on('message_received', (msg: Message) => {
      const { activeChatUser, activeChatMessages } = get();
      // If we are currently chatting with the sender, add to list
      // Also if we are the sender (echo), add to list
      if (activeChatUser === msg.senderId || activeChatUser === msg.recipientId) {
        set({ activeChatMessages: [...activeChatMessages, msg] });
        
        // Mark read if we are viewing
        if (msg.senderId === activeChatUser) {
           apiClient('chat/read', {
             method: 'POST', 
             body: JSON.stringify({ senderId: activeChatUser })
           });
        }
      }
      
      // Always refresh conversations list to show new message/unread count
      get().fetchConversations();
    });
    
    // Also listen for sent messages to update sender's UI immediately if confirmed by server
    newSocket.on('message_sent', (msg: Message) => {
       const { activeChatUser, activeChatMessages } = get();
       if (activeChatUser === msg.recipientId) {
          // Check duplicates just in case optimistic UI is used later
          if (!activeChatMessages.some(m => m.id === msg.id)) {
             set({ activeChatMessages: [...activeChatMessages, msg] });
          }
       }
    });

    newSocket.on('user_typing', (data: { userId: string }) => {
       const { activeChatUser } = get();
       if (activeChatUser === data.userId) {
          set({ activeChatTypingStatus: true });
       }
    });

    newSocket.on('user_stop_typing', (data: { userId: string }) => {
       const { activeChatUser } = get();
       if (activeChatUser === data.userId) {
          set({ activeChatTypingStatus: false });
       }
    });

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  joinChat: async (recipientId: string) => {
    set({ activeChatUser: recipientId, activeChatMessages: [] });
    await get().fetchChatHistory(recipientId);
  },

  leaveChat: () => {
    set({ activeChatUser: null, activeChatMessages: [] });
  },

  fetchChatHistory: async (recipientId: string) => {
    try {
      const msgs = await apiClient(`chat/${recipientId}`, { method: 'GET' });
      set({ activeChatMessages: msgs as any });
      
      // Mark as read
      await apiClient('chat/read', {
         method: 'POST',
         body: JSON.stringify({ senderId: recipientId })
      });
    } catch (e) {
      console.error("Failed to fetch chat history", e);
    }
  },

  sendMessage: (content: string) => {
    const { socket, activeChatUser, activeChatMessages } = get();
    // Getting current user ID is tricky here without importing useUserStore directly or passing it.
    // However, socket event 'private_message' expects senderId.
    // We can assume the component handles calling this with senderId, OR we depend on userStore.
    // To keep stores independent, better to pass senderId or handle it in component. 
    // BUT, standard pattern is to have senderId available.
    // Let's rely on component for now to emit, OR import userStore statically (might cause cycles).
    
    // Actually, let's look at how we implemented App.tsx. 
    // We can import userStore inside the function to avoid cycle.
    const userStore = require('./userStore').useUserStore.getState();
    const senderId = userStore.user.id;
    
    if (!socket || !activeChatUser) return;
    
    const payload = {
      senderId,
      recipientId: activeChatUser,
      content
    };
    
    socket.emit('private_message', payload);
    
    // Optimistic update could happen here, but we wait for server echo 'message_sent' for simplicity and id correctness
  },
  
  addMessage: (msg: Message) => {
     set(state => ({ activeChatMessages: [...state.activeChatMessages, msg] }));
     get().fetchConversations(); // Update list on new msg
  },
  
  fetchConversations: async () => {
    try {
      const res = await apiClient('chats/conversations', { method: 'GET' });
      set({ conversations: (res as any) || [] });
    } catch (e) {
      console.error("Failed fetch conversations", e);
    }
  },

  updateConversationStatus: (userId, isOnline, lastSeen) => {
    set(state => ({
      conversations: state.conversations.map(c => 
        c.userId === userId 
          ? { ...c, isOnline, lastSeen: lastSeen || c.lastSeen } 
          : c
      )
    }));
  }
}));
