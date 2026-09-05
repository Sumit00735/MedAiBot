'use client';

const META_LABELS = {
  irn: 'IRN NO',
  ackNo: 'ACK NO',
  ackDate: 'ACK DATE',
  customerName: 'Customer Name',
  billDate: 'Bill Date',
  totalAmount: 'Total Amount',
};

export default function MetaFieldsForm({ meta, onChange, documentType, extractionNotes }) {
  return (
    <div className="meta-form glass">
      <div className="meta-form-header">
        <h4>Invoice Details</h4>
        {documentType && (
          <span className="badge badge-type">{documentType.replace('_', ' ')}</span>
        )}
      </div>
      {extractionNotes && (
        <p className="extraction-notes">{extractionNotes}</p>
      )}
      <div className="meta-grid">
        {Object.entries(META_LABELS).map(([key, label]) => (
          <div key={key} className="meta-field">
            <label>{label}</label>
            <input
              type="text"
              value={meta[key] || ''}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder="Optional"
              className="field-input"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
