'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface DocumentInfo {
  id: string;
  doc_type: string;
  original_filename: string;
  parse_status: string;
  time_shield_status: string;
  received_at: string;
  classification_confidence: number;
}

interface UploadCardProps {
  docType: string;
  label: string;
  icon: string;
  required: boolean;
  document?: DocumentInfo;
  smmmId: string;
  clientId: string;
  periodId: string;
  onUploadSuccess: () => void;
}

export default function UploadCard({
  docType,
  label,
  icon,
  required,
  document,
  smmmId,
  clientId,
  periodId,
  onUploadSuccess
}: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const authHeaders = { 'Authorization': `DEV_${smmmId}` };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const url = `http://localhost:8000/api/v1/documents/upload?client_id=${clientId}&period_id=${periodId}&doc_type=${docType}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: authHeaders,
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || `Upload failed: ${res.status}`);
      }

      const data = await res.json();

      if (data.data?.time_shield?.status === 'REJECT') {
        setError(`Donem uyumsuzlugu: ${data.data.time_shield.reason}`);
      } else {
        onUploadSuccess();
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Yukleme hatasi');
    }

    setUploading(false);
  };

  const getStatusBadge = () => {
    if (!document) return null;

    const badges = [];

    // Parse status
    if (document.parse_status === 'OK') {
      badges.push(
        <span key="parse" className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
          Parse OK
        </span>
      );
    } else if (document.parse_status === 'WARN') {
      badges.push(
        <span key="parse" className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
          Parse Uyari
        </span>
      );
    } else if (document.parse_status === 'ERROR') {
      badges.push(
        <span key="parse" className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs">
          Parse Hata
        </span>
      );
    }

    // Time shield status
    if (document.time_shield_status === 'PASS') {
      badges.push(
        <span key="shield" className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
          Donem OK
        </span>
      );
    } else if (document.time_shield_status === 'WARN') {
      badges.push(
        <span key="shield" className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
          Donem Uyari
        </span>
      );
    }

    return badges;
  };

  const hasDocument = !!document;

  return (
    <div
      className={`relative rounded-lg border-2 transition-all ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : hasDocument
            ? 'border-green-300 bg-green-50'
            : required
              ? 'border-orange-300 bg-orange-50 border-dashed'
              : 'border-gray-200 bg-white border-dashed'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Required Badge */}
      {required && !hasDocument && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
          Zorunlu
        </div>
      )}

      {/* Uploaded Badge */}
      {hasDocument && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
          Yuklu
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{label}</h3>
            <p className="text-xs text-gray-500">{docType}</p>
          </div>
        </div>

        {/* Document Info or Upload Area */}
        {hasDocument ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-700 truncate" title={document.original_filename}>
              {document.original_filename}
            </p>
            <div className="flex flex-wrap gap-1">
              {getStatusBadge()}
            </div>
            <p className="text-xs text-gray-400">
              {new Date(document.received_at).toLocaleString('tr-TR')}
            </p>

            {/* Replace button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-2 w-full py-1.5 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50"
            >
              {uploading ? 'Yukleniyor...' : 'Degistir'}
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-2">
              {isDragging ? 'Dosyayi birakin...' : 'Dosya surukleyin veya'}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Yukleniyor...' : 'Dosya Sec'}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept=".csv,.xlsx,.xls,.xml,.pdf,.txt"
      />
    </div>
  );
}
