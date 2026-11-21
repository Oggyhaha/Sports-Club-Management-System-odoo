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

// Executive Portals
import OwnerDashboardPage from '../pages/owner/OwnerDashboardPage';
import ReceptionDashboardPage from '../pages/reception/ReceptionDashboardPage';
import MemberDashboardPage from '../pages/member/MemberDashboardPage';
import CorporateDashboardPage from '../pages/corporate/CorporateDashboardPage';

// Operational Pages (Milestone H5 & H6)
import MembersPage from '../pages/members/MembersPage';
import MembershipPlansPage from '../pages/members/MembershipPlansPage';
import CourtsPage from '../pages/courts/CourtsPage';
import BookingsPage from '../pages/bookings/BookingsPage';
import SocialPlayPage from '../pages/social-play/SocialPlayPage';
import ShopPosPage from '../pages/shop/ShopPosPage';
import ShopInventoryPage from '../pages/shop/ShopInventoryPage';
import ShopProductsPage from '../pages/shop/ShopProductsPage';
import ShopOrdersPage from '../pages/shop/ShopOrdersPage';
import CafeteriaKitchenPage from '../pages/cafeteria/CafeteriaKitchenPage';
import CafeteriaMenuPage from '../pages/cafeteria/CafeteriaMenuPage';
import EmployeesPage from '../pages/hr/EmployeesPage';
import DepartmentsPage from '../pages/hr/DepartmentsPage';
import AttendancePage from '../pages/hr/AttendancePage';
import LeavesPage from '../pages/hr/LeavesPage';
import SalaryStructuresPage from '../pages/hr/SalaryStructuresPage';
import PayrollPage from '../pages/hr/PayrollPage';
import BusinessClientsPage from '../pages/finance/BusinessClientsPage';
import InvoicesPage from '../pages/finance/InvoicesPage';
import PaymentsPage from '../pages/finance/PaymentsPage';
import ReceiptsPage from '../pages/finance/ReceiptsPage';

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

        {/* Court Operations */}
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
              <BookingsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/courts"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.RECEPTIONIST]}>
              <CourtsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/social-play"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.MEMBER]}>
              <SocialPlayPage />
            </RoleRoute>
          }
        />

        {/* Memberships & Subscriptions */}
        <Route
          path="/members"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.RECEPTIONIST]}>
              <MembersPage />
            </RoleRoute>
          }
        />
        <Route
          path="/members/plans"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.MEMBER]}>
              <MembershipPlansPage />
            </RoleRoute>
          }
        />

        {/* Shop Counter & Inventory */}
        <Route
          path="/shop/pos"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.SHOP_STAFF]}>
              <ShopPosPage />
            </RoleRoute>
          }
        />
        <Route path="/shop" element={<Navigate to="/shop/pos" replace />} />
        <Route
          path="/shop/inventory"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.SHOP_STAFF]}>
              <ShopInventoryPage />
            </RoleRoute>
          }
        />
        <Route
          path="/shop/products"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.SHOP_STAFF, ROLES.MEMBER]}>
              <ShopProductsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/shop/orders"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.SHOP_STAFF]}>
              <ShopOrdersPage />
            </RoleRoute>
          }
        />

        {/* Cafeteria & Kitchen Queue */}
        <Route
          path="/cafeteria/kitchen"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.SHOP_STAFF, ROLES.RECEPTIONIST]}>
              <CafeteriaKitchenPage />
            </RoleRoute>
          }
        />
        <Route path="/cafeteria" element={<Navigate to="/cafeteria/kitchen" replace />} />
        <Route
          path="/cafeteria/menu"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.SHOP_STAFF, ROLES.RECEPTIONIST, ROLES.MEMBER]}>
              <CafeteriaMenuPage />
            </RoleRoute>
          }
        />

        {/* HR & Payroll */}
        <Route
          path="/hr/employees"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.HR_STAFF]}>
              <EmployeesPage />
            </RoleRoute>
          }
        />
        <Route path="/hr" element={<Navigate to="/hr/employees" replace />} />
        <Route
          path="/hr/departments"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.HR_STAFF]}>
              <DepartmentsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/hr/attendance"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.HR_STAFF, ROLES.RECEPTIONIST, ROLES.SHOP_STAFF]}>
              <AttendancePage />
            </RoleRoute>
          }
        />
        <Route
          path="/hr/leaves"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.HR_STAFF, ROLES.RECEPTIONIST, ROLES.SHOP_STAFF]}>
              <LeavesPage />
            </RoleRoute>
          }
        />
        <Route
          path="/hr/salary-structures"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.HR_STAFF]}>
              <SalaryStructuresPage />
            </RoleRoute>
          }
        />
        <Route
          path="/hr/payroll"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.HR_STAFF, ROLES.RECEPTIONIST, ROLES.SHOP_STAFF]}>
              <PayrollPage />
            </RoleRoute>
          }
        />
        <Route
          path="/hr/payslips"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.HR_STAFF, ROLES.RECEPTIONIST, ROLES.SHOP_STAFF]}>
              <PayrollPage />
            </RoleRoute>
          }
        />
        <Route
          path="/hr/me"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.HR_STAFF, ROLES.RECEPTIONIST, ROLES.SHOP_STAFF]}>
              <AttendancePage />
            </RoleRoute>
          }
        />

        {/* Finance & Corporate Administration */}
        <Route
          path="/finance/clients"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER]}>
              <BusinessClientsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/finance/invoices"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.BUSINESS_CLIENT]}>
              <InvoicesPage />
            </RoleRoute>
          }
        />
        <Route
          path="/finance/payments"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.RECEPTIONIST]}>
              <PaymentsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/finance/receipts"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.SHOP_STAFF]}>
              <ReceiptsPage />
            </RoleRoute>
          }
        />

        {/* Member Portal (Reserved for H7) */}
        <Route
          path="/member"
          element={
            <RoleRoute allowedRoles={[ROLES.MEMBER, ROLES.OWNER]}>
              <MemberDashboardPage />
            </RoleRoute>
          }
        />

        {/* Corporate Client Portal (Reserved for H7) */}
        <Route
          path="/corporate"
          element={
            <RoleRoute allowedRoles={[ROLES.BUSINESS_CLIENT, ROLES.OWNER]}>
              <CorporateDashboardPage />
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
