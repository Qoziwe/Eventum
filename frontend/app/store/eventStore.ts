import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DetailedEventItem } from '../data/mockData';
import { apiClient } from '../api/apiClient';
import { sanitizeText, validateImageUrl } from '../utils/security';

export interface AppEvent extends DetailedEventItem {
  organizerId: string;
}

interface EventState {
  events: AppEvent[];
  isLoading: boolean;
  fetchEvents: () => Promise<void>;
  addEvent: (event: Omit<AppEvent, 'id'>) => Promise<void>;
  updateEvent: (event: AppEvent) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventById: (id: string) => AppEvent | undefined;
  clearAllEvents: () => Promise<void>;
}

export const useEventStore = create<EventState>()(
  persist(
    (set, get) => ({
      events: [],
      isLoading: false,

      fetchEvents: async () => {
        try {
          set({ isLoading: true });
          const data = await apiClient('events', { method: 'GET' });
          set({ events: data, isLoading: false });
        } catch (error: any) {
          set({ isLoading: false });
        }
      },

      addEvent: async event => {
        if (event.image && !validateImageUrl(event.image)) {
          throw new Error('Incorrect URL images');
        }

        const sanitizedEvent = {
          ...event,
          title: sanitizeText(event.title),
          fullDescription: sanitizeText(event.fullDescription || ''),
        };

        await apiClient('events', {
          method: 'POST',
          body: JSON.stringify(sanitizedEvent),
        });

        await get().fetchEvents();
      },

      updateEvent: async updatedEvent => {
        if (updatedEvent.image && !validateImageUrl(updatedEvent.image)) {
          throw new Error('Incorrect URL images');
        }

        const sanitizedEvent = {
          ...updatedEvent,
          title: sanitizeText(updatedEvent.title),
          fullDescription: sanitizeText(updatedEvent.fullDescription || ''),
        };

        await apiClient(`events/${updatedEvent.id}`, {
          method: 'PUT',
          body: JSON.stringify(sanitizedEvent),
        });

        await get().fetchEvents();
      },

      deleteEvent: async id => {
        await apiClient(`events/${id}`, { method: 'DELETE' });
        set(state => ({
          events: state.events.filter(e => e.id !== id),
        }));
      },

      getEventById: id => {
        return get().events.find(e => e.id === id);
      },

      clearAllEvents: async () => {
        set({ events: [] });
      },
    }),
    {
      name: 'event-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
