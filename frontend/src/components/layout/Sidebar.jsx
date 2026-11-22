import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { X, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CLUB_CONFIG, ROLE_LABELS } from '../../config/constants';
import { getPermittedNavigation } from '../../config/navigation';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, roles } = useAuth();
  const location = useLocation();

  const permittedSections = getPermittedNavigation(roles);
  const primaryRole = roles?.[0];
  const roleLabel = ROLE_LABELS[primaryRole] || primaryRole || 'Staff';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Shell */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-250 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Application Sidebar"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800 bg-slate-950/50">
          <NavLink to="/" className="flex items-center gap-3" onClick={onClose}>
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-sky-950">
              CC
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white block leading-tight">
                {CLUB_CONFIG.NAME}
              </span>
              <span className="text-[10px] text-sky-400 font-medium tracking-wider uppercase">
                Sports SaaS
              </span>
            </div>
          </NavLink>

          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Context Banner in Sidebar */}
        {user && (
          <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/60 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 font-semibold text-xs shrink-0">
              {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-200 truncate">{user.full_name}</p>
              <div className="flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                <p className="text-[10px] text-slate-400 truncate">{roleLabel}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          {permittedSections.map((section, idx) => (
            <div key={section.title || idx}>
              <h4 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {section.title}
              </h4>
              <nav className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150 ${
                          isActive
                            ? 'bg-sky-600 text-white shadow-xs font-semibold'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/40 text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            {CLUB_CONFIG.TIMEZONE} • 06:00–22:00
          </p>
          <p className="text-[9px] text-slate-400 mt-0.5">
            Champions Club Architecture v1.0
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
