'use client';

import { isFieldMissing } from '@/lib/utils';

export default function FieldInput({ item, fieldKey, value, onChange, placeholder, className = '' }) {
  const missing = isFieldMissing(item, fieldKey);

  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={missing ? 'Fill in' : placeholder || ''}
      className={`field-input ${missing ? 'field-missing' : ''} ${className}`}
    />
  );
}
