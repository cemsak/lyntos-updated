"""
GİB Public Veri API Endpoints

KURGAN senaryoları için gerçek veri kaynakları:
- GİB VUK Md.5 Borçlu Listesi
- e-Fatura Kayıtlı Mükellefler
- GİB Sektör İstatistikleri
- MERSIS Tekil Sorgulama

⚠️ HARDCODED/MOCK/DEMO YASAK - SADECE GERÇEK VERİ
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
from pydantic import BaseModel
import logging
from middleware.auth import verify_token

# Servisler
try:
    from services.gib_risk_service import GibRiskService
    GIB_SERVICE_AVAILABLE = True
except ImportError:
    GIB_SERVICE_AVAILABLE = False

try:
    from services.gib_borclu_listesi import get_borclu_servisi
    BORCLU_SERVISI_MEVCUT = True
except ImportError:
    BORCLU_SERVISI_MEVCUT = False

try:
    from services.efatura_kayitli_sorgulama import get_efatura_servisi
    EFATURA_SERVISI_MEVCUT = True
except ImportError:
    EFATURA_SERVISI_MEVCUT = False

try:
    from services.gib_sektor_istatistik import get_sektor_servisi
    SEKTOR_SERVISI_MEVCUT = True
except ImportError:
    SEKTOR_SERVISI_MEVCUT = False

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gib", tags=["GİB Public Data"], dependencies=[Depends(verify_token)])


# ═══════════════════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════════════════════

class VknSorguRequest(BaseModel):
    vkn: str


class TopluVknSorguRequest(BaseModel):
    vkn_listesi: List[str]


class SektorKarsilastirmaRequest(BaseModel):
    nace_kodu: str
    mukellef_vergi_yuku: float
    mukellef_kar_marji: float


# ═══════════════════════════════════════════════════════════════════════════
# VERİ KAYNAĞI DURUMU
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/veri-kaynaklari")
async def get_veri_kaynaklari():
    """
    Tüm GİB veri kaynaklarının durumunu döndür

    Returns:
        Her veri kaynağının aktif/pasif durumu ve güvenilirlik skoru
    """
    if not GIB_SERVICE_AVAILABLE:
        return {
            "durum": "HATA",
            "mesaj": "GİB Risk Servisi yüklenemedi",
            "kaynaklar": {}
        }

    service = GibRiskService()
    return {
        "durum": "OK",
        "kaynaklar": service.get_veri_kaynagi_durumu()
    }


# ═══════════════════════════════════════════════════════════════════════════
# BORÇLU LİSTESİ SORGULAMA
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/borclu-sorgula")
async def sorgula_borclu(vkn: str = Query(..., min_length=10, max_length=11)):
    """
    VKN ile GİB VUK Md.5 borçlu listesini sorgula

    Args:
        vkn: Vergi kimlik numarası (10-11 hane)

    Returns:
        Borçlu mu, borç tutarı, kaynak bilgisi
    """
    if not BORCLU_SERVISI_MEVCUT:
        raise HTTPException(status_code=503, detail="Borçlu listesi servisi mevcut değil")

    servisi = get_borclu_servisi()
    sonuc = servisi.sorgula_vkn(vkn)

    return {
        "vkn": sonuc.vkn,
        "borclu_mu": sonuc.borclu_mu,
        "borc_tutari": sonuc.mukellef.borc_tutari if sonuc.mukellef else None,
        "unvan": sonuc.mukellef.unvan if sonuc.mukellef else None,
        "liste_tarihi": sonuc.mukellef.liste_tarihi if sonuc.mukellef else None,
        "kaynak": sonuc.kaynak,
        "sorgulama_tarihi": sonuc.sorgulama_tarihi,
        "guvenilirlik": 1.0  # GİB resmi kaynak
    }


@router.post("/borclu-sorgula-toplu")
async def sorgula_borclu_toplu(request: TopluVknSorguRequest):
    """
    Toplu VKN sorgulaması (tedarikçi listesi için)

    Args:
        vkn_listesi: VKN listesi (max 100)

    Returns:
        Her VKN için borçlu durumu
    """
    if not BORCLU_SERVISI_MEVCUT:
        raise HTTPException(status_code=503, detail="Borçlu listesi servisi mevcut değil")

    if len(request.vkn_listesi) > 100:
        raise HTTPException(status_code=400, detail="Maksimum 100 VKN sorgulanabilir")

    servisi = get_borclu_servisi()
    sonuclar = servisi.sorgula_toplu(request.vkn_listesi)

    return {
        "toplam": len(request.vkn_listesi),
        "borclu_sayisi": sum(1 for s in sonuclar.values() if s.borclu_mu),
        "sonuclar": {
            vkn: {
                "borclu_mu": s.borclu_mu,
                "borc_tutari": s.mukellef.borc_tutari if s.mukellef else None,
                "unvan": s.mukellef.unvan if s.mukellef else None
            }
            for vkn, s in sonuclar.items()
        },
        "kaynak": "GIB_VUK_MD5"
    }


@router.get("/borclu-istatistik")
async def get_borclu_istatistik():
    """
    Borçlu listesi veritabanı istatistikleri

    Returns:
        Toplam mükellef sayısı, toplam borç, son güncelleme
    """
    if not BORCLU_SERVISI_MEVCUT:
        raise HTTPException(status_code=503, detail="Borçlu listesi servisi mevcut değil")

    servisi = get_borclu_servisi()
    return servisi.istatistikler()


# ═══════════════════════════════════════════════════════════════════════════
# E-FATURA KAYITLI SORGULAMA
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/efatura-sorgula")
async def sorgula_efatura(vkn: str = Query(..., min_length=10, max_length=11)):
    """
    VKN ile e-Fatura kayıtlı mükellef sorgulaması

    Args:
        vkn: Vergi kimlik numarası

    Returns:
        e-Fatura'da kayıtlı mı, kayıt tarihi, unvan
    """
    if not EFATURA_SERVISI_MEVCUT:
        raise HTTPException(status_code=503, detail="e-Fatura servisi mevcut değil")

    servisi = get_efatura_servisi()
    sonuc = servisi.sorgula_vkn(vkn)

    return {
        "vkn": sonuc.vkn,
        "kayitli_mi": sonuc.kayitli_mi,
        "unvan": sonuc.mukellef.unvan if sonuc.mukellef else None,
        "kayit_tarihi": sonuc.mukellef.kayit_tarihi if sonuc.mukellef else None,
        "kaynak": sonuc.kaynak,
        "sorgulama_tarihi": sonuc.sorgulama_tarihi
    }


@router.get("/efatura-zorunluluk")
async def kontrol_efatura_zorunluluk(brut_satis: float = Query(..., gt=0)):
    """
    e-Fatura zorunluluğu kontrolü

    Args:
        brut_satis: Brüt satış hasılatı (TL)

    Returns:
        e-Fatura zorunlu mu, açıklama
    """
    if not EFATURA_SERVISI_MEVCUT:
        raise HTTPException(status_code=503, detail="e-Fatura servisi mevcut değil")

    servisi = get_efatura_servisi()
    return servisi.kontrol_zorunluluk(brut_satis)


# ═══════════════════════════════════════════════════════════════════════════
# SEKTÖR İSTATİSTİKLERİ
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/sektor-istatistik")
async def get_sektor_istatistik(nace_kodu: str = Query(..., min_length=2, max_length=6)):
    """
    NACE koduna göre sektör istatistiği

    Args:
        nace_kodu: NACE faaliyet kodu (2-6 hane)

    Returns:
        Sektör vergi yükü, kar marjı, mükellef sayısı
    """
    if not SEKTOR_SERVISI_MEVCUT:
        raise HTTPException(status_code=503, detail="Sektör istatistik servisi mevcut değil")

    servisi = get_sektor_servisi()
    istatistik = servisi.get_sektor_istatistik(nace_kodu)

    if not istatistik:
        return {
            "nace_kodu": nace_kodu,
            "bulunamadi": True,
            "mesaj": "Bu NACE kodu için istatistik bulunamadı"
        }

    return {
        "nace_kodu": istatistik.nace_kodu,
        "nace_adi": istatistik.nace_adi,
        "yil": istatistik.yil,
        "mukellef_sayisi": istatistik.mukellef_sayisi,
        "vergi_yuku_orani": istatistik.vergi_yuku_orani,
        "kar_marji": istatistik.kar_marji_tahmini,
        "ortalama_matrah": istatistik.ortalama_matrah,
        "kaynak": istatistik.kaynak
    }


@router.post("/sektor-karsilastir")
async def karsilastir_sektor(request: SektorKarsilastirmaRequest):
    """
    Mükellef değerlerini sektör ortalaması ile karşılaştır

    Args:
        nace_kodu: NACE faaliyet kodu
        mukellef_vergi_yuku: Mükellef vergi yükü oranı
        mukellef_kar_marji: Mükellef kar marjı oranı

    Returns:
        Karşılaştırma sonucu ve VDK risk değerlendirmesi
    """
    if not SEKTOR_SERVISI_MEVCUT:
        raise HTTPException(status_code=503, detail="Sektör istatistik servisi mevcut değil")

    servisi = get_sektor_servisi()
    return servisi.karsilastir_mukellef(
        request.nace_kodu,
        request.mukellef_vergi_yuku,
        request.mukellef_kar_marji
    )


@router.get("/sektor-listesi")
async def get_sektor_listesi(yil: Optional[int] = None):
    """
    Tüm sektör istatistiklerini listele

    Args:
        yil: İstenen yıl (opsiyonel)

    Returns:
        Sektör listesi
    """
    if not SEKTOR_SERVISI_MEVCUT:
        raise HTTPException(status_code=503, detail="Sektör istatistik servisi mevcut değil")

    servisi = get_sektor_servisi()
    sektorler = servisi.tum_sektorler(yil)

    return {
        "toplam": len(sektorler),
        "yil": yil,
        "sektorler": [
            {
                "nace_kodu": s.nace_kodu,
                "nace_adi": s.nace_adi,
                "vergi_yuku_orani": s.vergi_yuku_orani,
                "kar_marji": s.kar_marji_tahmini,
                "mukellef_sayisi": s.mukellef_sayisi
            }
            for s in sektorler
        ]
    }


# ═══════════════════════════════════════════════════════════════════════════
# RİSK ANALİZİ (KURGAN)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/tedarikci-risk-analizi")
async def analiz_tedarikci_riski(request: TopluVknSorguRequest):
    """
    KURGAN KRG-01 ve KRG-02 için tedarikçi risk analizi

    Args:
        vkn_listesi: Tedarikçi VKN listesi

    Returns:
        Risk analizi sonucu
    """
    if not GIB_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="GİB Risk Servisi mevcut değil")

    service = GibRiskService()
    return service.analiz_tedarikci_riski(request.vkn_listesi)


# ═══════════════════════════════════════════════════════════════════════════
# VERİ GÜNCELLEME
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/guncelle")
async def guncelle_tum_veriler():
    """
    Tüm GİB veri kaynaklarını güncelle (arka plan işlemi)

    Returns:
        Güncelleme durumu
    """
    if not GIB_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="GİB Risk Servisi mevcut değil")

    service = GibRiskService()

    try:
        sonuc = await service.guncelle_tum_listeler()
        return {
            "durum": "OK",
            "guncelleme_sonuclari": sonuc
        }
    except Exception as e:
        logger.error(f"Veri güncelleme hatası: {e}")
        raise HTTPException(status_code=500, detail=str(e))
