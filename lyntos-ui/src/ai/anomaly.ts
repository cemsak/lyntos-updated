export type Anomaly = {
  title: string;
  severity: "low" | "med" | "high";
  evidence: string;
  suggestion: string;
  tag: "Banka" | "Mizan" | "Beyan" | "SMİYB" | "Radar" | "Genel";
};

export function analyzeAnomalies(d: any): Anomaly[] {
  const out: Anomaly[] = [];
  const parts = d?.parts || {};
  const bank = d?.bank || {};
  const book = d?.book || {};
  const returns = Array.isArray(d?.returns) ? d.returns : [];
  const trend = Array.isArray(d?.trend) ? d.trend : [];

  // Mizan
  if (book && book.balanced === false) {
    out.push({
      title: "Mizan dengesiz",
      severity: "high",
      evidence: `Borç ${book.debitTotal} ≠ Alacak ${book.creditTotal}`,
      suggestion:
        "Fiş/hesap bakiyelerini kontrol edin; kapanış kayıtlarını gözden geçirin.",
      tag: "Mizan",
    });
  }

  // SMİYB
  if (Number(parts.smiyb) >= 60) {
    out.push({
      title: "SMİYB riski yüksek",
      severity: "high",
      evidence: `SMİYB puanı ${parts.smiyb}`,
      suggestion:
        "Karşı firma BA/BS, yoklama ve sevk belgeleriyle doğrulama yapın.",
      tag: "SMİYB",
    });
  } else if (Number(parts.smiyb) >= 40) {
    out.push({
      title: "SMİYB riski orta",
      severity: "med",
      evidence: `SMİYB puanı ${parts.smiyb}`,
      suggestion:
        "Tedarikçi uygunluk kontrolünü sıklaştırın; ödeme akışını izleyin.",
      tag: "SMİYB",
    });
  }

  // Beyannameler
  for (const r of returns) {
    if (r.status === "Bekliyor") {
      out.push({
        title: `${r.name} bekliyor`,
        severity: "med",
        evidence: `Durum: ${r.status} • Risk: ${r.risk}`,
        suggestion:
          "Onay/gönderim sürecini tamamlayın; mizan uyumu kontrol edin.",
        tag: "Beyan",
      });
    } else if (r.status === "Hazırlanıyor") {
      out.push({
        title: `${r.name} hazırlık aşamasında`,
        severity: "low",
        evidence: `Durum: ${r.status} • Risk: ${r.risk}`,
        suggestion: "Eksik belgeleri tamamlayın; son onay takvimini planlayın.",
        tag: "Beyan",
      });
    }
  }

  // Banka – son 7 gün delta aralığı
  const line = Array.isArray(d?.bankLine)
    ? d.bankLine
    : Array.isArray(d?.bankHeat)
      ? d.bankHeat
      : [];
  if (Array.isArray(line) && line.length > 3) {
    const last = line.slice(-7).map((x: any) => Number(x.delta) || 0);
    const max = Math.max(...last),
      min = Math.min(...last);
    if (max - min >= 12) {
      out.push({
        title: "Nakit akışında anormal oynaklık",
        severity: "med",
        evidence: `Son 7 gün delta aralığı: ${min}…${max}`,
        suggestion:
          "Büyük çıkış/girişlerin dayanağını kontrol edin; açıklama ekleyin.",
        tag: "Banka",
      });
    }
  }

  // Radar ortalama düşükse
  const radar = Array.isArray(d?.radarContribs) ? d.radarContribs : [];
  if (radar.length) {
    const avg = Math.round(
      radar.reduce((a: number, b: any) => a + (Number(b.value) || 0), 0) /
        radar.length,
    );
    if (avg < 50) {
      out.push({
        title: "Radar puanı düşük",
        severity: "low",
        evidence: `Ortalama ${avg}`,
        suggestion:
          "Düşük kalan fonksiyonlar için süreç iyileştirme planı hazırlayın.",
        tag: "Radar",
      });
    }
  }

  // Trend – sert düşüş
  if (trend.length > 2) {
    const a = trend.at(-2)?.score ?? 0;
    const b = trend.at(-1)?.score ?? 0;
    if (b < a - 10) {
      out.push({
        title: "Genel puanda düşüş",
        severity: "med",
        evidence: `Son iki dönem: ${a} → ${b}`,
        suggestion:
          "Etki eden girdileri (beyan, banka, SMİYB) ayrı ayrı inceleyin.",
        tag: "Genel",
      });
    }
  }

  return out;
}
