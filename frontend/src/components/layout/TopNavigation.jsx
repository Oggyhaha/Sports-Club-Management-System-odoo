import React, { useState } from 'react';
import { Menu, LogOut, User, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ROLE_LABELS } from '../../config/constants';
import ConfirmationDialog from '../common/ConfirmationDialog';

/**
 * Champions Club - Top Navigation Bar
 * 
 * Provides:
 * - Mobile hamburger trigger
 * - Breadcrumbs / workspace context
 * - Current user identity & role pill
 * - Session refresh button
 * - Clean sign-out flow with confirmation
 */
export const TopNavigation = ({ onToggleSidebar }) => {
  const { user, roles, logout, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const primaryRole = roles?.[0];
  const roleLabel = ROLE_LABELS[primaryRole] || primaryRole || 'Authenticated';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
      showToast('User session re-synchronized with server', 'success');
    } catch (e) {
      showToast('Could not refresh session', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      showToast('Logged out successfully', 'info');
    } catch (e) {
      showToast('Session terminated locally', 'warning');
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Side: Mobile Menu Button & Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            aria-label="Open navigation sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
              Club Management System
            </span>
          </div>
        </div>

        {/* Right Side: Identity, Refresh & Sign Out */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 cursor-pointer"
            title="Refresh session from server"
            aria-label="Refresh session"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* User Profile Pill */}
          {user && (
            <div className="flex items-center gap-2.5 pl-1">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs">
                {user.full_name?.charAt(0)?.toUpperCase() || <User className="w-4 h-4" />}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-tight">
                  {user.full_name}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-medium rounded bg-sky-50 text-sky-700 border border-sky-200">
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer ml-1"
            title="Sign out of Champions Club"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Sign Out Confirmation Modal */}
      <ConfirmationDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirm}
        title="Sign Out Confirmation"
        message="Are you sure you want to end your active session? Your session token will be invalidated server-side."
        confirmText="Sign Out"
        confirmVariant="danger"
        isLoading={isLoggingOut}
      />
    </>
  );
};

export default TopNavigation;
