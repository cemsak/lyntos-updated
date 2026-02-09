'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Calculator, FileText } from 'lucide-react';
import { useDashboardScope } from '../_components/scope/ScopeProvider';
import { HeroSection } from './_components/HeroSection';
import { AlertBanners } from './_components/AlertBanners';
import { TabNavigation } from './_components/TabNavigation';
import { GenelBakisTab } from './_components/GenelBakisTab';
import { SiniflandirmaTab } from './_components/SiniflandirmaTab';
import { EndekslerTab } from './_components/EndekslerTab';
import { BilgiTab } from './_components/BilgiTab';
import { ENFLASYON_KEY_BASE } from './_lib/constants';
import type { EnflasyonTab, EnflasyonStep } from './_types';

export default function EnflasyonPage() {
  const router = useRouter();
  const { scope } = useDashboardScope();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<EnflasyonTab>('genel');
  const [mounted, setMounted] = useState(false);

  const storageKey = scope.client_id && scope.period
    ? `${ENFLASYON_KEY_BASE}_${scope.client_id}_${scope.period}`
    : ENFLASYON_KEY_BASE;

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

  const getStepStatus = (stepNum: number): 'completed' | 'current' | 'locked' => {
    if (completedSteps.includes(stepNum)) return 'completed';
    if (stepNum === 1) return 'current';
    if (completedSteps.includes(stepNum - 1)) return 'current';
    return 'locked';
  };

  const handleStepClick = (href: string) => {
    router.push(href);
  };

  const handleMarkComplete = (stepNum: number) => {
    if (!completedSteps.includes(stepNum)) {
      const newSteps = [...completedSteps, stepNum];
      localStorage.setItem(storageKey, JSON.stringify({ completedSteps: newSteps }));
      setCompletedSteps(newSteps);
    }
  };

  const STEPS: EnflasyonStep[] = [
    {
      step: 1,
      title: 'Veri Yükleme',
      description: 'Sabit kıymet listesi, stok ve sermaye detayları',
      icon: Upload,
      href: '/v2/enflasyon/upload',
      detailedSteps: [
        'Dönem sonu mizan yükle',
        'Sabit kıymet listesi (edinim tarihleri ile)',
        'Stok hareket raporu',
        'Sermaye artırım/azaltım tarihçesi',
      ],
    },
    {
      step: 2,
      title: 'Yeniden Değerleme Hesabı',
      description: 'VUK Mük. 298/Ç yeniden değerleme katsayıları uygulanır',
      icon: Calculator,
      href: '/v2/enflasyon/hesaplama',
      detailedSteps: [
        'Amortismana tabi iktisadi kıymet tespiti',
        'Yİ-ÜFE katsayı hesaplama',
        'Yeniden değerleme farkları belirleme',
        'Değer artış fonu hesaplama',
      ],
    },
    {
      step: 3,
      title: 'Rapor Üretimi',
      description: 'Değerleme fişleri ve karşılaştırmalı tablolar',
      icon: FileText,
      href: '/v2/enflasyon/rapor',
      detailedSteps: [
        'Yeniden değerleme fişleri (muhasebe kayıtları)',
        'Değer artış fonu tablosu',
        'Amortismana tabi kıymet karşılaştırması',
        'Karşılaştırmalı özet rapor',
      ],
    },
  ];

  const progressPercentage = (completedSteps.length / STEPS.length) * 100;

  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-8">
      <HeroSection
        completedStepsCount={completedSteps.length}
        totalSteps={STEPS.length}
        progressPercentage={progressPercentage}
      />

      <AlertBanners />

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'genel' && (
        <GenelBakisTab
          steps={STEPS}
          completedSteps={completedSteps}
          getStepStatus={getStepStatus}
          onStepClick={handleStepClick}
          onMarkComplete={handleMarkComplete}
        />
      )}

      {activeTab === 'siniflandirma' && <SiniflandirmaTab />}

      {activeTab === 'endeksler' && <EndekslerTab />}

      {activeTab === 'bilgi' && <BilgiTab />}
    </div>
  );
}
