/**
 * Media URL Resolver Utility.
 * Resolves relative uploaded file paths (e.g., /uploads/doctors/...)
 * into fully qualified backend URLs for display in frontend img tags.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

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

  // Extract backend origin (e.g. "http://127.0.0.1:8000") from API base URL
  try {
    const urlObj = new URL(API_BASE_URL);
    const backendOrigin = urlObj.origin;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${backendOrigin}${cleanPath}`;
  } catch (e) {
    // Fallback if URL parsing fails
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `http://127.0.0.1:8000${cleanPath}`;
  }
};
