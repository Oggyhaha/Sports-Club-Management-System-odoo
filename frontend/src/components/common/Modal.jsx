import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Champions Club - Accessible Modal Dialog Component
 * 
 * Accessibility Features:
 * - Keyboard Escape listener closes dialog.
 * - Focus is trapped within modal dialog while open (Tab and Shift+Tab cycle).
 * - Focus is automatically returned to the triggering element upon closing.
 * - Disables background scroll (`overflow: hidden`).
 * - Declares `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-lg',
  closeOnBackdrop = true,
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // 1. Capture previously focused element to restore upon modal close
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';

      // 2. Focus first interactive element or dialog itself
      const focusableSelector =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

      const timer = setTimeout(() => {
        if (modalRef.current) {
          const focusable = modalRef.current.querySelectorAll(focusableSelector);
          if (focusable.length > 0) {
            focusable[0].focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 50);

      // 3. Focus trap and Escape handler
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
          return;
        }

        if (e.key === 'Tab' && modalRef.current) {
          const focusableElements = Array.from(
            modalRef.current.querySelectorAll(focusableSelector)
          );

          if (focusableElements.length === 0) {
            e.preventDefault();
            return;
          }

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            // Shift + Tab
            if (
              document.activeElement === firstElement ||
              !modalRef.current.contains(document.activeElement)
            ) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            // Tab
            if (
              document.activeElement === lastElement ||
              !modalRef.current.contains(document.activeElement)
            ) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);

        // 4. Return focus to triggering element
        if (
          previousActiveElement.current &&
          typeof previousActiveElement.current.focus === 'function'
        ) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop - Clean, unblurred dark overlay */}
      <div
        className="fixed inset-0 bg-slate-950/60 transition-opacity animate-in fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-labelledby={title ? 'modal-title' : undefined}
          className={`w-full ${maxWidth} transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all animate-in zoom-in-95 border border-slate-200/80 outline-none`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100">
            <div>
              {title && (
                <h3 id="modal-title" className="text-base font-bold text-slate-900">
                  {title}
                </h3>
              )}
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 transition-colors hover:bg-slate-100 cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 max-h-[calc(100vh-200px)] overflow-y-auto">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
