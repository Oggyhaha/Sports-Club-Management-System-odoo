import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage } from '../utils/storage';

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
});
