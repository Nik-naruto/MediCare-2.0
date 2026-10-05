import axios from 'axios';

/**
 * Base URL for MediCare 2.0 FastAPI backend API v1.
 * Loaded dynamically from Vite environment variable.
 * Normalizes input so whether the user provides:
 *   "https://medicare-2-0-rte1.onrender.com"
 *   "https://medicare-2-0-rte1.onrender.com/"
 *   "https://medicare-2-0-rte1.onrender.com/api/v1"
 *   or undefined (falls back to local /api/v1)
 * it always reliably resolves to the /api/v1 root.
 */
const getNormalizedApiBaseUrl = () => {
  const rawUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!rawUrl) {
    return '/api/v1';
  }
  const cleanUrl = rawUrl.replace(/\/+$/, '');
  if (cleanUrl.endsWith('/api/v1')) {
    return cleanUrl;
  }
  return `${cleanUrl}/api/v1`;
};

const API_BASE_URL = getNormalizedApiBaseUrl();

/**
 * Centralized Axios HTTP Client instance.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/**
 * Request Interceptor: Attach JWT Bearer Access Token if present in storage.
 */
apiClient.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('access_token') ||
      localStorage.getItem('medicare_access_token') ||
      sessionStorage.getItem('access_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor: Safe, centralized handling for HTTP errors.
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle Network Errors or Timeout
    if (!error.response) {
      const networkError = {
        message: 'Network error or server unreachable. Please check backend status.',
        status: 0,
      };
      return Promise.reject(networkError);
    }

    const { status, data } = error.response;
    const errorMessage = data?.detail || data?.message || error.message || 'An unexpected error occurred.';

    // Construct clean error payload
    const formattedError = {
      status,
      message: errorMessage,
      detail: data?.detail || null,
      raw: error,
    };

    if (status === 401) {
      // 401 Unauthorized - Invalid or expired token
      // Note: Automatic logout / redirection will be wired in the auth integration step.
    } else if (status === 403) {
      // 403 Forbidden - Role/Domain permission denied
    }

    return Promise.reject(formattedError);
  }
);

export default apiClient;
