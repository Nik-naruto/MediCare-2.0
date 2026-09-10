import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext();

/**
 * Convert backend UserRole enum string (PATIENT, DOCTOR, RECEPTIONIST, ADMIN)
 * into Title Case role string expected by frontend router guards (Patient, Doctor, Receptionist, Admin).
 */
export const normalizeRole = (roleStr) => {
  if (!roleStr) return 'Patient';
  const upper = String(roleStr).toUpperCase();
  if (upper === 'PATIENT') return 'Patient';
  if (upper === 'DOCTOR') return 'Doctor';
  if (upper === 'RECEPTIONIST') return 'Receptionist';
  if (upper === 'ADMIN') return 'Admin';
  return roleStr.charAt(0).toUpperCase() + roleStr.slice(1).toLowerCase();
};

const formatUserData = (userData) => {
  if (!userData) return null;
  return {
    ...userData,
    name: userData.full_name || userData.email,
  };
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const role = currentUser ? normalizeRole(currentUser.role) : null;

  // Restore authenticated session on page refresh
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token =
        localStorage.getItem('access_token') ||
        localStorage.getItem('medicare_access_token');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get('/auth/me');
        setCurrentUser(formatUserData(response.data));
      } catch (error) {
        // Token invalid, expired, or user inactive -> clear storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('medicare_access_token');
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  /**
   * Authenticate user against FastAPI POST /api/v1/auth/login.
   * Sends URL-encoded form data (username=<email>, password=<password>).
   */
  const login = async (email, password) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);

    // 1. Obtain JWT Token from FastAPI
    const tokenResponse = await apiClient.post('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const accessToken = tokenResponse.data?.access_token;
    if (!accessToken) {
      throw new Error('No access token returned from server.');
    }

    // 2. Persist access token in localStorage
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('medicare_access_token', accessToken);

    // 3. Fetch authenticated user details from /auth/me
    const meResponse = await apiClient.get('/auth/me');
    const user = formatUserData(meResponse.data);
    setCurrentUser(user);

    return user;
  };

  /**
   * Clear authentication state and remove stored tokens.
   */
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('medicare_access_token');
    localStorage.removeItem('medicare_mock_user');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        user: currentUser,
        role,
        loading,
        login,
        logout,
        isAuthenticated: !!currentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Re-exports for backward compatibility
export const MockAuthProvider = AuthProvider;
export const useMockAuth = useAuth;
