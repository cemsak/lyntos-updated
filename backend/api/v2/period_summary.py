"""
LYNTOS API v2 - Period Summary Endpoint
Q1 Özet sayfası için beyanname, tahakkuk ve diğer dönem verilerini sağlar.

NO AUTH REQUIRED - Frontend'den doğrudan erişilebilir.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.db import get_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/period-summary", tags=["period-summary"])


# ============================================================================
# RESPONSE MODELS
# ============================================================================

class KDVBeyanname(BaseModel):
    donem: str
    matrah: float
    hesaplanan_kdv: float
    indirilecek_kdv: float
    odenecek_kdv: float
    devreden_kdv: float


class MuhtasarBeyanname(BaseModel):
    donem: str
    toplam_vergi: float
    calisan_sayisi: int = 0


class GeciciVergiBeyanname(BaseModel):
    donem: str
    matrah: float
    hesaplanan_vergi: float


class TahakkukKalem(BaseModel):
    """Tahakkuk fişindeki tek bir vergi kalemi"""
    vergi_kodu: str  # 0015, 1048, 1046 vb.
    vergi_adi: str   # KDV, 5035, TDMG vb.
    matrah: float
    tahakkuk_eden: float
    mahsup_edilen: float
    odenecek: float
    vade_tarihi: Optional[str] = None
    is_ana_vergi: bool = False


class TahakkukItem(BaseModel):
    id: int  # Tahakkuk DB ID - manuel ödeme için gerekli
    beyanname_turu: str
    donem: str
    toplam_borc: float
    payment_status: Optional[str] = None  # odendi, odenmedi, gecikli_odendi, vadesi_gelmedi
    payment_date: Optional[str] = None
    payment_amount: Optional[float] = None
    vade_tarihi: Optional[str] = None
    gecikme_gun: Optional[int] = None
    gecikme_ay: Optional[int] = None
    gecikme_zammi: Optional[float] = None
    toplam_borc_faizli: Optional[float] = None
    gecikme_oran: Optional[float] = None
    kalemler: List[TahakkukKalem] = []  # Alt kalemler (0015 KDV, 1048 Damga vb.)


class OdemeOzetiResponse(BaseModel):
    """Vergi ödeme durumu özeti"""
    toplam_tahakkuk: int
    odenen: int
    gecikli_odenen: int
    odenmemis: int
    vadesi_gelmemis: int
    toplam_borc: float
    odenen_tutar: float
    kalan_borc: float
    gecikme_uyarilari: List[Dict[str, Any]]
    detaylar: List[Dict[str, Any]]


class OpeningBalanceStatus(BaseModel):
    """Açılış bakiyesi durumu"""
    has_data: bool = False
    status: str = 'missing'  # missing, pending, loaded, verified, error
    status_color: str = 'red'  # red, yellow, green
    status_text: str = 'Açılış bakiyesi yüklenmedi'
    fiscal_year: Optional[int] = None
    hesap_sayisi: int = 0
    toplam_borc: float = 0
    toplam_alacak: float = 0
    is_balanced: bool = False
    source_type: Optional[str] = None  # acilis_fisi, acilis_mizani, manual
    upload_date: Optional[str] = None


class PeriodSummaryResponse(BaseModel):
    kdv: List[KDVBeyanname]
    muhtasar: List[MuhtasarBeyanname]
    gecici_vergi: List[GeciciVergiBeyanname]
    tahakkuk: List[TahakkukItem]
    banka_islem_sayisi: int
    yevmiye_sayisi: int
    kebir_sayisi: int
    mizan_sayisi: int
    edefter_sayisi: int
    # Yeni: Açılış bakiyesi durumu (TD-002)
    opening_balance: Optional[OpeningBalanceStatus] = None


# ============================================================================
# HELPERS
# ============================================================================

def _donem_str(yil: int, ay: int) -> str:
    """Dönem string oluştur (Ocak 2025 gibi)"""
    ay_adlari = {
        1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan", 5: "Mayıs", 6: "Haziran",
        7: "Temmuz", 8: "Ağustos", 9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık"
    }
    return f"{ay_adlari.get(ay, str(ay))} {yil}"


def _parse_date_safe(date_str: Optional[str]) -> Optional['date']:
    """
    Güvenli tarih parse. Desteklenen formatlar:
    - dd/MM/yyyy (Türk formatı: 26/04/2025)
    - yyyy-MM-dd (ISO formatı: 2025-04-26)
    - dd.MM.yyyy (Türk noktalı: 26.04.2025)
    Hatalı veya boş değerde None döner, sessiz hata YASAK → log yazar.
    """
    if not date_str or not isinstance(date_str, str):
        return None
    date_str = date_str.strip()
    if not date_str:
        return None

    from datetime import date
    import re

    try:
        # dd/MM/yyyy
        if '/' in date_str:
            parts = date_str.split('/')
            if len(parts) == 3:
                return date(int(parts[2]), int(parts[1]), int(parts[0]))
        # yyyy-MM-dd
        elif re.match(r'^\d{4}-\d{2}-\d{2}', date_str):
            parts = date_str[:10].split('-')
            return date(int(parts[0]), int(parts[1]), int(parts[2]))
        # dd.MM.yyyy
        elif '.' in date_str:
            parts = date_str.split('.')
            if len(parts) == 3:
                return date(int(parts[2]), int(parts[1]), int(parts[0]))
    except (ValueError, IndexError) as e:
        logger.warning(f"Tarih parse hatası: '{date_str}' → {e}")
        return None

    logger.warning(f"Tanınmayan tarih formatı: '{date_str}'")
    return None


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/ozet", response_model=PeriodSummaryResponse)
async def get_period_summary(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Query(..., description="Dönem ID (örn: 2025-Q1)"),
    tenant_id: str = Query("default", description="Tenant ID")
):
    """
    Dönem özet verilerini getir (Q1 Özet sayfası için).

    Tüm beyanname ve tahakkuk verilerini yeni tablo yapısından çeker.
    Auth gerektirmez.
    """
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            # =================================================================
            # KDV BEYANNAMELERİ
            # =================================================================
            cursor.execute("""
                SELECT
                    donem_yil, donem_ay,
                    matrah_toplam, hesaplanan_vergi,
                    indirimler_toplam, odenecek_vergi, devreden_kdv,
                    raw_text
                FROM beyanname_entries
                WHERE client_id = ? AND period_id = ? AND beyanname_tipi = 'KDV'
                ORDER BY donem_ay
            """, (client_id, period_id))

            kdv_list = []
            for row in cursor.fetchall():
                row_dict = dict(row)
                donem = _donem_str(row_dict['donem_yil'] or 2025, row_dict['donem_ay'] or 1)

                # raw_text'ten değerler parse edelim (PDF verilerinden)
                raw = row_dict.get('raw_text', '') or ''

                # Devreden KDV'yi raw_text'ten bul
                devreden = row_dict['devreden_kdv'] or 0
                if devreden == 0 and 'Sonraki Döneme Devreden' in raw:
                    import re
                    match = re.search(r'Sonraki Döneme Devreden[^\d]*([\d.,]+)', raw)
                    if match:
                        devreden = float(match.group(1).replace('.', '').replace(',', '.'))

                # Hesaplanan KDV
                hesaplanan = row_dict['hesaplanan_vergi'] or 0
                if hesaplanan == 0 and 'Hesaplanan Katma' in raw:
                    import re
                    match = re.search(r'Hesaplanan Katma Değer Vergisi\s+([\d.,]+)', raw)
                    if match:
                        hesaplanan = float(match.group(1).replace('.', '').replace(',', '.'))

                # İndirimler toplamı
                indirimler = row_dict['indirimler_toplam'] or 0
                if indirimler == 0 and 'İndirimler Toplamı' in raw:
                    import re
                    match = re.search(r'İndirimler Toplamı\s+([\d.,]+)', raw)
                    if match:
                        indirimler = float(match.group(1).replace('.', '').replace(',', '.'))

                kdv_list.append(KDVBeyanname(
                    donem=donem,
                    matrah=row_dict['matrah_toplam'] or 0,
                    hesaplanan_kdv=hesaplanan,
                    indirilecek_kdv=indirimler,
                    odenecek_kdv=row_dict['odenecek_vergi'] or 0,
                    devreden_kdv=devreden
                ))

            # =================================================================
            # MUHTASAR BEYANNAMELERİ
            # =================================================================
            cursor.execute("""
                SELECT
                    donem_yil, donem_ay,
                    hesaplanan_vergi, raw_text
                FROM beyanname_entries
                WHERE client_id = ? AND period_id = ? AND beyanname_tipi = 'MUHTASAR'
                ORDER BY donem_ay
            """, (client_id, period_id))

            muhtasar_list = []
            for row in cursor.fetchall():
                row_dict = dict(row)
                donem = _donem_str(row_dict['donem_yil'] or 2025, row_dict['donem_ay'] or 1)

                # raw_text'ten değerleri parse et
                raw = row_dict.get('raw_text', '') or ''
                toplam_vergi = row_dict['hesaplanan_vergi'] or 0
                calisan_sayisi = 0

                if raw:
                    import re

                    # TAHAKKUKA ESAS İCMAL CETVELİ'nden "Ödenecek" değerini al
                    # Format: "Ödenecek 3.895,61"
                    if toplam_vergi == 0:
                        match = re.search(r'TAHAKKUKA ESAS.*?Ödenecek\s+([\d.,]+)', raw, re.DOTALL)
                        if match:
                            toplam_vergi = float(match.group(1).replace('.', '').replace(',', '.'))

                    # Alternatif: "Tahakkuk Eden" değeri
                    if toplam_vergi == 0:
                        match = re.search(r'Tahakkuk Eden\s+([\d.,]+)', raw)
                        if match:
                            toplam_vergi = float(match.group(1).replace('.', '').replace(',', '.'))

                    # Çalışan sayısı - "1. Ay" satırlarından sonraki ilk sayıyı al ve topla
                    # Format: "1. Ay - Asgari\n22 0 1" veya "1. Ay - Diğer\n3 0 1"
                    calisan_matches = re.findall(r'1\. Ay[^\n]*\n(\d+)', raw)
                    if calisan_matches:
                        calisan_sayisi = sum(int(m) for m in calisan_matches)

                muhtasar_list.append(MuhtasarBeyanname(
                    donem=donem,
                    toplam_vergi=toplam_vergi,
                    calisan_sayisi=calisan_sayisi
                ))

            # =================================================================
            # GEÇİCİ VERGİ BEYANNAMELERİ
            # =================================================================
            cursor.execute("""
                SELECT
                    donem_yil, donem_ay,
                    matrah_toplam, hesaplanan_vergi
                FROM beyanname_entries
                WHERE client_id = ? AND period_id = ? AND beyanname_tipi = 'GECICI_VERGI'
                ORDER BY donem_ay
            """, (client_id, period_id))

            gecici_list = []
            for row in cursor.fetchall():
                row_dict = dict(row)
                donem = _donem_str(row_dict['donem_yil'] or 2025, row_dict['donem_ay'] or 1)
                gecici_list.append(GeciciVergiBeyanname(
                    donem=donem,
                    matrah=row_dict['matrah_toplam'] or 0,
                    hesaplanan_vergi=row_dict['hesaplanan_vergi'] or 0
                ))

            # =================================================================
            # TAHAKKUKLAR (with payment status and kalemler)
            # =================================================================
            cursor.execute("""
                SELECT
                    id, tahakkuk_tipi, donem_yil, donem_ay,
                    toplam_borc, raw_text,
                    payment_status, payment_date, payment_amount,
                    vade_tarihi, gecikme_gun
                FROM tahakkuk_entries
                WHERE client_id = ? AND period_id = ?
                ORDER BY donem_ay
            """, (client_id, period_id))

            tahakkuk_list = []
            for row in cursor.fetchall():
                row_dict = dict(row)
                tahakkuk_id = row_dict['id']
                raw = row_dict.get('raw_text', '') or ''

                # raw_text'ten dönem ve borç bilgilerini parse et
                donem_yil = row_dict['donem_yil']
                donem_ay = row_dict['donem_ay']
                toplam_borc = row_dict['toplam_borc'] or 0

                if raw:
                    import re
                    # "02/2025-02/2025" formatından ay ve yıl al
                    match = re.search(r'(\d{2})/(\d{4})-\d{2}/\d{4}', raw)
                    if match and not donem_ay:
                        donem_ay = int(match.group(1))
                        donem_yil = int(match.group(2))

                    # "TOPLAM 443,70" veya "TOPLAM 691,10" formatından borç al
                    if toplam_borc == 0:
                        match2 = re.search(r'TOPLAM\s+([\d.,]+)', raw)
                        if match2:
                            toplam_borc = float(match2.group(1).replace('.', '').replace(',', '.'))

                # Alt kalemleri çek
                cursor.execute("""
                    SELECT vergi_kodu, vergi_adi, matrah, tahakkuk_eden,
                           mahsup_edilen, odenecek, vade_tarihi, is_ana_vergi
                    FROM tahakkuk_kalemleri
                    WHERE tahakkuk_id = ?
                    ORDER BY is_ana_vergi DESC, vergi_kodu
                """, (tahakkuk_id,))

                kalemler = []
                for kalem_row in cursor.fetchall():
                    kalem_dict = dict(kalem_row)
                    kalemler.append(TahakkukKalem(
                        vergi_kodu=kalem_dict['vergi_kodu'],
                        vergi_adi=kalem_dict['vergi_adi'],
                        matrah=kalem_dict['matrah'] or 0,
                        tahakkuk_eden=kalem_dict['tahakkuk_eden'] or 0,
                        mahsup_edilen=kalem_dict['mahsup_edilen'] or 0,
                        odenecek=kalem_dict['odenecek'] or 0,
                        vade_tarihi=kalem_dict['vade_tarihi'],
                        is_ana_vergi=bool(kalem_dict['is_ana_vergi'])
                    ))

                donem = _donem_str(donem_yil or 2025, donem_ay or 1)

                # Gecikme zammı hesapla (ödenmemiş veya gecikmeli ödenmiş ise)
                gecikme_zammi = None
                toplam_borc_faizli = None
                gecikme_ay = None
                gecikme_oran = None

                vade_str = row_dict.get('vade_tarihi')
                payment_status = row_dict.get('payment_status')

                if vade_str and payment_status in ('odenmedi', 'gecikli_odendi', None):
                    try:
                        from services.vergi_odeme_takip import hesapla_gecikme_zammi

                        # Vade tarihini güvenli parse et
                        vade_date = _parse_date_safe(vade_str)
                        if not vade_date:
                            raise ValueError(f"Vade tarihi parse edilemedi: '{vade_str}'")

                        # Ödeme tarihi varsa onu kullan, yoksa bugün
                        odeme_date = _parse_date_safe(row_dict.get('payment_date'))

                        hesap = hesapla_gecikme_zammi(toplam_borc, vade_date, odeme_date)
                        gecikme_zammi = hesap['gecikme_zammi']
                        toplam_borc_faizli = hesap['toplam_borc']
                        gecikme_ay = hesap['gecikme_ay']
                        if hesap['aylik_detay']:
                            gecikme_oran = hesap['aylik_detay'][0]['oran']
                    except Exception as e:
                        logger.warning(f"Gecikme zammı hesaplama hatası: {e}")

                tahakkuk_list.append(TahakkukItem(
                    id=tahakkuk_id,  # DB ID - manuel ödeme için
                    beyanname_turu=row_dict['tahakkuk_tipi'] or 'DİĞER',
                    donem=donem,
                    toplam_borc=toplam_borc,
                    payment_status=row_dict.get('payment_status'),
                    payment_date=row_dict.get('payment_date'),
                    payment_amount=row_dict.get('payment_amount'),
                    vade_tarihi=row_dict.get('vade_tarihi'),
                    gecikme_gun=row_dict.get('gecikme_gun'),
                    gecikme_ay=gecikme_ay,
                    gecikme_zammi=gecikme_zammi,
                    toplam_borc_faizli=toplam_borc_faizli,
                    gecikme_oran=gecikme_oran,
                    kalemler=kalemler
                ))

            # =================================================================
            # KAYIT SAYILARI
            # =================================================================

            # Banka işlem sayısı
            cursor.execute("""
                SELECT COUNT(*) FROM bank_transactions
                WHERE client_id = ? AND period_id = ?
            """, (client_id, period_id))
            banka_count = cursor.fetchone()[0] or 0

            # Yevmiye sayısı (E-Defter'den)
            cursor.execute("""
                SELECT COUNT(*) FROM edefter_entries
                WHERE client_id = ? AND period_id = ? AND defter_tipi = 'Y'
            """, (client_id, period_id))
            yevmiye_count = cursor.fetchone()[0] or 0

            # Kebir sayısı (E-Defter'den)
            cursor.execute("""
                SELECT COUNT(*) FROM edefter_entries
                WHERE client_id = ? AND period_id = ? AND defter_tipi = 'K'
            """, (client_id, period_id))
            kebir_count = cursor.fetchone()[0] or 0

            # Mizan sayısı
            cursor.execute("""
                SELECT COUNT(*) FROM mizan_entries
                WHERE client_id = ? AND period_id = ?
            """, (client_id, period_id))
            mizan_count = cursor.fetchone()[0] or 0

            # E-Defter sayısı
            cursor.execute("""
                SELECT COUNT(*) FROM edefter_entries
                WHERE client_id = ? AND period_id = ?
            """, (client_id, period_id))
            edefter_count = cursor.fetchone()[0] or 0

            # =================================================================
            # AÇILIŞ BAKİYESİ DURUMU (TD-002)
            # =================================================================
            opening_balance_status = OpeningBalanceStatus()

            cursor.execute("""
                SELECT status, fiscal_year, toplam_hesap_sayisi, toplam_borc,
                       toplam_alacak, is_balanced, source_type, upload_date
                FROM opening_balance_summary
                WHERE client_id = ? AND period_id = ?
                ORDER BY fiscal_year DESC LIMIT 1
            """, (client_id, period_id))

            ob_row = cursor.fetchone()
            if ob_row:
                ob_dict = dict(ob_row)
                status = ob_dict.get('status', 'pending')
                is_balanced = bool(ob_dict.get('is_balanced'))

                # Durum rengi belirleme
                if status == 'verified':
                    status_color = 'green'
                    status_text = 'Açılış bakiyesi doğrulandı'
                elif status == 'loaded' and is_balanced:
                    status_color = 'green'
                    status_text = 'Açılış bakiyesi yüklendi'
                elif status == 'loaded' and not is_balanced:
                    status_color = 'yellow'
                    status_text = 'Açılış bakiyesi dengesiz'
                elif status == 'error':
                    status_color = 'red'
                    status_text = 'Açılış bakiyesi hatası'
                else:
                    status_color = 'yellow'
                    status_text = 'Açılış bakiyesi beklemede'

                opening_balance_status = OpeningBalanceStatus(
                    has_data=True,
                    status=status,
                    status_color=status_color,
                    status_text=status_text,
                    fiscal_year=ob_dict.get('fiscal_year'),
                    hesap_sayisi=ob_dict.get('toplam_hesap_sayisi', 0),
                    toplam_borc=ob_dict.get('toplam_borc', 0),
                    toplam_alacak=ob_dict.get('toplam_alacak', 0),
                    is_balanced=is_balanced,
                    source_type=ob_dict.get('source_type'),
                    upload_date=ob_dict.get('upload_date')
                )

            return PeriodSummaryResponse(
                kdv=kdv_list,
                muhtasar=muhtasar_list,
                gecici_vergi=gecici_list,
                tahakkuk=tahakkuk_list,
                banka_islem_sayisi=banka_count,
                yevmiye_sayisi=yevmiye_count,
                kebir_sayisi=kebir_count,
                mizan_sayisi=mizan_count,
                edefter_sayisi=edefter_count,
                opening_balance=opening_balance_status
            )

    except Exception as e:
        logger.error(f"Period summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/odeme-durumu", response_model=OdemeOzetiResponse)
async def get_odeme_durumu(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Query(..., description="Dönem ID (örn: 2025-Q1)"),
    tenant_id: str = Query("default", description="Tenant ID"),
    refresh: bool = Query(False, description="Ödemeleri yeniden analiz et")
):
    """
    Tahakkuk ödeme durumlarını getir.

    Devlet bankası (Ziraat, Halkbank, Vakıfbank) işlemlerinden vergi ödemelerini
    tespit eder ve tahakkuklarla eşleştirir.

    refresh=True ile ödemeleri yeniden analiz eder ve veritabanını günceller.
    """
    try:
        from services.vergi_odeme_takip import (
            update_tahakkuk_payment_status,
            VergiOdemeTakipServisi
        )
        from database.db import get_db_path

        db_path = get_db_path()

        if refresh:
            # Ödemeleri yeniden analiz et ve güncelle
            ozet = update_tahakkuk_payment_status(db_path, tenant_id, client_id, period_id)
        else:
            # Sadece mevcut durumu getir
            import sqlite3
            conn = sqlite3.connect(db_path)
            service = VergiOdemeTakipServisi(conn)
            ozet = service.get_odeme_ozeti(tenant_id, client_id, period_id)
            conn.close()

        return OdemeOzetiResponse(**ozet)

    except Exception as e:
        logger.error(f"Ödeme durumu error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/odeme-durumu/refresh")
async def refresh_odeme_durumu(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Query(..., description="Dönem ID (örn: 2025-Q1)"),
    tenant_id: str = Query("default", description="Tenant ID")
):
    """
    Ödeme durumlarını yeniden analiz et ve veritabanını güncelle.
    """
    try:
        from services.vergi_odeme_takip import update_tahakkuk_payment_status
        from database.db import get_db_path

        db_path = get_db_path()
        ozet = update_tahakkuk_payment_status(db_path, tenant_id, client_id, period_id)

        return {
            "status": "success",
            "message": f"{ozet['toplam_tahakkuk']} tahakkuk analiz edildi",
            "ozet": ozet
        }

    except Exception as e:
        logger.error(f"Ödeme durumu refresh error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "period-summary"}


# ============================================================================
# MANUEL ÖDEME İŞARETLEME (SMMM Müdahalesi)
# ============================================================================

class ManuelOdemeRequest(BaseModel):
    """Manuel ödeme işaretleme için request model"""
    tahakkuk_id: int
    odeme_durumu: str  # odendi, odenmedi, gecikli_odendi
    odeme_tarihi: Optional[str] = None  # YYYY-MM-DD format
    odeme_tutari: Optional[float] = None
    odeme_kaynagi: Optional[str] = None  # banka, kredi_karti, nakit_vergi_dairesi
    aciklama: Optional[str] = None


@router.post("/tahakkuk/manuel-odeme")
async def manuel_odeme_isaretle(
    request: ManuelOdemeRequest,
    tenant_id: str = Query("default", description="Tenant ID")
):
    """
    SMMM'nin manuel olarak tahakkuk ödeme durumunu güncellemesi.

    Kullanım senaryoları:
    - Kredi kartıyla ödeme (banka ekstresinde görünmez)
    - Vergi dairesinde nakit ödeme
    - Başka dönemde gecikme zammıyla ödeme
    - Hatalı otomatik eşleştirmeyi düzeltme
    """
    try:
        from database.db import get_connection
        from datetime import datetime

        with get_connection() as conn:
            cursor = conn.cursor()

            # Tahakkuk var mı kontrol et
            cursor.execute("""
                SELECT id, tahakkuk_tipi, toplam_borc, payment_status
                FROM tahakkuk_entries
                WHERE id = ?
            """, (request.tahakkuk_id,))

            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Tahakkuk bulunamadı")

            tahakkuk = dict(row)

            # Güncelleme yap
            cursor.execute("""
                UPDATE tahakkuk_entries
                SET payment_status = ?,
                    payment_date = ?,
                    payment_amount = ?,
                    payment_source = ?,
                    payment_note = ?,
                    manual_override = 1,
                    manual_override_by = ?,
                    manual_override_at = ?,
                    gecikme_gun = CASE
                        WHEN ? = 'odendi' THEN 0
                        ELSE gecikme_gun
                    END
                WHERE id = ?
            """, (
                request.odeme_durumu,
                request.odeme_tarihi,
                request.odeme_tutari,
                request.odeme_kaynagi,
                request.aciklama,
                tenant_id,  # SMMM ID
                datetime.now().isoformat(),
                request.odeme_durumu,
                request.tahakkuk_id
            ))

            conn.commit()

            return {
                "status": "success",
                "message": f"{tahakkuk['tahakkuk_tipi']} tahakkuku '{request.odeme_durumu}' olarak işaretlendi",
                "tahakkuk_id": request.tahakkuk_id,
                "onceki_durum": tahakkuk['payment_status'],
                "yeni_durum": request.odeme_durumu
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Manuel ödeme hatası: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tahakkuk/odeme-iptal")
async def odeme_iptal(
    tahakkuk_id: int = Query(..., description="Tahakkuk ID"),
    tenant_id: str = Query("default", description="Tenant ID")
):
    """
    Manuel olarak işaretlenmiş ödemeyi iptal et ve otomatik taramaya geri dön.
    """
    try:
        from database.db import get_connection

        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                UPDATE tahakkuk_entries
                SET payment_status = 'odenmedi',
                    payment_date = NULL,
                    payment_amount = NULL,
                    payment_source = NULL,
                    payment_note = NULL,
                    manual_override = 0,
                    manual_override_by = NULL,
                    manual_override_at = NULL
                WHERE id = ?
            """, (tahakkuk_id,))

            conn.commit()

            return {
                "status": "success",
                "message": "Ödeme kaydı iptal edildi, otomatik tarama yapılabilir",
                "tahakkuk_id": tahakkuk_id
            }

    except Exception as e:
        logger.error(f"Ödeme iptal hatası: {e}")
        raise HTTPException(status_code=500, detail=str(e))
