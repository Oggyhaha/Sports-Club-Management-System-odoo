import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import apiClient from '../lib/axios';
import { storage } from '../utils/storage';

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

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.clearAuth();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    );
  };

  it('renders login form elements with accessible labels', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /Sign In to Your Account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('validates empty email and password submission', async () => {
    renderComponent();

    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Email address is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Password is required/i)).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('validates invalid email format', async () => {
    renderComponent();

    const emailInput = screen.getByLabelText(/Email Address/i);
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Please enter a valid email address/i)).toBeInTheDocument();
  });

  it('handles successful login and saves session credentials', async () => {
    const mockUserData = {
      id: 'user-123',
      email: 'owner@championsclub.com',
      full_name: 'Club Owner',
      roles: ['owner'],
      is_active: true,
    };

    apiClient.post.mockResolvedValueOnce({
      data: {
        access_token: 'fake-jwt-token-xyz',
        token_type: 'bearer',
        expires_in: 1800,
        user: mockUserData,
      },
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'owner@championsclub.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'CorrectPassword123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'owner@championsclub.com',
        password: 'CorrectPassword123',
      });
      expect(storage.getToken()).toBe('fake-jwt-token-xyz');
    });
  });

  it('displays error banner upon invalid credentials (401)', async () => {
    apiClient.post.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { detail: 'Invalid email or password.' },
      },
      message: 'Invalid email or password.',
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'owner@championsclub.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'WrongPassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    const errorBanners = await screen.findAllByText(/Invalid email or password/i);
    expect(errorBanners.length).toBeGreaterThanOrEqual(1);
  });
});
