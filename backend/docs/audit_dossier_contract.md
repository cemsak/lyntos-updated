# Lyntos Audit Dossier Contract (VDK-AUDITDOSSIER/1.0)

Bu doküman, frontend’in güveneceği `audit_dossier` sözleşmesini tanımlar.

## Konum
`metrics.rules.risks[*].evidence_details.audit_dossier`

## Zorunlu alanlar (top-level)
- version (string) — örn. `VDK-AUDITDOSSIER/1.0`
- period (string) — örn. `2025-Q2`
- risk_code (string) — örn. `R-501`
- title (string)
- severity (string) — LOW/MEDIUM/HIGH/CRITICAL
- headline (string)

## Delil paketi (preferred)
`audit_dossier.evidence_pack` dict olmalı ve şunları içermeli:
- worst_month (string) — örn. `2025-04`
- samples_counts (dict) — `{sales:int, kdv:int}`
- month_table (list[dict]) — her satırda:
  - month (string)
  - kdv_matrah (number)
  - edefter_net_sales (number)
  - delta_net_minus_kdv (number)
  - ratio_net_over_kdv (number)

## Opsiyonel
- reconciliation_plan (list[string])

## Geriye uyumluluk
Eğer `evidence_pack` yoksa, `samples_counts/worst_month/month_table` alanları doğrudan `audit_dossier` içinde bulunabilir.
