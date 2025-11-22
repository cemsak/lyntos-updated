import { z } from "zod";

/** ====== SCHEMAS ====== */
export const RiskNedeniSchema = z.object({
  neden: z.string(),
  etki: z.string().optional(),
  kanit: z.string().optional(),
  oneri: z.string().optional(),
  kaynak: z.enum(["RADAR", "SMIYB", "MIZAN", "BABS", "BANKA"]).optional(),
  referans_id: z.string().optional(),
  href: z.string().url().optional(),
  partner_id: z.string().optional(),
});

export const KarsiFirmaSchema = z.object({
  id: z.string().optional(),
  unvan: z.string(),
  vergi_no: z.string().optional(),
  faaliyet_durumu: z.string().optional(),
  nace: z.string().optional(),
  uyum_puani: z.number().optional(),
  fatura_sayisi: z.number().optional(),
  kdv_orani: z.string().optional(),
  nace_mismatch: z.boolean().optional(),
});

export const BeyanOzetSchema = z.object({
  tur: z.string(),
  donem: z.string().optional(),
  durum: z.string().optional(),
  tutar: z.number().optional(),
  ozet: z.string().optional(),
  not: z.string().optional(),
});

export const MizanTop5Schema = z.object({
  hesap: z.string().optional(),
  ad: z.string().optional(),
  borc: z.number().optional(),
  alacak: z.number().optional(),
  fark: z.number().optional(),
});

export const MizanOzetSchema = z.object({
  dengeli: z.boolean().optional(),
  borc_toplam: z.number().optional(),
  alacak_toplam: z.number().optional(),
  hesap_sayisi: z.number().optional(),
  uyari: z.array(z.string()).optional(),
  not: z.string().optional(),
  top5: z.array(MizanTop5Schema).optional(),
});

export const AnalyzeResponseSchema = z.object({
  filters: z
    .object({
      entity: z.string().optional(),
      period: z.string().optional(),
    })
    .optional(),

  kurgan: z
    .object({
      risk_skoru: z.number().optional(),
      risk_durumu: z.string().optional(),
      vergi_uyum_endeksi: z.number().optional(),
      karsi_firma: z.array(KarsiFirmaSchema).optional(),
      risk_log: z
        .array(z.object({ donem: z.string(), skor: z.number() }))
        .optional(),
    })
    .optional(),

  radar: z
    .object({
      radar_risk_durumu: z.string().optional(),
    })
    .optional(),

  sahte_fatura_riski: z
    .object({
      skor: z.number().optional(),
      durum: z.string().optional(),
      nedenler: z.array(RiskNedeniSchema).optional(),
      eksik_veriler: z.array(z.string()).optional(),
    })
    .optional(),

  vdk_uzmani_yorumu: z.string().optional(),
  ai_analizi: z.string().optional(),

  beyanname_ozeti: z.array(BeyanOzetSchema).optional(),
  mizan: MizanOzetSchema.optional(),
});

/** ====== TYPES ====== */
export type RiskNedeni = z.infer<typeof RiskNedeniSchema>;
export type KarsiFirma = z.infer<typeof KarsiFirmaSchema>;
export type BeyanOzet = z.infer<typeof BeyanOzetSchema>;
export type MizanTop5 = z.infer<typeof MizanTop5Schema>;
export type MizanOzet = z.infer<typeof MizanOzetSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
