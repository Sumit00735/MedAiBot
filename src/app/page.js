'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, Save, Sparkles, RotateCcw, Activity } from 'lucide-react';
import ImageUploader from '@/components/scan/ImageUploader';
import ScanQueue from '@/components/scan/ScanQueue';
import MetaFieldsForm from '@/components/scan/MetaFieldsForm';
import ExtractionReview from '@/components/scan/ExtractionReview';
import { useToast } from '@/components/shared/Toast';
import { computeMissingFields, recalcAmount } from '@/lib/utils';

function resizeImage(file, maxWidth = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ScanPage() {
  const { addToast } = useToast();
  const [queue, setQueue] = useState([]);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [documentType, setDocumentType] = useState('');
  const [extractionNotes, setExtractionNotes] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [saveDate, setSaveDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  const processingRef = useRef(false);
  const itemsRef = useRef(items);
  const metaRef = useRef(meta);

  itemsRef.current = items;
  metaRef.current = meta;

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const processQueue = useCallback(async (initialQueue) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsScanning(true);
    setLogs([]); // clear logs on new scan

    let mergedItems = [...itemsRef.current];
    let mergedMeta = { ...metaRef.current };
    let lastDocType = documentType;
    let lastNotes = extractionNotes;

    for (const entry of initialQueue.filter((q) => q.status === 'pending')) {
      setQueue((prev) =>
        prev.map((q) => (q.id === entry.id ? { ...q, status: 'processing' } : q))
      );
      
      setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `[${entry.name}] Preparing upload...` }]);

      try {
        const base64 = await resizeImage(entry.file);
        
        const fetchAndParseSSE = async (payload) => {
          const res = await fetch('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.body) throw new Error('ReadableStream not supported');
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let done = false;
          let parsedResult = null;
          let buffer = '';
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const parts = buffer.split('\n\n');
              buffer = parts.pop() || '';
              for (const part of parts) {
                if (part.startsWith('data: ')) {
                  let event;
                  try {
                    event = JSON.parse(part.slice(6));
                  } catch (e) {
                    continue;
                  }
                  if (event.type === 'log') {
                    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `[${entry.name}] ${event.message}` }]);
                  } else if (event.type === 'error') {
                    throw new Error(event.error);
                  } else if (event.type === 'result') {
                    parsedResult = event.data;
                  }
                }
              }
            }
          }
          if (!parsedResult) throw new Error('No result received from server');
          return parsedResult;
        };

        let dataResult = await fetchAndParseSSE({ image: base64 });

        const newItems = (dataResult.items || []).map((item) => {
          let withSn = { ...item, sn: item.sn || String(mergedItems.length + 1) };
          return recalcAmount(withSn);
        });

        mergedItems = [...mergedItems, ...newItems];

        if (dataResult.meta) {
          Object.entries(dataResult.meta).forEach(([k, v]) => {
            if (v && String(v).trim() && !mergedMeta[k]) mergedMeta[k] = v;
          });
        }

        if (dataResult.documentType) lastDocType = dataResult.documentType;
        if (dataResult.extractionNotes) lastNotes = dataResult.extractionNotes;

        setQueue((prev) =>
          prev.map((q) =>
            q.id === entry.id
              ? { ...q, status: 'done', rowCount: newItems.length }
              : q
          )
        );
        
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `[${entry.name}] Finished successfully!` }]);
      } catch (err) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === entry.id ? { ...q, status: 'error', error: err.message } : q
          )
        );
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `[${entry.name}] Error: ${err.message}` }]);
        addToast(`Failed to scan ${entry.name}: ${err.message}`, 'error');
      }
    }

    setItems(mergedItems);
    setMeta(mergedMeta);
    setDocumentType(lastDocType);
    setExtractionNotes(lastNotes);
    setIsScanning(false);
    processingRef.current = false;

    if (mergedItems.length > 0) {
      const missing = computeMissingFields(mergedItems);
      if (missing.length > 0) {
        addToast(`${missing.length} field(s) need review — highlighted in amber`, 'info');
      } else {
        addToast('Extraction complete!', 'success');
      }
    }
  }, [documentType, extractionNotes, addToast]);

  const handleFilesSelected = (files) => {
    const newEntries = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
      status: 'pending',
    }));

    setQueue((prev) => {
      const updated = [...prev, ...newEntries];
      setTimeout(() => processQueue(updated), 100);
      return updated;
    });
  };

  const handleRemoveFromQueue = (id) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const handleRemoveRow = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMetaChange = (key, value) => {
    setMeta((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (items.length === 0) {
      addToast('No items to save', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: saveDate, meta, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      addToast(data.message, 'success');
    } catch (err) {
      addToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setQueue([]);
    setItems([]);
    setMeta({});
    setDocumentType('');
    setExtractionNotes('');
    setLogs([]);
  };

  const missingCount = computeMissingFields(items).length;

  return (
    <div className="page scan-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Sparkles size={28} className="text-accent glow-icon" /> Scan Medicine Data
          </h1>
          <p className="page-subtitle">
            Upload any invoice, challan, or medicine image — AI extracts all fields automatically
          </p>
        </div>
      </div>

      <div className="layout-grid">
        <div className="main-col">
          <ImageUploader onFilesSelected={handleFilesSelected} disabled={isScanning} />
          <ScanQueue queue={queue} onRemove={handleRemoveFromQueue} />
        </div>
        
        {/* Real-time Logs Terminal */}
        {(logs.length > 0 || isScanning) && (
          <div className="side-col">
            <div className="terminal-logs glass">
              <div className="terminal-header">
                <Activity size={16} className={isScanning ? 'pulse' : ''} />
                <span>Live AI Logs</span>
              </div>
              <div className="terminal-body">
                {logs.map((log, i) => (
                  <div key={i} className="log-line">
                    <span className="log-time">{log.time}</span>
                    <span className="log-msg">{log.msg}</span>
                  </div>
                ))}
                {isScanning && (
                  <div className="log-line typing">
                    <span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
                  </div>
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        )}
      </div>

      {(items.length > 0 || Object.values(meta).some(Boolean)) && (
        <div className="results-section slide-up">

          {missingCount > 0 && (
            <div className="missing-banner">
              {missingCount} field(s) empty or low confidence — fill in amber highlighted cells (all optional)
            </div>
          )}

          <ExtractionReview items={items} onChange={setItems} onRemoveRow={handleRemoveRow} />

          <div className="save-bar glass">
            <div className="save-bar-left">
              <label>
                Save to date
                <input
                  type="date"
                  value={saveDate}
                  onChange={(e) => setSaveDate(e.target.value)}
                  className="date-input"
                />
              </label>
              <span className="item-count badge badge-type">{items.length} item(s)</span>
            </div>
            <div className="save-bar-actions">
              <button className="button button-outline" onClick={handleReset}>
                <RotateCcw size={16} /> Clear
              </button>
              <button
                className="button button-primary"
                onClick={handleSave}
                disabled={isSaving || items.length === 0}
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
