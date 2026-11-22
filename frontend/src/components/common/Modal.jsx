import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Champions Club - Accessible Modal Dialog Component
 * 
 * Reliability & Accessibility Features:
 * - Robust backdrop click detection: Only closes when both mousedown and mouseup
 *   occur directly on the outer backdrop container (prevents accidental closing
 *   when selecting text or clicking between input fields inside the modal).
 * - Focus is securely trapped within modal dialog while open.
 * - Restores focus to the triggering element upon closing without disrupting active editing.
 * - Prevents background page scrolling while modal is open.
 * - Keyboard Escape listener closes dialog.
 * - Explicit layering (z-10 on dialog container) prevents overlay occlusion.
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
  const onCloseRef = useRef(onClose);
  const mouseDownTargetRef = useRef(null);

  // Keep latest onClose callback without re-triggering modal effect
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

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
        onCloseRef.current?.();
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
  }, [isOpen]);

  if (!isOpen) return null;

  const handleContainerMouseDown = (e) => {
    mouseDownTargetRef.current = e.target;
  };

  const handleContainerMouseUp = (e) => {
    // Only close if BOTH mouse down and mouse up were directly on the backdrop container,
    // and NOT inside the modal dialog card or its input fields
    if (
      closeOnBackdrop &&
      e.target === e.currentTarget &&
      mouseDownTargetRef.current === e.currentTarget
    ) {
      onCloseRef.current?.();
    }
    mouseDownTargetRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Visual Backdrop Overlay - Clean, unblurred dark overlay */}
      <div
        className="fixed inset-0 bg-slate-950/60 transition-opacity animate-in fade-in"
        aria-hidden="true"
      />

      {/* Interactive Modal Container */}
      <div
        className="relative z-10 flex min-h-full items-center justify-center p-4 text-center cursor-default"
        onMouseDown={handleContainerMouseDown}
        onMouseUp={handleContainerMouseUp}
      >
        {/* Modal Dialog Card */}
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-labelledby={title ? 'modal-title' : undefined}
          className={`relative z-20 w-full ${maxWidth} transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all animate-in zoom-in-95 border border-slate-200 outline-none`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
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
              onClick={() => onCloseRef.current?.()}
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
