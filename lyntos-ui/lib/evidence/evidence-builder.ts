/**
 * Evidence Builder
 *
 * "Neden bu sonuç?" sorusuna cevap üreten sistem.
 * Her tespit için kanıt paketi oluşturur.
 */

import type { Kanit, RiskSeviyesi } from '../types/vdk-types';
import {
  type MevzuatMaddesi,
  getMevzuatByKKodu,
  getMevzuatByKurganSenaryo,
  getMevzuatByRamPattern,
} from './legal-references';
import { VDK_K_CODES } from '../rules/vdk-k-codes';
import { KURGAN_SCENARIOS } from '../rules/kurgan-scenarios';
import { RAM_PATTERNS } from '../rules/ram-patterns';

// Evidence paketi
export interface EvidenceBundle {
  baslik: string;
  ozet: string;
  seviye: RiskSeviyesi;
  kanitlar: EvidenceItem[];
  mevzuatlar: MevzuatMaddesi[];
  formul?: FormulaEvidence;
  sektorKarsilastirma?: SektorEvidence;
  oneriler: string[];
  sonrakiAdimlar: string[];
}

// Evidence item
export interface EvidenceItem {
  kategori:
    | 'HESAP'
    | 'DEGER'
    | 'ESIK'
    | 'FORMUL'
    | 'MEVZUAT'
    | 'SEKTOR'
    | 'KURGAN'
    | 'RAM';
  baslik: string;
  deger: string | number;
  aciklama?: string;
  kaynak?: string;
  kritikMi?: boolean;
}

// Formül kanıtı
export interface FormulaEvidence {
  ad: string;
  formul: string;
  adimlar: { aciklama: string; deger: string | number }[];
  sonuc: string | number;
}

// Sektör kanıtı
export interface SektorEvidence {
  sektorAdi: string;
  naceKodu: string;
  mukellefDegeri: number;
  sektorMin: number;
  sektorOrtalama: number;
  sektorMax: number;
  sapmaYuzdesi: number;
  yorum: string;
}

/**
 * K-Kodu için evidence paketi oluştur
 */
export const buildKKoduEvidence = (
  kKodu: string,
  hesaplananDeger: number,
  mizanKanitlari: Kanit[]
): EvidenceBundle | null => {
  const kKoduDef = VDK_K_CODES[kKodu];
  if (!kKoduDef) return null;

  const mevzuatlar = getMevzuatByKKodu(kKodu);

  // Kanıtları dönüştür
  const kanitlar: EvidenceItem[] = mizanKanitlari.map((k) => ({
    kategori: k.tip as EvidenceItem['kategori'],
    baslik: k.aciklama,
    deger: k.deger ?? '',
    kaynak: k.kaynak,
  }));

  // Eşik değer kanıtı ekle
  kanitlar.push({
    kategori: 'ESIK',
    baslik: 'VDK Eşik Değeri',
    deger: kKoduDef.esik.kritik,
    aciklama: kKoduDef.esik.uyari
      ? `Uyarı: ${kKoduDef.esik.uyari}, Kritik: ${kKoduDef.esik.kritik}`
      : `Kritik: ${kKoduDef.esik.kritik}`,
    kaynak: 'VDK-RAS',
    kritikMi: hesaplananDeger >= kKoduDef.esik.kritik,
  });

  // Formül kanıtı
  const formul: FormulaEvidence = {
    ad: kKoduDef.ad,
    formul: kKoduDef.formul,
    adimlar: mizanKanitlari.map((k) => ({
      aciklama: k.aciklama,
      deger: k.deger ?? 0,
    })),
    sonuc: hesaplananDeger,
  };

  // Seviye belirle
  let seviye: RiskSeviyesi;
  if (hesaplananDeger >= kKoduDef.esik.kritik) {
    seviye = 'KRITIK';
  } else if (kKoduDef.esik.uyari && hesaplananDeger >= kKoduDef.esik.uyari) {
    seviye = 'YUKSEK';
  } else {
    seviye = 'ORTA';
  }

  // Öneriler
  const oneriler = [kKoduDef.oneri];

  // Sonraki adımlar
  const sonrakiAdimlar: string[] = [];
  if (kKoduDef.kurganIliskili) {
    sonrakiAdimlar.push('KURGAN sisteminde bu işlem izlenebilir');
  }
  if (seviye === 'KRITIK') {
    sonrakiAdimlar.push('Vergi incelemesi riski yüksek - derhal düzeltme yapın');
  }
  mevzuatlar.forEach((m) => {
    sonrakiAdimlar.push(`${m.kanun} ${m.maddeNo} hükümlerini inceleyin`);
  });

  return {
    baslik: `${kKoduDef.kod}: ${kKoduDef.ad}`,
    ozet: kKoduDef.aciklama,
    seviye,
    kanitlar,
    mevzuatlar,
    formul,
    oneriler,
    sonrakiAdimlar,
  };
};

/**
 * KURGAN senaryosu için evidence paketi oluştur
 */
export const buildKurganEvidence = (
  senaryoId: string,
  tetiklenenKosullar: string[]
): EvidenceBundle | null => {
  const senaryo = KURGAN_SCENARIOS[senaryoId];
  if (!senaryo) return null;

  const mevzuatlar = getMevzuatByKurganSenaryo(senaryoId);

  // Kanıtlar
  const kanitlar: EvidenceItem[] = tetiklenenKosullar.map((k) => ({
    kategori: 'KURGAN' as const,
    baslik: 'Tetiklenen Koşul',
    deger: k,
    kritikMi: true,
  }));

  // Risk puanı kanıtı
  kanitlar.push({
    kategori: 'DEGER',
    baslik: 'KURGAN Risk Puanı',
    deger: senaryo.riskPuani,
    aciklama: `0-100 arası. ${senaryo.riskPuani >= 80 ? 'Kritik' : senaryo.riskPuani >= 60 ? 'Yüksek' : 'Orta'} risk.`,
    kaynak: 'KURGAN Sistemi',
  });

  // Aksiyon kanıtı
  kanitlar.push({
    kategori: 'KURGAN',
    baslik: 'Beklenen VDK Aksiyonu',
    deger: senaryo.aksiyon,
    aciklama: senaryo.suresi ? `Süre: ${senaryo.suresi}` : 'Süresiz takip',
  });

  // Seviye
  let seviye: RiskSeviyesi;
  if (senaryo.aksiyon === 'INCELEME') seviye = 'KRITIK';
  else if (senaryo.aksiyon === 'IZAHA_DAVET') seviye = 'YUKSEK';
  else if (senaryo.aksiyon === 'BILGI_ISTEME') seviye = 'ORTA';
  else seviye = 'DUSUK';

  // Öneriler
  const oneriler: string[] = [];
  if (senaryo.aksiyon === 'IZAHA_DAVET') {
    oneriler.push('30 gün içinde izahat hazırlayın');
    oneriler.push('Tüm belgeleri düzenli şekilde derleyin');
  }
  if (senaryo.aksiyon === 'BILGI_ISTEME') {
    oneriler.push('15 gün içinde bilgi/belge sunun');
  }

  // Sonraki adımlar
  const sonrakiAdimlar = [
    'İşlemin gerçekliğini belgeleyin',
    'Banka dekontları ve sözleşmeleri hazırlayın',
    ...(senaryo.ornekler || []).map((o) => `Örnek: ${o}`),
  ];

  return {
    baslik: `${senaryo.id}: ${senaryo.ad}`,
    ozet: senaryo.aciklama,
    seviye,
    kanitlar,
    mevzuatlar,
    oneriler,
    sonrakiAdimlar,
  };
};

/**
 * RAM pattern için evidence paketi oluştur
 */
export const buildRamEvidence = (
  patternId: string,
  tespitDetaylari: { [key: string]: string | number }
): EvidenceBundle | null => {
  const pattern = RAM_PATTERNS[patternId];
  if (!pattern) return null;

  const mevzuatlar = getMevzuatByRamPattern(patternId);

  // Kanıtlar
  const kanitlar: EvidenceItem[] = Object.entries(tespitDetaylari).map(
    ([key, value]) => ({
      kategori: 'RAM' as const,
      baslik: key,
      deger: value,
    })
  );

  // Tespit formülü kanıtı
  kanitlar.push({
    kategori: 'FORMUL',
    baslik: 'Tespit Formülü',
    deger: pattern.tespit,
    kaynak: 'RAM Pattern',
  });

  // Seviye
  let seviye: RiskSeviyesi;
  if (pattern.oncelik === 'KRITIK') seviye = 'KRITIK';
  else if (pattern.oncelik === 'YUKSEK') seviye = 'YUKSEK';
  else seviye = 'ORTA';

  // Öneriler
  const oneriler = [pattern.dogru];
  if (pattern.otomatikDuzeltme && pattern.duzeltmeAksiyonu) {
    oneriler.push(`Otomatik düzeltme: ${pattern.duzeltmeAksiyonu}`);
  }

  // Sonraki adımlar
  const sonrakiAdimlar = [
    'Hatayı düzeltin',
    ...mevzuatlar.map((m) => `${m.kanun} ${m.maddeNo} hükümlerini inceleyin`),
  ];

  return {
    baslik: `${pattern.id}: ${pattern.ad}`,
    ozet: pattern.aciklama,
    seviye,
    kanitlar,
    mevzuatlar,
    oneriler,
    sonrakiAdimlar,
  };
};

/**
 * Sektör karşılaştırmalı evidence paketi oluştur
 */
export const buildSektorEvidence = (
  baslik: string,
  ozet: string,
  mukellefDegeri: number,
  sektorData: {
    sektorAdi: string;
    naceKodu: string;
    min: number;
    ortalama: number;
    max: number;
  },
  kanitlar: Kanit[]
): EvidenceBundle => {
  // Sapma hesapla
  let sapmaYuzdesi = 0;
  let yorum = '';

  if (mukellefDegeri < sektorData.min) {
    sapmaYuzdesi = ((sektorData.min - mukellefDegeri) / sektorData.min) * 100;
    yorum = `Sektör minimumunun %${sapmaYuzdesi.toFixed(1)} altında`;
  } else if (mukellefDegeri > sektorData.max) {
    sapmaYuzdesi = ((mukellefDegeri - sektorData.max) / sektorData.max) * 100;
    yorum = `Sektör maksimumunun %${sapmaYuzdesi.toFixed(1)} üstünde`;
  } else {
    yorum = 'Sektör ortalaması dahilinde';
  }

  // Seviye belirle
  let seviye: RiskSeviyesi;
  if (sapmaYuzdesi >= 100) seviye = 'KRITIK';
  else if (sapmaYuzdesi >= 50) seviye = 'YUKSEK';
  else if (sapmaYuzdesi >= 25) seviye = 'ORTA';
  else seviye = 'DUSUK';

  const evidenceKanitlar: EvidenceItem[] = kanitlar.map((k) => ({
    kategori: k.tip as EvidenceItem['kategori'],
    baslik: k.aciklama,
    deger: k.deger ?? '',
    kaynak: k.kaynak,
  }));

  // Sektör karşılaştırma kanıtı
  evidenceKanitlar.push({
    kategori: 'SEKTOR',
    baslik: `Sektör: ${sektorData.sektorAdi}`,
    deger: `Min: ${sektorData.min}, Ort: ${sektorData.ortalama}, Max: ${sektorData.max}`,
    aciklama: yorum,
    kritikMi: seviye === 'KRITIK' || seviye === 'YUKSEK',
  });

  const sektorKarsilastirma: SektorEvidence = {
    sektorAdi: sektorData.sektorAdi,
    naceKodu: sektorData.naceKodu,
    mukellefDegeri,
    sektorMin: sektorData.min,
    sektorOrtalama: sektorData.ortalama,
    sektorMax: sektorData.max,
    sapmaYuzdesi,
    yorum,
  };

  return {
    baslik,
    ozet,
    seviye,
    kanitlar: evidenceKanitlar,
    mevzuatlar: [],
    sektorKarsilastirma,
    oneriler: [
      sapmaYuzdesi > 0
        ? 'Sektör ortalamasına yaklaşmaya çalışın'
        : 'Mevcut durum sektör ortalamasına uygundur',
    ],
    sonrakiAdimlar: [
      'Sektörel karşılaştırma raporunu inceleyin',
      'Sapmanın nedenlerini analiz edin',
    ],
  };
};

/**
 * Evidence bundle'ı HTML formatında render et
 */
export const renderEvidenceHTML = (bundle: EvidenceBundle): string => {
  const seviyeRenk = {
    KRITIK: '#dc2626',
    YUKSEK: '#ea580c',
    ORTA: '#ca8a04',
    DUSUK: '#16a34a',
  };

  const html = `
    <div class="evidence-bundle" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 8px 0;">
      <h3 style="color: ${seviyeRenk[bundle.seviye]}; margin: 0 0 8px 0;">${bundle.baslik}</h3>
      <p style="color: #6b7280; margin: 0 0 16px 0;">${bundle.ozet}</p>

      <h4 style="margin: 16px 0 8px 0;">Kanitlar</h4>
      <ul style="margin: 0; padding-left: 20px;">
        ${bundle.kanitlar
          .map(
            (k) => `
          <li style="${k.kritikMi ? 'color: #dc2626; font-weight: bold;' : ''}">
            <strong>${k.baslik}:</strong> ${k.deger}
            ${k.aciklama ? `<br><small style="color: #6b7280;">${k.aciklama}</small>` : ''}
          </li>
        `
          )
          .join('')}
      </ul>

      ${
        bundle.formul
          ? `
        <h4 style="margin: 16px 0 8px 0;">Formul</h4>
        <code style="background: #f3f4f6; padding: 8px; display: block; border-radius: 4px;">
          ${bundle.formul.formul} = ${bundle.formul.sonuc}
        </code>
      `
          : ''
      }

      ${
        bundle.mevzuatlar.length > 0
          ? `
        <h4 style="margin: 16px 0 8px 0;">Mevzuat Dayanagi</h4>
        <ul style="margin: 0; padding-left: 20px;">
          ${bundle.mevzuatlar
            .map(
              (m) => `
            <li>
              <strong>${m.kanun} ${m.maddeNo}:</strong> ${m.baslik}
              <br><small style="color: #6b7280;">${m.ozet.substring(0, 100)}...</small>
            </li>
          `
            )
            .join('')}
        </ul>
      `
          : ''
      }

      <h4 style="margin: 16px 0 8px 0;">Oneriler</h4>
      <ul style="margin: 0; padding-left: 20px;">
        ${bundle.oneriler.map((o) => `<li>${o}</li>`).join('')}
      </ul>

      <h4 style="margin: 16px 0 8px 0;">Sonraki Adimlar</h4>
      <ol style="margin: 0; padding-left: 20px;">
        ${bundle.sonrakiAdimlar.map((a) => `<li>${a}</li>`).join('')}
      </ol>
    </div>
  `;

  return html;
};

/**
 * Evidence bundle'ı Markdown formatında render et
 */
export const renderEvidenceMarkdown = (bundle: EvidenceBundle): string => {
  const seviyeEmoji = {
    KRITIK: '🔴',
    YUKSEK: '🟠',
    ORTA: '🟡',
    DUSUK: '🟢',
  };

  const md = `
## ${seviyeEmoji[bundle.seviye]} ${bundle.baslik}

${bundle.ozet}

### Kanitlar

${bundle.kanitlar.map((k) => `- **${k.baslik}:** ${k.deger}${k.aciklama ? ` _(${k.aciklama})_` : ''}`).join('\n')}

${
  bundle.formul
    ? `
### Formul

\`\`\`
${bundle.formul.formul} = ${bundle.formul.sonuc}
\`\`\`
`
    : ''
}

${
  bundle.mevzuatlar.length > 0
    ? `
### Mevzuat Dayanagi

${bundle.mevzuatlar.map((m) => `- **${m.kanun} ${m.maddeNo}:** ${m.baslik}`).join('\n')}
`
    : ''
}

### Oneriler

${bundle.oneriler.map((o) => `- ${o}`).join('\n')}

### Sonraki Adimlar

${bundle.sonrakiAdimlar.map((a, i) => `${i + 1}. ${a}`).join('\n')}
`;

  return md;
};

/**
 * Evidence bundle'ı JSON formatına dönüştür (API response için)
 */
export const evidenceToJSON = (bundle: EvidenceBundle): object => {
  return {
    baslik: bundle.baslik,
    ozet: bundle.ozet,
    seviye: bundle.seviye,
    kanitlar: bundle.kanitlar,
    mevzuatlar: bundle.mevzuatlar.map((m) => ({
      id: m.id,
      kanun: m.kanun,
      maddeNo: m.maddeNo,
      baslik: m.baslik,
      ozet: m.ozet,
    })),
    formul: bundle.formul,
    sektorKarsilastirma: bundle.sektorKarsilastirma,
    oneriler: bundle.oneriler,
    sonrakiAdimlar: bundle.sonrakiAdimlar,
  };
};

/**
 * Seviye rengini döndür
 */
export const getEvidenceSeviyeRenk = (seviye: RiskSeviyesi): string => {
  switch (seviye) {
    case 'KRITIK':
      return 'red';
    case 'YUKSEK':
      return 'orange';
    case 'ORTA':
      return 'yellow';
    case 'DUSUK':
      return 'green';
    default:
      return 'gray';
  }
};

/**
 * Seviye emoji'sini döndür
 */
export const getEvidenceSeviyeEmoji = (seviye: RiskSeviyesi): string => {
  switch (seviye) {
    case 'KRITIK':
      return '🔴';
    case 'YUKSEK':
      return '🟠';
    case 'ORTA':
      return '🟡';
    case 'DUSUK':
      return '🟢';
    default:
      return '⚪';
  }
};
