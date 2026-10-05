/**
 * Media URL Resolver Utility.
 * Resolves relative uploaded file paths (e.g., /uploads/doctors/...)
 * into fully qualified backend URLs for display in frontend img tags.
 */

const getBackendOrigin = () => {
  const rawUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (rawUrl) {
    try {
      return new URL(rawUrl).origin;
    } catch (e) {
      // Ignore URL parsing errors
    }
  }
  // If running in browser and no VITE_API_BASE_URL is set, use window.location.origin for proxies
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://127.0.0.1:8000';
};

export const getMediaUrl = (path) => {
  if (!path || typeof path !== 'string') return null;

  // Return data URLs or external absolute URLs directly
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }

  const backendOrigin = getBackendOrigin();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${backendOrigin}${cleanPath}`;
};
