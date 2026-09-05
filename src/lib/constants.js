export const HEADERS = [
  'Sn',
  'Item Name',
  'Qty',
  'Batch',
  'Expiry',
  'Rate',
  'Amount',
];

export const HEADER_TO_KEY = {
  Sn: 'sn',
  'Item Name': 'productName',
  Qty: 'quantity',
  Batch: 'batchNumber',
  Expiry: 'exp',
  Rate: 'rate',
  Amount: 'amount',
};

export const KEY_TO_HEADER = Object.fromEntries(
  Object.entries(HEADER_TO_KEY).map(([h, k]) => [k, h])
);

export const ITEM_KEYS = Object.values(HEADER_TO_KEY);

export const META_FIELDS = [
  'irn',
  'ackNo',
  'ackDate',
  'customerName',
  'billDate',
  'totalAmount',
];

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(dateStr) {
  if (!DATE_REGEX.test(dateStr)) return false;
  const parsed = new Date(dateStr);
  return !isNaN(parsed.getTime());
}

export function itemToRow(item, snFallback) {
  return HEADERS.map((h) => {
    const key = HEADER_TO_KEY[h];
    if (h === 'Sn') return item.sn || String(snFallback);
    return item[key] ?? '';
  });
}

export function rowToItem(row) {
  const item = {};
  HEADERS.forEach((h, i) => {
    item[HEADER_TO_KEY[h]] = row[i] !== undefined && row[i] !== null ? String(row[i]) : '';
  });
  return item;
}

export function sanitizeForStorage(item) {
  const clean = {};
  ITEM_KEYS.forEach((key) => {
    clean[key] = item[key] != null ? String(item[key]) : '';
  });
  if (item.isBatchHandwritten) clean.isBatchHandwritten = true;
  if (item.fieldConfidence) clean.fieldConfidence = item.fieldConfidence;
  return clean;
}
