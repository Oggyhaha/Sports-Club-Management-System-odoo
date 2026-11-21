import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingIndicator from '../components/feedback/LoadingIndicator';

/**
 * Route guard that requires active authentication.
 * Redirects unauthenticated visitors to /login preserving intended path in state.
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingIndicator fullScreen text="Verifying Champions Club authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
