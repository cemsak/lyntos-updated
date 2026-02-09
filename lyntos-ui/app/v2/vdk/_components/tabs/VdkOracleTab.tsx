'use client';

/**
 * VDK Oracle Tab
 * Birleşik VDK Risk Analizi: KURGAN Calculator + Simulator
 *
 * 3 Bölüm:
 * 1. Risk Özet Başlığı (OracleRiskHeader)
 * 2. İnceleme Simülasyonu (sol) + Savunma Hazırlığı (sağ)
 * 3. Muhtemel Tespit ve Cezalar
 */

import React from 'react';
import {
  Eye,
  AlertTriangle,
  Scale,
  Coins,
  FileText,
  Folder,
  ShieldOff,
  DatabaseZap,
} from 'lucide-react';

import type { VdkOracleData } from '../../../_hooks/useVdkOracle';
import type { MuhtemelCezalar, CezaTespiti } from '../../../_hooks/useVdkFullAnalysis';
import type { KurganAlarm } from '../../../_components/vdk-simulator/types';
import { KurganAlarmCard } from '../../../_components/vdk-simulator/KurganAlarmCard';
import { OracleRiskHeader } from './vdk-oracle/OracleRiskHeader';
import { InspectorQuestionsPanel } from './vdk-oracle/InspectorQuestionsPanel';
import { DocumentChecklist } from './vdk-oracle/DocumentChecklist';

// Türkçe sayı formatı
function formatTL(value: number): string {
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

interface VdkOracleTabProps {
  data: VdkOracleData;
  clientId: string;
  period: string;
  onGenerateIzah?: (topic: string) => void;
}

export default function VdkOracleTab({
  data,
  clientId,
  period,
  onGenerateIzah,
}: VdkOracleTabProps) {
  const simulator = data.simulator;
  const alarms: KurganAlarm[] = simulator?.alarms || [];
  const triggeredAlarms = alarms.filter((a: KurganAlarm) => a.triggered);
  const passedAlarms = alarms.filter((a: KurganAlarm) => !a.triggered);
  const kurganScore = data.kurgan_risk?.score || 0;
  const kurganRiskLevel = data.kurgan_risk?.risk_level || 'Bilinmiyor';

  // Mock veri kontrolü
  const dataSource = data.kurgan_risk?.data_source;
  const isRealData = dataSource === 'database';

  // K-SAHTE kontrolü: riskli tedarikçi verisi bağlı mı?
  const kSahteAlarm = alarms.find((a: KurganAlarm) => a.rule_id === 'K-SAHTE');
  const kSahteDisconnected = kSahteAlarm && !kSahteAlarm.triggered && (kSahteAlarm.actual_value === 0 || kSahteAlarm.actual_value === null);

  return (
    <div className="space-y-6">
      {/* Mock Veri Uyarı Banner */}
      {!isRealData && (
        <div className="bg-[#FEF2F2] border-2 border-[#F0282D] rounded-xl p-4 flex items-start gap-3">
          <DatabaseZap className="w-6 h-6 text-[#F0282D] flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-[#BF192B] text-sm">
              ⚠️ DİKKAT: Gerçek Mizan Verisi Bulunamadı
            </h4>
            <p className="text-xs text-[#BF192B] mt-1">
              Bu mükellef için veritabanında mizan verisi yok. Gösterilen risk skorları ve hesaplamalar
              <strong> tahmini değerlere </strong> dayanmaktadır. Kesin analiz için önce &quot;Veri Yükleme&quot;
              sayfasından mizan dosyasını yükleyin.
            </p>
            <p className="text-xs text-[#969696] mt-1">
              Veri kaynağı: {dataSource === 'json' ? 'JSON dosyası (tahmini)' : dataSource === 'none' ? 'Veri yok' : dataSource || 'Bilinmiyor'}
            </p>
          </div>
        </div>
      )}

      {/* K-SAHTE Devre Dışı Uyarı */}
      {kSahteDisconnected && (
        <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded-xl p-3 flex items-center gap-3">
          <ShieldOff className="w-5 h-5 text-[#E67324] flex-shrink-0" />
          <p className="text-xs text-[#E67324]">
            <strong>Riskli Tedarikçi Kontrolü (K-SAHTE):</strong> Bu kriter için veri kaynağı henüz bağlanmadı.
            Riskli tedarikçi (SMİYB) tespiti şu an devre dışıdır. Cross-check modülü aktifleştirildiğinde otomatik çalışacaktır.
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1: Risk Özet Başlığı
          ═══════════════════════════════════════════════════════════ */}
      <OracleRiskHeader
        kurganScore={kurganScore}
        kurganRiskLevel={kurganRiskLevel}
        simulator={simulator}
      />

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2: İnceleme Simülasyonu + Savunma Hazırlığı
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol Panel - İnceleme Simülasyonu */}
        <div className="space-y-6">
          {/* İlk İzlenim */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            <h3 className="text-lg font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#0049AA]" />
              VDK Müfettişi Şu Anda Sizi İncelese...
            </h3>

            {/* İlk İzlenim Kutusu */}
            <div className="mb-6">
              <div className="text-sm font-medium text-[#969696] uppercase mb-2">
                1. İlk İzlenim
              </div>
              <div
                className={`p-4 rounded-lg ${
                  kurganScore >= 70
                    ? 'bg-[#ECFDF5] border border-[#AAE8B8]'
                    : kurganScore >= 40
                      ? 'bg-[#FFFBEB] border border-[#FFF08C]'
                      : 'bg-[#FEF2F2] border border-[#FFC7C9]'
                }`}
              >
                <p
                  className={`text-sm ${
                    kurganScore >= 70
                      ? 'text-[#005A46]'
                      : kurganScore >= 40
                        ? 'text-[#E67324]'
                        : 'text-[#980F30]'
                  }`}
                >
                  {kurganScore >= 70
                    ? 'İlk izlenim olumlu. Risk skoru yüksek, ciddi bulgu beklenmiyor. Yine de belgeleri hazır tutun.'
                    : kurganScore >= 40
                      ? 'Müfettiş bazı konularda soru soracak. Detaylı belgelerle hazırlıklı olun.'
                      : 'Müfettiş ilk bakışta ciddi sorunlar görecek. Yüksek kasa, ortak alacakları ve devreden KDV hemen dikkat çekecek.'}
                </p>
              </div>
            </div>

            {/* Tetiklenen Alarmlar */}
            {triggeredAlarms.length > 0 && (
              <div className="mb-6">
                <div className="text-sm font-medium text-[#969696] uppercase mb-3">
                  2. Tetiklenen Alarmlar ({triggeredAlarms.length})
                </div>
                <div className="space-y-3">
                  {triggeredAlarms.map((alarm) => (
                    <KurganAlarmCard
                      key={alarm.rule_id}
                      alarm={alarm}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Geçen Kontroller (collapsed) */}
            {passedAlarms.length > 0 && (
              <div>
                <div className="text-sm font-medium text-[#969696] uppercase mb-2">
                  Geçen Kontroller ({passedAlarms.length})
                </div>
                <div className="space-y-1">
                  {passedAlarms.map((alarm) => (
                    <KurganAlarmCard
                      key={alarm.rule_id}
                      alarm={alarm}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Müfettiş Soruları Paneli */}
          <InspectorQuestionsPanel
            alarms={alarms}
            categoryAnalysis={data.category_analysis}
            ttk376={data.ttk_376}
            clientId={clientId}
            period={period}
            onNavigateToAi={onGenerateIzah}
          />
        </div>

        {/* Sağ Panel - Savunma Hazırlığı */}
        <div className="space-y-6">
          {/* Belge Checklist */}
          <DocumentChecklist
            alarms={alarms}
            clientId={clientId}
            period={period}
          />

          {/* Hazır İzah Şablonları */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            <h3 className="text-lg font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0049AA]" />
              Hazır İzah Şablonları
            </h3>

            <div className="space-y-2">
              {getIzahTemplates(triggeredAlarms).map((item, idx) => (
                <button
                  key={idx}
                  className="w-full flex items-center gap-3 p-3 bg-[#F5F6F8] border border-[#E5E5E5] rounded-lg hover:bg-[#E6F9FF] hover:border-[#ABEBFF] transition-colors text-left"
                  onClick={() => onGenerateIzah?.(item.topic)}
                >
                  <Folder className="w-5 h-5 text-[#969696]" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[#5A5A5A]">{item.label}</span>
                    {item.alarm_code && (
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#FEF2F2] text-[#BF192B] rounded">
                        {item.alarm_code}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3: Muhtemel Tespit ve Cezalar
          ═══════════════════════════════════════════════════════════ */}
      {data.muhtemel_cezalar && data.muhtemel_cezalar.tespitler.length > 0 && (
        <PenaltySection cezalar={data.muhtemel_cezalar} />
      )}
    </div>
  );
}

// ============================================================================
// PENALTY SECTION (MufettisGozuTab'dan taşındı)
// ============================================================================

function PenaltySection({ cezalar }: { cezalar: MuhtemelCezalar }) {
  return (
    <div className="bg-white rounded-xl border border-[#FFC7C9] p-6">
      <h3 className="text-lg font-semibold text-[#2E2E2E] mb-2 flex items-center gap-2">
        <Scale className="w-5 h-5 text-[#BF192B]" />
        Muhtemel Tespit ve Cezalar
      </h3>
      <p className="text-xs text-[#969696] mb-4">
        Aşağıdaki hesaplamalar mizan verilerinden otomatik üretilmiştir.
        Formül: Matrah Farkı × %25 KV = Vergi, Vergi × %50 = VZC, Vergi × %1,8 × 12 ay = Gecikme Faizi
      </p>

      <div className="space-y-4">
        {cezalar.tespitler.map((tespit: CezaTespiti, idx: number) => (
          <div
            key={idx}
            className="bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-[#BF192B] bg-[#FEF2F2] px-2 py-0.5 rounded">
                    {tespit.hesap_kodu}
                  </span>
                  <h4 className="font-medium text-[#980F30]">{tespit.baslik}</h4>
                </div>
                <p className="text-sm text-[#BF192B]">{tespit.aciklama}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <div className="text-xl font-bold text-[#BF192B]">
                  {formatTL(tespit.toplam)} TL
                </div>
                <div className="text-xs text-[#F0282D]">Toplam Risk</div>
              </div>
            </div>

            {/* Hesaplama detayı */}
            <div className="bg-white rounded-lg p-3 border border-[#FEF2F2]">
              <div className="text-xs text-[#969696] mb-2 font-medium">Hesaplama Detayı:</div>
              <div className="grid grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-[#969696]">1. Matrah Farkı</div>
                  <div className="font-semibold text-[#2E2E2E] font-mono">
                    {formatTL(tespit.matrah_farki)} TL
                  </div>
                </div>
                <div>
                  <div className="text-[#969696]">2. Vergi (%25)</div>
                  <div className="font-semibold text-[#2E2E2E] font-mono">
                    {formatTL(tespit.vergi)} TL
                  </div>
                </div>
                <div>
                  <div className="text-[#969696]">3. VZC (%50)</div>
                  <div className="font-semibold text-[#2E2E2E] font-mono">
                    {formatTL(tespit.vzc)} TL
                  </div>
                </div>
                <div>
                  <div className="text-[#969696]">4. Gecikme F. (12 ay)</div>
                  <div className="font-semibold text-[#2E2E2E] font-mono">
                    {formatTL(tespit.gecikme_faizi)} TL
                  </div>
                </div>
              </div>
            </div>

            {tespit.mevzuat_ref && tespit.mevzuat_ref.length > 0 && (
              <div className="mt-3 flex gap-1 flex-wrap items-center">
                <span className="text-xs text-[#969696]">Dayanak:</span>
                {tespit.mevzuat_ref.map((ref: string, refIdx: number) => (
                  <span key={refIdx} className="text-xs bg-[#F5F6F8] text-[#5A5A5A] px-2 py-0.5 rounded">
                    {ref}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Toplam */}
      <div className="mt-4 pt-4 border-t border-[#FFC7C9]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#BF192B]" />
            <span className="font-semibold text-[#980F30]">TOPLAM TAHMİNİ RİSK</span>
          </div>
          <div className="text-2xl font-bold text-[#BF192B] font-mono">
            {formatTL(cezalar.genel_toplam)} TL
          </div>
        </div>
        <div className="mt-3 p-3 bg-[#FFFBEB] border border-[#FFF08C] rounded-lg">
          <p className="text-xs text-[#E67324]">
            <strong>Önemli:</strong> {cezalar.uyari}
            <br />
            <span className="text-[#FA841E]">
              Gerçek inceleme sonuçları farklı olabilir. Bu tutarlar VDK riski farkındalığı için hesaplanmıştır.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// İZAH ŞABLONLARI (dinamik - alarm bazlı)
// ============================================================================

function getIzahTemplates(
  triggeredAlarms: { rule_id: string; rule_name: string }[]
): Array<{ topic: string; label: string; alarm_code?: string }> {
  const templates: Array<{ topic: string; label: string; alarm_code?: string }> = [];

  // Triggered alarm'lardan şablon oluştur
  const alarmTemplateMap: Record<string, string> = {
    'K-09': 'Yüksek kasa bakiyesi için izah',
    'K-15': 'Ortaklardan alacaklar için izah',
    'K-22': 'Stok devir anomalisi için izah',
    'K-31': 'Şüpheli alacak oranı için izah',
    'K-24': 'Amortisman/sabit varlık oranı için izah',
    'TREND-MATRAH': 'Matrah erozyonu için izah',
    'K-SAHTE': 'Riskli tedarikçi ilişkisi için izah',
  };

  for (const alarm of triggeredAlarms) {
    const label = alarmTemplateMap[alarm.rule_id];
    if (label) {
      templates.push({
        topic: label,
        label,
        alarm_code: alarm.rule_id,
      });
    }
  }

  // Eğer az alarm varsa, genel şablonlar ekle
  const generalTemplates = [
    { topic: 'Devreden KDV için izah', label: 'Devreden KDV için izah' },
    { topic: 'Transfer fiyatlandırması dokümantasyonu', label: 'Transfer fiyatlandırması dokümantasyonu' },
  ];

  for (const t of generalTemplates) {
    if (templates.length >= 5) break;
    if (!templates.some((existing) => existing.topic === t.topic)) {
      templates.push(t);
    }
  }

  return templates.slice(0, 6);
}
