import fs from 'fs';
import path from 'path';
import {
  HEADERS,
  isValidDate,
  itemToRow,
  rowToItem,
} from './constants';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function sanitizeDate(dateString) {
  if (!isValidDate(dateString)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD.');
  }
  return dateString.replace(/[^0-9\-]/g, '');
}

export function getCsvPath(dateString) {
  return path.join(DATA_DIR, `${sanitizeDate(dateString)}.csv`);
}

export function getMetaPath(dateString) {
  return path.join(DATA_DIR, `${sanitizeDate(dateString)}.meta.json`);
}

function escapeCsvField(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: HEADERS, rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);
  return { headers, rows };
}

function writeCsv(dateString, rows) {
  ensureDataDir();
  const lines = [HEADERS.map(escapeCsvField).join(',')];
  rows.forEach((row) => {
    const padded = HEADERS.map((_, i) => row[i] ?? '');
    lines.push(padded.map(escapeCsvField).join(','));
  });
  fs.writeFileSync(getCsvPath(dateString), lines.join('\n') + '\n', 'utf8');
}

function readMeta(dateString) {
  const metaPath = getMetaPath(dateString);
  if (!fs.existsSync(metaPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch {
    return {};
  }
}

function writeMeta(dateString, meta) {
  ensureDataDir();
  const merged = {
    ...meta,
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(getMetaPath(dateString), JSON.stringify(merged, null, 2), 'utf8');
}

function mergeMeta(existing, incoming) {
  if (!incoming || typeof incoming !== 'object') return existing;
  const merged = { ...existing };
  Object.entries(incoming).forEach(([key, value]) => {
    if (value != null && String(value).trim() !== '') {
      merged[key] = value;
    }
  });
  return merged;
}

export function readRecords(dateString) {
  const csvPath = getCsvPath(dateString);
  const meta = readMeta(dateString);

  if (!fs.existsSync(csvPath)) {
    return { meta, items: [] };
  }

  const content = fs.readFileSync(csvPath, 'utf8');
  const { rows } = parseCsv(content);
  const items = rows.map(rowToItem);
  return { meta, items };
}

export function writeRecords(dateString, { meta = {}, items = [] }) {
  const rows = items.map((item, index) => itemToRow(item, index + 1));
  writeCsv(dateString, rows);
  writeMeta(dateString, meta);
}

export function appendRecords(dateString, { meta = {}, items = [] }) {
  const existing = readRecords(dateString);
  const mergedMeta = mergeMeta(existing.meta, meta);
  const startSn = existing.items.length + 1;
  const newRows = items.map((item, index) => itemToRow(item, startSn + index));
  const existingRows = existing.items.map((item, index) => itemToRow(item, index + 1));
  writeCsv(dateString, [...existingRows, ...newRows]);
  writeMeta(dateString, mergedMeta);
}

export function deleteRow(dateString, rowIndex) {
  const existing = readRecords(dateString);
  if (rowIndex < 0 || rowIndex >= existing.items.length) {
    throw new Error('Row index out of range.');
  }
  existing.items.splice(rowIndex, 1);
  writeRecords(dateString, { meta: existing.meta, items: existing.items });
}

export function deleteFile(dateString) {
  const csvPath = getCsvPath(dateString);
  const metaPath = getMetaPath(dateString);
  if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
  if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
}

export function listDates() {
  ensureDataDir();
  const files = fs.readdirSync(DATA_DIR);
  const dates = files
    .filter((f) => f.endsWith('.csv'))
    .map((f) => f.replace('.csv', ''))
    .filter(isValidDate)
    .sort((a, b) => b.localeCompare(a));
  return dates;
}
