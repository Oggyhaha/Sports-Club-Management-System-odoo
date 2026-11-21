import axios from 'axios';
import { API_BASE_URL } from '../config/constants';
import { storage } from '../utils/storage';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Attach Bearer Token without logging sensitive credentials
apiClient.interceptors.request.use(
  (config) => {
    const token = storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Centralize error handling & authentication lifecycle
let isDispatchingUnauthorized = false;

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response ? error.response.status : null;
    const data = error.response ? error.response.data : null;
    const isLoginRequest = error.config && error.config.url && error.config.url.includes('/auth/login');

    if (status === 401 && !isLoginRequest) {
      // 401 Unauthorized: token expired, invalid signature, or revoked token_version
      storage.clearAuth();

      // Guard against concurrent 401 response storm dispatching repeated events
      if (!isDispatchingUnauthorized) {
        isDispatchingUnauthorized = true;
        window.dispatchEvent(
          new CustomEvent('champions:unauthorized', {
            detail: { message: data?.detail || 'Session expired. Please log in again.' },
          })
        );
        setTimeout(() => {
          isDispatchingUnauthorized = false;
        }, 500);
      }
    } else if (status === 403) {
      // 403 Forbidden: authenticated user lacks sufficient role permission
      window.dispatchEvent(
        new CustomEvent('champions:forbidden', {
          detail: { message: data?.detail || 'You do not have permission to access this resource.' },
        })
      );
    }

    // Normalize error payload structure for frontend UI consumption
    const normalizedError = {
      status,
      message: data?.detail || error.message || 'An unexpected network error occurred.',
      errors: Array.isArray(data?.detail) ? data.detail : null, // Pydantic 422 errors
      original: error,
    };

    return Promise.reject(normalizedError);
  }
);

export default apiClient;
