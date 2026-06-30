import axios from 'axios';
import type { ApiErrorData } from '@/components/ui/api-error';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@cpq:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3333'}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        localStorage.setItem('@cpq:token', data.token);

        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (err) {
        localStorage.removeItem('@cpq:token');
        localStorage.removeItem('@cpq:user');
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }

    const normalized: ApiErrorData = error.response?.data || {
      status: 'error',
      code: 'NETWORK_ERROR',
      message: error.message || 'Network error',
    };

    error.normalizedError = normalized;

    return Promise.reject(error);
  },
);
