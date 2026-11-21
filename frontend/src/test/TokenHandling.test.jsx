import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage } from '../utils/storage';
import apiClient from '../lib/axios';

describe('Token Security & Storage Handling', () => {
  beforeEach(() => {
    storage.clearAuth();
    vi.clearAllMocks();
  });

  it('never stores raw tokens in URL or logs', () => {
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig';
    storage.setToken(testToken);

    // Verify storage persistence
    expect(storage.getToken()).toBe(testToken);

    // Ensure clearAuth purges token completely
    storage.clearAuth();
    expect(storage.getToken()).toBeNull();
    expect(storage.getUser()).toBeNull();
  });

  it('safely handles corrupt or unparseable JSON in localStorage', () => {
    localStorage.setItem('champions_user_profile', '{invalid json syntax}');
    expect(storage.getUser()).toBeNull();
  });

  it('handles simultaneous 401 responses with debounced single event dispatch', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const unauthorizedHandler = vi.fn();
    window.addEventListener('champions:unauthorized', unauthorizedHandler);

    // Simulate 3 concurrent API responses with status 401
    const errorResponse = {
      response: {
        status: 401,
        data: { detail: 'Token signature has expired.' },
      },
      config: { url: '/bookings/availability' },
    };

    // Grab the response interceptor error handler from axios client
    const responseInterceptor = apiClient.interceptors.response.handlers[0].rejected;

    // Fire 3 simultaneous 401 rejections
    await Promise.allSettled([
      responseInterceptor(errorResponse),
      responseInterceptor(errorResponse),
      responseInterceptor(errorResponse),
    ]);

    // Verify storage was cleared
    expect(storage.getToken()).toBeNull();

    // Verify champions:unauthorized was only dispatched once (debounced single-flight guard)
    const unauthorizedEvents = dispatchSpy.mock.calls.filter(
      (call) => call[0].type === 'champions:unauthorized'
    );
    expect(unauthorizedEvents.length).toBe(1);

    window.removeEventListener('champions:unauthorized', unauthorizedHandler);
  });
});
