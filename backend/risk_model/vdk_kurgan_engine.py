"""
LYNTOS VDK KURGAN + RAM Rule Engine
Executes 25 official VDK criteria from YAML rule cards

This is SEPARATE from v1_rule_engine.py to avoid conflicts.
"""

import os
import yaml
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class Severity(Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RuleCategory(Enum):
    KURGAN = "KURGAN"
    RAM = "RAM"


@dataclass
class RuleResult:
    """Result of a single rule evaluation"""
    rule_id: str
    name_tr: str
    status: str  # 'pass', 'fail', 'warning', 'pending'
    severity: str
    score: float
    detail_tr: str
    recommendation_tr: str = ""
    evidence: Dict[str, Any] = field(default_factory=dict)
    legal_refs: List[str] = field(default_factory=list)


@dataclass
class VdkAssessment:
    """Complete VDK risk assessment"""
    vkn: str
    period: str
    assessed_at: datetime
    criteria: List[RuleResult]
    total_score: float
    max_score: float
    risk_level: str
    summary_tr: str


class VdkKurganEngine:
    """
    VDK KURGAN + RAM Rule Engine
    Loads rules from YAML and executes against taxpayer data
    """

    def __init__(self, registry_path: str = None):
        if registry_path is None:
            registry_path = Path(__file__).parent.parent / "rules" / "registry" / "vdk"
        self.registry_path = Path(registry_path)
        self.rules: Dict[str, Dict] = {}
        self._load_rules()

    def _load_rules(self) -> None:
        """Load all YAML rule cards from vdk/ directory"""
        if not self.registry_path.exists():
            print(f"Warning: VDK registry path does not exist: {self.registry_path}")
            return

        for yaml_file in self.registry_path.glob("*.yaml"):
            try:
                with open(yaml_file, 'r', encoding='utf-8') as f:
                    rule = yaml.safe_load(f)
                    if rule and 'rule_id' in rule:
                        self.rules[rule['rule_id']] = rule
            except Exception as e:
                print(f"Error loading {yaml_file}: {e}")

        print(f"Loaded {len(self.rules)} VDK rules")

    def get_rule(self, rule_id: str) -> Optional[Dict]:
        """Get a specific rule by ID"""
        return self.rules.get(rule_id)

    def get_all_rules(self) -> List[Dict]:
        """Get all loaded rules"""
        return list(self.rules.values())

    def get_kurgan_rules(self) -> List[Dict]:
        """Get only KURGAN rules (K-01 to K-13)"""
        return [r for r in self.rules.values() if r.get('category') == 'KURGAN']

    def get_ram_rules(self) -> List[Dict]:
        """Get only RAM rules (RAM-01 to RAM-12)"""
        return [r for r in self.rules.values() if r.get('category') == 'RAM']

    def evaluate_rule(self, rule_id: str, data: Dict[str, Any]) -> RuleResult:
        """Evaluate a single rule against provided data"""
        rule = self.get_rule(rule_id)
        if not rule:
            return RuleResult(
                rule_id=rule_id,
                name_tr="Bilinmeyen Kural",
                status="pending",
                severity="LOW",
                score=0,
                detail_tr=f"Kural bulunamadi: {rule_id}"
            )

        # Check required inputs
        missing_inputs = []
        for inp in rule.get('inputs', []):
            if inp.get('required', False) and inp['name'] not in data:
                missing_inputs.append(inp['name'])

        if missing_inputs:
            return RuleResult(
                rule_id=rule_id,
                name_tr=rule.get('name_tr', rule.get('name', '')),
                status="pending",
                severity=rule.get('severity', 'MEDIUM'),
                score=0,
                detail_tr=f"Eksik veri: {', '.join(missing_inputs)}",
                legal_refs=rule.get('legal_basis_refs', [])
            )

        # Execute algorithm (simplified evaluation)
        result = self._execute_algorithm(rule, data)

        return RuleResult(
            rule_id=rule_id,
            name_tr=rule.get('name_tr', rule.get('name', '')),
            status=result.get('status', 'pending'),
            severity=rule.get('severity', 'MEDIUM'),
            score=result.get('score', 0),
            detail_tr=result.get('detail_tr', ''),
            recommendation_tr=result.get('recommendation', ''),
            evidence=result.get('evidence', {}),
            legal_refs=rule.get('legal_basis_refs', [])
        )

    def _execute_algorithm(self, rule: Dict, data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute rule algorithm with provided data"""
        rule_id = rule['rule_id']
        thresholds = rule.get('thresholds', {})

        # Route to specific handlers based on rule ID
        handlers = {
            'K-01': self._check_k01_vtr,
            'K-03': self._check_k03_oran,
            'K-04': self._check_k04_iliskili,
            'K-05': self._check_k05_karlilik,
            'K-06': self._check_k06_coklu,
            'K-09': self._check_k09_odeme,
            'K-11': self._check_k11_gecmis,
            'RAM-01': self._check_ram01_sektor,
            'RAM-02': self._check_ram02_gider,
            'RAM-04': self._check_ram04_ortulu_kazanc,
            'RAM-05': self._check_ram05_ortulu_sermaye,
            'RAM-07': self._check_ram07_babs,
            'RAM-10': self._check_ram10_davranis,
            'RAM-11': self._check_ram11_rasyo,
            'RAM-12': self._check_ram12_banka,
        }

        handler = handlers.get(rule_id)
        if handler:
            return handler(data, thresholds)

        # Default: pending for unimplemented rules
        return {
            'status': 'pending',
            'score': 0,
            'detail_tr': 'Bu kural henuz tam olarak implement edilmedi.',
            'evidence': {}
        }

    # --- KURGAN Rule Handlers ---

    def _check_k01_vtr(self, data: Dict, thresholds: Dict) -> Dict:
        vtr = data.get('vtr_tespiti_var', False)
        if vtr:
            return {
                'status': 'fail',
                'score': 25,
                'detail_tr': 'VTR\'de sahte belgenin bilerek kullanildigina dair tespit mevcut.',
                'recommendation': 'VTR raporu detayli incelenmeli, hukuki savunma hazirlanmali.',
                'evidence': {'vtr_tespiti_var': True}
            }
        return {
            'status': 'pass',
            'score': 0,
            'detail_tr': 'VTR\'de olumsuz tespit bulunmuyor.',
            'evidence': {'vtr_tespiti_var': False}
        }

    def _check_k03_oran(self, data: Dict, thresholds: Dict) -> Dict:
        devreden_kdv = data.get('devreden_kdv', 0)
        gelir = data.get('gelir_beyan', 0)
        limit = thresholds.get('devreden_kdv_oran_limit', 0.05)

        if gelir > 0:
            oran = devreden_kdv / gelir
            if oran > limit:
                return {
                    'status': 'fail',
                    'score': 20,
                    'detail_tr': f'Devreden KDV orani anormal: %{oran*100:.1f}',
                    'recommendation': 'KDV beyannameleri detayli incelenmeli.',
                    'evidence': {'devreden_kdv_orani': oran}
                }
            return {
                'status': 'pass',
                'score': 0,
                'detail_tr': 'KDV oranlari normal seviyede.',
                'evidence': {'devreden_kdv_orani': oran}
            }
        return {
            'status': 'pending',
            'score': 0,
            'detail_tr': 'Oran analizi yapilamadi - gelir verisi eksik.',
            'evidence': {}
        }

    def _check_k04_iliskili(self, data: Dict, thresholds: Dict) -> Dict:
        iliskili = data.get('iliskili_kisi_var', False)
        if iliskili:
            return {
                'status': 'fail',
                'score': 20,
                'detail_tr': 'Sahte belge duzenleyicisi ile iliskili kisi bagi tespit edildi.',
                'recommendation': 'Transfer fiyatlandirmasi raporu hazirlanmali.',
                'evidence': {'iliskili_kisi_var': True}
            }
        return {
            'status': 'pass',
            'score': 0,
            'detail_tr': 'Iliskili kisi bagi tespit edilmedi.',
            'evidence': {'iliskili_kisi_var': False}
        }

    def _check_k05_karlilik(self, data: Dict, thresholds: Dict) -> Dict:
        zarar_yili = data.get('ardisik_zarar_yili', 0)
        devreden_kdv = data.get('devreden_kdv', 0)
        gelir = data.get('gelir_beyan', 0)

        score = 0
        triggers = []

        if zarar_yili >= 2:
            triggers.append(f'{zarar_yili} yil ardisik zarar')
            score += 15

        if gelir > 0 and devreden_kdv / gelir > 0.05:
            triggers.append('Yuksek devreden KDV')
            score += 10

        if score > 0:
            return {
                'status': 'fail',
                'score': score,
                'detail_tr': f'Karlilik/vergi uyumsuzlugu: {", ".join(triggers)}',
                'recommendation': 'Zarar sebepleri belgelenmeli, is plani sunulmali.',
                'evidence': {'triggers': triggers}
            }
        return {
            'status': 'pass',
            'score': 0,
            'detail_tr': 'Karlilik ve vergi beyani normal.',
            'evidence': {}
        }

    def _check_k06_coklu(self, data: Dict, thresholds: Dict) -> Dict:
        sayisi = data.get('sahte_belge_duzenleyici_sayisi', 0)
        if sayisi > 1:
            return {
                'status': 'fail',
                'score': 30,
                'detail_tr': f'{sayisi} farkli duzenleyiciden sahte belge alinmis.',
                'recommendation': 'Acil hukuki danismanlik alinmali.',
                'evidence': {'duzenleyici_sayisi': sayisi}
            }
        elif sayisi == 1:
            return {
                'status': 'warning',
                'score': 15,
                'detail_tr': '1 duzenleyiciden sahte belge tespiti.',
                'evidence': {'duzenleyici_sayisi': sayisi}
            }
        return {
            'status': 'pass',
            'score': 0,
            'detail_tr': 'Sahte belge duzenleyicisi tespit edilmedi.',
            'evidence': {'duzenleyici_sayisi': 0}
        }

    def _check_k09_odeme(self, data: Dict, thresholds: Dict) -> Dict:
        kasa = data.get('kasa_bakiye', 0)
        aktif = data.get('aktif_toplam', 0)
        limit = thresholds.get('kasa_aktif_oran_limit', 0.15)

        if aktif > 0:
            oran = kasa / aktif
            if oran > limit:
                return {
                    'status': 'fail',
                    'score': 15,
                    'detail_tr': f'Yuksek kasa bakiyesi: %{oran*100:.1f} (Aktif icinde)',
                    'recommendation': 'Kasa hareketleri detayli incelenmeli.',
                    'evidence': {'kasa_orani': oran}
                }
            return {
                'status': 'pass',
                'score': 0,
                'detail_tr': 'Kasa bakiyesi normal seviyede.',
                'evidence': {'kasa_orani': oran}
            }
        return {
            'status': 'pending',
            'score': 0,
            'detail_tr': 'Odeme analizi yapilamadi - mizan verisi eksik.',
            'evidence': {}
        }

    def _check_k11_gecmis(self, data: Dict, thresholds: Dict) -> Dict:
        sbk = data.get('sbk_raporu_var', False)
        inceleme = data.get('gecmis_inceleme_sayisi', 0)

        if sbk or inceleme > 0:
            return {
                'status': 'fail',
                'score': 20,
                'detail_tr': f'Gecmis inceleme/SBK raporu mevcut ({inceleme} adet)',
                'recommendation': 'Onceki inceleme sonuclari degerlendirilerek uyum saglanmali.',
                'evidence': {'sbk_raporu_var': sbk, 'inceleme_sayisi': inceleme}
            }
        return {
            'status': 'pass',
            'score': 0,
            'detail_tr': 'Gecmis inceleme kaydi bulunmuyor.',
            'evidence': {}
        }

    # --- RAM Rule Handlers ---

    def _check_ram01_sektor(self, data: Dict, thresholds: Dict) -> Dict:
        marj = data.get('brut_kar_marji', 0)
        avg = data.get('sektor_kar_marji_avg', 0)
        limit = thresholds.get('sapma_limit', 0.20)

        if avg > 0 and marj > 0:
            sapma = abs(marj - avg) / avg
            if sapma > limit:
                return {
                    'status': 'fail',
                    'score': 15,
                    'detail_tr': f'Sektor ortalamasindan %{sapma*100:.1f} sapma tespit edildi.',
                    'recommendation': 'Sektor ortalamasindan sapma nedenleri aciklanmali.',
                    'evidence': {'sapma_orani': sapma}
                }
            return {
                'status': 'pass',
                'score': 0,
                'detail_tr': 'Karlilik orani sektor ortalamasina yakin.',
                'evidence': {'sapma_orani': sapma}
            }
        return {
            'status': 'pending',
            'score': 0,
            'detail_tr': 'Sektor karsilastirmasi yapilamadi - sektor verisi eksik.',
            'evidence': {}
        }

    def _check_ram02_gider(self, data: Dict, thresholds: Dict) -> Dict:
        gider = data.get('faaliyet_giderleri', 0)
        satis = data.get('net_satislar', 0)
        limit = thresholds.get('gider_oran_limit', 0.30)

        if satis > 0:
            oran = gider / satis
            if oran > limit:
                return {
                    'status': 'fail',
                    'score': 15,
                    'detail_tr': f'Yuksek gider orani: %{oran*100:.1f}',
                    'recommendation': 'Gider kalemleri detayli belgelenmeli.',
                    'evidence': {'gider_orani': oran}
                }
            return {
                'status': 'pass',
                'score': 0,
                'detail_tr': 'Gider orani normal seviyede.',
                'evidence': {'gider_orani': oran}
            }
        return {
            'status': 'pending',
            'score': 0,
            'detail_tr': 'Gider analizi yapilamadi - satis verisi eksik.',
            'evidence': {}
        }

    def _check_ram04_ortulu_kazanc(self, data: Dict, thresholds: Dict) -> Dict:
        alacak = data.get('ortaklardan_alacak', 0)
        ozsermaye = data.get('ozsermaye', 0)
        limit = thresholds.get('ortaklar_alacak_limit', 0.25)

        if ozsermaye > 0:
            oran = alacak / ozsermaye
            if oran > limit:
                return {
                    'status': 'fail',
                    'score': 20,
                    'detail_tr': f'Yuksek ortaklardan alacak: Ozsermayenin %{oran*100:.1f}\'i',
                    'recommendation': 'Transfer fiyatlandirmasi raporu hazirlanmali.',
                    'evidence': {'ortaklar_alacak_orani': oran}
                }
            return {
                'status': 'pass',
                'score': 0,
                'detail_tr': 'Ortaklardan alacak normal seviyede.',
                'evidence': {'ortaklar_alacak_orani': oran}
            }
        return {
            'status': 'pending',
            'score': 0,
            'detail_tr': 'Ortulu kazanc analizi yapilamadi - ozsermaye verisi eksik.',
            'evidence': {}
        }

    def _check_ram05_ortulu_sermaye(self, data: Dict, thresholds: Dict) -> Dict:
        borc = data.get('ortaklara_borc', 0)
        ozsermaye = data.get('ozsermaye', 0)
        limit = thresholds.get('ortaklara_borc_limit', 0.30)

        if ozsermaye > 0:
            oran = borc / ozsermaye
            if oran > limit:
                return {
                    'status': 'fail',
                    'score': 10,
                    'detail_tr': f'Yuksek ortaklara borc: Ozsermayenin %{oran*100:.1f}\'i',
                    'recommendation': 'Ortulu sermaye degerlendirmesi yapilmali.',
                    'evidence': {'ortaklara_borc_orani': oran}
                }
            return {
                'status': 'pass',
                'score': 0,
                'detail_tr': 'Ortaklara borc normal seviyede.',
                'evidence': {'ortaklara_borc_orani': oran}
            }
        return {
            'status': 'pending',
            'score': 0,
            'detail_tr': 'Ortulu sermaye analizi yapilamadi - ozsermaye verisi eksik.',
            'evidence': {}
        }

    def _check_ram07_babs(self, data: Dict, thresholds: Dict) -> Dict:
        ba = data.get('ba_toplam', 0)
        bs = data.get('bs_toplam', 0)
        limit = thresholds.get('ba_bs_fark_limit', 10000)

        fark = abs(ba - bs)
        if fark > limit:
            return {
                'status': 'fail',
                'score': 15,
                'detail_tr': f'Ba-Bs tutarsizligi: {fark:,.0f} TL fark',
                'recommendation': 'Ba-Bs bildirimleri kontrol edilmeli, duzeltme yapilmali.',
                'evidence': {'ba_bs_fark': fark}
            }
        return {
            'status': 'pass',
            'score': 0,
            'detail_tr': 'Ba-Bs bildirimleri tutarli.',
            'evidence': {'ba_bs_fark': fark}
        }

    def _check_ram10_davranis(self, data: Dict, thresholds: Dict) -> Dict:
        ceza = data.get('gecmis_ceza_sayisi', 0)
        inceleme = data.get('gecmis_inceleme_sayisi', 0)

        if ceza > 0 or inceleme > 1:
            return {
                'status': 'fail',
                'score': 15,
                'detail_tr': f'Gecmis ceza/inceleme kaydi: {ceza} ceza, {inceleme} inceleme',
                'recommendation': 'Gecmis sorunlarin tekrari onlenmeli.',
                'evidence': {'ceza_sayisi': ceza, 'inceleme_sayisi': inceleme}
            }
        return {
            'status': 'pass',
            'score': 0,
            'detail_tr': 'Gecmis olumsuz kayit bulunmuyor.',
            'evidence': {}
        }

    def _check_ram11_rasyo(self, data: Dict, thresholds: Dict) -> Dict:
        cari = data.get('cari_oran', 0)
        min_limit = thresholds.get('cari_oran_min', 0.5)
        max_limit = thresholds.get('cari_oran_max', 5.0)

        triggers = []
        score = 0

        if cari > 0:
            if cari < min_limit:
                triggers.append(f'Dusuk cari oran: {cari:.2f}')
                score += 5
            elif cari > max_limit:
                triggers.append(f'Anormal yuksek cari oran: {cari:.2f}')
                score += 5

        if triggers:
            return {
                'status': 'fail',
                'score': score,
                'detail_tr': f'Rasyo uyarilari: {", ".join(triggers)}',
                'recommendation': 'Finansal yapi guclendirilmeli.',
                'evidence': {'cari_oran': cari, 'triggers': triggers}
            }
        return {
            'status': 'pass',
            'score': 0,
            'detail_tr': 'Finansal rasyolar normal aralikta.',
            'evidence': {'cari_oran': cari}
        }

    def _check_ram12_banka(self, data: Dict, thresholds: Dict) -> Dict:
        bilanco = data.get('banka_bilanco', 0)
        fiili = data.get('banka_fiili', 0)
        limit = thresholds.get('banka_fark_limit', 50000)

        fark = abs(bilanco - fiili)
        if fark > limit:
            return {
                'status': 'fail',
                'score': 30,
                'detail_tr': f'KRITIK: Banka bakiyesi uyumsuzlugu {fark:,.0f} TL',
                'recommendation': 'ACIL: Banka mutabakati yapilmali.',
                'evidence': {'banka_fark': fark}
            }
        return {
            'status': 'pass',
            'score': 0,
            'detail_tr': 'Banka bakiyeleri tutarli.',
            'evidence': {'banka_fark': fark}
        }

    def evaluate_all(self, data: Dict[str, Any], vkn: str = "UNKNOWN", period: str = "UNKNOWN") -> VdkAssessment:
        """Evaluate all 25 rules and return comprehensive assessment"""
        criteria: List[RuleResult] = []
        total_score = 0
        max_score = 0

        for rule_id in sorted(self.rules.keys()):
            result = self.evaluate_rule(rule_id, data)
            criteria.append(result)
            total_score += result.score

            # Calculate max possible score
            rule = self.rules[rule_id]
            outputs = rule.get('outputs', [])
            for out in outputs:
                if out.get('name') == 'score' and 'range' in out:
                    max_score += out['range'][1]

        # Determine risk level
        if total_score >= 70:
            risk_level = "CRITICAL"
        elif total_score >= 50:
            risk_level = "HIGH"
        elif total_score >= 25:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        # Generate summary
        fail_count = sum(1 for c in criteria if c.status == 'fail')
        warning_count = sum(1 for c in criteria if c.status == 'warning')
        pending_count = sum(1 for c in criteria if c.status == 'pending')

        summary_tr = f"{len(criteria)} kriter degerlendirildi. "
        summary_tr += f"{fail_count} risk, {warning_count} uyari, {pending_count} beklemede."

        return VdkAssessment(
            vkn=vkn,
            period=period,
            assessed_at=datetime.now(),
            criteria=criteria,
            total_score=total_score,
            max_score=max_score,
            risk_level=risk_level,
            summary_tr=summary_tr
        )

    def to_dict(self, assessment: VdkAssessment) -> Dict[str, Any]:
        """Convert assessment to dictionary for JSON serialization"""
        return {
            'vkn': assessment.vkn,
            'period': assessment.period,
            'assessed_at': assessment.assessed_at.isoformat(),
            'criteria': [
                {
                    'id': c.rule_id,
                    'code': c.rule_id,
                    'name_tr': c.name_tr,
                    'status': c.status,
                    'severity': c.severity,
                    'score': c.score,
                    'detail_tr': c.detail_tr,
                    'recommendation_tr': c.recommendation_tr,
                    'evidence': c.evidence,
                    'legal_refs': c.legal_refs
                }
                for c in assessment.criteria
            ],
            'total_score': assessment.total_score,
            'max_score': assessment.max_score,
            'risk_level': assessment.risk_level,
            'summary_tr': assessment.summary_tr
        }


# Singleton instance
_engine_instance = None

def get_vdk_engine() -> VdkKurganEngine:
    """Get or create the VDK engine singleton"""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = VdkKurganEngine()
    return _engine_instance


# CLI for testing
if __name__ == "__main__":
    import json

    engine = get_vdk_engine()
    print(f"Loaded {len(engine.rules)} VDK rules")
    print(f"KURGAN: {len(engine.get_kurgan_rules())}")
    print(f"RAM: {len(engine.get_ram_rules())}")

    # Test with sample data
    test_data = {
        'vtr_tespiti_var': False,
        'iliskili_kisi_var': False,
        'ardisik_zarar_yili': 0,
        'devreden_kdv': 30000,
        'gelir_beyan': 1000000,
        'kasa_bakiye': 50000,
        'aktif_toplam': 1000000,
        'ortaklardan_alacak': 100000,
        'ortaklara_borc': 150000,
        'ozsermaye': 800000,
        'ba_toplam': 500000,
        'bs_toplam': 495000,
        'banka_bilanco': 300000,
        'banka_fiili': 290000,
        'cari_oran': 1.5,
    }

    assessment = engine.evaluate_all(test_data, vkn="1234567890", period="2025-Q1")
    print("\n" + json.dumps(engine.to_dict(assessment), indent=2, ensure_ascii=False))
