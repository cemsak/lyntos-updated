export interface MevzuatResult {
  id: number;
  src_code: string;
  mevzuat_type: string;
  mevzuat_no: string | null;
  madde: string | null;
  fikra: string | null;
  baslik: string;
  kisa_aciklama: string | null;
  tam_metin: string | null;
  kurum: string;
  yururluk_tarih: string | null;
  canonical_url: string | null;
  trust_class: string;
  affected_rules: string[];
  kapsam_etiketleri: string[];
  relevance_score: number;
  highlights: string[];
}

export interface Statistics {
  total_active: number;
  total_all: number;
  by_type: Record<string, number>;
  by_kurum: Record<string, number>;
  by_trust_class: Record<string, number>;
  type_labels: Record<string, string>;
  kurum_labels: Record<string, string>;
}

export const TYPE_COLORS: Record<string, string> = {
  kanun: 'bg-[#E6F9FF] text-[#0049AA] dark:bg-[#0049AA]/30 dark:text-[#5ED6FF]',
  khk: 'bg-[#E6F9FF] text-[#0049AA] dark:bg-[#0049AA]/30 dark:text-[#ABEBFF]',
  teblig: 'bg-[#ECFDF5] text-[#00804D] dark:bg-[#00A651]/30 dark:text-[#AAE8B8]',
  sirkular: 'bg-[#FFFBEB] text-[#E67324] dark:bg-[#FFB114]/30 dark:text-[#FFE045]',
  genelge: 'bg-[#FFFBEB] text-[#E67324] dark:bg-[#FA841E]/30 dark:text-[#FFB114]',
  ozelge: 'bg-[#FEF2F2] text-[#BF192B] dark:bg-[#F0282D]/30 dark:text-[#FFC7C9]',
  danistay_karar: 'bg-[#FEF2F2] text-[#BF192B] dark:bg-[#980F30]/30 dark:text-[#FF9196]',
  yonetmelik: 'bg-[#E6F9FF] text-[#0049AA] dark:bg-[#0078D0]/30 dark:text-[#ABEBFF]'
};
