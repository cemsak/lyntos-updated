'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { getAuthToken } from '../../_lib/auth';
import { API_ENDPOINTS } from '../../_lib/config/api';
import { useDashboardScope, useScopeComplete } from '../../_components/scope/useDashboardScope';
import type { AuditEntry, BundleSummary } from './_components/types';
import { BIG4_SECTIONS } from './_components/types';
import { BundleHeader } from './_components/BundleHeader';
import { AuditTrailPanel } from './_components/AuditTrailPanel';
import { ProgressSection } from './_components/ProgressSection';
import { WorkpaperSections } from './_components/WorkpaperSections';
import { InfoFooter } from './_components/InfoFooter';

export default function EvidenceBundlePage() {
  const [bundleData, setBundleData] = useState<BundleSummary | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const { scope } = useDashboardScope();
  const scopeComplete = useScopeComplete();
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    // Scope henüz hazır değilse bekle
    if (!scopeComplete || !scope.client_id || !scope.period) {
      setIsLoading(false);
      setBundleData(null);
      return;
    }

    // Aynı scope için tekrar yükleme yapma
    const scopeKey = `${scope.client_id}__${scope.period}`;
    if (loadedRef.current === scopeKey) return;

    async function fetchBundleData() {
      const token = getAuthToken();
      setIsLoading(true);
      loadedRef.current = scopeKey;

      try {
        const url = API_ENDPOINTS.evidenceBundle.summary(
          scope.client_id!,
          scope.period!
        );
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          setBundleData(null);
        } else {
          const data = await response.json();
          setBundleData(data);
        }

        // Audit trail
        try {
          const auditResponse = await fetch('/api/v1/audit/recent?limit=20', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (auditResponse.ok) {
            const auditData = await auditResponse.json();
            const entries: AuditEntry[] = (auditData.entries || []).map((e: {
              id: number;
              created_at: string;
              action: string;
              user_id?: string;
              details?: string;
            }) => ({
              id: `at-${e.id}`,
              timestamp: e.created_at,
              action: e.action as AuditEntry['action'],
              user: e.user_id || 'Sistem',
              details: e.details || e.action,
            }));
            setAuditTrail(entries);
          }
        } catch {
          setAuditTrail([]);
        }
      } catch {
        setBundleData(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBundleData();
  }, [scopeComplete, scope.client_id, scope.period]);

  const sections = bundleData?.sections || BIG4_SECTIONS;
  const totalFiles = bundleData?.totalFiles || 0;
  const completedFiles = bundleData?.completedFiles || 0;
  const progress = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;
  const hasData = bundleData !== null && totalFiles > 0;

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Scope seçilmemişse bilgi mesajı
  if (!scopeComplete) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] text-center">
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 max-w-md">
          <h3 className="text-lg font-semibold text-[#2E2E2E] mb-2">
            Mükellef ve Dönem Seçin
          </h3>
          <p className="text-[#969696]">
            Kanıt paketini görüntülemek için üst menüden mükellef ve dönem seçimi yapın.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-[#0049AA]" />
        <span className="ml-2 text-[#5A5A5A]">Kanıt paketi yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BundleHeader
        bundleData={bundleData}
        hasData={hasData}
        completedFiles={completedFiles}
        totalFiles={totalFiles}
        showAuditTrail={showAuditTrail}
        onToggleAuditTrail={() => setShowAuditTrail(!showAuditTrail)}
      />

      {showAuditTrail && <AuditTrailPanel auditTrail={auditTrail} />}

      <ProgressSection
        sections={sections}
        totalFiles={totalFiles}
        hasData={hasData}
        progress={progress}
      />

      <WorkpaperSections
        sections={sections}
        hasData={hasData}
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
      />

      <InfoFooter />
    </div>
  );
}
