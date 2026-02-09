'use client';

import React from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import type { VdkFullAnalysisData } from '../../../_hooks/useVdkFullAnalysis';

// Proaktif uyari tipi
export interface ProaktifUyari {
  baslik: string;
  aciklama: string;
  deger?: string;
  seviye: 'kritik' | 'uyari';
  soru: string;
}

interface ProaktifUyarilarProps {
  uyarilar: ProaktifUyari[];
  clientId: string | null;
  period: string | null;
  onSendMessage: (message: string) => void;
}

export function ProaktifUyarilar({ uyarilar, clientId, period, onSendMessage }: ProaktifUyarilarProps) {
  if (uyarilar.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-[#FFFBEB] to-[#FFFBEB] rounded-xl border border-[#FFF08C] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#FFF08C]">
        <h3 className="font-semibold text-[#E67324] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#FA841E]" />
          Proaktif Uyari
        </h3>
        <p className="text-xs text-[#FA841E] mt-1">AI otomatik tespit</p>
      </div>
      <div className="p-4 space-y-3">
        {uyarilar.map((uyari, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg border ${
              uyari.seviye === 'kritik'
                ? 'bg-[#FEF2F2] border-[#FFC7C9]'
                : 'bg-[#FFFBEB] border-[#FFF08C]'
            }`}
          >
            <div className="flex items-start gap-2">
              {uyari.seviye === 'kritik' ? (
                <AlertTriangle className="w-5 h-5 text-[#F0282D] flex-shrink-0" />
              ) : (
                <Shield className="w-5 h-5 text-[#FFB114] flex-shrink-0" />
              )}
              <div className="flex-1">
                <h4 className={`font-medium ${uyari.seviye === 'kritik' ? 'text-[#980F30]' : 'text-[#E67324]'}`}>
                  {uyari.baslik}
                </h4>
                <p className={`text-sm mt-1 ${uyari.seviye === 'kritik' ? 'text-[#BF192B]' : 'text-[#FA841E]'}`}>
                  {uyari.aciklama}
                </p>
                {uyari.deger && (
                  <div className={`mt-2 text-lg font-bold ${uyari.seviye === 'kritik' ? 'text-[#BF192B]' : 'text-[#FA841E]'}`}>
                    {uyari.deger}
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      if (!clientId || !period || clientId.trim() === '' || period.trim() === '') {
                        console.warn('[AiDanismanTab] Musteri/donem secilmemis');
                        return;
                      }
                      onSendMessage(uyari.soru);
                    }}
                    disabled={!clientId || !period}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                      uyari.seviye === 'kritik'
                        ? 'bg-[#FEF2F2] text-[#BF192B] hover:bg-[#FFC7C9]'
                        : 'bg-[#FFFBEB] text-[#FA841E] hover:bg-[#FFF08C]'
                    } ${(!clientId || !period) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Detayli Analiz
                  </button>
                  <button
                    onClick={() => {
                      if (!clientId || !period || clientId.trim() === '' || period.trim() === '') {
                        console.warn('[AiDanismanTab] Musteri/donem secilmemis');
                        return;
                      }
                      onSendMessage(`${uyari.baslik} icin cozum onerileri`);
                    }}
                    disabled={!clientId || !period}
                    className={`text-xs px-3 py-1.5 bg-white border border-[#E5E5E5] text-[#5A5A5A] rounded-lg hover:bg-[#F5F6F8] ${(!clientId || !period) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Cozum Onerileri
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Proaktif uyarilari olustur - ZENGINLESTIRILMIS VERSIYON
export function generateProaktifUyarilar(data?: VdkFullAnalysisData | null): ProaktifUyari[] {
  if (!data) return [];

  const uyarilar: ProaktifUyari[] = [];

  // TTK 376 Sermaye Kaybi Uyarisi
  if (data.ttk_376) {
    const ttk = data.ttk_376;
    const kayipOrani = ttk.sermaye_kaybi_orani * 100;

    if (ttk.durum === 'BORCA_BATIK') {
      uyarilar.push({
        baslik: 'TTK 376 - Borca Batik Durum',
        aciklama: 'Sirket borca batik durumda! Mahkemeye bildirim yukumlulugu var.',
        deger: `%${kayipOrani.toFixed(1)} Sermaye Kaybi`,
        seviye: 'kritik',
        soru: 'TTK 376 borca batiklik durumunda ne yapmaliyim? Yasal surec ve cozum onerileri nelerdir?',
      });
    } else if (ttk.durum === 'UCTE_IKI_KAYIP') {
      uyarilar.push({
        baslik: 'TTK 376 - 2/3 Sermaye Kaybi',
        aciklama: 'Sermayenin 2/3\'u kayip. Genel Kurul toplantisi zorunlu.',
        deger: `%${kayipOrani.toFixed(1)} Sermaye Kaybi`,
        seviye: 'kritik',
        soru: 'TTK 376 2/3 sermaye kaybi durumunda Genel Kurul toplantisi nasil yapilir? Iyilestirme tedbirleri nelerdir?',
      });
    } else if (ttk.durum === 'YARI_KAYIP') {
      uyarilar.push({
        baslik: 'TTK 376 - 1/2 Sermaye Kaybi Riski',
        aciklama: 'Sermaye kaybi 1/2 sinirna yaklasiyor. Dikkatli izleme gerekli.',
        deger: `%${kayipOrani.toFixed(1)} Sermaye Kaybi`,
        seviye: 'uyari',
        soru: 'TTK 376 yari sermaye kaybi durumunda ne yapmaliyim? Onleyici tedbirler nelerdir?',
      });
    }
  }

  // Ortulu Sermaye Uyarisi
  if (data.ortulu_sermaye && data.ortulu_sermaye.durum === 'SINIR_UZERINDE') {
    const ortulu = data.ortulu_sermaye;
    uyarilar.push({
      baslik: 'Ortulu Sermaye (KVK 12)',
      aciklama: 'Iliskili kisilerden borclanma ozkaynak sinirini asti. KKEG hesaplanmali.',
      deger: `${ortulu.kkeg_tutari.toLocaleString('tr-TR')} TL KKEG`,
      seviye: 'kritik',
      soru: 'Ortulu sermaye nedeniyle KKEG nasil hesaplanir? Beyanname duzeltmesi gerekir mi?',
    });
  }

  // Risk Skoru Uyarisi
  if (data.kurgan_risk && data.kurgan_risk.score <= 40) {
    uyarilar.push({
      baslik: 'Yuksek VDK Inceleme Riski',
      aciklama: `Saglik skoru kritik seviyede (${data.kurgan_risk.score}/100). VDK inceleme olasiligi cok yuksek.`,
      deger: `Saglik Skoru: ${data.kurgan_risk.score}/100`,
      seviye: 'kritik',
      soru: 'VDK inceleme riskini dusurmek icin oncelikli olarak hangi adimlari atmaliyim?',
    });
  } else if (data.kurgan_risk && data.kurgan_risk.score <= 60) {
    uyarilar.push({
      baslik: 'Orta-Yuksek VDK Inceleme Riski',
      aciklama: `Saglik skoru orta-yuksek risk seviyesinde (${data.kurgan_risk.score}/100). Proaktif onlemler alinmali.`,
      deger: `Saglik Skoru: ${data.kurgan_risk.score}/100`,
      seviye: 'uyari',
      soru: 'Mevcut risk seviyesini dusurmek icin hangi iyilestirmeler yapilmali?',
    });
  }

  // Tetiklenen KURGAN Senaryolari
  const tetiklenenSenaryolar = data.kurgan_scenarios?.filter(s => s.tetiklendi) || [];
  const sortedSenaryolar = [...tetiklenenSenaryolar].sort((a, b) => (b.risk_puani || 0) - (a.risk_puani || 0));

  for (const senaryo of sortedSenaryolar.slice(0, 2)) {
    const isKritik = senaryo.aksiyon === 'INCELEME' || (senaryo.risk_puani && senaryo.risk_puani >= 75);

    let ozelSoru = '';
    switch (senaryo.senaryo_id) {
      case 'KRG-04':
        ozelSoru = `Stok-satis uyumsuzlugu tespit edildi (${senaryo.senaryo_id}). Stok bakiyesinin satis maliyetiyle orantili olmadigi goruluyor. Bu durumu VDK'ya nasil izah edebilirim? Hangi belgeler hazirlanmali?`;
        break;
      case 'KRG-13':
        ozelSoru = `Iliskili taraf islem orani yuksek (${senaryo.senaryo_id}). Transfer fiyatlandirmasi acisindan risk var. KVK Md. 13 kapsaminda dokumantasyon yukumluluklerimi ve yapilmasi gerekenleri acikla.`;
        break;
      case 'KRG-14':
        ozelSoru = `Surekli zarar beyani tespit edildi (${senaryo.senaryo_id}). Son donemlerde ardisik zarar beyan edilmis. VUK 134 kapsaminda re'sen takdir riski var mi? KVK 6 ve TTK 376 acisindan degerlendirme ve cozum onerilerini acikla.`;
        break;
      case 'KRG-08':
        ozelSoru = `Sektor ortalamasinin altinda vergi yuku tespit edildi (${senaryo.senaryo_id}). Bu durum VDK incelemesini tetikler mi? Savunma argumanlari nelerdir?`;
        break;
      default:
        ozelSoru = `${senaryo.senaryo_id} senaryosu tetiklendi: ${senaryo.senaryo_adi}. Bu senaryo ne anlama geliyor? Riskleri ve cozum onerilerini detayli acikla.`;
    }

    uyarilar.push({
      baslik: `KURGAN ${senaryo.senaryo_id} Tetiklendi`,
      aciklama: `${senaryo.senaryo_adi}${senaryo.tetikleme_nedeni ? ' - ' + senaryo.tetikleme_nedeni.slice(0, 80) : ''}`,
      deger: `Risk: ${senaryo.risk_puani}/100`,
      seviye: isKritik ? 'kritik' : 'uyari',
      soru: ozelSoru,
    });
  }

  // Finansman Gider Kisitlamasi Uyarisi
  if (data.finansman_gider_kisitlamasi && data.finansman_gider_kisitlamasi.kisitlamaya_tabi_gider > 0) {
    const fgk = data.finansman_gider_kisitlamasi;
    uyarilar.push({
      baslik: 'Finansman Gider Kisitlamasi',
      aciklama: 'Finansman giderleri %10 sinirini asti. KKEG hesaplanmali.',
      deger: `${fgk.kisitlamaya_tabi_gider.toLocaleString('tr-TR')} TL KKEG`,
      seviye: 'uyari',
      soru: 'Finansman gider kisitlamasi nasil hesaplanir? Beyanname duzeltmesi gerekir mi?',
    });
  }

  return uyarilar.slice(0, 4);
}
