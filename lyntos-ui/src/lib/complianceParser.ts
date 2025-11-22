/**
 * Compliance markdown string'ini veri objesine çevirir.
 */
export interface ComplianceData {
  risk: string;
  bulgu: string;
  uyari: string;
  skor: string;
  aksiyonlar: string[];
  ozet: string;
  oneriler: string[];
}

export function parseComplianceMarkdown(markdown: string): ComplianceData {
  function extractBlock(head: string, txt: string) {
    const pattern = new RegExp(`###?\\s*${head}[:\\s\\-]*([\\s\\S]+?)(?=(###|---|$))`, "i");
    const match = txt.match(pattern);
    return match ? match[1].trim() : "";
  }
  const risk = extractBlock("Risk", markdown);
  const bulgu = extractBlock("Bulgu", markdown);
  const skor = extractBlock("Skor", markdown).split("\n")[0]?.replace(/\*\*/g,"").trim() || "";
  const aksiyonlar = (extractBlock("Aksiyon", markdown)||"")
    .split(/\n+/).map(l=>l.replace(/^\d+\.\s*/,"").trim()).filter(Boolean);
  const uyari = extractBlock("Uyarı", markdown);
  const ozet = extractBlock("Kısa Özet", markdown);
  const oneriler = (extractBlock("Öneri", markdown)||"")
    .split(/\n+/).map(l=>l.replace(/^\d+\.\s*|-/,"").trim()).filter(Boolean);
  return { risk, bulgu, uyari, skor, aksiyonlar, ozet, oneriler };
}
 