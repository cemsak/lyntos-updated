"""
LYNTOS Rapor Oluşturma Ajanı
============================

Big 4+ kalitesinde profesyonel rapor üretimi.

Rapor Tipleri:
- VDK İzah Metni
- SMMM Danışmanlık Raporu
- YMM Özel Denetim Raporu
- Risk Değerlendirme Raporu
- Due Diligence Raporu
- Yatırımcı Sunum Paketi

Formatlar:
- PDF (print-ready, bookmarks)
- Word (editable, styles)
- Excel (data tables)
- PowerPoint (presentations)
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import json

from .base_agent import (
    BaseAgent, AgentTask, AgentResult, AgentStatus,
    AgentCapability, TaskPriority
)
from ..orchestrator import get_orchestrator

logger = logging.getLogger(__name__)


class RaporTipi(str, Enum):
    """Rapor tipleri"""
    VDK_IZAH = "vdk_izah"
    SMMM_DANISMANLIK = "smmm_danismanlik"
    YMM_DENETIM = "ymm_denetim"
    RISK_DEGERLENDIRME = "risk_degerlendirme"
    DUE_DILIGENCE = "due_diligence"
    YATIRIMCI_SUNUM = "yatirimci_sunum"
    KURUMLAR_VERGISI = "kurumlar_vergisi"
    GECICI_VERGI = "gecici_vergi"
    DONEM_SONU = "donem_sonu"


class RaporFormat(str, Enum):
    """Çıktı formatları"""
    PDF = "pdf"
    WORD = "docx"
    EXCEL = "xlsx"
    POWERPOINT = "pptx"
    JSON = "json"
    HTML = "html"


@dataclass
class RaporBolumu:
    """Rapor bölümü"""
    baslik: str
    icerik: str
    sira: int
    alt_bolumler: List["RaporBolumu"] = field(default_factory=list)
    tablolar: List[Dict] = field(default_factory=list)
    grafikler: List[Dict] = field(default_factory=list)
    dipnotlar: List[str] = field(default_factory=list)


@dataclass
class RaporMetadata:
    """Rapor metadata"""
    baslik: str
    rapor_tipi: RaporTipi
    mukellef_adi: str
    mukellef_vkn: str
    donem: str
    hazirlayan: str = "LYNTOS AI"
    tarih: datetime = field(default_factory=datetime.now)
    versiyon: str = "1.0"
    gizlilik: str = "GİZLİ"
    sayfa_sayisi: int = 0


@dataclass
class RaporSonucu:
    """Rapor çıktısı"""
    metadata: RaporMetadata
    bolumler: List[RaporBolumu]
    ozet: str
    kaynaklar: List[str]
    ekler: List[Dict]
    format: RaporFormat
    dosya_yolu: Optional[str] = None


class RaporAgent(BaseAgent):
    """
    LYNTOS Rapor Oluşturma Ajanı

    Big 4+ kalitesinde profesyonel raporlar üretir.
    Kurumsal kimlik, yasal referanslar ve yapılandırılmış
    içerik ile print-ready çıktılar sağlar.

    Kullanım:
        agent = RaporAgent()

        # VDK İzah raporu
        result = await agent.run(AgentTask(
            task_type="generate",
            context={
                "rapor_tipi": "vdk_izah",
                "risk_data": {...},
                "mukellef": {...}
            }
        ))

        # Risk değerlendirme raporu
        result = await agent.run(AgentTask(
            task_type="generate",
            context={
                "rapor_tipi": "risk_degerlendirme",
                "vdk_analiz": {...},
                "format": "pdf"
            }
        ))
    """

    agent_name = "Rapor"
    agent_description = "Big 4+ kalitesinde profesyonel rapor üretimi"

    capabilities = [
        AgentCapability(
            name="Rapor Üretimi",
            description="Profesyonel rapor oluştur",
            task_types=["generate", "create_report"],
            required_context=["rapor_tipi"],
        ),
        AgentCapability(
            name="İzah Metni",
            description="VDK izah metni hazırla",
            task_types=["izah_metni", "vdk_savunma"],
            required_context=["senaryo", "risk_data"],
        ),
        AgentCapability(
            name="Format Dönüştürme",
            description="Rapor formatını dönüştür",
            task_types=["convert", "export"],
            required_context=["rapor", "format"],
        ),
    ]

    # Rapor şablonları
    RAPOR_SABLONLARI = {
        RaporTipi.VDK_IZAH: {
            "bolumler": [
                "Yönetici Özeti",
                "Konu ve Kapsam",
                "İlgili Mevzuat",
                "Olay Açıklaması",
                "Yasal Dayanak",
                "Değerlendirme",
                "Sonuç ve Talep",
                "Ekler"
            ],
            "gizlilik": "GİZLİ - VERGİ DAİRESİ"
        },
        RaporTipi.RISK_DEGERLENDIRME: {
            "bolumler": [
                "Yönetici Özeti",
                "Kapsam ve Metodoloji",
                "Risk Matrisi",
                "Kritik Bulgular",
                "Detaylı Analiz",
                "Aksiyon Planı",
                "Mevzuat Referansları",
                "Ekler"
            ],
            "gizlilik": "GİZLİ - MÜVEKKİL"
        },
        RaporTipi.KURUMLAR_VERGISI: {
            "bolumler": [
                "Özet",
                "Ticari Bilanço Karı",
                "KKEG Hesaplaması",
                "İstisnalar ve İndirimler",
                "Vergi Matrahı",
                "Kurumlar Vergisi Hesabı",
                "Geçici Vergi Mahsubu",
                "Ödenecek Vergi",
                "Kontrol Listesi"
            ],
            "gizlilik": "GİZLİ"
        }
    }

    def __init__(self):
        super().__init__()
        self.orchestrator = get_orchestrator()

    async def execute(self, task: AgentTask) -> AgentResult:
        """Görevi çalıştır"""

        if task.task_type in ["generate", "create_report"]:
            return await self._generate_report(task)
        elif task.task_type in ["izah_metni", "vdk_savunma"]:
            return await self._generate_izah(task)
        elif task.task_type in ["convert", "export"]:
            return await self._convert_format(task)
        else:
            return await self._handle_general(task)

    async def _generate_report(self, task: AgentTask) -> AgentResult:
        """Rapor oluştur"""
        rapor_tipi_str = task.context.get("rapor_tipi", "risk_degerlendirme")

        try:
            rapor_tipi = RaporTipi(rapor_tipi_str)
        except ValueError:
            return AgentResult(
                task_id=task.task_id,
                agent_name=self.agent_name,
                status=AgentStatus.FAILED,
                error=f"Geçersiz rapor tipi: {rapor_tipi_str}"
            )

        # Metadata oluştur
        mukellef = task.context.get("mukellef", {})
        metadata = RaporMetadata(
            baslik=self._get_rapor_basligi(rapor_tipi, task.context),
            rapor_tipi=rapor_tipi,
            mukellef_adi=mukellef.get("ad", "N/A"),
            mukellef_vkn=mukellef.get("vkn", "N/A"),
            donem=task.context.get("donem", datetime.now().strftime("%Y-Q%q")),
            gizlilik=self.RAPOR_SABLONLARI.get(rapor_tipi, {}).get("gizlilik", "GİZLİ")
        )

        # Bölümleri oluştur
        bolumler = await self._generate_bolumler(rapor_tipi, task.context)

        # Özet oluştur
        ozet = await self._generate_ozet(rapor_tipi, bolumler, task.context)

        # Rapor sonucu
        rapor = RaporSonucu(
            metadata=metadata,
            bolumler=bolumler,
            ozet=ozet,
            kaynaklar=self._get_kaynaklar(rapor_tipi),
            ekler=[],
            format=RaporFormat(task.context.get("format", "json"))
        )

        return AgentResult(
            task_id=task.task_id,
            agent_name=self.agent_name,
            status=AgentStatus.COMPLETED,
            output={
                "rapor": self._serialize_rapor(rapor),
                "metadata": {
                    "baslik": metadata.baslik,
                    "mukellef": metadata.mukellef_adi,
                    "donem": metadata.donem,
                    "tarih": metadata.tarih.isoformat(),
                },
                "bolum_sayisi": len(bolumler),
                "format": rapor.format.value
            }
        )

    async def _generate_bolumler(
        self,
        rapor_tipi: RaporTipi,
        context: Dict[str, Any]
    ) -> List[RaporBolumu]:
        """Rapor bölümlerini oluştur"""

        sablon = self.RAPOR_SABLONLARI.get(rapor_tipi, {})
        bolum_basliklari = sablon.get("bolumler", ["İçerik"])

        bolumler = []

        for i, baslik in enumerate(bolum_basliklari):
            icerik = await self._generate_bolum_icerigi(
                baslik, rapor_tipi, context
            )

            bolum = RaporBolumu(
                baslik=baslik,
                icerik=icerik,
                sira=i + 1
            )
            bolumler.append(bolum)

        return bolumler

    async def _generate_bolum_icerigi(
        self,
        bolum_basligi: str,
        rapor_tipi: RaporTipi,
        context: Dict[str, Any]
    ) -> str:
        """Tek bir bölümün içeriğini oluştur"""

        # Context'ten ilgili veriyi çıkar
        risk_data = context.get("risk_data", {})
        vdk_analiz = context.get("vdk_analiz", {})
        mukellef = context.get("mukellef", {})

        prompt = f"""LYNTOS Rapor Bölümü Oluşturma

RAPOR TİPİ: {rapor_tipi.value}
BÖLÜM: {bolum_basligi}

MÜVEKKİL:
{json.dumps(mukellef, ensure_ascii=False, indent=2)}

VERİ:
{json.dumps(risk_data or vdk_analiz, ensure_ascii=False, indent=2)[:2000]}

Bu bölüm için profesyonel, Big 4 kalitesinde içerik yaz.

KURALLAR:
1. Somut TL tutarları ve hesap kodları kullan
2. Mevzuat referanslarını belirt (VUK Md. X, KVK Md. Y)
3. Profesyonel, resmi dil kullan
4. Gereksiz uzatma yapma, özlü ol
5. Hallucination YAPMA - emin olmadığın şeyleri belirtme

Türkçe yaz, sadece bölüm içeriğini yaz (başlık ekleme)."""

        response = await self.orchestrator.generate(
            prompt=prompt,
            system_prompt="Sen LYNTOS rapor yazarısın. Big 4 kalitesinde profesyonel raporlar yazarsın."
        )

        return response.content if response.success else f"[{bolum_basligi} içeriği oluşturulamadı]"

    async def _generate_ozet(
        self,
        rapor_tipi: RaporTipi,
        bolumler: List[RaporBolumu],
        context: Dict[str, Any]
    ) -> str:
        """Yönetici özeti oluştur"""

        bolum_ozetleri = "\n".join([
            f"- {b.baslik}: {b.icerik[:200]}..."
            for b in bolumler[:5]
        ])

        prompt = f"""LYNTOS Rapor Yönetici Özeti

RAPOR TİPİ: {rapor_tipi.value}

BÖLÜMLER:
{bolum_ozetleri}

Yönetici özeti yaz (maksimum 5 cümle):
1. Ana bulgu
2. Risk seviyesi
3. Kritik tutar (varsa)
4. Öncelikli aksiyon
5. Sonuç

Kısa, net, somut ol. Hallucination YAPMA!"""

        response = await self.orchestrator.summarize(
            text=prompt,
            max_length=150
        )

        return response.content if response.success else "Özet oluşturulamadı."

    async def _generate_izah(self, task: AgentTask) -> AgentResult:
        """VDK izah metni oluştur"""
        senaryo = task.context.get("senaryo", "")
        risk_data = task.context.get("risk_data", {})

        # Orchestrator'daki mevcut metodu kullan
        response = await self.orchestrator.vdk_generate_izah(
            scenario=senaryo,
            risk_data=risk_data,
            specific_issue=task.context.get("specific_issue")
        )

        return AgentResult(
            task_id=task.task_id,
            agent_name=self.agent_name,
            status=AgentStatus.COMPLETED if response.success else AgentStatus.FAILED,
            output={
                "izah_metni": response.content,
                "senaryo": senaryo,
            },
            error=response.error,
            tokens_used=response.tokens_used
        )

    async def _convert_format(self, task: AgentTask) -> AgentResult:
        """Format dönüştürme"""
        rapor = task.context.get("rapor", {})
        hedef_format = task.context.get("format", "pdf")

        # Şimdilik JSON formatında döndür
        # TODO: PDF/Word/Excel generation (weasyprint, python-docx, openpyxl)

        return AgentResult(
            task_id=task.task_id,
            agent_name=self.agent_name,
            status=AgentStatus.COMPLETED,
            output={
                "format": hedef_format,
                "status": "pending_implementation",
                "note": "PDF/Word/Excel generation henüz implement edilmedi. JSON formatında döndürülüyor.",
                "data": rapor
            }
        )

    async def _handle_general(self, task: AgentTask) -> AgentResult:
        """Genel rapor sorusu"""
        response = await self.orchestrator.generate(
            prompt=task.description,
            system_prompt="Sen LYNTOS rapor uzmanısın."
        )

        return AgentResult(
            task_id=task.task_id,
            agent_name=self.agent_name,
            status=AgentStatus.COMPLETED if response.success else AgentStatus.FAILED,
            output=response.content,
            error=response.error,
            tokens_used=response.tokens_used
        )

    def _get_rapor_basligi(self, rapor_tipi: RaporTipi, context: Dict) -> str:
        """Rapor başlığı oluştur"""
        mukellef_adi = context.get("mukellef", {}).get("ad", "Mükellef")
        donem = context.get("donem", "")

        basliklar = {
            RaporTipi.VDK_IZAH: f"VDK İzaha Davet Savunma Metni - {mukellef_adi}",
            RaporTipi.SMMM_DANISMANLIK: f"SMMM Danışmanlık Raporu - {mukellef_adi}",
            RaporTipi.YMM_DENETIM: f"YMM Özel Denetim Raporu - {mukellef_adi}",
            RaporTipi.RISK_DEGERLENDIRME: f"VDK Risk Değerlendirme Raporu - {mukellef_adi} ({donem})",
            RaporTipi.DUE_DILIGENCE: f"Due Diligence Raporu - {mukellef_adi}",
            RaporTipi.YATIRIMCI_SUNUM: f"Yatırımcı Sunum Paketi - {mukellef_adi}",
            RaporTipi.KURUMLAR_VERGISI: f"Kurumlar Vergisi Hesaplama Raporu - {mukellef_adi} ({donem})",
            RaporTipi.GECICI_VERGI: f"Geçici Vergi Raporu - {mukellef_adi} ({donem})",
            RaporTipi.DONEM_SONU: f"Dönem Sonu İşlemleri Raporu - {mukellef_adi}",
        }

        return basliklar.get(rapor_tipi, f"LYNTOS Rapor - {mukellef_adi}")

    def _get_kaynaklar(self, rapor_tipi: RaporTipi) -> List[str]:
        """Rapor için kaynak listesi"""
        temel_kaynaklar = [
            "213 sayılı Vergi Usul Kanunu",
            "5520 sayılı Kurumlar Vergisi Kanunu",
            "193 sayılı Gelir Vergisi Kanunu",
            "3065 sayılı Katma Değer Vergisi Kanunu",
        ]

        if rapor_tipi in [RaporTipi.VDK_IZAH, RaporTipi.RISK_DEGERLENDIRME]:
            temel_kaynaklar.extend([
                "VDK 13 Kriter Genelgesi (E-55935724-010.06-7361)",
                "KURGAN 16 Risk Senaryosu Sistemi",
            ])

        return temel_kaynaklar

    def _serialize_rapor(self, rapor: RaporSonucu) -> Dict[str, Any]:
        """Raporu JSON'a dönüştür"""
        return {
            "metadata": {
                "baslik": rapor.metadata.baslik,
                "rapor_tipi": rapor.metadata.rapor_tipi.value,
                "mukellef_adi": rapor.metadata.mukellef_adi,
                "mukellef_vkn": rapor.metadata.mukellef_vkn,
                "donem": rapor.metadata.donem,
                "hazirlayan": rapor.metadata.hazirlayan,
                "tarih": rapor.metadata.tarih.isoformat(),
                "versiyon": rapor.metadata.versiyon,
                "gizlilik": rapor.metadata.gizlilik,
            },
            "ozet": rapor.ozet,
            "bolumler": [
                {
                    "sira": b.sira,
                    "baslik": b.baslik,
                    "icerik": b.icerik,
                    "tablo_sayisi": len(b.tablolar),
                    "dipnot_sayisi": len(b.dipnotlar),
                }
                for b in rapor.bolumler
            ],
            "kaynaklar": rapor.kaynaklar,
            "ek_sayisi": len(rapor.ekler),
        }
