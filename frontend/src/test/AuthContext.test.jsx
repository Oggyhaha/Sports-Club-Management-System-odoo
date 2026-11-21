import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { storage } from '../utils/storage';
import apiClient from '../lib/axios';

vi.mock('../lib/axios', () => {
  const instance = {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return {
    default: instance,
    __esModule: true,
  };
});

const Consumer = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="auth">{String(isAuthenticated)}</div>
      <div data-testid="user">{user ? user.email : 'none'}</div>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
};

describe('AuthContext Session Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.clearAuth();
  });

  it('initializes as unauthenticated when storage is empty', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('auth').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('none');
    });
  });

  it('rehydrates and verifies active session on mount with /auth/me', async () => {
    storage.setToken('valid-existing-token');
    storage.setUser({ email: 'reception@championsclub.com', roles: ['receptionist'] });

    apiClient.get.mockResolvedValueOnce({
      data: {
        id: 'user-rec',
        email: 'reception@championsclub.com',
        full_name: 'Reception Desk',
        roles: ['receptionist'],
        is_active: true,
      },
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('auth').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('reception@championsclub.com');
    });
  });

  it('purges session if /auth/me fails (expired or revoked token)', async () => {
    storage.setToken('expired-token');
    storage.setUser({ email: 'old@example.com', roles: ['member'] });

    apiClient.get.mockRejectedValueOnce({
      response: { status: 401, data: { detail: 'Token expired.' } },
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('auth').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('none');
      expect(storage.getToken()).toBeNull();
      expect(storage.getUser()).toBeNull();
    });
  });

  it('logout attempts server revocation and purges local storage', async () => {
    storage.setToken('valid-token');
    storage.setUser({ email: 'staff@example.com', roles: ['shop_staff'] });
    apiClient.get.mockResolvedValueOnce({
      data: { id: 'u1', email: 'staff@example.com', roles: ['shop_staff'], is_active: true },
    });
    apiClient.post.mockResolvedValueOnce({ data: { message: 'Logged out' } });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('true');
    });

    const logoutBtn = screen.getByRole('button', { name: /Logout/i });
    await act(async () => {
      logoutBtn.click();
    });

    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
    expect(screen.getByTestId('auth').textContent).toBe('false');
    expect(storage.getToken()).toBeNull();
  });
});
