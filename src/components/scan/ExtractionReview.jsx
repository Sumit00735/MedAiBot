'use client';

import { HEADERS, KEY_TO_HEADER } from '@/lib/constants';
import FieldInput from '@/components/shared/FieldInput';
import { isDuplicateRow, recalcAmount } from '@/lib/utils';
import { Trash2, AlertTriangle, PenLine } from 'lucide-react';

const COLUMN_KEYS = HEADERS.map((h) =>
  Object.entries(KEY_TO_HEADER).find(([, header]) => header === h)?.[0]
);

export default function ExtractionReview({ items, onChange, onRemoveRow }) {
  if (!items || items.length === 0) {
    return (
      <div className="empty-state glass">
        <p>No items extracted yet. Upload images to begin.</p>
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

  const duplicateIndices = new Set();
  items.forEach((item, i) => {
    items.forEach((other, j) => {
      if (i < j && isDuplicateRow(item, other)) {
        duplicateIndices.add(i);
        duplicateIndices.add(j);
      }
    });
  });

  return (
    <div className="extraction-review">
      <div className="table-wrapper data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {HEADERS.map((h) => (
                <th key={h}>{h}</th>
              ))}
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className={duplicateIndices.has(idx) ? 'row-duplicate' : ''}>
                {COLUMN_KEYS.map((key) => (
                  <td key={key}>
                    {key === 'batchNumber' ? (
                      <div className="batch-cell">
                        <FieldInput
                          item={item}
                          fieldKey={key}
                          value={item[key]}
                          onChange={(v) => updateItem(idx, key, v)}
                        />
                        {item.isBatchHandwritten && (
                          <span className="badge badge-handwritten" title="Handwritten batch">
                            <PenLine size={12} /> HW
                          </span>
                        )}
                      </div>
                    ) : (
                      <FieldInput
                        item={item}
                        fieldKey={key}
                        value={item[key]}
                        onChange={(v) => updateItem(idx, key, v)}
                      />
                    )}
                  </td>
                ))}
                <td className="col-actions">
                  {duplicateIndices.has(idx) && (
                    <span className="badge badge-warning" title="Possible duplicate">
                      <AlertTriangle size={12} />
                    </span>
                  )}
                  <button
                    className="icon-btn icon-btn-danger"
                    onClick={() => onRemoveRow(idx)}
                    aria-label="Remove row"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
