import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RoleRoute from '../routes/RoleRoute';
import * as AuthContextModule from '../contexts/AuthContext';
import { ROLES } from '../config/constants';

describe('RoleRoute Authorization Guard', () => {
  it('redirects to /unauthorized when user role is not permitted', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      roles: [ROLES.MEMBER],
      user: { email: 'member@test.com', roles: [ROLES.MEMBER] },
    });

    render(
      <MemoryRouter initialEntries={['/hr/payroll']}>
        <Routes>
          <Route path="/unauthorized" element={<div>Access Forbidden Screen</div>} />
          <Route
            path="/hr/payroll"
            element={
              <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.HR_STAFF]}>
                <div>Confidential Payroll Runs</div>
              </RoleRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Confidential Payroll Runs')).not.toBeInTheDocument();
    expect(screen.getByText('Access Forbidden Screen')).toBeInTheDocument();
  });

  it('allows access when user possesses the permitted role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      roles: [ROLES.HR_STAFF],
      user: { email: 'hr@championsclub.com', roles: [ROLES.HR_STAFF] },
    });

    render(
      <MemoryRouter initialEntries={['/hr/payroll']}>
        <Routes>
          <Route
            path="/hr/payroll"
            element={
              <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.HR_STAFF]}>
                <div>Confidential Payroll Runs</div>
              </RoleRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Confidential Payroll Runs')).toBeInTheDocument();
  });
});
