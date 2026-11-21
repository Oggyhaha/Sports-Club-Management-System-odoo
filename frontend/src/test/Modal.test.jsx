import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../components/common/Modal';
import ConfirmationDialog from '../components/common/ConfirmationDialog';

describe('Modal & ConfirmationDialog Components', () => {
  it('renders modal dialog content when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal Dialog">
        <div>Modal Body Content</div>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal Dialog')).toBeInTheDocument();
    expect(screen.getByText('Modal Body Content')).toBeInTheDocument();
  });

  it('does not render modal when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Hidden Dialog">
        <div>Hidden Body</div>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('triggers onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Escape Test">
        <div>Press Escape</div>
      </Modal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('ConfirmationDialog executes onConfirm and onCancel callbacks', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmationDialog
        isOpen={true}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title="Revoke Session"
        message="Are you sure you want to invalidate all tokens?"
        confirmText="Confirm Revoke"
        cancelText="Abort"
      />
    );

    expect(screen.getByText('Revoke Session')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to invalidate all tokens?')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /Abort/i });
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);

    const confirmBtn = screen.getByRole('button', { name: /Confirm Revoke/i });
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});
