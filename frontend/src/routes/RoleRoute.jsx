import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingIndicator from '../components/feedback/LoadingIndicator';

/**
 * Route guard enforcing role-based permissions.
 * Redirects authenticated users lacking the required role to /unauthorized.
 */
export const RoleRoute = ({ allowedRoles = [], children }) => {
  const { roles, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingIndicator fullScreen text="Validating role permissions..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = allowedRoles.length === 0 || allowedRoles.some((role) => roles.includes(role));

  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default RoleRoute;
