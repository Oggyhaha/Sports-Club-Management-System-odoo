import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoadingIndicator from '../components/feedback/LoadingIndicator';
import EmptyState from '../components/feedback/EmptyState';
import ErrorState from '../components/feedback/ErrorState';

describe('Feedback States Components', () => {
  it('renders LoadingIndicator with custom label', () => {
    render(<LoadingIndicator text="Syncing court availability..." />);
    expect(screen.getByText('Syncing court availability...')).toBeInTheDocument();
  });

  it('renders EmptyState with title, description, and primary CTA', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No Reservations Found"
        description="There are currently no active bookings scheduled for this date."
        actionLabel="Book a Court"
        onAction={handleAction}
      />
    );

    expect(screen.getByText('No Reservations Found')).toBeInTheDocument();
    expect(
      screen.getByText('There are currently no active bookings scheduled for this date.')
    ).toBeInTheDocument();

    const actionBtn = screen.getByRole('button', { name: /Book a Court/i });
    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('renders ErrorState with message and retry callback', () => {
    const handleRetry = vi.fn();
    render(
      <ErrorState
        title="Network Connection Failed"
        message="Unable to reach Champions Club backend service."
        onRetry={handleRetry}
        retryText="Try Again"
      />
    );

    expect(screen.getByText('Network Connection Failed')).toBeInTheDocument();
    expect(screen.getByText('Unable to reach Champions Club backend service.')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Try Again/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
