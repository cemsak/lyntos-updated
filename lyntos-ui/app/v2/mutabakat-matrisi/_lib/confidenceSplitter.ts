/**
 * Confidence Splitter - Tek trust_score'u Kapsam + Eslestirme'ye bol
 * Saf fonksiyon, yan etkisi yok
 */

import type { ConfidenceSplit, CrossCheckResultRaw } from '../_types/crossCheck';

export function splitConfidence(check: CrossCheckResultRaw): ConfidenceSplit {
  const hasSource = check.source_value !== 0;
  const hasTarget = check.target_value !== 0;

  // Kapsam: Veri kapsami (source + target mevcut mu?)
  let kapsam = 0;
  if (hasSource && hasTarget) {
    kapsam = 100;
  } else if (hasSource || hasTarget) {
    kapsam = 50;
  }

  // no_data kontrolu
  if (check.status === 'no_data') {
    kapsam = 0;
  }

  // Eslestirme: Eslestirme kalitesi
  let eslestirme = 100;
  if (check.status === 'pass') {
    eslestirme = 100;
  } else if (check.status === 'no_data' || check.status === 'skipped') {
    eslestirme = 0;
  } else {
    // Fark yuzdesine gore dusur
    if (check.difference_percent > 10) {
      eslestirme = 20;
    } else if (check.difference_percent > 5) {
      eslestirme = 50;
    } else if (check.difference_percent > 1) {
      eslestirme = 70;
    } else {
      eslestirme = 90;
    }
  }

  const toplam = Math.round((kapsam + eslestirme) / 2);

  let aciklama = '';
  if (kapsam === 0) {
    aciklama = 'Veri eksik - karsilastirma yapilamadi';
  } else if (kapsam < 100) {
    aciklama = 'Kaynak veya hedef verisi eksik';
  } else if (eslestirme >= 80) {
    aciklama = 'Yuksek eslestirme kalitesi';
  } else if (eslestirme >= 50) {
    aciklama = 'Orta eslestirme kalitesi';
  } else {
    aciklama = 'Dusuk eslestirme - fark yuksek';
  }

  return {
    kapsam: Math.round(kapsam),
    eslestirme: Math.round(eslestirme),
    toplam,
    aciklama,
  };
}
