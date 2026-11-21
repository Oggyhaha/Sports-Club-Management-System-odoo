import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumb = ({ items = [] }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
      <Link to="/" className="hover:text-slate-800 transition-colors flex items-center gap-1">
        <Home className="w-3.5 h-3.5" />
        <span>Home</span>
      </Link>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;

        return (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {isLast || !item.href ? (
              <span className={`font-semibold ${isLast ? 'text-slate-800' : 'text-slate-500'}`}>
                {item.label}
              </span>
            ) : (
              <Link to={item.href} className="hover:text-slate-800 transition-colors">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
