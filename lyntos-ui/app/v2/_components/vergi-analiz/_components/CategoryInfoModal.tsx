'use client';

import React from 'react';
import {
  CheckCircle2,
  X,
  TrendingDown,
  Sparkles,
  FileText,
  type LucideIcon,
} from 'lucide-react';

// ════════════════════════════════════════════════════════════════════════════
// CATEGORY INFO - SMMM EXPLANATIONS
// ════════════════════════════════════════════════════════════════════════════

interface CategoryInfo {
  title: string;
  icon: LucideIcon;
  description: string;
  details: string[];
  action: string;
  examples: string[];
}

const CATEGORY_INFO: Record<'risk' | 'avantaj' | 'zorunlu', CategoryInfo> = {
  risk: {
    title: 'Risk Kontrolleri',
    icon: TrendingDown,
    description: 'VDK incelemelerinde sıkça tespit edilen riskli durumlar',
    details: [
      'Bu kontroller, vergi incelemelerinde eleştiri konusu olabilecek alanları gösterir.',
      'Her kontrol, potansiyel vergi riski ve ceza ihtimalini azaltmak için önemlidir.',
      'Yüksek riskli kontroller öncelikli olarak ele alınmalıdır.',
    ],
    action: 'Risk kontrollerini gözden geçirin ve gerekli düzeltmeleri yapın.',
    examples: [
      'Örtülü Sermaye Kontrolü - Ortaklara borç/sermaye oranı',
      'Transfer Fiyatlandırması - İlişkili taraf işlemleri',
      'KKEG Analizi - Kanunen kabul edilmeyen giderler',
    ],
  },
  avantaj: {
    title: 'Vergi Avantajları',
    icon: Sparkles,
    description: 'Yasal vergi avantajları ve tasarruf fırsatları',
    details: [
      'Bu kontroller, mükelleflerin yararlanabileceği yasal vergi avantajlarını gösterir.',
      'Her avantaj, vergi yükünü azaltmak için kullanılabilecek bir fırsattır.',
      'Bazı avantajlar belirli koşullara bağlıdır, şartları kontrol edin.',
    ],
    action: 'Vergi avantajlarını değerlendirin ve uygun olanları uygulayın.',
    examples: [
      'Ar-Ge İndirimi - %100 ek indirim hakkı',
      'İhracat İndirimi - %5 kurumlar vergisi indirimi',
      'İstihdam Teşvikleri - SGK prim destekleri',
    ],
  },
  zorunlu: {
    title: 'Zorunlu Kontroller',
    icon: FileText,
    description: 'Yasal olarak yapılması zorunlu kontroller ve beyanlar',
    details: [
      'Bu kontroller, vergi mevzuatı gereği yapılması zorunlu olan işlemlerdir.',
      'Eksik veya hatalı beyan durumunda cezai müeyyide uygulanabilir.',
      'Tüm zorunlu kontrollerin eksiksiz tamamlanması gerekir.',
    ],
    action: 'Tüm zorunlu kontrolleri tamamlayın ve belgelendirin.',
    examples: [
      'Kurumlar Vergisi Beyannamesi - Yıllık beyan',
      'Geçici Vergi Beyannamesi - Üç aylık beyan',
      'E-Defter Berat - Aylık yükleme zorunluluğu',
    ],
  },
};

// Category Info Modal Colors
const CATEGORY_COLORS: Record<'risk' | 'avantaj' | 'zorunlu', {
  bg: string;
  border: string;
  text: string;
  iconBg: string;
  icon: string;
}> = {
  risk: {
    bg: 'bg-[#FEF2F2]',
    border: 'border-[#FFC7C9]',
    text: 'text-[#980F30]',
    iconBg: 'bg-[#FEF2F2]',
    icon: 'text-[#BF192B]',
  },
  avantaj: {
    bg: 'bg-[#ECFDF5]',
    border: 'border-[#AAE8B8]',
    text: 'text-[#005A46]',
    iconBg: 'bg-[#ECFDF5]',
    icon: 'text-[#00804D]',
  },
  zorunlu: {
    bg: 'bg-[#E6F9FF]',
    border: 'border-[#ABEBFF]',
    text: 'text-[#00287F]',
    iconBg: 'bg-[#E6F9FF]',
    icon: 'text-[#0049AA]',
  },
};

// ════════════════════════════════════════════════════════════════════════════
// CATEGORY INFO MODAL COMPONENT
// ════════════════════════════════════════════════════════════════════════════

interface CategoryInfoModalProps {
  category: 'risk' | 'avantaj' | 'zorunlu' | null;
  onClose: () => void;
}

export function CategoryInfoModal({ category, onClose }: CategoryInfoModalProps) {
  if (!category) return null;

  const info = CATEGORY_INFO[category];
  const colors = CATEGORY_COLORS[category];
  const Icon = info.icon;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className={`p-4 flex items-center justify-between ${colors.bg} ${colors.border} border-b`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.iconBg}`}>
              <Icon className={`w-6 h-6 ${colors.icon}`} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${colors.text}`}>{info.title}</h2>
              <p className="text-sm text-[#5A5A5A]">{info.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#969696] hover:text-[#5A5A5A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Details */}
          <div>
            <h3 className="text-sm font-semibold text-[#5A5A5A] mb-2">Bu Ne Anlama Geliyor?</h3>
            <ul className="space-y-2">
              {info.details.map((detail, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#5A5A5A]">
                  <CheckCircle2 className="w-4 h-4 text-[#969696] flex-shrink-0 mt-0.5" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Examples */}
          <div>
            <h3 className="text-sm font-semibold text-[#5A5A5A] mb-2">Ornek Kontroller</h3>
            <ul className="space-y-1">
              {info.examples.map((example, i) => (
                <li key={i} className="text-sm text-[#5A5A5A] pl-4 border-l-2 border-[#E5E5E5]">
                  {example}
                </li>
              ))}
            </ul>
          </div>

          {/* Action */}
          <div className={`p-3 rounded-lg ${colors.bg} ${colors.border} border`}>
            <h3 className={`text-sm font-semibold mb-1 ${colors.text}`}>SMMM Olarak Ne Yapmalisiniz?</h3>
            <p className="text-sm text-[#5A5A5A]">{info.action}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E5E5] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2E2E2E] text-white rounded-lg hover:bg-[#5A5A5A] transition-colors"
          >
            Anladim
          </button>
        </div>
      </div>
    </div>
  );
}
