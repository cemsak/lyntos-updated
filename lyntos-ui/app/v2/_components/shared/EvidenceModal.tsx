'use client';

import React from 'react';
import {
  X,
  FileText,
  Calculator,
  Scale,
  Lightbulb,
  ArrowRight,
  Copy,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RiskBadge } from './RiskBadge';
import { type RiskLevel, RISK_LEVELS } from '@/lib/ui/design-tokens';

interface EvidenceItem {
  label: string;
  value: string | number;
  source?: string;
}

interface MevzuatItem {
  kod: string;
  ad: string;
  madde?: string;
  ozet: string;
}

interface FormulaItem {
  aciklama: string;
  formul: string;
  hesaplama: string;
  sonuc: string | number;
}

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  riskLevel: RiskLevel;
  // Data sections
  kanitlar?: EvidenceItem[];
  formul?: FormulaItem;
  esikler?: {
    normal: string;
    uyari: string;
    kritik: string;
    mevcutDurum: string;
  };
  mevzuatlar?: MevzuatItem[];
  vdkRiski?: string;
  oneriler?: string[];
  sonrakiAdimlar?: string[];
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  riskLevel,
  kanitlar,
  formul,
  esikler,
  mevzuatlar,
  vdkRiski,
  oneriler,
  sonrakiAdimlar,
}) => {
  if (!isOpen) return null;

  const riskConfig = RISK_LEVELS[riskLevel];

  const handleCopy = () => {
    const text = `${title}\n${subtitle || ''}\n\nKanitlar:\n${
      kanitlar?.map((k) => `- ${k.label}: ${k.value}`).join('\n') || ''
    }`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-modal-title"
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        tabIndex={-1}
      >
        {/* Header */}
        <div
          className={cn(
            'px-6 py-4 flex items-start justify-between',
            riskConfig.color.bg,
            'border-b',
            riskConfig.color.border
          )}
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 id="evidence-modal-title" className={cn('text-lg font-bold', riskConfig.color.text)}>
                {title}
              </h2>
              <RiskBadge level={riskLevel} size="sm" />
            </div>
            {subtitle && (
              <p className="text-sm text-[#5A5A5A]">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/50 transition-colors"
          >
            <X className="w-5 h-5 text-[#969696]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Kanitlar */}
          {kanitlar && kanitlar.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#5A5A5A] mb-3">
                <FileText className="w-4 h-4" />
                KULLANILAN VERILER
              </h3>
              <div className="bg-[#F5F6F8] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E5E5]">
                      <th className="px-4 py-2 text-left font-medium text-[#969696]">
                        Veri
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-[#969696]">
                        Deger
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-[#969696]">
                        Kaynak
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {kanitlar.map((k, i) => (
                      <tr
                        key={i}
                        className="border-b border-[#E5E5E5] last:border-0"
                      >
                        <td className="px-4 py-2 text-[#5A5A5A]">{k.label}</td>
                        <td className="px-4 py-2 text-right font-mono font-medium text-[#2E2E2E]">
                          {typeof k.value === 'number'
                            ? k.value.toLocaleString('tr-TR')
                            : k.value}
                        </td>
                        <td className="px-4 py-2 text-right text-[#969696] text-xs">
                          {k.source || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Formul */}
          {formul && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#5A5A5A] mb-3">
                <Calculator className="w-4 h-4" />
                HESAPLAMA
              </h3>
              <div className="bg-[#F5F6F8] rounded-lg p-4 space-y-2">
                <p className="text-sm text-[#5A5A5A]">{formul.aciklama}</p>
                <div className="font-mono text-sm bg-white rounded p-3 border border-[#E5E5E5]">
                  <div className="text-[#969696]">{formul.formul}</div>
                  <div className="text-[#5A5A5A] mt-1">
                    = {formul.hesaplama}
                  </div>
                  <div className={cn('font-bold mt-1', riskConfig.color.text)}>
                    = {formul.sonuc}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Esikler */}
          {esikler && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#5A5A5A] mb-3">
                <Scale className="w-4 h-4" />
                ESIK DEGERLERI
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-[#ECFDF5] rounded-lg border border-[#AAE8B8]">
                  <span className="text-sm text-[#00804D]">Normal</span>
                  <span className="text-sm font-medium text-[#005A46]">
                    {esikler.normal}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#FFFBEB] rounded-lg border border-[#FFF08C]">
                  <span className="text-sm text-[#FA841E]">Uyari</span>
                  <span className="text-sm font-medium text-[#E67324]">
                    {esikler.uyari}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#FEF2F2] rounded-lg border border-[#FFC7C9]">
                  <span className="text-sm text-[#BF192B]">Kritik</span>
                  <span className="text-sm font-medium text-[#980F30]">
                    {esikler.kritik}
                  </span>
                </div>
                <div
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border-2',
                    riskConfig.color.bg,
                    riskConfig.color.border
                  )}
                >
                  <span
                    className={cn('text-sm font-medium', riskConfig.color.text)}
                  >
                    Mevcut Durum
                  </span>
                  <span
                    className={cn('text-sm font-bold', riskConfig.color.text)}
                  >
                    {esikler.mevcutDurum} ← SIZ BURADASINIZ
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Mevzuat */}
          {mevzuatlar && mevzuatlar.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#5A5A5A] mb-3">
                <Scale className="w-4 h-4" />
                MEVZUAT DAYANAGI
              </h3>
              <div className="space-y-2">
                {mevzuatlar.map((m, i) => (
                  <div
                    key={i}
                    className="p-3 bg-[#F5F6F8] rounded-lg border border-[#E5E5E5]"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-[#E5E5E5] rounded text-xs font-medium text-[#5A5A5A]">
                        {m.kod}
                      </span>
                      <span className="text-sm font-medium text-[#2E2E2E]">
                        {m.ad}
                      </span>
                    </div>
                    <p className="text-xs text-[#5A5A5A]">{m.ozet}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* VDK Riski */}
          {vdkRiski && (
            <section>
              <div className="p-4 bg-[#FEF2F2] rounded-lg border border-[#FFC7C9]">
                <h3 className="text-sm font-semibold text-[#980F30] mb-1">
                  VDK Inceleme Riski
                </h3>
                <p className="text-sm text-[#BF192B]">{vdkRiski}</p>
              </div>
            </section>
          )}

          {/* Oneriler */}
          {oneriler && oneriler.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#5A5A5A] mb-3">
                <Lightbulb className="w-4 h-4" />
                ONERILER
              </h3>
              <ul className="space-y-2">
                {oneriler.map((o, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[#5A5A5A]"
                  >
                    <span className="text-[#00A651] mt-0.5">✓</span>
                    {o}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Sonraki Adimlar */}
          {sonrakiAdimlar && sonrakiAdimlar.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#5A5A5A] mb-3">
                <ArrowRight className="w-4 h-4" />
                SONRAKI ADIMLAR
              </h3>
              <ol className="space-y-2">
                {sonrakiAdimlar.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-[#5A5A5A]"
                  >
                    <span className="flex-shrink-0 w-5 h-5 bg-[#E6F9FF] text-[#0049AA] rounded-full flex items-center justify-center text-xs font-medium">
                      {i + 1}
                    </span>
                    {a}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E5E5] flex items-center justify-between bg-[#F5F6F8]">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-1" />
              Kopyala
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
          </div>
          <Button onClick={onClose}>Anladim</Button>
        </div>
      </div>
    </div>
  );
};

export default EvidenceModal;
