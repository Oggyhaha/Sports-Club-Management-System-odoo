import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/common/Button';
import { getDefaultPortalPath } from '../config/navigation';

export const NotFound = () => {
  const navigate = useNavigate();
  const { roles, isAuthenticated } = useAuth();
  const homePath = isAuthenticated ? getDefaultPortalPath(roles) : '/login';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 p-8 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mx-auto mb-4">
          <Compass className="w-7 h-7" />
        </div>

        <span className="text-xs font-bold text-sky-600 uppercase tracking-widest">
          Error 404
        </span>

        <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
          Page Not Found
        </h1>

        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          The requested URL path does not exist on this server or has been relocated to another module route.
        </p>

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
            onClick={() => navigate(homePath)}
            leftIcon={Home}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
