import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS } from '../config/constants';
import Button from '../components/common/Button';
import { getDefaultPortalPath } from '../config/navigation';

export const Unauthorized = () => {
  const navigate = useNavigate();
  const { user, roles } = useAuth();

  const primaryRole = roles?.[0];
  const roleLabel = ROLE_LABELS[primaryRole] || primaryRole || 'None assigned';
  const defaultPath = getDefaultPortalPath(roles);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 p-8 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Access Restricted (403 Forbidden)
        </h1>

        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Your authenticated account does not possess the required role permissions to view or execute operations in this section.
        </p>

        {user && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200/60 text-left text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200/50">
              <span className="text-slate-500">Authenticated As:</span>
              <span className="font-semibold text-slate-800">{user.full_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/50">
              <span className="text-slate-500">Account Email:</span>
              <span className="font-medium text-slate-800">{user.email}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Assigned Role:</span>
              <span className="font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                {roleLabel}
              </span>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            leftIcon={ArrowLeft}
          >
            Go Back
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(defaultPath)}
            leftIcon={Home}
          >
            Return to My Portal
          </Button>
        </div>

        <p className="mt-6 text-[11px] text-slate-400">
          If you believe this is an error, contact your club administrator or owner to request role assignment.
        </p>
      </div>
    </div>
  );
};

export default Unauthorized;
