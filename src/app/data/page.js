'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Calendar,
  Download,
  Trash2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import DataTable, { DataTableToolbar } from '@/components/data/DataTable';
import MetaFieldsForm from '@/components/scan/MetaFieldsForm';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useToast } from '@/components/shared/Toast';
import { exportItemsToCSV } from '@/lib/utils';

function DataPageContent() {
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    searchParams.get('date') || new Date().toISOString().split('T')[0]
  );
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);

  const fetchDates = useCallback(async () => {
    try {
      const res = await fetch('/api/records');
      const data = await res.json();
      if (data.dates) setDates(data.dates);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchRecords = useCallback(async (date, isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await fetch(`/api/records?date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data.items || []);
      setMeta(data.meta || {});
    } catch (err) {
      addToast(err.message, 'error');
      setItems([]);
      setMeta({});
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchDates();
  }, [fetchDates]);

  useEffect(() => {
    if (selectedDate) fetchRecords(selectedDate);
  }, [selectedDate, fetchRecords]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, meta, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast(data.message, 'success');
      setEditing(false);
      fetchDates();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRow = async (rowIndex) => {
    try {
      const res = await fetch(`/api/records?date=${selectedDate}&row=${rowIndex}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast(data.message, 'success');
      fetchRecords(selectedDate, true);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDeleteFile = async () => {
    try {
      const res = await fetch(`/api/records?date=${selectedDate}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast(data.message, 'success');
      setItems([]);
      setMeta({});
      setDeleteDialog(null);
      fetchDates();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleExport = () => {
    if (items.length === 0) {
      addToast('No data to export', 'error');
      return;
    }
    exportItemsToCSV(items, meta, `medicine_data_${selectedDate}.csv`);
    addToast('CSV exported', 'success');
  };

  const handleMetaChange = (key, value) => {
    setMeta((prev) => ({ ...prev, [key]: value }));
    if (!editing) setEditing(true);
  };

  return (
    <div className="page data-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Calendar size={28} /> Saved Data
          </h1>
          <p className="page-subtitle">Browse, edit, and export medicine records by date</p>
        </div>
        <div className="page-header-actions">
          <button className="button button-outline" onClick={() => fetchRecords(selectedDate, true)}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="button button-outline" onClick={handleExport} disabled={items.length === 0}>
            <Download size={16} /> Export CSV
          </button>
          {items.length > 0 && (
            <button
              className="button button-danger"
              onClick={() => setDeleteDialog('file')}
            >
              <Trash2 size={16} /> Delete Day
            </button>
          )}
        </div>
      </div>

      <div className="data-controls glass">
        <div className="date-picker-row">
          <label>
            Select date
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-input"
            />
          </label>
          {dates.length > 0 && (
            <div className="date-chips">
              {dates.slice(0, 8).map((d) => (
                <button
                  key={d}
                  className={`date-chip ${d === selectedDate ? 'date-chip-active' : ''}`}
                  onClick={() => setSelectedDate(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-state glass">
          <Loader2 size={32} className="spin" />
          <span>Loading records...</span>
        </div>
      ) : (
        <>

          <DataTableToolbar
            editing={editing}
            onToggleEdit={() => setEditing(!editing)}
            onSave={handleSave}
            saving={saving}
          />

          <DataTable
            items={items}
            editing={editing}
            onChange={setItems}
            onDeleteRow={handleDeleteRow}
          />
        </>
      )}

      <ConfirmDialog
        open={deleteDialog === 'file'}
        title="Delete all records?"
        message={`This will permanently delete all data for ${selectedDate}. This cannot be undone.`}
        confirmLabel="Delete All"
        danger
        onConfirm={handleDeleteFile}
        onCancel={() => setDeleteDialog(null)}
      />
    </div>
  );
}

export default function DataPage() {
  return (
    <Suspense fallback={<div className="loading-state glass"><Loader2 size={32} className="spin" /></div>}>
      <DataPageContent />
    </Suspense>
  );
}
