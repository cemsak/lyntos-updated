'use client';

import React, { useState, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Cpu,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Card } from '../../_components/shared/Card';
import { Badge } from '../../_components/shared/Badge';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface ColumnMappingItem {
  source_column: string;
  source_index: number;
  confidence: number;
  method: string;
}

export interface PreviewData {
  column_mapping: Record<string, ColumnMappingItem>;
  preview_rows: Record<string, string>[];
  total_rows: number;
  detected_delimiter: string;
  detected_encoding: string;
  detected_program: string | null;
  raw_headers: string[];
  warnings: string[];
}

interface CariUploadPreviewProps {
  data: PreviewData;
  filename: string;
  onConfirm: (mapping: Record<string, ColumnMappingItem>) => void;
  onCancel: () => void;
  confirming: boolean;
}

// ═══════════════════════════════════════════════════════════
// HEDEF ALAN ETİKETLERİ
// ═══════════════════════════════════════════════════════════

const TARGET_LABELS: Record<string, string> = {
  hesap_kodu: 'Hesap Kodu',
  karsi_taraf: 'Karşı Taraf / Ünvan',
  bakiye: 'Bakiye',
  borc: 'Borç',
  alacak: 'Alacak',
};

// ═══════════════════════════════════════════════════════════
// CONFIDENCE BADGE
// ═══════════════════════════════════════════════════════════

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 80) {
    return (
      <Badge variant="success" size="sm">
        <CheckCircle2 className="w-3 h-3" />
        %{confidence}
      </Badge>
    );
  }
  if (confidence >= 50) {
    return (
      <Badge variant="warning" size="sm">
        <AlertTriangle className="w-3 h-3" />
        %{confidence}
      </Badge>
    );
  }
  return (
    <Badge variant="error" size="sm">
      <XCircle className="w-3 h-3" />
      %{confidence}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════
// COLUMN MAPPING ROW
// ═══════════════════════════════════════════════════════════

function ColumnMappingRow({
  targetField,
  mapping,
  rawHeaders,
  onChangeSource,
}: {
  targetField: string;
  mapping: ColumnMappingItem;
  rawHeaders: string[];
  onChangeSource: (targetField: string, newSource: string, newIndex: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (idx >= 0 && idx < rawHeaders.length) {
      onChangeSource(targetField, rawHeaders[idx], idx);
    }
    setIsEditing(false);
  };

  return (
    <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F6F8]/50 transition-colors">
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-[#2E2E2E]">
          {TARGET_LABELS[targetField] || targetField}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <ArrowRight className="w-4 h-4 text-[#B4B4B4] mx-auto" />
      </td>
      <td className="px-4 py-3">
        {isEditing ? (
          <select
            autoFocus
            className="w-full px-2 py-1.5 text-sm border border-[#0078D0] rounded-lg focus:ring-2 focus:ring-[#ABEBFF] outline-none bg-white"
            defaultValue={mapping.source_index}
            onChange={handleSelect}
            onBlur={() => setIsEditing(false)}
          >
            {rawHeaders.map((h, i) => (
              <option key={i} value={i}>
                {h}
              </option>
            ))}
          </select>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-2 py-1 text-sm text-[#2E2E2E] bg-[#F5F6F8] rounded-lg hover:bg-[#E5E5E5] transition-colors"
          >
            <span className="font-mono">{mapping.source_column}</span>
            <ChevronDown className="w-3 h-3 text-[#969696]" />
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        <ConfidenceBadge confidence={mapping.confidence} />
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-[#969696]">{mapping.method}</span>
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function CariUploadPreview({
  data,
  filename,
  onConfirm,
  onCancel,
  confirming,
}: CariUploadPreviewProps) {
  const [editedMapping, setEditedMapping] = useState<Record<string, ColumnMappingItem>>(
    () => ({ ...data.column_mapping }),
  );

  const handleChangeSource = useCallback(
    (targetField: string, newSource: string, newIndex: number) => {
      setEditedMapping((prev) => ({
        ...prev,
        [targetField]: {
          ...prev[targetField],
          source_column: newSource,
          source_index: newIndex,
          confidence: 100,
          method: 'manual',
        },
      }));
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    onConfirm(editedMapping);
  }, [editedMapping, onConfirm]);

  // Ortalama confidence hesapla
  const mappingEntries = Object.entries(editedMapping);
  const avgConfidence =
    mappingEntries.length > 0
      ? Math.round(mappingEntries.reduce((s, [, m]) => s + m.confidence, 0) / mappingEntries.length)
      : 0;

  const hasLowConfidence = mappingEntries.some(([, m]) => m.confidence < 50);
  const hasHesapKodu = 'hesap_kodu' in editedMapping;

  return (
    <Card>
      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#2E2E2E]">Sütun Eşleştirme Önizlemesi</h2>
            <p className="text-sm text-[#5A5A5A] mt-0.5">
              <span className="font-mono text-xs bg-[#F5F6F8] px-1.5 py-0.5 rounded">{filename}</span>
              {' '}&middot; {data.total_rows} satır
            </p>
          </div>
          {data.detected_program && (
            <Badge variant="info" size="md" icon={<Cpu className="w-3.5 h-3.5" />}>
              {data.detected_program}
            </Badge>
          )}
        </div>

        {/* Uyarılar */}
        {data.warnings.length > 0 && (
          <div className="bg-[#FFFBEB] border border-[#FFE045] rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#FA841E] mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                {data.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-[#E67324]">{w}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Düşük confidence uyarısı */}
        {hasLowConfidence && (
          <div className="bg-[#FEF2F2] border border-[#FF9196] rounded-lg p-3">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-[#BF192B] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#BF192B]">
                  Düşük güvenilirlikli eşleşme tespit edildi
                </p>
                <p className="text-xs text-[#BF192B] mt-0.5">
                  Kırmızı işaretli sütunları &quot;Değiştir&quot; butonuyla manuel olarak düzeltmeniz önerilir.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hesap kodu yoksa hata */}
        {!hasHesapKodu && (
          <div className="bg-[#FEF2F2] border border-[#FF9196] rounded-lg p-3">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-[#BF192B] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#BF192B]">
                  Hesap Kodu sütunu bulunamadı
                </p>
                <p className="text-xs text-[#BF192B] mt-0.5">
                  Desteklenen formatlar: Logo Tiger, Mikro, ETA, Zirve, Luca, Netsis.
                  Sütun başlıklarında &quot;hesap kodu&quot;, &quot;cari kod&quot;, &quot;account code&quot; gibi ifadeler aranır.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sütun Haritası Tablosu */}
        <div className="overflow-x-auto border border-[#E5E5E5] rounded-lg">
          <table className="min-w-full divide-y divide-[#E5E5E5]">
            <thead>
              <tr className="bg-[#F5F6F8]">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#5A5A5A] uppercase">
                  Hedef Alan
                </th>
                <th className="px-4 py-2.5 w-8" />
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#5A5A5A] uppercase">
                  Kaynak Sütun
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#5A5A5A] uppercase">
                  Güven
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#5A5A5A] uppercase">
                  Yöntem
                </th>
              </tr>
            </thead>
            <tbody>
              {mappingEntries.map(([field, mapping]) => (
                <ColumnMappingRow
                  key={field}
                  targetField={field}
                  mapping={mapping}
                  rawHeaders={data.raw_headers}
                  onChangeSource={handleChangeSource}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Veri Önizleme (İlk 5 satır) */}
        {data.preview_rows.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#2E2E2E] mb-2">
              Veri Önizleme (ilk {data.preview_rows.length} satır)
            </h3>
            <div className="overflow-x-auto border border-[#E5E5E5] rounded-lg">
              <table className="min-w-full divide-y divide-[#E5E5E5]">
                <thead>
                  <tr className="bg-[#F5F6F8]">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[#5A5A5A]">#</th>
                    {data.raw_headers.map((h, i) => (
                      <th
                        key={i}
                        className="px-3 py-2 text-left text-xs font-semibold text-[#5A5A5A] whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.preview_rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-[#E5E5E5] hover:bg-[#F5F6F8]/50">
                      <td className="px-3 py-2 text-xs text-[#969696]">{rowIdx + 1}</td>
                      {data.raw_headers.map((h, i) => (
                        <td key={i} className="px-3 py-2 text-sm text-[#2E2E2E] whitespace-nowrap font-mono">
                          {row[h] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Meta bilgiler */}
        <div className="flex items-center gap-4 text-xs text-[#969696]">
          <span>Ayraç: <span className="font-mono bg-[#F5F6F8] px-1 rounded">{data.detected_delimiter === '\t' ? 'TAB' : data.detected_delimiter}</span></span>
          <span>Encoding: <span className="font-mono">{data.detected_encoding}</span></span>
          <span>Ort. Güven: <span className={`font-semibold ${avgConfidence >= 80 ? 'text-[#00804D]' : avgConfidence >= 50 ? 'text-[#E67324]' : 'text-[#BF192B]'}`}>%{avgConfidence}</span></span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E5E5E5]">
          <button
            onClick={onCancel}
            disabled={confirming}
            className="px-4 py-2 text-sm font-medium text-[#5A5A5A] bg-white border border-[#E5E5E5] rounded-lg hover:bg-[#F5F6F8] transition-colors disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || !hasHesapKodu}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0049AA] rounded-lg hover:bg-[#00287F] transition-colors disabled:bg-[#ABEBFF] disabled:text-[#5A5A5A] disabled:cursor-not-allowed"
          >
            {confirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mutabakat çalıştırılıyor...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Onayla ve Mutabakat Başlat
              </>
            )}
          </button>
        </div>
      </div>
    </Card>
  );
}
