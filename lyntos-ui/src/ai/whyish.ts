import type { Anomaly } from "./anomaly";

export type WhyNode = { why: string; evidence?: string };
export type Fishbone = {
  effect: string;
  bones: {
    name: string;
    causes: { text: string; evidence?: string; fix?: string }[];
  }[];
};

export function buildFiveWhys(a: Anomaly): WhyNode[] {
  return [
    { why: `${a.title} neden oldu?`, evidence: a.evidence },
    {
      why: "İlgili süreç neden yeterli kontrol sunmadı?",
      evidence: a.suggestion,
    },
    { why: "Önleyici kontroller neden devreye alınmadı?" },
    { why: "İzleme/raporlama bu riski neden erken yakalamadı?" },
    { why: "Kaynak planlaması bu alanı neden önceliklendirmedi?" },
  ];
}

export function buildFishbone(a: Anomaly): Fishbone {
  return {
    effect: a.title,
    bones: [
      {
        name: "Süreç",
        causes: [
          { text: "Onay akışı eksik", evidence: a.evidence, fix: a.suggestion },
        ],
      },
      { name: "Veri", causes: [{ text: "Belge/delil yetersiz" }] },
      { name: "Sistem", causes: [{ text: "Entegrasyon/otomasyon yok" }] },
      { name: "İnsan", causes: [{ text: "Sorumluluk belirsiz" }] },
      { name: "Politika", causes: [{ text: "Yazılı prosedür eksik" }] },
    ],
  };
}
