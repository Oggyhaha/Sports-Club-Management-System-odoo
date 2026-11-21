import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { CLUB_CONFIG } from '../config/constants';

/**
 * Champions Club - Dedicated Authentication Shell Layout
 * 
 * Used for Login, Registration, and Staff Invitation acceptance.
 */
export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-sky-500 selection:text-white">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400 font-bold text-lg shadow-sm">
            CC
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            {CLUB_CONFIG.NAME}
          </span>
        </Link>
        <p className="mt-2 text-xs font-medium text-slate-500 uppercase tracking-widest">
          Sports Club Management System
        </p>
      </div>

      {/* Auth Card Container */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xs rounded-2xl border border-slate-200/80">
          <Outlet />
        </div>
      </div>

      {/* Footer Security Badges */}
      <footer className="mt-8 sm:mx-auto sm:w-full sm:max-w-md text-center text-xs text-slate-400">
        <div className="flex items-center justify-center gap-1.5 mb-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Role-Based Access Control • 30-Min JWT Security</span>
        </div>
        <p>© {new Date().getFullYear()} {CLUB_CONFIG.NAME}. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default AuthLayout;
