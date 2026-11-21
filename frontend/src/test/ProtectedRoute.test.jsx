import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../routes/ProtectedRoute';
import * as AuthContextModule from '../contexts/AuthContext';

describe('ProtectedRoute Guard', () => {
  it('redirects unauthenticated visitors to /login', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/owner/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Screen</div>} />
          <Route
            path="/owner/dashboard"
            element={
              <ProtectedRoute>
                <div>Secret Executive Data</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Secret Executive Data')).not.toBeInTheDocument();
    expect(screen.getByText('Login Screen')).toBeInTheDocument();
  });

  it('renders child workspace component when user is authenticated', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { email: 'owner@championsclub.com', roles: ['owner'] },
    });

    render(
      <MemoryRouter initialEntries={['/owner/dashboard']}>
        <Routes>
          <Route
            path="/owner/dashboard"
            element={
              <ProtectedRoute>
                <div>Secret Executive Data</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Secret Executive Data')).toBeInTheDocument();
  });
});
