import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegisterPage from '../pages/auth/RegisterPage';
import { ToastProvider } from '../contexts/ToastContext';
import authService from '../services/authService';

vi.mock('../services/authService', () => ({
  default: {
    register: vi.fn(),
  },
}));

describe('RegisterPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <ToastProvider>
          <RegisterPage />
        </ToastProvider>
      </BrowserRouter>
    );
  };

  it('renders registration fields', () => {
    renderComponent();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
  });

  it('validates password minimum length of 8 characters', async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'New Member' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'member@test.com' } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'short' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(await screen.findByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('validates matching confirmation password', async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'New Member' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'member@test.com' } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'Mismatch456' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('submits valid registration and shows success state', async () => {
    authService.register.mockResolvedValueOnce({
      id: 'user-new',
      email: 'member@test.com',
      full_name: 'New Member',
      roles: ['member'],
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'New Member' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'member@test.com' } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'Password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith({
        full_name: 'New Member',
        email: 'member@test.com',
        phone: undefined,
        password: 'Password123',
      });
      expect(screen.getByText(/Account Created Successfully/i)).toBeInTheDocument();
    });
  });
});
