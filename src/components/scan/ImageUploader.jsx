'use client';

import { useRef, useState } from 'react';
import { UploadCloud, Camera, ImagePlus } from 'lucide-react';

export default function ImageUploader({ onFilesSelected, disabled }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (fileList) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) onFilesSelected(files);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      className={`upload-area ${dragActive ? 'drag-active' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={onDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <UploadCloud size={48} className="upload-icon" />
      <h3>Drop medicine images here</h3>
      <p className="upload-hint">Invoices, challans, strips, boxes — AI detects the type automatically</p>

      <div className="upload-actions" onClick={(e) => e.stopPropagation()}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />

        <button
          className="button button-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <ImagePlus size={18} /> Choose Images
        </button>
        <button
          className="button button-outline"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled}
        >
          <Camera size={18} /> Camera
        </button>
      </div>
    </div>
  );
}
