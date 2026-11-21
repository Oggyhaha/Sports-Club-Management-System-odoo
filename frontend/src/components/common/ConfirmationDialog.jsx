import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed? This action may be irreversible.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const icons = {
    danger: <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />,
    primary: <Info className="w-6 h-6 text-sky-600 shrink-0" />,
  };

  const buttonVariants = {
    danger: 'danger',
    warning: 'warning',
    primary: 'primary',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      closeOnBackdrop={!isLoading}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={buttonVariants[variant] || 'danger'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-full bg-slate-50 border border-slate-100">
          {icons[variant] || icons.danger}
        </div>
        <div>
          <h4 className="text-base font-semibold text-slate-900">{title}</h4>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">{message}</p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationDialog;
