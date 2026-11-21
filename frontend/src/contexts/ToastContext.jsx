import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', message, title, duration = 4000 }) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast = { id, type, message, title };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const toast = {
    success: (message, title = 'Success') => addToast({ type: 'success', message, title }),
    error: (message, title = 'Error') => addToast({ type: 'error', message, title, duration: 6000 }),
    warning: (message, title = 'Warning') => addToast({ type: 'warning', message, title }),
    info: (message, title = 'Information') => addToast({ type: 'info', message, title }),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};

const ToastContainer = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
          info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
        };

        const borders = {
          success: 'border-emerald-200 bg-white text-slate-900',
          error: 'border-rose-200 bg-white text-slate-900',
          warning: 'border-amber-200 bg-white text-slate-900',
          info: 'border-blue-200 bg-white text-slate-900',
        };

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${borders[t.type] || borders.info}`}
          >
            {icons[t.type] || icons.info}
            <div className="flex-1 min-w-0">
              {t.title && <h4 className="text-sm font-semibold text-slate-900">{t.title}</h4>}
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">{t.message}</p>
            </div>
            <button
              onClick={() => onRemove(t.id)}
              className="text-slate-400 hover:text-slate-600 rounded-md p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
