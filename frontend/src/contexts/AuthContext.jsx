import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/axios';
import { storage } from '../utils/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => storage.getUser());
  const [token, setToken] = useState(() => storage.getToken());
  const [isLoading, setIsLoading] = useState(true);

  const roles = user?.roles || [];
  const isAuthenticated = !!token && !!user;

  // Verify and rehydrate user profile on mount
  const refreshProfile = useCallback(async () => {
    const existingToken = storage.getToken();
    if (!existingToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return null;
    }

    try {
      const response = await apiClient.get('/auth/me');
      const userData = response.data;
      setUser(userData);
      storage.setUser(userData);
      return userData;
    } catch (error) {
      // Token is invalid, expired, or revoked
      storage.clearAuth();
      setUser(null);
      setToken(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();

    // Listen for global unauthorized events (e.g. token expired while using app)
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('champions:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('champions:unauthorized', handleUnauthorized);
    };
  }, [refreshProfile]);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      // Backend POST /api/v1/auth/login accepts JSON or form-data
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      const { access_token, user: loggedInUser } = response.data;

      // Persist auth tokens
      storage.setToken(access_token);
      storage.setUser(loggedInUser);

      setToken(access_token);
      setUser(loggedInUser);

      return { success: true, user: loggedInUser };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Invalid email or password.',
        errors: error.errors,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Attempt backend session revocation (increments token_version)
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Ignore network errors on logout; clean local state regardless
    } finally {
      storage.clearAuth();
      setUser(null);
      setToken(null);
    }
  };

  const hasRole = useCallback(
    (requiredRole) => {
      if (!user || !user.roles) return false;
      if (Array.isArray(requiredRole)) {
        return requiredRole.some((r) => user.roles.includes(r));
      }
      return user.roles.includes(requiredRole);
    },
    [user]
  );

  const hasAnyRole = useCallback(
    (allowedRoles) => {
      if (!user || !user.roles || !allowedRoles) return false;
      return allowedRoles.some((r) => user.roles.includes(r));
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        roles,
        isAuthenticated,
        isLoading,
        login,
        logout,
        hasRole,
        hasAnyRole,
        refreshProfile,
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
