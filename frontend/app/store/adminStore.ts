import { create } from 'zustand';
import { apiClient } from '../api/apiClient';

interface DashboardStats {
  users: { total: number; organizers: number; explorers: number; banned: number };
  events: { total: number; pending: number; approved: number; rejected: number };
  posts: { total: number; pending: number; approved: number; rejected: number };
  tickets: number;
  messages: number;
  totalRevenue: number;
}

interface AdminEvent {
  id: string;
  title: string;
  fullDescription?: string;
  organizerName: string;
  organizerAvatar?: string;
  organizerId: string;
  vibe?: string;
  district?: string;
  ageLimit?: number;
  tags?: string[];
  categories?: string[];
  priceValue?: number;
  location?: string;
  image?: string;
  views: number;
  timestamp?: number;
  date: string;
  moderationStatus: string;
  rejectionReason?: string;
  addedAt?: string;
}

interface AdminPost {
  id: string;
  categorySlug?: string;
  categoryName?: string;
  authorId: string;
  authorName: string;
  content: string;
  upvotes: number;
  downvotes: number;
  ageLimit?: number;
  timestamp: string;
  commentCount: number;
  moderationStatus: string;
  rejectionReason?: string;
}

interface AdminUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
  userType: string;
  location?: string;
  bio?: string;
  isBanned: boolean;
  banReason?: string;
  isAdmin: boolean;
  registeredAt?: string;
  eventsCount: number;
  postsCount: number;
  followersCount: number;
}

interface AnalyticsDataPoint {
  date: string;
  count: number;
}

interface OverviewAnalytics {
  topCategories: { name: string; count: number }[];
  topOrganizers: { id: string; name: string; avatarUrl: string; eventsCount: number }[];
  userTypeDistribution: { type: string; count: number }[];
  vibeDistribution: { name: string; count: number }[];
  totalViews: number;
  averageEventPrice: number;
  freeEventsCount: number;
  paidEventsCount: number;
}

interface AdminState {
  dashboard: DashboardStats | null;
  events: AdminEvent[];
  posts: AdminPost[];
  users: AdminUser[];
  registrationAnalytics: AnalyticsDataPoint[];
  eventsCreatedAnalytics: AnalyticsDataPoint[];
  overview: OverviewAnalytics | null;
  isLoading: boolean;

  fetchDashboard: () => Promise<void>;
  fetchEvents: (filters?: Record<string, string>) => Promise<void>;
  moderateEvent: (id: string, action: string, reason?: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  fetchPosts: (filters?: Record<string, string>) => Promise<void>;
  moderatePost: (id: string, action: string, reason?: string) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  fetchUsers: (filters?: Record<string, string>) => Promise<void>;
  banUser: (id: string, action: string, reason?: string) => Promise<void>;
  changeUserRole: (id: string, userType: string) => Promise<void>;
  fetchRegistrationAnalytics: (days?: number) => Promise<void>;
  fetchEventsCreatedAnalytics: (days?: number) => Promise<void>;
  fetchOverview: () => Promise<void>;
}

export const useAdminStore = create<AdminState>()((set, get) => ({
  dashboard: null,
  events: [],
  posts: [],
  users: [],
  registrationAnalytics: [],
  eventsCreatedAnalytics: [],
  overview: null,
  isLoading: false,

  fetchDashboard: async () => {
    try {
      set({ isLoading: true });
      const data = await apiClient('admin/dashboard', { method: 'GET' });
      set({ dashboard: data as DashboardStats, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  fetchEvents: async (filters = {}) => {
    try {
      set({ isLoading: true });
      const params = new URLSearchParams(filters).toString();
      const data = await apiClient(`admin/events?${params}`, { method: 'GET' });
      set({ events: data as AdminEvent[], isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  moderateEvent: async (id, action, reason = '') => {
    await apiClient(`admin/events/${id}/moderate`, {
      method: 'PUT',
      body: JSON.stringify({ action, reason }),
    });
    await get().fetchEvents();
  },

  deleteEvent: async (id) => {
    await apiClient(`admin/events/${id}`, { method: 'DELETE' });
    set(state => ({ events: state.events.filter(e => e.id !== id) }));
  },

  fetchPosts: async (filters = {}) => {
    try {
      set({ isLoading: true });
      const params = new URLSearchParams(filters).toString();
      const data = await apiClient(`admin/posts?${params}`, { method: 'GET' });
      set({ posts: data as AdminPost[], isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  moderatePost: async (id, action, reason = '') => {
    await apiClient(`admin/posts/${id}/moderate`, {
      method: 'PUT',
      body: JSON.stringify({ action, reason }),
    });
    await get().fetchPosts();
  },

  deletePost: async (id) => {
    await apiClient(`admin/posts/${id}`, { method: 'DELETE' });
    set(state => ({ posts: state.posts.filter(p => p.id !== id) }));
  },

  fetchUsers: async (filters = {}) => {
    try {
      set({ isLoading: true });
      const params = new URLSearchParams(filters).toString();
      const data = await apiClient(`admin/users?${params}`, { method: 'GET' });
      set({ users: data as AdminUser[], isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  banUser: async (id, action, reason = '') => {
    await apiClient(`admin/users/${id}/ban`, {
      method: 'PUT',
      body: JSON.stringify({ action, reason }),
    });
    await get().fetchUsers();
  },

  changeUserRole: async (id, userType) => {
    await apiClient(`admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ userType }),
    });
    await get().fetchUsers();
  },

  fetchRegistrationAnalytics: async (days = 30) => {
    try {
      const data = await apiClient(`admin/analytics/registrations?days=${days}`, { method: 'GET' });
      set({ registrationAnalytics: data as AnalyticsDataPoint[] });
    } catch (e) {}
  },

  fetchEventsCreatedAnalytics: async (days = 30) => {
    try {
      const data = await apiClient(`admin/analytics/events-created?days=${days}`, { method: 'GET' });
      set({ eventsCreatedAnalytics: data as AnalyticsDataPoint[] });
    } catch (e) {}
  },

  fetchOverview: async () => {
    try {
      const data = await apiClient('admin/analytics/overview', { method: 'GET' });
      set({ overview: data as OverviewAnalytics });
    } catch (e) {}
  },
}));
