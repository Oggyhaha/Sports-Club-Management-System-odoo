import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../config/constants';
import { getDefaultPortalPath } from '../config/navigation';

// Layouts
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';

// Route Guards
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

// Auth Pages
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import AcceptInvitePage from '../pages/auth/AcceptInvitePage';

// Portal Placeholder Pages
import OwnerDashboardPage from '../pages/owner/OwnerDashboardPage';
import ReceptionDashboardPage from '../pages/reception/ReceptionDashboardPage';
import ShopDashboardPage from '../pages/shop/ShopDashboardPage';
import CafeteriaDashboardPage from '../pages/cafeteria/CafeteriaDashboardPage';
import HRDashboardPage from '../pages/hr/HRDashboardPage';
import MemberDashboardPage from '../pages/member/MemberDashboardPage';
import CorporateDashboardPage from '../pages/corporate/CorporateDashboardPage';

// Error & Feedback Pages
import Unauthorized from '../pages/Unauthorized';
import NotFound from '../pages/NotFound';

/**
 * Root Redirector: Sends authenticated user to their role portal, or unauthenticated to /login
 */
const RootRedirect = () => {
  const { isAuthenticated, roles, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated && roles.length > 0) {
    return <Navigate to={getDefaultPortalPath(roles)} replace />;
  }

  return <Navigate to="/login" replace />;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Root Path */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Authentication Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/accept-invitation" element={<AcceptInvitePage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
      </Route>

      {/* Protected SaaS Application Routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Owner Executive Portal */}
        <Route
          path="/owner/dashboard"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER]}>
              <OwnerDashboardPage />
            </RoleRoute>
          }
        />
        <Route path="/owner" element={<Navigate to="/owner/dashboard" replace />} />
        <Route
          path="/owner/reports/finance"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER]}>
              <OwnerDashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="/owner/reports/tax"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER]}>
              <OwnerDashboardPage />
            </RoleRoute>
          }
        />

        {/* Reception Desk */}
        <Route
          path="/reception"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.RECEPTIONIST]}>
              <ReceptionDashboardPage />
            </RoleRoute>
          }
        />

        {/* Shop Counter & Inventory */}
        <Route
          path="/shop/pos"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.SHOP_STAFF]}>
              <ShopDashboardPage />
            </RoleRoute>
          }
        />
        <Route path="/shop" element={<Navigate to="/shop/pos" replace />} />
        <Route
          path="/shop/inventory"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.SHOP_STAFF]}>
              <ShopDashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="/shop/products"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.SHOP_STAFF, ROLES.MEMBER]}>
              <ShopDashboardPage />
            </RoleRoute>
          }
        />

        {/* Cafeteria & Kitchen Queue */}
        <Route
          path="/cafeteria/kitchen"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.SHOP_STAFF, ROLES.RECEPTIONIST]}>
              <CafeteriaDashboardPage />
            </RoleRoute>
          }
        />
        <Route path="/cafeteria" element={<Navigate to="/cafeteria/kitchen" replace />} />
        <Route
          path="/cafeteria/menu"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.SHOP_STAFF, ROLES.RECEPTIONIST, ROLES.MEMBER]}>
              <CafeteriaDashboardPage />
            </RoleRoute>
          }
        />

        {/* HR & Payroll */}
        <Route
          path="/hr/employees"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.HR_STAFF]}>
              <HRDashboardPage />
            </RoleRoute>
          }
        />
        <Route path="/hr" element={<Navigate to="/hr/employees" replace />} />
        <Route
          path="/hr/attendance"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.HR_STAFF]}>
              <HRDashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="/hr/leaves"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.HR_STAFF]}>
              <HRDashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="/hr/payroll"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.HR_STAFF]}>
              <HRDashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="/hr/me"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.HR_STAFF, ROLES.RECEPTIONIST, ROLES.SHOP_STAFF]}>
              <HRDashboardPage />
            </RoleRoute>
          }
        />

        {/* Member Portal */}
        <Route
          path="/member"
          element={
            <RoleRoute allowedRoles={[ROLES.MEMBER, ROLES.OWNER]}>
              <MemberDashboardPage />
            </RoleRoute>
          }
        />

        {/* Corporate Client Portal */}
        <Route
          path="/corporate"
          element={
            <RoleRoute allowedRoles={[ROLES.BUSINESS_CLIENT, ROLES.OWNER]}>
              <CorporateDashboardPage />
            </RoleRoute>
          }
        />

        {/* Shared Facility & Booking Navigation Routes */}
        <Route
          path="/bookings/availability"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.MEMBER]}>
              <ReceptionDashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.RECEPTIONIST]}>
              <ReceptionDashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="/social-play"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.MEMBER]}>
              <ReceptionDashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="/courts"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.RECEPTIONIST]}>
              <ReceptionDashboardPage />
            </RoleRoute>
          }
        />

        {/* Shared Membership Routes */}
        <Route
          path="/members"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.RECEPTIONIST]}>
              <ReceptionDashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="/members/plans"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.MEMBER]}>
              <MemberDashboardPage />
            </RoleRoute>
          }
        />

        {/* Shared Finance Routes */}
        <Route
          path="/finance/invoices"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.BUSINESS_CLIENT]}>
              <CorporateDashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="/finance/payments"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.RECEPTIONIST]}>
              <ReceptionDashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="/finance/clients"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER]}>
              <OwnerDashboardPage />
            </RoleRoute>
          }
        />

        {/* Access Restricted View */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* 404 Catch-All inside Dashboard Shell */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
