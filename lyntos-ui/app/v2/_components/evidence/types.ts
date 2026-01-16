/**
 * LYNTOS Evidence Types
 * Sprint 4.3 - Evidence Binding Contract
 */

export type EvidenceStatus = 'available' | 'missing' | 'pending' | 'expired';
export type EvidenceCategory =
  | 'mizan'
  | 'beyan'
  | 'banka'
  | 'sayim'
  | 'mutabakat'
  | 'sozlesme'
  | 'rapor'
  | 'mevzuat';

export interface EvidenceRef {
  id: string;                    // "mizan-100-2024Q4"
  category: EvidenceCategory;
  label: string;                 // "100-Kasa Mizan Satiri"
  description?: string;
  status: EvidenceStatus;
  documentId?: string;           // Gercek belge ID'si (varsa)
  period?: string;
  hesapKodu?: string;
  url?: string;                  // Belge URL'i (varsa)
  uploadedAt?: string;
  expiresAt?: string;
}

export interface EvidenceBundle {
  signalId: string;
  refs: EvidenceRef[];
  completeness: number;          // 0-100
  missingCount: number;
  status: 'complete' | 'partial' | 'empty';
}

// ═══════════════════════════════════════════════════════════════════
// EVIDENCE REF GENERATORS
// ═══════════════════════════════════════════════════════════════════

/**
 * Parse evidence ref string to structured object
 * Format: "{category}-{identifier}-{period}"
 * Example: "mizan-100-2024Q4" → { category: 'mizan', hesapKodu: '100', period: '2024Q4' }
 */
export function parseEvidenceRef(refString: string): EvidenceRef {
  const parts = refString.split('-');

  // Default fallback
  const ref: EvidenceRef = {
    id: refString,
    category: 'rapor',
    label: refString,
    status: 'pending',
  };

  if (parts.length >= 2) {
    const categoryMap: Record<string, EvidenceCategory> = {
      'mizan': 'mizan',
      'banka': 'banka',
      'ekstre': 'banka',
      'kasa': 'sayim',
      'stok': 'sayim',
      'sayim': 'sayim',
      'alici': 'mutabakat',
      'satici': 'mutabakat',
      'mutabakat': 'mutabakat',
      'kdv': 'beyan',
      'beyan': 'beyan',
      'sozlesme': 'sozlesme',
      'ortak': 'sozlesme',
      'faiz': 'rapor',
      'ciro': 'rapor',
      'sermaye': 'rapor',
      'regwatch': 'mevzuat',
      'ttk': 'mevzuat',
      'vuk': 'mevzuat',
    };

    const prefix = parts[0].toLowerCase();
    ref.category = categoryMap[prefix] || 'rapor';

    // Extract hesap kodu if present
    if (parts[1] && /^\d+/.test(parts[1])) {
      ref.hesapKodu = parts[1];
    }

    // Extract period if present
    if (parts.length >= 3) {
      ref.period = parts[parts.length - 1];
    }

    // Generate label
    ref.label = generateEvidenceLabel(ref.category, parts);
  }

  return ref;
}

function generateEvidenceLabel(category: EvidenceCategory, parts: string[]): string {
  const labels: Record<EvidenceCategory, (p: string[]) => string> = {
    mizan: (p) => `${p[1] || ''}-${getHesapAdi(p[1])} Mizan`,
    beyan: (p) => `${p[0].toUpperCase()} Beyannamesi`,
    banka: (p) => `Banka Ekstre`,
    sayim: (p) => `${p[0].charAt(0).toUpperCase() + p[0].slice(1)} Sayim Tutanagi`,
    mutabakat: (p) => `${p[0].charAt(0).toUpperCase() + p[0].slice(1)} Mutabakat`,
    sozlesme: (p) => `${p[0].charAt(0).toUpperCase() + p[0].slice(1)} Sozlesme`,
    rapor: (p) => `${p.join(' ')} Raporu`,
    mevzuat: (p) => `${p.join(' ')} Mevzuat`,
  };

  return labels[category]?.(parts) || parts.join(' ');
}

function getHesapAdi(kod?: string): string {
  if (!kod) return '';
  const hesaplar: Record<string, string> = {
    '100': 'Kasa',
    '102': 'Bankalar',
    '120': 'Alicilar',
    '131': 'Ortaklara Borclar',
    '153': 'Ticari Mallar',
    '191': 'Indirilecek KDV',
    '320': 'Saticilar',
    '331': 'Ortaklardan Alacaklar',
    '360': 'Odenecek Vergi',
    '391': 'Hesaplanan KDV',
    '600': 'Yurtici Satislar',
    '601': 'Yurtdisi Satislar',
    '602': 'Diger Gelirler',
  };
  return hesaplar[kod] || kod;
}

/**
 * Build evidence bundle from signal's evidence_refs
 */
export function buildEvidenceBundle(
  signalId: string,
  evidenceRefs: string[],
  availableDocuments: Map<string, string> // refId -> documentId
): EvidenceBundle {
  const refs = evidenceRefs.map(refString => {
    const ref = parseEvidenceRef(refString);

    // Check if document is available
    const docId = availableDocuments.get(refString);
    if (docId) {
      ref.status = 'available';
      ref.documentId = docId;
    } else {
      ref.status = 'missing';
    }

    return ref;
  });

  const availableCount = refs.filter(r => r.status === 'available').length;
  const missingCount = refs.filter(r => r.status === 'missing').length;
  const completeness = refs.length > 0
    ? Math.round((availableCount / refs.length) * 100)
    : 0;

  return {
    signalId,
    refs,
    completeness,
    missingCount,
    status: completeness === 100 ? 'complete' : completeness > 0 ? 'partial' : 'empty',
  };
}
