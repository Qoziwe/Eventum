import { create } from 'zustand';
import { apiClient } from '../api/apiClient';

export interface District {
  id: number;
  name: string;
  sortOrder: number;
}

export interface City {
  id: number;
  name: string;
  sortOrder: number;
  districts: District[];
}

import { CATEGORIES } from '../data/categories';

export interface Category {
  id: number;
  slug: string;
  label: string;
  icon: string;
  sortOrder?: number;
  type: string;
}

export interface Vibe {
  id: number;
  slug: string;
  label: string;
  icon: string;
  sortOrder: number;
}

interface ConfigState {
  currencySymbol: string;
  platformName: string;
  cities: City[];
  categories: Category[];
  vibes: Vibe[];
  isLoaded: boolean;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  fetchConfig: () => Promise<void>;
  getCityDistricts: (cityName: string) => District[];
  formatPrice: (amount: number) => string;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  currencySymbol: '$',
  platformName: 'Eventum',
  cities: [],
  categories: CATEGORIES as any[],
  vibes: [],
  isLoaded: false,
  selectedCity: 'Almaty',
  setSelectedCity: (city: string) => set({ selectedCity: city }),

  fetchConfig: async () => {
    try {
      const data = await apiClient('config');
      if (data) {
        set({
          currencySymbol: data.currencySymbol || '$',
          platformName: data.platformName || 'Eventum',
          cities: data.cities || [],
          categories: CATEGORIES as any[],
          vibes: data.vibes || [],
          isLoaded: true,
        });
      }
    } catch (error) {
      console.error('Failed to fetch platform config:', error);
      // Fallback to empty state but mark as loaded to prevent blocking
      set({ isLoaded: true });
    }
  },

  getCityDistricts: (cityName: string) => {
    const { cities } = get();
    const city = cities.find((c) => c.name === cityName);
    return city ? city.districts : [];
  },

  formatPrice: (amount: number) => {
    if (amount === 0) return 'Free';
    const { currencySymbol } = get();
    return `${amount}${currencySymbol}`; // Or `${currencySymbol}${amount}` based on preference
  },
}));
