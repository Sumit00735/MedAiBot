'use client';

import { CheckCircle, Loader2, AlertCircle, X, Clock } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { icon: Clock, label: 'Waiting', className: 'queue-pending' },
  processing: { icon: Loader2, label: 'Scanning', className: 'queue-processing' },
  done: { icon: CheckCircle, label: 'Done', className: 'queue-done' },
  error: { icon: AlertCircle, label: 'Failed', className: 'queue-error' },
};

export default function ScanQueue({ queue, onRemove }) {
  if (queue.length === 0) return null;

  return (
    <div className="scan-queue glass">
      <h4>Scan Queue ({queue.length})</h4>
      <div className="queue-grid">
        {queue.map((item) => {
          const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
          const Icon = cfg.icon;
          return (
            <div key={item.id} className={`queue-item ${cfg.className}`}>
              <img src={item.preview} alt={item.name} />
              <div className="queue-item-info">
                <span className="queue-name">{item.name}</span>
                <span className="queue-status">
                  <Icon size={14} className={item.status === 'processing' ? 'spin' : ''} />
                  {cfg.label}
                  {item.status === 'done' && item.rowCount != null && ` · ${item.rowCount} row(s)`}
                </span>
              </div>
              {item.status !== 'processing' && (
                <button className="queue-remove" onClick={() => onRemove(item.id)} aria-label="Remove">
                  <X size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
