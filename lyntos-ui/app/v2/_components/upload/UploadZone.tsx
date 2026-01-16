'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { classifyFile } from './fileClassifier';
import { getBankCount } from './bankRegistry';
import { parseMizanFile } from './mizanParser';
import { useMizanStore } from '../../_lib/stores/mizanStore';
import type { UploadedFile, DocumentType, RequiredDocument } from './types';

const generateId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  beyanname_pdf: 'Beyanname (PDF)',
  tahakkuk_pdf: 'Tahakkuk (PDF)',
  mizan_excel: 'Mizan (Excel)',
  mizan_csv: 'Mizan (CSV)',
  e_berat_xml: 'e-Berat (XML)',
  banka_ekstresi: 'Banka Ekstresi',
  e_fatura_xml: 'e-Fatura (XML)',
  unknown: 'Tanimlanamadi',
};

const DOC_TYPE_ICONS: Record<DocumentType, string> = {
  beyanname_pdf: 'B',
  tahakkuk_pdf: 'T',
  mizan_excel: 'M',
  mizan_csv: 'M',
  e_berat_xml: 'E',
  banka_ekstresi: 'K',
  e_fatura_xml: 'F',
  unknown: '?',
};

interface UploadZoneProps {
  smmm_id: string;
  client_id: string;
  period: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
}

export function UploadZone({ smmm_id, client_id, period, onUploadComplete }: UploadZoneProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const setMizan = useMizanStore(s => s.setMizan);

  const requiredDocs: RequiredDocument[] = [
    { type: 'beyanname_pdf', label_tr: 'KDV Beyannamesi', required: true, uploaded: false },
    { type: 'tahakkuk_pdf', label_tr: 'Vergi Tahakkuku', required: true, uploaded: false },
    { type: 'mizan_excel', label_tr: 'Mizan', required: true, uploaded: false },
    { type: 'e_berat_xml', label_tr: 'e-Defter Berati', required: true, uploaded: false },
    { type: 'banka_ekstresi', label_tr: 'Banka Ekstresi', required: false, uploaded: false },
  ];

  const updatedRequiredDocs = requiredDocs.map(doc => ({
    ...doc,
    uploaded: files.some(f => (f.type === doc.type || (doc.type === 'mizan_excel' && f.type === 'mizan_csv')) && f.status !== 'error'),
    fileId: files.find(f => f.type === doc.type)?.id,
  }));

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);

    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: generateId(),
      file,
      name: file.name,
      size: file.size,
      type: 'unknown' as DocumentType,
      status: 'analyzing' as const,
      progress: 0,
      errors: [],
      warnings: [],
    }));

    setFiles(prev => [...prev, ...newFiles]);

    for (const uploadFile of newFiles) {
      try {
        const classification = await classifyFile(uploadFile.file);

        // Mizan dosyası ise parse et ve store'a kaydet
        if (classification.type === 'mizan_excel' || classification.type === 'mizan_csv') {
          try {
            const buffer = await uploadFile.file.arrayBuffer();
            const parsedMizan = parseMizanFile(buffer, uploadFile.file.name);

            // Store'a kaydet
            setMizan(parsedMizan, {
              taxpayerId: client_id,
              taxpayerName: client_id, // TODO: Gerçek isim
              period: period,
              uploadedAt: new Date().toISOString(),
            });

            console.log('[UploadZone] Mizan parsed and stored:', {
              accounts: parsedMizan.accounts.length,
              totals: parsedMizan.totals,
            });
          } catch (parseError) {
            console.error('[UploadZone] Mizan parse error:', parseError);
            // Hata durumunda warning ekle ama yüklemeyi engelleme
            setFiles(prev => prev.map(f => {
              if (f.id !== uploadFile.id) return f;
              return {
                ...f,
                warnings: [...f.warnings, `Mizan parse hatası: ${parseError}`],
              };
            }));
          }
        }

        setFiles(prev => prev.map(f => {
          if (f.id !== uploadFile.id) return f;

          return {
            ...f,
            type: classification.type,
            status: classification.confidence > 0.5 ? 'ready' : 'pending',
            detectedBank: classification.details.bank,
            detectedSoftware: classification.details.software,
            vkn: classification.details.vkn,
            detectedPeriod: classification.details.period,
            beratType: classification.details.beratType,
            warnings: classification.confidence < 0.5
              ? ['Dosya tipi kesin olarak belirlenemedi. Lutfen kontrol edin.']
              : [],
          };
        }));
      } catch (error) {
        setFiles(prev => prev.map(f => {
          if (f.id !== uploadFile.id) return f;
          return { ...f, status: 'error', errors: [`Analiz hatasi: ${error}`] };
        }));
      }
    }

    setIsProcessing(false);
  }, [setMizan, client_id, period]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
      'application/zip': ['.zip'],
    },
    multiple: true,
  });

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));

  const changeFileType = (id: string, newType: DocumentType) => {
    setFiles(prev => prev.map(f => f.id !== id ? f : { ...f, type: newType, status: 'ready' }));
  };

  const uploadAll = async () => {
    const readyFiles = files.filter(f => f.status === 'ready');
    if (readyFiles.length === 0) return;

    for (const file of readyFiles) {
      setFiles(prev => prev.map(f => f.id !== file.id ? f : { ...f, status: 'uploading', progress: 0 }));

      // Simulate upload progress - replace with real API call
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(r => setTimeout(r, 100));
        setFiles(prev => prev.map(f => f.id !== file.id ? f : { ...f, progress: i }));
      }

      setFiles(prev => prev.map(f => f.id !== file.id ? f : { ...f, status: 'complete', progress: 100 }));
    }

    onUploadComplete?.(files.filter(f => f.status === 'complete'));
  };

  const readyCount = files.filter(f => f.status === 'ready').length;
  const uploadedCount = updatedRequiredDocs.filter(d => d.uploaded).length;
  const requiredCount = updatedRequiredDocs.filter(d => d.required).length;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Donem Belgelerini Yukle</h2>
          <p className="text-sm text-slate-500 mt-1">{client_id} - {period}</p>
        </div>
        <span className={`text-sm font-medium ${uploadedCount >= requiredCount ? 'text-green-600' : 'text-amber-600'}`}>
          {uploadedCount}/{requiredCount} zorunlu belge
        </span>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="space-y-3">
          <div className="text-5xl font-bold text-slate-300">{isDragActive ? '+' : 'D'}</div>
          {isDragActive ? (
            <p className="text-blue-600 font-medium">Dosyalari buraya birakin...</p>
          ) : (
            <>
              <p className="text-slate-700">
                Dosyalari surukleyip birakin veya <span className="text-blue-600 font-medium">tiklayarak secin</span>
              </p>
              <p className="text-xs text-slate-500">PDF, Excel, CSV, XML, ZIP desteklenir - Toplu yukleme yapabilirsiniz</p>
            </>
          )}
        </div>
      </div>

      {/* Required Documents Checklist */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Donem icin gereken belgeler</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {updatedRequiredDocs.map(doc => (
            <div key={doc.type} className={`flex items-center gap-2 p-2 rounded text-sm
              ${doc.uploaded ? 'bg-green-50 text-green-700' : doc.required ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>
              <span>{doc.uploaded ? 'OK' : 'o'}</span>
              <span className="truncate">{doc.label_tr}</span>
            </div>
          ))}
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-700">Yuklenen dosyalar ({files.length})</h3>
          {files.map(file => (
            <div key={file.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-2xl w-8 h-8 flex items-center justify-center bg-slate-100 rounded font-bold text-slate-500">
                {DOC_TYPE_ICONS[file.type]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900 truncate">{file.name}</span>
                  <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={file.type}
                    onChange={(e) => changeFileType(file.id, e.target.value as DocumentType)}
                    className="text-xs border border-slate-300 rounded px-2 py-1 bg-slate-50"
                  >
                    {Object.entries(DOC_TYPE_LABELS).map(([type, label]) => (
                      <option key={type} value={type}>{label}</option>
                    ))}
                  </select>
                  {file.detectedBank && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {file.detectedBank.shortName}
                    </span>
                  )}
                  {file.detectedSoftware && file.detectedSoftware !== 'unknown' && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      {file.detectedSoftware.toUpperCase()}
                    </span>
                  )}
                  {file.beratType && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{file.beratType}</span>
                  )}
                </div>
                {file.warnings.map((w, i) => <p key={i} className="text-xs text-amber-600 mt-1">! {w}</p>)}
                {file.errors.map((e, i) => <p key={i} className="text-xs text-red-600 mt-1">X {e}</p>)}
                {file.status === 'uploading' && (
                  <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                    <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${file.progress}%` }} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded
                  ${file.status === 'analyzing' ? 'bg-blue-100 text-blue-700' : ''}
                  ${file.status === 'ready' ? 'bg-green-100 text-green-700' : ''}
                  ${file.status === 'uploading' ? 'bg-amber-100 text-amber-700' : ''}
                  ${file.status === 'complete' ? 'bg-green-100 text-green-700' : ''}
                  ${file.status === 'error' ? 'bg-red-100 text-red-700' : ''}
                  ${file.status === 'pending' ? 'bg-slate-100 text-slate-700' : ''}`}>
                  {file.status === 'analyzing' && 'Analiz...'}
                  {file.status === 'ready' && 'Hazir'}
                  {file.status === 'uploading' && `%${file.progress}`}
                  {file.status === 'complete' && 'Yuklendi'}
                  {file.status === 'error' && 'Hata'}
                  {file.status === 'pending' && 'Bekliyor'}
                </span>
                {!['uploading', 'complete'].includes(file.status) && (
                  <button onClick={() => removeFile(file.id)} className="p-1 text-slate-400 hover:text-red-500">X</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {readyCount > 0 && (
        <div className="flex justify-end">
          <button onClick={uploadAll} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            {readyCount} dosyayi yukle
          </button>
        </div>
      )}

      {/* Bank info */}
      <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <p className="font-medium mb-1">Desteklenen bankalar ({getBankCount()})</p>
        <p>Ziraat, Halkbank, Vakifbank, Akbank, Garanti, Is Bankasi, Yapi Kredi, TEB, ING, QNB, Denizbank,
           Kuveyt Turk, Turkiye Finans, Albaraka ve diger tum Turkiye bankalari otomatik algilanir.</p>
      </div>
    </div>
  );
}

export default UploadZone;
