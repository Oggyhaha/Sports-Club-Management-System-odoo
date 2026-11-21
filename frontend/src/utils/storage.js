import { STORAGE_KEYS } from '../config/constants';

export const storage = {
  getToken: () => {
    try {
      return localStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch {
      return null;
    }
  },

  setToken: (token) => {
    try {
      if (token) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      } else {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      }
    } catch (e) {
      console.warn('Unable to persist auth token:', e);
    }
  },

  removeToken: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    } catch (e) {
      console.warn('Unable to remove auth token:', e);
    }
  },

  getUser: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setUser: (user) => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch (e) {
      console.warn('Unable to persist user profile:', e);
    }
  },

  removeUser: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER);
    } catch (e) {
      console.warn('Unable to remove user profile:', e);
    }
  },

  clearAuth: () => {
    storage.removeToken();
    storage.removeUser();
  },
};
