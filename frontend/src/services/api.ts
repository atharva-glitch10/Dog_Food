import axios from 'axios';

// Same-origin by default: Nginx (production) and the Vite dev server proxy
// /api to the backend. Override with VITE_API_URL for other setups.
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorData = error.response?.data?.error || {
      message: error.message || 'An unexpected error occurred.',
      code: 'NETWORK_ERROR',
    };
    return Promise.reject(errorData);
  }
);

export default api;
