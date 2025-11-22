export type NormalizeOpts = { demoFill?: boolean };

export function normalizeAnalyze(raw: any, opts: NormalizeOpts = {}) {
  return {
    summary: raw.summary ?? "",
    panel_summary: raw.panel_summary ?? {},
    mizan: raw.mizan ?? {},
    beyanname_ozeti: raw.beyanname_ozeti ?? [],
    beyannameler: raw.beyannameler ?? [],
    tahakkuklar: raw.tahakkuklar ?? [],
    tahsilatlar: raw.tahsilatlar ?? [],
    banka: raw.banka ?? {},
    musteri: raw.musteri ?? [],
    edefter: raw.edefter ?? {},
    parts: raw.parts ?? {},

    // panel keyleri - modül eşleşmeleri:
    compliance: raw.modul_tax_compliance ?? {},
    smiyb: raw.modul_smiyb ?? {},
    matrix13: raw.modul_matrix13 ?? {},
    anomaly: raw.modul_anomaly ?? {},
    fmea: raw.modul_fmea ?? {},
    bank: raw.modul_bank_reconciliation ?? {},
    counterparty: raw.modul_counterparty ?? {},
    fivewhy: raw.modul_5why ?? {},
    benford: raw.modul_benford_outlier ?? {},
    mizan_panel: raw.modul_mizan_panel ?? {},
    capa: raw.modul_capa_8d ?? {},
    fishbone: raw.modul_fishbone ?? {},
    fraud: raw.modul_fraud_network ?? {},
    edefter_panel: raw.modul_edefter_panel ?? {},
    bowtie: raw.modul_cosobowtie ?? {},
    // birkaç ek panel olması durumunda ekleyebilirsin
  };
}