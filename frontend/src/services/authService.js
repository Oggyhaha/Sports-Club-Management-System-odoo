import apiClient from '../lib/axios';

/**
 * Centralized Authentication Service
 * 
 * Strictly integrates with backend auth endpoints audited in Milestone H1:
 * - POST /api/v1/auth/login
 * - POST /api/v1/auth/register
 * - POST /api/v1/auth/staff/accept
 * - GET  /api/v1/auth/me
 * - PUT  /api/v1/auth/me
 * - POST /api/v1/auth/logout
 */
export const authService = {
  /**
   * Authenticate with email and password.
   * Backend issues 30-minute JWT token.
   */
  async login(email, password) {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  /**
   * Register a new public member account.
   * Backend automatically forces role to 'member'.
   */
  async register({ email, password, full_name, phone }) {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
      full_name,
      phone: phone || null,
    });
    return response.data;
  },

  /**
   * Accept an owner-issued staff or corporate invitation token.
   */
  async acceptStaffInvite({ token, password, full_name, phone }) {
    const response = await apiClient.post('/auth/staff/accept', {
      token,
      password,
      full_name,
      phone: phone || null,
    });
    return response.data;
  },

  /**
   * Fetch current authenticated user's profile and roles.
   */
  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * Update authenticated user's self profile.
   */
  async updateProfile({ full_name, phone }) {
    const response = await apiClient.put('/auth/me', {
      full_name,
      phone,
    });
    return response.data;
  },

  /**
   * Invalidate current user's session server-side.
   * Increments database token_version to revoke active JWTs.
   */
  async logout() {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
};

export default authService;
