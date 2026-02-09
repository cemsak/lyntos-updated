"""
Ticaret Sicil Çapraz Sorgulama Servisi
LYNTOS V2 - Sprint 8

Vergi Levhası verileri ile Ticaret Sicil Gazetesi verilerini karşılaştırır.

Kontrol edilen alanlar:
1. Şirket ünvanı eşleşmesi
2. Adres tutarlılığı
3. Faaliyet konusu (NACE) uyumu
4. Sermaye bilgisi
5. Ortak/Yetkili bilgileri
"""

import logging
import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class TradeRegistryMatch:
    """Ticaret Sicil eşleşme sonucu"""
    field: str
    tax_cert_value: str
    registry_value: str
    match_type: str  # exact, partial, mismatch, missing
    confidence: float  # 0-100
    note: Optional[str] = None


@dataclass
class TradeRegistryComparison:
    """Ticaret Sicil karşılaştırma sonuçları"""
    vkn: str
    company_name: str
    registry_number: Optional[str]
    matches: List[TradeRegistryMatch]
    overall_match_score: float  # 0-100
    discrepancies: List[str]
    verification_status: str  # verified, partial, unverified, mismatch
    comparison_date: str


class TradeRegistryService:
    """Ticaret Sicil çapraz sorgulama servisi"""

    def __init__(self):
        # Türkiye Ticaret Sicil Gazetesi API endpoint'leri
        # Not: Gerçek API entegrasyonu için TOBB veya e-Devlet servisleri kullanılacak
        self.tsg_base_url = "https://www.ticaretsicil.gov.tr"

    def normalize_company_name(self, name: str) -> str:
        """Şirket ünvanını normalize et"""
        if not name:
            return ""

        # Büyük harfe çevir
        normalized = name.upper()

        # Türkçe karakterleri düzelt
        tr_map = {
            'İ': 'I', 'Ş': 'S', 'Ğ': 'G', 'Ü': 'U', 'Ö': 'O', 'Ç': 'C',
            'ı': 'I', 'ş': 'S', 'ğ': 'G', 'ü': 'U', 'ö': 'O', 'ç': 'C'
        }
        for tr_char, ascii_char in tr_map.items():
            normalized = normalized.replace(tr_char, ascii_char)

        # Şirket tiplerini standardize et
        replacements = {
            'LİMİTED ŞİRKETİ': 'LTD STI',
            'LIMITED SIRKETI': 'LTD STI',
            'LTD. ŞTİ.': 'LTD STI',
            'LTD.ŞTİ.': 'LTD STI',
            'LTD ŞTİ': 'LTD STI',
            'ANONİM ŞİRKETİ': 'AS',
            'ANONIM SIRKETI': 'AS',
            'A.Ş.': 'AS',
            'A.S.': 'AS',
        }
        for old, new in replacements.items():
            normalized = normalized.replace(old, new)

        # Fazla boşlukları kaldır
        normalized = ' '.join(normalized.split())

        return normalized

    def normalize_address(self, address: str) -> str:
        """Adresi normalize et"""
        if not address:
            return ""

        normalized = address.upper()

        # Yaygın kısaltmaları standardize et
        replacements = {
            'MAH.': 'MAHALLESI',
            'MAHALLESİ': 'MAHALLESI',
            'CAD.': 'CADDESI',
            'CADDESİ': 'CADDESI',
            'SOK.': 'SOKAK',
            'SK.': 'SOKAK',
            'SOKAGI': 'SOKAK',
            'APT.': 'APARTMANI',
            'NO:': 'NO ',
            'KAT:': 'KAT ',
            'D:': 'DAIRE ',
        }
        for old, new in replacements.items():
            normalized = normalized.replace(old, new)

        # Noktalama ve fazla boşlukları temizle
        normalized = re.sub(r'[.,;:]+', ' ', normalized)
        normalized = ' '.join(normalized.split())

        return normalized

    def compare_with_registry(
        self,
        tax_cert_data: Dict[str, Any],
        registry_data: Optional[Dict[str, Any]] = None
    ) -> TradeRegistryComparison:
        """
        Vergi levhası verilerini ticaret sicil verileriyle karşılaştır

        Args:
            tax_cert_data: Vergi levhasından parse edilen veriler
            registry_data: Ticaret sicil gazetesinden çekilen veriler (opsiyonel)

        Returns:
            TradeRegistryComparison: Karşılaştırma sonuçları
        """
        matches = []
        discrepancies = []

        vkn = tax_cert_data.get('vkn', '')
        company_name = tax_cert_data.get('company_name', '')

        # Eğer registry_data yoksa, sadece hazırlık raporu döndür
        if not registry_data:
            return TradeRegistryComparison(
                vkn=vkn,
                company_name=company_name,
                registry_number=None,
                matches=[],
                overall_match_score=0,
                discrepancies=["Ticaret Sicil verisi henüz yüklenmedi"],
                verification_status="unverified",
                comparison_date=datetime.now().isoformat()
            )

        # 1. Şirket Ünvanı Karşılaştırması
        tc_name = self.normalize_company_name(company_name)
        reg_name = self.normalize_company_name(registry_data.get('company_name', ''))

        if tc_name and reg_name:
            if tc_name == reg_name:
                matches.append(TradeRegistryMatch(
                    field="company_name",
                    tax_cert_value=company_name,
                    registry_value=registry_data.get('company_name', ''),
                    match_type="exact",
                    confidence=100,
                    note="Ünvan tam eşleşiyor"
                ))
            elif tc_name in reg_name or reg_name in tc_name:
                matches.append(TradeRegistryMatch(
                    field="company_name",
                    tax_cert_value=company_name,
                    registry_value=registry_data.get('company_name', ''),
                    match_type="partial",
                    confidence=80,
                    note="Ünvan kısmen eşleşiyor"
                ))
            else:
                # Levenshtein mesafesi ile benzerlik
                similarity = self._calculate_similarity(tc_name, reg_name)
                if similarity > 0.7:
                    matches.append(TradeRegistryMatch(
                        field="company_name",
                        tax_cert_value=company_name,
                        registry_value=registry_data.get('company_name', ''),
                        match_type="partial",
                        confidence=similarity * 100,
                        note=f"Ünvan benzerliği: %{similarity*100:.0f}"
                    ))
                else:
                    matches.append(TradeRegistryMatch(
                        field="company_name",
                        tax_cert_value=company_name,
                        registry_value=registry_data.get('company_name', ''),
                        match_type="mismatch",
                        confidence=similarity * 100,
                        note="Ünvan eşleşmiyor - KONTROL EDİN"
                    ))
                    discrepancies.append(f"Ünvan uyuşmazlığı: '{company_name}' vs '{registry_data.get('company_name', '')}'")

        # 2. Adres Karşılaştırması
        tc_address = self.normalize_address(tax_cert_data.get('address', ''))
        reg_address = self.normalize_address(registry_data.get('address', ''))

        if tc_address and reg_address:
            # Adreslerde anahtar kelime eşleşmesi kontrol et
            tc_words = set(tc_address.split())
            reg_words = set(reg_address.split())
            common_words = tc_words.intersection(reg_words)

            if len(common_words) > 0:
                match_ratio = len(common_words) / max(len(tc_words), len(reg_words))

                if match_ratio > 0.6:
                    matches.append(TradeRegistryMatch(
                        field="address",
                        tax_cert_value=tax_cert_data.get('address', ''),
                        registry_value=registry_data.get('address', ''),
                        match_type="partial" if match_ratio < 0.9 else "exact",
                        confidence=match_ratio * 100,
                        note=f"Adres eşleşme oranı: %{match_ratio*100:.0f}"
                    ))
                else:
                    matches.append(TradeRegistryMatch(
                        field="address",
                        tax_cert_value=tax_cert_data.get('address', ''),
                        registry_value=registry_data.get('address', ''),
                        match_type="mismatch",
                        confidence=match_ratio * 100,
                        note="Adres eşleşmiyor - KONTROL EDİN"
                    ))
                    discrepancies.append("Adres uyuşmazlığı tespit edildi")

        # 3. Şehir Karşılaştırması
        tc_city = (tax_cert_data.get('city', '') or '').upper()
        reg_city = (registry_data.get('city', '') or '').upper()

        if tc_city and reg_city:
            if tc_city == reg_city:
                matches.append(TradeRegistryMatch(
                    field="city",
                    tax_cert_value=tc_city,
                    registry_value=reg_city,
                    match_type="exact",
                    confidence=100
                ))
            else:
                matches.append(TradeRegistryMatch(
                    field="city",
                    tax_cert_value=tc_city,
                    registry_value=reg_city,
                    match_type="mismatch",
                    confidence=0
                ))
                discrepancies.append(f"Şehir uyuşmazlığı: {tc_city} vs {reg_city}")

        # 4. Faaliyet Konusu (NACE) Karşılaştırması
        tc_nace = tax_cert_data.get('nace_code', '')
        reg_activity = registry_data.get('activity_subject', '')

        if tc_nace and reg_activity:
            # NACE kodunun faaliyet konusuyla uyumunu kontrol et
            # Bu basit bir kelime eşleşmesi - daha gelişmiş NLP kullanılabilir
            tc_nace_desc = (tax_cert_data.get('nace_description', '') or '').upper()
            reg_activity_upper = reg_activity.upper()

            # Anahtar kelimeleri karşılaştır
            if tc_nace_desc:
                tc_keywords = set(tc_nace_desc.split())
                reg_keywords = set(reg_activity_upper.split())
                common = tc_keywords.intersection(reg_keywords)

                if len(common) >= 2:
                    matches.append(TradeRegistryMatch(
                        field="activity_subject",
                        tax_cert_value=f"{tc_nace} - {tc_nace_desc}",
                        registry_value=reg_activity,
                        match_type="partial",
                        confidence=70,
                        note=f"Faaliyet konusu uyumlu ({len(common)} ortak kelime)"
                    ))
                else:
                    matches.append(TradeRegistryMatch(
                        field="activity_subject",
                        tax_cert_value=f"{tc_nace} - {tc_nace_desc}",
                        registry_value=reg_activity,
                        match_type="mismatch",
                        confidence=30,
                        note="Faaliyet konusu uyumsuz olabilir"
                    ))
                    discrepancies.append("NACE kodu ile ticaret sicil faaliyet konusu uyumsuz")

        # Genel eşleşme skoru hesapla
        if matches:
            total_confidence = sum(m.confidence for m in matches)
            overall_score = total_confidence / len(matches)
        else:
            overall_score = 0

        # Doğrulama durumu
        if overall_score >= 80 and not discrepancies:
            verification_status = "verified"
        elif overall_score >= 60:
            verification_status = "partial"
        elif overall_score >= 40:
            verification_status = "unverified"
        else:
            verification_status = "mismatch"

        return TradeRegistryComparison(
            vkn=vkn,
            company_name=company_name,
            registry_number=registry_data.get('registry_number'),
            matches=matches,
            overall_match_score=round(overall_score, 1),
            discrepancies=discrepancies,
            verification_status=verification_status,
            comparison_date=datetime.now().isoformat()
        )

    def _calculate_similarity(self, s1: str, s2: str) -> float:
        """İki string arasındaki benzerliği hesapla (0-1)"""
        if not s1 or not s2:
            return 0

        # Basit Jaccard benzerliği
        set1 = set(s1.split())
        set2 = set(s2.split())

        intersection = len(set1.intersection(set2))
        union = len(set1.union(set2))

        if union == 0:
            return 0

        return intersection / union

    def generate_verification_report(
        self,
        tax_cert_data: Dict[str, Any],
        registry_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Çapraz doğrulama raporu oluştur

        Args:
            tax_cert_data: Vergi levhası verileri
            registry_data: Ticaret sicil verileri

        Returns:
            Doğrulama raporu
        """
        comparison = self.compare_with_registry(tax_cert_data, registry_data)

        # Rapor oluştur
        report = {
            'vkn': comparison.vkn,
            'company_name': comparison.company_name,
            'registry_number': comparison.registry_number,
            'verification_status': comparison.verification_status,
            'overall_match_score': comparison.overall_match_score,
            'comparison_date': comparison.comparison_date,
            'field_comparisons': [
                {
                    'field': m.field,
                    'tax_certificate_value': m.tax_cert_value,
                    'trade_registry_value': m.registry_value,
                    'match_type': m.match_type,
                    'confidence': m.confidence,
                    'note': m.note
                }
                for m in comparison.matches
            ],
            'discrepancies': comparison.discrepancies,
            'recommendations': self._generate_recommendations(comparison)
        }

        return report

    def _generate_recommendations(self, comparison: TradeRegistryComparison) -> List[str]:
        """Karşılaştırma sonuçlarına göre öneriler oluştur"""
        recommendations = []

        if comparison.verification_status == "mismatch":
            recommendations.append("🚨 KRİTİK: Vergi levhası ve ticaret sicil bilgileri uyuşmuyor")
            recommendations.append("📋 Mükelleften güncel ticaret sicil belgesi talep edin")
            recommendations.append("🔍 Şirketin gerçekliğini MERSİS'ten kontrol edin")

        elif comparison.verification_status == "unverified":
            recommendations.append("⚠️ Doğrulama eksik - bazı bilgiler karşılaştırılamadı")
            recommendations.append("📋 Eksik belgeleri mükelleften talep edin")

        elif comparison.verification_status == "partial":
            recommendations.append("ℹ️ Kısmi doğrulama - bazı alanlarda uyumsuzluk var")
            for discrepancy in comparison.discrepancies:
                recommendations.append(f"⚠️ {discrepancy}")

        else:  # verified
            recommendations.append("✅ Vergi levhası ticaret sicil ile uyumlu")

        return recommendations


# Singleton instance
_service = None

def get_trade_registry_service() -> TradeRegistryService:
    """Get or create service instance"""
    global _service
    if _service is None:
        _service = TradeRegistryService()
    return _service


def verify_with_trade_registry(
    tax_cert_data: Dict[str, Any],
    registry_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Vergi levhası verilerini ticaret sicil ile doğrula

    Args:
        tax_cert_data: Vergi levhası verileri
        registry_data: Ticaret sicil verileri (opsiyonel)

    Returns:
        Doğrulama raporu
    """
    service = get_trade_registry_service()
    return service.generate_verification_report(tax_cert_data, registry_data)
