'use client';

import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog glass" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-icon">
          <AlertTriangle size={28} />
        </div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="dialog-actions">
          <button className="button button-outline" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`button ${danger ? 'button-danger' : 'button-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
