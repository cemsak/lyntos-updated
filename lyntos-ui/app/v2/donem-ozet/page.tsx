'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  CreditCard,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useDashboardScope } from '../_components/scope/ScopeProvider';
import { ScopeGuide } from '../_components/shared/ScopeGuide';
import { KDVRiskPanel } from '../_components/beyanname/KDVRiskPanel';
import { MuhtasarRiskPanel } from '../_components/beyanname/MuhtasarRiskPanel';
import { API_BASE_URL } from '../_lib/config/api';
import { formatCurrency } from '../_lib/format';
import { useToast } from '../_components/shared/Toast';
import type { DonemTab, DonemSummary, OdemeDurumu, Tahakkuk, ManuelOdemeForm } from './_components/types';
import { StatCard } from './_components/StatCard';
import { CollapsibleSection } from './_components/CollapsibleSection';
import { OdemeDurumuCard } from './_components/OdemeDurumuCard';
import { TahakkukTable } from './_components/TahakkukTable';
import { ManuelOdemeModal } from './_components/ManuelOdemeModal';

export default function DonemOzetPage() {
  const { selectedClient, selectedPeriod, user } = useDashboardScope();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<DonemTab>('ozet');
  const [data, setData] = useState<DonemSummary | null>(null);
  const [odemeDurumu, setOdemeDurumu] = useState<OdemeDurumu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingPayments, setRefreshingPayments] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    kdv: true,
    muhtasar: true,
    tahakkuk: true,
    odemeDurumu: true
  });

  const [manuelOdemeModal, setManuelOdemeModal] = useState<{
    open: boolean;
    tahakkuk: Tahakkuk | null;
    index: number;
  }>({ open: false, tahakkuk: null, index: -1 });
  const [manuelOdemeForm, setManuelOdemeForm] = useState<ManuelOdemeForm>({
    odeme_tarihi: new Date().toISOString().split('T')[0],
    odeme_tutari: 0,
    odeme_kaynagi: 'kredi_karti',
    aciklama: ''
  });
  const [savingManuelOdeme, setSavingManuelOdeme] = useState(false);

  const fetchData = async () => {
    if (!selectedClient || !selectedPeriod) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const clientId = selectedClient.id;
      const periodId = `${selectedPeriod.year}-Q${selectedPeriod.periodNumber}`;

      const [summaryResponse, odemeResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v2/period-summary/ozet?client_id=${clientId}&period_id=${periodId}`, {
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE_URL}/api/v2/period-summary/odeme-durumu?client_id=${clientId}&period_id=${periodId}&tenant_id=${encodeURIComponent(user?.id || 'default')}`, {
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      if (!summaryResponse.ok) {
        throw new Error(`HTTP ${summaryResponse.status}`);
      }

      const summaryResult = await summaryResponse.json();
      setData(summaryResult);

      if (odemeResponse.ok) {
        const odemeResult = await odemeResponse.json();
        setOdemeDurumu(odemeResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const refreshPaymentStatus = async () => {
    if (!selectedClient || !selectedPeriod) return;

    setRefreshingPayments(true);
    try {
      const clientId = selectedClient.id;
      const periodId = `${selectedPeriod.year}-Q${selectedPeriod.periodNumber}`;

      const response = await fetch(
        `${API_BASE_URL}/api/v2/period-summary/odeme-durumu/refresh?client_id=${clientId}&period_id=${periodId}&tenant_id=${encodeURIComponent(user?.id || 'default')}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );

      if (response.ok) {
        const result = await response.json();
        setOdemeDurumu(result.ozet);
        await fetchData();
      }
    } catch (err) {
      console.error('Payment refresh error:', err);
    } finally {
      setRefreshingPayments(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClient, selectedPeriod]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const openManuelOdemeModal = (tahakkuk: Tahakkuk, index: number) => {
    const faizliTutar = tahakkuk.toplam_borc + (tahakkuk.gecikme_zammi || 0);
    setManuelOdemeForm({
      odeme_tarihi: new Date().toISOString().split('T')[0],
      odeme_tutari: faizliTutar,
      odeme_kaynagi: 'kredi_karti',
      aciklama: ''
    });
    setManuelOdemeModal({ open: true, tahakkuk, index });
  };

  const closeManuelOdemeModal = () => {
    setManuelOdemeModal({ open: false, tahakkuk: null, index: -1 });
  };

  const saveManuelOdeme = async () => {
    if (!manuelOdemeModal.tahakkuk || !data) return;

    setSavingManuelOdeme(true);
    try {
      const targetTahakkuk = manuelOdemeModal.tahakkuk;

      const response = await fetch(`${API_BASE_URL}/api/v2/period-summary/tahakkuk/manuel-odeme?tenant_id=${encodeURIComponent(user?.id || 'default')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tahakkuk_id: targetTahakkuk.id,
          odeme_durumu: 'odendi',
          odeme_tarihi: manuelOdemeForm.odeme_tarihi,
          odeme_tutari: manuelOdemeForm.odeme_tutari,
          odeme_kaynagi: manuelOdemeForm.odeme_kaynagi,
          aciklama: manuelOdemeForm.aciklama || `${targetTahakkuk.beyanname_turu} ${targetTahakkuk.donem} manuel ödeme`
        })
      });

      if (response.ok) {
        closeManuelOdemeModal();
        await fetchData();
      } else {
        const err = await response.json();
        showToast('error', `Hata: ${err.detail || 'Bilinmeyen hata'}`);
      }
    } catch (err) {
      console.error('Manuel ödeme hatası:', err);
      showToast('error', 'Manuel ödeme kaydedilemedi');
    } finally {
      setSavingManuelOdeme(false);
    }
  };

  if (!selectedClient || !selectedPeriod) {
    return (
      <ScopeGuide variant="full" description="Dönem özetini görüntülemek için üstteki menülerden mükellef ve dönem seçin." />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#5A5A5A]">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Dönem verileri yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-[#F0282D] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#2E2E2E] mb-2">Veri Yüklenemedi</h2>
          <p className="text-[#5A5A5A] mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#2E2E2E]">
            {selectedPeriod?.label || 'Dönem'} Beyanname Özet & Risk Kontrolü
          </h1>
          <p className="text-[#5A5A5A] mt-1">
            {selectedClient?.shortName || selectedClient?.name || 'Mükellef'} — {selectedPeriod?.description || ''}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white border border-[#E5E5E5] rounded-xl p-1 mb-6">
          {([
            { id: 'ozet' as DonemTab, label: 'Özet & Tahakkuk', icon: <FileText className="w-4 h-4" /> },
            { id: 'kdv' as DonemTab, label: 'KDV Risk Kontrol', icon: <ShieldCheck className="w-4 h-4" /> },
            { id: 'muhtasar' as DonemTab, label: 'Muhtasar Risk Kontrol', icon: <Users className="w-4 h-4" /> },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id
                  ? 'bg-[#0049AA] text-white shadow-sm'
                  : 'text-[#5A5A5A] hover:bg-[#F5F6F8] hover:text-[#2E2E2E]'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'kdv' && selectedClient && selectedPeriod && (
          <KDVRiskPanel
            clientId={selectedClient.id}
            periodId={selectedPeriod.code}
          />
        )}

        {activeTab === 'muhtasar' && selectedClient && selectedPeriod && (
          <MuhtasarRiskPanel
            clientId={selectedClient.id}
            periodId={selectedPeriod.code}
          />
        )}

        {activeTab === 'ozet' && <>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatCard
            icon={<FileText className="w-5 h-5" />}
            label="KDV Beyanname"
            value={data?.kdv?.length || 0}
            color="blue"
          />
          <StatCard
            icon={<Calculator className="w-5 h-5" />}
            label="Muhtasar"
            value={data?.muhtasar?.length || 0}
            color="purple"
          />
        </div>

        <CollapsibleSection
          title="KDV Beyannameleri"
          icon={<FileText className="w-5 h-5 text-[#0049AA]" />}
          expanded={expandedSections.kdv}
          onToggle={() => toggleSection('kdv')}
          badge={`${data?.kdv?.length || 0} adet`}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-[#969696] border-b">
                  <th className="pb-3 font-medium">Dönem</th>
                  <th className="pb-3 font-medium text-right">Matrah</th>
                  <th className="pb-3 font-medium text-right">Hesaplanan KDV</th>
                  <th className="pb-3 font-medium text-right">İndirilecek KDV</th>
                  <th className="pb-3 font-medium text-right">Devreden KDV</th>
                </tr>
              </thead>
              <tbody>
                {data?.kdv?.map((item, idx) => (
                  <tr key={idx} className="border-b border-[#E5E5E5] hover:bg-[#F5F6F8]">
                    <td className="py-3 font-medium text-[#2E2E2E]">{item.donem}</td>
                    <td className="py-3 text-right text-[#5A5A5A]">{formatCurrency(item.matrah)}</td>
                    <td className="py-3 text-right text-[#5A5A5A]">{formatCurrency(item.hesaplanan_kdv)}</td>
                    <td className="py-3 text-right text-[#5A5A5A]">{formatCurrency(item.indirilecek_kdv)}</td>
                    <td className="py-3 text-right font-semibold text-[#0049AA]">{formatCurrency(item.devreden_kdv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Muhtasar Beyannameleri"
          icon={<Calculator className="w-5 h-5 text-[#0049AA]" />}
          expanded={expandedSections.muhtasar}
          onToggle={() => toggleSection('muhtasar')}
          badge={`${data?.muhtasar?.length || 0} adet`}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-[#969696] border-b">
                  <th className="pb-3 font-medium">Dönem</th>
                  <th className="pb-3 font-medium text-right">Toplam Vergi</th>
                  <th className="pb-3 font-medium text-right">Çalışan Sayısı</th>
                </tr>
              </thead>
              <tbody>
                {data?.muhtasar?.map((item, idx) => (
                  <tr key={idx} className="border-b border-[#E5E5E5] hover:bg-[#F5F6F8]">
                    <td className="py-3 font-medium text-[#2E2E2E]">{item.donem}</td>
                    <td className="py-3 text-right text-[#5A5A5A]">{formatCurrency(item.toplam_vergi)}</td>
                    <td className="py-3 text-right text-[#5A5A5A]">{item.calisan_sayisi || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        {odemeDurumu && (
          <OdemeDurumuCard
            odemeDurumu={odemeDurumu}
            refreshingPayments={refreshingPayments}
            onRefresh={refreshPaymentStatus}
          />
        )}

        <CollapsibleSection
          title="Tahakkuklar"
          icon={<CreditCard className="w-5 h-5 text-[#00804D]" />}
          expanded={expandedSections.tahakkuk}
          onToggle={() => toggleSection('tahakkuk')}
          badge={`${data?.tahakkuk?.length || 0} adet`}
        >
          <TahakkukTable
            tahakkuklar={data?.tahakkuk || []}
            onOdendiClick={openManuelOdemeModal}
          />
        </CollapsibleSection>

        <div className="mt-8 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#ECFDF5] text-[#005A46] rounded-full text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Gerçek PDF verilerinden parse edildi
          </span>
        </div>

        </>}
      </div>

      {manuelOdemeModal.open && manuelOdemeModal.tahakkuk && (
        <ManuelOdemeModal
          tahakkuk={manuelOdemeModal.tahakkuk}
          form={manuelOdemeForm}
          saving={savingManuelOdeme}
          onFormChange={setManuelOdemeForm}
          onSave={saveManuelOdeme}
          onClose={closeManuelOdemeModal}
        />
      )}
    </div>
  );
}
