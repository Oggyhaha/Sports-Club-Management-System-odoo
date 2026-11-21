import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../components/common/Modal';
import ConfirmationDialog from '../components/common/ConfirmationDialog';

const ModalWithTrigger = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <button data-testid="trigger-btn" onClick={() => setIsOpen(true)}>
        Open Modal
      </button>
      <button data-testid="outside-btn">Outside Background Button</button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Accessible Dialog">
        <div>
          <input data-testid="first-input" placeholder="First Input" />
          <button data-testid="middle-btn">Middle Action</button>
        </div>
      </Modal>
    </div>
  );
};

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

  it('traps keyboard Tab navigation inside the modal', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Focus Trap Modal">
        <div>
          <button data-testid="modal-btn-1">Button 1</button>
          <button data-testid="modal-btn-2">Button 2</button>
        </div>
      </Modal>
    );

    const closeBtn = screen.getByLabelText(/Close dialog/i);
    const btn1 = screen.getByTestId('modal-btn-1');
    const btn2 = screen.getByTestId('modal-btn-2');

    // Focus last interactive button (btn2) and press Tab
    btn2.focus();
    expect(document.activeElement).toBe(btn2);

    fireEvent.keyDown(window, { key: 'Tab' });
    // Tab from last element loops back to first interactive element (closeBtn)
    expect(document.activeElement).toBe(closeBtn);

    // Shift + Tab from closeBtn loops backward to last interactive element (btn2)
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(btn2);
  });

  it('restores focus to the triggering element upon closing', async () => {
    render(<ModalWithTrigger />);

    const triggerBtn = screen.getByTestId('trigger-btn');
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    // Click to open modal
    fireEvent.click(triggerBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Close the modal
    const closeBtn = screen.getByLabelText(/Close dialog/i);
    fireEvent.click(closeBtn);

    // Verify modal removed and focus returned to trigger
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(triggerBtn);
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
