import AsyncStorage from '@react-native-async-storage/async-storage';

if (!process.env.EXPO_PUBLIC_API_URL) {
  console.warn("ATTENTION: environment variable EXPO_PUBLIC_API_URL not specified!");
}

export const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');

const abortControllers = new Map<string, AbortController>();

export const apiClient = async (endpoint: string, options: any = {}) => {
  const token = await AsyncStorage.getItem('user-token');
  const method = options.method || 'GET';

  // IMPORTANT: If the request body - FormData, title Content-Type CANNOT be placed
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let cleanEndpoint = endpoint.replace(/^\/+/, '').replace(/^api\/+/, '');
  const url = `${BASE_URL}/${cleanEndpoint}`;
  const controllerKey = `${method}-${cleanEndpoint}`;

  if (abortControllers.has(controllerKey)) {
    abortControllers.get(controllerKey)?.abort();
  }

  const controller = new AbortController();
  abortControllers.set(controllerKey, controller);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type');
    let data = {};

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { text };
    }

    if (!response.ok) {
      const errorMessage =
        (data as any).error ||
        (data as any).message ||
        `Server error: ${response.status}`;
        
      if (response.status === 403 && (data as any).banned) {
        // User is banned — force logout immediately
        const useUserStore = require('../store/userStore').useUserStore;
        useUserStore.getState().logout();
      }
      
      throw new Error(errorMessage);
    }

    abortControllers.delete(controllerKey);
    return data;
  } catch (error: any) {
    abortControllers.delete(controllerKey);
    throw error;
  }
};

export const cancelAllRequests = () => {
  abortControllers.forEach(controller => controller.abort());
  abortControllers.clear();
};

export const cancelRequest = (endpoint: string, method: string = 'GET') => {
  const cleanEndpoint = endpoint.replace(/^\/+/, '').replace(/^api\/+/, '');
  const controllerKey = `${method}-${cleanEndpoint}`;
  if (abortControllers.has(controllerKey)) {
    abortControllers.get(controllerKey)?.abort();
    abortControllers.delete(controllerKey);
  }
};
