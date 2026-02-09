'use client';

/**
 * Dönem Sonu İşlemleri - Kaizen Görsel Sistem v2
 *
 * Mali yıl sonu işlemleri için adım adım wizard
 * Animasyonlu, responsive ve erişilebilir tasarım
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardScope } from '../_components/scope/ScopeProvider';
import { API_BASE_URL } from '../_lib/config/api';
import {
  FileSpreadsheet,
  Calculator,
  CheckCircle2,
  Upload,
  Sparkles,
  TrendingUp,
  Shield,
  Download,
  FileText,
} from 'lucide-react';

// Alt bileşenler ve tipler
import { type WizardStep, type ChecklistItem } from './_types';
import {
  HeaderSection,
  KpiStrip,
  AlertBanner,
  WizardStepsPanel,
  Checklist,
  QuickLinks,
} from './_components';
import { useToast } from '../_components/shared/Toast';

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

const DONEM_SONU_KEY_BASE = 'lyntos_donem_sonu_progress';

export default function DonemSonuPage() {
  const router = useRouter();
  const { scope, selectedClient, selectedPeriod } = useDashboardScope();
  const { showToast } = useToast();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [hasData, setHasData] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Scope-aware localStorage key
  const storageKey =
    scope.client_id && scope.period
      ? `${DONEM_SONU_KEY_BASE}_${scope.client_id}_${scope.period}`
      : DONEM_SONU_KEY_BASE;

  // Load progress from localStorage (scope-aware)
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCompletedSteps(parsed.completedSteps || []);
      } catch {
        // Invalid data
      }
    } else {
      setCompletedSteps([]);
    }
  }, [storageKey]);

  // Check data availability via API (Adım 6: replace localStorage check)
  useEffect(() => {
    if (!selectedClient?.id || !selectedPeriod?.code) {
      setHasData(false);
      return;
    }

    const checkDataStatus = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v2/periods/${encodeURIComponent(selectedClient.id)}/${encodeURIComponent(selectedPeriod.code)}/status`
        );
        if (!res.ok) {
          setHasData(false);
          return;
        }
        const data = await res.json();
        const uploadedTypes: string[] = data.uploaded_doc_types || [];
        setHasData(uploadedTypes.includes('MIZAN'));
      } catch {
        setHasData(false);
      }
    };

    checkDataStatus();
  }, [selectedClient?.id, selectedPeriod?.code]);

  // Save progress to localStorage (scope-aware)
  const saveProgress = (steps: number[]) => {
    localStorage.setItem(storageKey, JSON.stringify({ completedSteps: steps }));
    setCompletedSteps(steps);
  };

  const handleResetProgress = () => {
    if (confirm('Tüm ilerlemeniz sıfırlanacak. Emin misiniz?')) {
      saveProgress([]);
    }
  };

  const getStepStatus = (stepId: number): 'completed' | 'current' | 'pending' => {
    if (completedSteps.includes(stepId)) return 'completed';
    // Adım 8: Auto-complete step 1 when mizan data exists
    if (stepId === 1 && hasData) return 'completed';
    if (stepId === 1) return 'current';
    // Step 2 accessible when step 1 completed OR hasData
    if (stepId === 2 && (completedSteps.includes(1) || hasData)) return 'current';
    if (completedSteps.includes(stepId - 1)) return 'current';
    return 'pending';
  };

  const WIZARD_STEPS: WizardStep[] = [
    {
      id: 1,
      title: 'Mizan Kontrolü',
      description: 'Dönem sonu mizan verilerinin doğruluğunu kontrol edin',
      detailedInfo:
        'Mizan dosyanızı yükleyerek borç-alacak denkliğini, hesap bakiyelerini ve anomalileri otomatik olarak tespit edin.',
      status: getStepStatus(1),
      icon: <FileSpreadsheet className="w-5 h-5" />,
      href: hasData ? '/v2/cross-check' : '/v2/upload',
      estimatedTime: '5-10 dk',
      category: 'veri',
    },
    {
      id: 2,
      title: 'Yeniden Değerleme',
      description: 'VUK Mük. 298/Ç kapsamında MDV yeniden değerlemesi',
      detailedInfo:
        'VUK Geçici 37 ile 2025-2027 enflasyon düzeltmesi askıdadır. Yeniden değerleme (Yİ-ÜFE bazlı) uygulanabilir.',
      status: getStepStatus(2),
      icon: <Calculator className="w-5 h-5" />,
      href: '/v2/enflasyon',
      estimatedTime: '10-15 dk',
      category: 'hesaplama',
    },
    {
      id: 3,
      title: 'Vergi Hesaplaması',
      description: 'Amortisman, reeskont, karşılık ve kurumlar vergisi',
      detailedInfo:
        'VUK kapsamında amortisman (Md. 315), reeskont (Md. 281/285) ve şüpheli alacak karşılığı (Md. 323) hesaplayın.',
      status: getStepStatus(3),
      icon: <Shield className="w-5 h-5" />,
      href: '/v2/vergi/kurumlar',
      estimatedTime: '15-20 dk',
      category: 'vergi',
    },
    {
      id: 4,
      title: 'Raporlama',
      description: 'Dönem sonu raporlarını oluşturun ve indirin',
      detailedInfo:
        'Yakın zamanda aktif olacaktır. Tüm hesaplamalarınızı raporlar olarak dışa aktarabileceksiniz.',
      status: getStepStatus(4),
      icon: <Download className="w-5 h-5" />,
      href: '/v2/reports',
      estimatedTime: '2-5 dk',
      category: 'rapor',
    },
  ];

  const handleStepClick = (step: WizardStep) => {
    if (step.status === 'pending') {
      showToast(
        'warning',
        `Bu adımı başlatmak için önce "${WIZARD_STEPS[step.id - 2]?.title || 'önceki adımı'}" tamamlamanız gerekiyor.`
      );
      return;
    }
    router.push(step.href);
  };

  const handleMarkComplete = (stepId: number) => {
    // Adım 8: Step 1 requires data to be uploaded
    if (stepId === 1 && !hasData) {
      showToast('warning', 'Bu adımı tamamlamak için önce mizan verilerinizi yüklemeniz gerekiyor.');
      return;
    }
    if (!completedSteps.includes(stepId)) {
      saveProgress([...completedSteps, stepId]);
    }
  };

  const checklistItems: ChecklistItem[] = [
    { id: 1, text: 'Dönem sonu mizan yüklendi', stepId: 1, icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
    { id: 2, text: 'Mizan denge kontrolü yapıldı', stepId: 1, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { id: 3, text: 'Yeniden değerleme hesaplandı', stepId: 2, icon: <Calculator className="w-3.5 h-3.5" /> },
    { id: 4, text: 'Vergi matrahı belirlendi', stepId: 3, icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 5, text: 'Kurumlar vergisi hesaplandı', stepId: 3, icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 6, text: 'Raporlar oluşturuldu', stepId: 4, icon: <FileText className="w-3.5 h-3.5" /> },
  ];
  // Count completed steps (include auto-completed step 1 from hasData)
  const effectiveCompletedSteps =
    hasData && !completedSteps.includes(1) ? [1, ...completedSteps] : completedSteps;
  const completedCount = effectiveCompletedSteps.length;
  const progressPercent = (completedCount / 4) * 100;

  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-8">
      <HeaderSection
        completedCount={completedCount}
        progressPercent={progressPercent}
        onDownloadReport={() => router.push('/v2/reports')}
        onResetProgress={handleResetProgress}
      />

      <KpiStrip
        progressPercent={progressPercent}
        completedCount={completedCount}
        hasData={hasData}
        effectiveCompletedSteps={effectiveCompletedSteps}
      />

      {/* Info Banners */}
      {!hasData && (
        <AlertBanner
          variant="warning"
          title="Veri Yükleme Gerekli"
          description="Dönem sonu işlemlerini başlatmak için mizan verilerinizi yükleyin. İş akışı adımları veri yükleme sonrası aktif hale gelecektir."
          action={{
            label: 'Veri Yükle',
            onClick: () => router.push('/v2/upload'),
          }}
          icon={<Upload className="w-5 h-5" />}
        />
      )}

      {hasData && completedSteps.length === 0 && (
        <AlertBanner
          variant="info"
          title="Başlamaya Hazırsınız!"
          description="Mizan verileriniz yüklendi. Şimdi dönem sonu işlemlerine başlayabilirsiniz. Yeniden değerleme adımından devam edin."
          icon={<Sparkles className="w-5 h-5" />}
        />
      )}

      {completedCount === 4 && (
        <AlertBanner
          variant="success"
          title="Tebrikler!"
          description="Tüm dönem sonu işlemleri başarıyla tamamlandı. Artık raporlarınızı indirebilir ve müşterinize sunabilirsiniz."
          action={{
            label: 'Raporları Görüntüle',
            onClick: () => router.push('/v2/reports'),
          }}
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
      )}

      <WizardStepsPanel
        steps={WIZARD_STEPS}
        effectiveCompletedSteps={effectiveCompletedSteps}
        getStepStatus={getStepStatus}
        onStepClick={handleStepClick}
        onMarkComplete={handleMarkComplete}
      />

      <Checklist
        items={checklistItems}
        effectiveCompletedSteps={effectiveCompletedSteps}
      />

      <QuickLinks onNavigate={(path) => router.push(path)} />
    </div>
  );
}
