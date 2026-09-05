import { HEADERS, HEADER_TO_KEY, KEY_TO_HEADER } from './constants';

export function sanitizeCSV(val) {
  const s = String(val ?? '');
  if (/^[=+\-@\t\r]/.test(s)) return `'${s}`;
  return s;
}

export function exportItemsToCSV(items, meta = {}, filename) {
  let csv = HEADERS.join(',') + '\n';

  items.forEach((item) => {
    const row = HEADERS.map((h) => {
      const key = HEADER_TO_KEY[h];
      const val = sanitizeCSV(item[key] ?? '');
      return `"${val.replace(/"/g, '""')}"`;
    });
    csv += row.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `medicine_data_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function isFieldMissing(item, key) {
  const val = item[key];
  const empty = val == null || String(val).trim() === '';
  const lowConfidence = item.fieldConfidence?.[key] === 'low';
  return empty || lowConfidence;
}

export function computeMissingFields(items) {
  const keys = Object.keys(KEY_TO_HEADER);
  const missing = new Set();
  items.forEach((item) => {
    keys.forEach((key) => {
      if (isFieldMissing(item, key)) {
        missing.add(KEY_TO_HEADER[key]);
      }
    });
  });
  return Array.from(missing);
}

export function recalcAmount(item) {
  const qty = parseFloat(item.quantity) || 0;
  const rate = parseFloat(item.rate) || 0;
  if (qty && rate) {
    return { ...item, amount: (qty * rate).toFixed(2) };
  }
  return item;
}

export function isDuplicateRow(a, b) {
  const nameA = (a.productName || '').toLowerCase().trim();
  const nameB = (b.productName || '').toLowerCase().trim();
  const batchA = (a.batchNumber || '').toLowerCase().trim();
  const batchB = (b.batchNumber || '').toLowerCase().trim();
  return nameA && nameA === nameB && batchA && batchA === batchB;
}
