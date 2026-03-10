import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'https://54.38.156.234.nip.io/api';

const abortControllers = new Map<string, AbortController>();

export const apiClient = async (endpoint: string, options: any = {}) => {
  const token = await AsyncStorage.getItem('user-token');
  const method = options.method || 'GET';

  // ВАЖНО: Если тело запроса - FormData, заголовок Content-Type ставить НЕЛЬЗЯ
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
