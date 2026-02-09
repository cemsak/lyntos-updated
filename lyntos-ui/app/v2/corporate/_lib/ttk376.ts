/**
 * TTK 376 Hesaplama Fonksiyonları
 * Sermaye kaybı ve borca batıklık analizi
 */

import type { TTK376Sonuc } from '../_types/corporate';

export function hesaplaTTK376(sermaye: number, yedekler: number, ozvarlik: number): TTK376Sonuc {
  const korunanSermaye = sermaye + yedekler;
  const kayipOrani = ((korunanSermaye - ozvarlik) / korunanSermaye) * 100;
  const yariEsik = korunanSermaye * 0.5;
  const ucteBirEsik = korunanSermaye * (1/3);

  if (ozvarlik <= 0) {
    return {
      durum: 'borca_batik',
      kayipOrani: 100,
      yariEsik,
      ucteBirEsik,
      oneri: 'DERHAL mahkemeye başvuru zorunlu. İyileştirme planı veya iflas başvurusu.',
      ttkMadde: 'TTK 376/3',
      aksiyonSuresi: 'DERHAL',
    };
  }

  if (ozvarlik < ucteBirEsik) {
    return {
      durum: 'ucte_iki_kayip',
      kayipOrani,
      yariEsik,
      ucteBirEsik,
      oneri: 'Yönetim kurulu DERHAL genel kurulu toplar. Sermaye tamamlama, artırım veya indirim kararı alınmalı.',
      ttkMadde: 'TTK 376/2',
      aksiyonSuresi: 'DERHAL',
    };
  }

  if (ozvarlik < yariEsik) {
    return {
      durum: 'yari_kayip',
      kayipOrani,
      yariEsik,
      ucteBirEsik,
      oneri: 'Yönetim kurulu genel kurulu toplamalı, durumu izah etmeli. İyileştirme tedbirleri önermeli.',
      ttkMadde: 'TTK 376/1',
      aksiyonSuresi: '30 gün içinde',
    };
  }

  return {
    durum: 'saglikli',
    kayipOrani,
    yariEsik,
    ucteBirEsik,
    oneri: 'Sermaye yapısı sağlıklı. Herhangi bir zorunlu aksiyon yok.',
    ttkMadde: 'TTK 376 kapsamı dışında',
    aksiyonSuresi: null,
  };
}
