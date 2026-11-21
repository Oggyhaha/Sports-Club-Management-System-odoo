import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import * as AuthContextModule from '../contexts/AuthContext';
import { ROLES } from '../config/constants';

describe('Sidebar Navigation Component', () => {
  it('renders all administrative sections for owner role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { full_name: 'Club Owner', email: 'owner@test.com' },
      roles: [ROLES.OWNER],
    });

    render(
      <BrowserRouter>
        <Sidebar isOpen={true} onClose={() => {}} />
      </BrowserRouter>
    );

    expect(screen.getByText(/Executive Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Reception Desk/i)).toBeInTheDocument();
    expect(screen.getByText(/Inventory Control/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly Payroll Runs/i)).toBeInTheDocument();
    expect(screen.getByText(/GST Tax Summary/i)).toBeInTheDocument();
  });

  it('filters out staff-restricted sections for regular members', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { full_name: 'Tennis Member', email: 'member@test.com' },
      roles: [ROLES.MEMBER],
    });

    render(
      <BrowserRouter>
        <Sidebar isOpen={true} onClose={() => {}} />
      </BrowserRouter>
    );

    // Permitted for member
    expect(screen.getByText(/Member Self-Service/i)).toBeInTheDocument();
    expect(screen.getByText(/Court Availability Matrix/i)).toBeInTheDocument();
    expect(screen.getByText(/Friday Social Play/i)).toBeInTheDocument();

    // Restricted (should NOT be visible)
    expect(screen.queryByText(/Monthly Payroll Runs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/GST Tax Summary/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Inventory Control/i)).not.toBeInTheDocument();
  });

  it('mobile backdrop click triggers onClose callback', () => {
    const handleClose = vi.fn();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { full_name: 'Test Staff', email: 'staff@test.com' },
      roles: [ROLES.RECEPTIONIST],
    });

    const { container } = render(
      <BrowserRouter>
        <Sidebar isOpen={true} onClose={handleClose} />
      </BrowserRouter>
    );

    const backdrop = container.querySelector('.bg-slate-950\\/60');
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
