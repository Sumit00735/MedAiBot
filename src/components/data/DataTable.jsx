'use client';

import { HEADERS, KEY_TO_HEADER } from '@/lib/constants';
import FieldInput from '@/components/shared/FieldInput';
import { recalcAmount } from '@/lib/utils';
import { Trash2, Save, Pencil } from 'lucide-react';

const COLUMN_KEYS = HEADERS.map((h) =>
  Object.entries(KEY_TO_HEADER).find(([, header]) => header === h)?.[0]
);

export default function DataTable({ items, editing, onChange, onDeleteRow }) {
  if (!items || items.length === 0) {
    return (
      <div className="empty-state glass">
        <p>No records for this date.</p>
      </div>
    );
  }

  const updateItem = (idx, key, value) => {
    const updated = items.map((item, i) => {
      if (i !== idx) return item;
      let next = { ...item, [key]: value };
      if (key === 'quantity' || key === 'rate') {
        next = recalcAmount(next);
      }
      return next;
    });
    onChange(updated);
  };

  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {HEADERS.map((h) => (
              <th key={h}>{h}</th>
            ))}
            {editing && <th className="col-actions">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              {COLUMN_KEYS.map((key) => (
                <td key={key}>
                  {editing ? (
                    <FieldInput
                      item={item}
                      fieldKey={key}
                      value={item[key]}
                      onChange={(v) => updateItem(idx, key, v)}
                    />
                  ) : (
                    <span>{item[key] || '—'}</span>
                  )}
                </td>
              ))}
              {editing && (
                <td className="col-actions">
                  <button
                    className="icon-btn icon-btn-danger"
                    onClick={() => onDeleteRow(idx)}
                    aria-label="Delete row"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DataTableToolbar({ editing, onToggleEdit, onSave, saving, saveDisabled }) {
  return (
    <div className="table-toolbar">
      <button className="button button-outline" onClick={onToggleEdit}>
        <Pencil size={16} />
        {editing ? 'Done Editing' : 'Edit Rows'}
      </button>
      {editing && (
        <button className="button button-primary" onClick={onSave} disabled={saving || saveDisabled}>
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      )}
    </div>
  );
}
