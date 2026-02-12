"""
LYNTOS - Mevzuat Veritabanı Zenginleştirme Scripti
Mevcut 31 kaydı günceller + 70+ yeni SMMM-kritik kayıt ekler.
FTS5 index'i yeniden oluşturur.
"""
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from database.db import get_connection, rebuild_fts_index


def _id():
    return uuid.uuid4().hex[:8]


# ── MEVCUT KAYITLARIN CANONICAL_URL VE TAM_METİN GÜNCELLEMELERİ ──────────

UPDATES = [
    # VUK 213 kayıtları
    ("VUK - Emtia Değerlemesi",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=213&MevzuatTur=1&MevzuatTertip=4",
     "VUK Md.274-278 kapsamında emtia değerlemesi maliyet bedeli esasına dayanır. İşletmeye dahil emtialar maliyet bedeli ile değerlenir. Maliyet bedeli, iktisadi kıymetin iktisap edilmesi veya değerinin artırılması amacıyla yapılan ödemelerle bunlara ilişkin giderlerin toplamıdır. Emtianın maliyet bedeline nazaran piyasa fiyatında %10 ve daha fazla düşüklük olması halinde emtia emsal bedeli ile değerlenir."),
    ("VUK - Banka Hesap Bildirimi",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=213&MevzuatTur=1&MevzuatTertip=4",
     "VUK kapsamında vergi mükellefleri, bankalar ve diğer finans kuruluşlarındaki hesaplarını vergi dairesine bildirmekle yükümlüdür. Bildirim yükümlülüğüne uymayanlar hakkında VUK Md.355 uyarınca özel usulsüzlük cezası kesilir. Bankalar, mükelleflerin hesap hareketlerini GİB'e elektronik ortamda bildirmekle yükümlüdür."),
    ("VUK - Re'sen Takdir (Kasa)",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=213&MevzuatTur=1&MevzuatTertip=4",
     "VUK Md.30 kapsamında kasa fazlası ve ortaklar cari hesabı bakiyesi re'sen takdir nedenidir. Bilanço esasına göre defter tutan mükelleflerde kasa hesabında oluşan farklar ile ortaklardan alacaklar hesabında işletmenin esas faaliyetiyle ilgili olmayan tutarlar, adat yöntemiyle faiz hesaplanarak gelir kaydedilir. VDK incelemelerde kasa fazlası öncelikli kontrol alanıdır."),
    ("VUK - Enflasyon Düzeltmesi",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=213&MevzuatTur=1&MevzuatTertip=4",
     "VUK Mükerrer Md.298 kapsamında enflasyon düzeltmesi, parasal olmayan kıymetlerin düzeltme katsayısı ile çarpılarak düzeltilmesidir. 2024 yılından itibaren enflasyon düzeltmesi uygulanmaktadır. Düzeltme yapılabilmesi için Yİ-ÜFE artışının son 36 ayda %100'ü veya son 12 ayda %10'u aşması gerekir. Düzeltmeden doğan kar/zarar gelir tablosunda gösterilir."),
    ("VUK m.359",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=213&MevzuatTur=1&MevzuatTertip=4",
     "VUK Md.359 vergi kaçakçılığı suçlarını düzenler. Defter ve kayıtlarda hesap ve muhasebe hilesi yapmak, gerçek olmayan kişiler adına hesap açmak, çift defter tutmak, sahte belge düzenlemek/kullanmak hapis cezası gerektirir. Sahte belge (naylon fatura) kullanımı 3-8 yıl hapis cezası, düzenlenmesi 3-8 yıl hapis cezası öngörür. SMMM'ler mesleki sorumluluk kapsamında özellikle dikkat etmelidir."),
    ("VUK m.274-278",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=213&MevzuatTur=1&MevzuatTertip=4",
     "Stokların değerlemesinde maliyet bedeli (Md.274), piyasa değeri düşüklüğü halinde emsal bedel (Md.275), zirai mahsul değerlemesi (Md.276), üretim maliyetine dahil giderler (Md.275) ve maliyet hesaplama yöntemleri (FIFO, ortalama maliyet) düzenlenir. İşletmeye dahil emtialar maliyet bedeli ile değerlenir; değer düşüklüğü halinde emsal bedel uygulanır."),
    ("VUK Md. 278 - Degeri dusen mallar",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=213&MevzuatTur=1&MevzuatTertip=4",
     "Yangın, deprem ve su basması gibi afetler yüzünden veya bozulmak, çürümek, kırılmak, çatlamak, paslanmak gibi nedenlerle iktisadi kıymetlerinde önemli azalış olan emtia ve mallar emsal bedel ile değerlenir. Takdir komisyonu kararı veya Maliye Bakanlığı belirlediği usule göre mükellef kendisi de değer tespiti yapabilir."),
    ("VUK Md. 323 - Supheli alacaklar",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=213&MevzuatTur=1&MevzuatTertip=4",
     "Ticari ve zirai kazancın elde edilmesi ve idame ettirilmesi ile ilgili olmak şartıyla, dava veya icra safhasında bulunan alacaklar şüpheli alacak sayılır. Bu alacaklar için karşılık ayrılabilir. Teminatlı alacaklarda teminatı aşan kısım için karşılık ayrılır. Karşılık ayırma ihtiyaridir ancak şüpheli hale geldiği dönemde ayrılmalıdır."),
    ("VUK Md. 324 - Degersi alacaklar",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=213&MevzuatTur=1&MevzuatTertip=4",
     "Kazai bir hükme veya kanaat verici bir vesikaya göre tahsili imkansız hale gelen alacaklar değersiz alacak sayılır ve doğrudan zarar yazılır. Kanaat verici vesikalar: konkordato anlaşması, borçlunun gaipliğine ilişkin mahkeme kararı, icra takibinde aciz vesikası. Değersiz alacak karşılık ayırmadan doğrudan gider yazılır."),
    ("VUK Md. 134 - Vergi incelemesi",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=213&MevzuatTur=1&MevzuatTertip=4",
     "Vergi incelemesinden maksat, ödenmesi gereken vergilerin doğruluğunu araştırmak, tespit etmek ve sağlamaktır. İncelemeye yetkili olanlar: Vergi Müfettişleri (VDK), Gelir Uzmanları. İnceleme 1 yılda tamamlanmalıdır (zorunlu hallerde 6 ay uzatma). Mükellef inceleme süresince defter ve belgelerini ibraz etmekle yükümlüdür."),
    ("VUK Md. 135 - Incelemeye alinma",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=213&MevzuatTur=1&MevzuatTertip=4",
     "İncelemeye başlanılmasında mükellefe yazılı olarak bildirim yapılır. İnceleme tutanağı düzenlenir ve mükellefin imzası alınır. İnceleme sırasında mükellefin hakları: avukat/SMMM/YMM bulundurma, tutanağa itiraz yazma, 3568 sayılı kanun kapsamında meslek mensubundan yardım alma. İnceleme sonucu tarhiyat yapılabilir."),
    ("213 sayili VUK Md. 11 - Muteselsil sorumluluk",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=213&MevzuatTur=1&MevzuatTertip=4",
     "Yaptıkları veya yapacakları ödemelerden vergi kesmeye mecbur olanlar, verginin tam olarak kesilip ödenmesinden ve kanunla gösterilen diğer ödevleri yerine getirmekten sorumludurlar. Bu sorumluluk müteselsilen (zincirleme) uygulanır. Mal alım satımı ve hizmet ifasında KDV tevkifat uygulamasında alıcı müteselsil sorumludur."),
    ("VUK Md. 370 - Pismanlik",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=213&MevzuatTur=1&MevzuatTertip=4",
     "Beyana dayanan vergilerde vergi ziyaına sebebiyet verdiklerini kendiliğinden ilgili makamlara bildiren mükelleflere pişmanlık hükümleri uygulanır. Şartları: (1) Haber verme dilekçesi, (2) 15 gün içinde beyanname verme, (3) Aynı sürede gecikme zammı oranında pişmanlık zammı ile vergiyi ödeme. Pişmanlıktan yararlanan mükelleflere vergi ziyaı cezası kesilmez."),
    ("VUK Md. 315-320 - Amortisman",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=213&MevzuatTur=1&MevzuatTertip=4",
     "Amortismana tabi iktisadi kıymetler (ATİK), işletmede bir yıldan fazla kullanılan ve yıpranmaya, aşınmaya veya kıymetten düşmeye maruz bulunan gayrimenkullerle gayrimenkul gibi değerlenen iktisadi kıymetler, alet, edavat, mefruşat, demirbaş ve sinema filmleridir. Normal amortisman (Md.315), azalan bakiyeler yöntemi (Md.316), fevkalade amortisman (Md.317) yöntemleri uygulanabilir."),
    # GVK 193
    ("GVK - Geçici Vergi",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=193&MevzuatTur=1&MevzuatTertip=4",
     "GVK Mükerrer Md.120 kapsamında ticari kazanç sahipleri ve serbest meslek erbabı üçer aylık dönemler halinde geçici vergi öder. Geçici vergi oranı gelir vergisi tarifesindeki ilk dilim oranı (%15) üzerinden hesaplanır. Beyanname 3 aylık dönemin bitiminden itibaren 17. gün akşamına kadar verilir. Ödeme beyanname verme süresinin son günüdür."),
    ("GVK Md. 40 - Indirilecek giderler",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=193&MevzuatTur=1&MevzuatTertip=4",
     "Ticari kazancın tespitinde indirilecek giderler: genel giderler, personel giderleri, işle ilgili seyahat ve konaklama giderleri, sigorta primleri, amortismanlar, işle ilgili tazminatlar. Binek otomobil giderlerinin %70'i indirilir. Kiralama giderlerinde aylık KDV hariç 26.000 TL'yi aşan kısım KKEG'dir (2026 tutarı)."),
    # KDV 3065
    ("KDV Kanunu - Vergi İndirimi",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=3065&MevzuatTur=1&MevzuatTertip=4",
     "KDVK Md.29 kapsamında mükellefler yüklendikleri KDV'yi indirim konusu yapabilir. İndirim hakkı vergiyi doğuran olayın meydana geldiği takvim yılını takip eden yılın sonuna kadar kullanılabilir. Fatura ve benzeri vesikalarda gösterilen KDV indirilebilir. İndirilemeyen KDV sonraki dönemlere devreder (devreden KDV). İade hakkı doğuran işlemlerde (ihracat, indirimli oran) iade talep edilebilir."),
    # KVK 5520
    ("Kurumlar Vergisi Kanunu",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5520&MevzuatTur=1&MevzuatTertip=5",
     "5520 sayılı Kurumlar Vergisi Kanunu sermaye şirketleri, kooperatifler, iktisadi kamu kuruluşları, dernek ve vakıflara ait iktisadi işletmeler ile iş ortaklıklarının kazançlarını vergilendirir. KV oranı 2024'ten itibaren %25'tir. İhracat yapan kurumların kazançlarına %5 indirimli oran (%20) uygulanır. Geçici vergi dönemlerinde kurumlar vergisi oranı üzerinden hesaplama yapılır."),
    ("KVK - İstisnalar",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5520&MevzuatTur=1&MevzuatTertip=5",
     "KVK Md.5 kapsamında kurumlar vergisinden istisna kazançlar: iştirak kazançları istisnası (Md.5/1-a), gayrimenkul satış kazancı istisnası (Md.5/1-e - %50 istisna, 2 yıl elde tutma şartı), yurt dışı iştirak kazançları istisnası, serbest bölge kazanç istisnası, teknoloji geliştirme bölgesi kazanç istisnası. İstisna şartlarının sağlanmaması halinde istisna iptal edilir ve cezalı tarhiyat yapılır."),
    ("KVK - KKEG",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5520&MevzuatTur=1&MevzuatTertip=5",
     "KVK Md.11 kapsamında kanunen kabul edilmeyen giderler (KKEG): öz sermaye üzerinden hesaplanan faizler, transfer fiyatlandırması yoluyla örtülü kazanç dağıtımı, her türlü para cezaları ve vergi cezaları, menkul kıymet alım giderleri, kiralama yoluyla edinilen varlıklarda amortisman farkları. KKEG'ler beyanname üzerinde kara ilave edilir."),
    ("KVK m.13 (Transfer Fiyatlandirmasi)",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5520&MevzuatTur=1&MevzuatTertip=5",
     "Kurumlar, ilişkili kişilerle yaptıkları işlemlerde emsallere uygunluk ilkesine uymak zorundadır. İlişkili kişi: ortaklar, ortakların ilişkili olduğu kişiler, kurumun %10 ve üzeri pay sahibi olduğu kişiler. Transfer fiyatlandırması yöntemleri: karşılaştırılabilir fiyat yöntemi, maliyet artı yöntemi, yeniden satış fiyatı yöntemi, kâr bölüşüm yöntemi, işleme dayalı net kâr marjı yöntemi."),
    ("KVK m.12",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5520&MevzuatTur=1&MevzuatTertip=5",
     "Örtülü sermaye: kurumların ortaklarından veya ortaklarla ilişkili kişilerden doğrudan veya dolaylı olarak temin ederek işletmede kullandıkları borçların, hesap dönemi içinde herhangi bir tarihte kurumun öz sermayesinin 3 katını aşan kısmı örtülü sermaye sayılır. Örtülü sermaye üzerinden ödenen faizler KKEG'dir."),
    ("5520 sayili Kanun",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5520&MevzuatTur=1&MevzuatTertip=5",
     "Kurumlar Vergisi Kanunu'nun genel düzenlemesi: mükellefiyet (tam ve dar mükellef), matrah tespiti, beyanname verme süreleri (Nisan ayı), geçici vergi, stopaj uygulamaları. KV oranı %25, ihracatçılar %20. Yıllık beyanname takip eden yılın Nisan ayının son günü akşamına kadar verilir."),
    # SGK 5510
    ("Sosyal Sigortalar ve GSS Kanunu",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5510&MevzuatTur=1&MevzuatTertip=5",
     "5510 sayılı Kanun sosyal sigorta ve genel sağlık sigortası hükümlerini düzenler. İşveren SGK prim oranları: %20.5 (işveren payı) + %14 (işçi payı) = %34.5 toplam. İşveren teşvikleri: 5 puanlık indirim (Md.81/ı), 6111 sayılı genç istihdamı teşviki, 7252 sayılı kısa çalışma desteği. Prim bildirgeleri aylık olarak (APHB) takip eden ayın 26'sına kadar verilir."),
    # Ar-Ge 5746
    ("Ar-Ge ve Tasarım Faaliyetleri Kanunu",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5746&MevzuatTur=1&MevzuatTertip=5",
     "5746 sayılı Kanun kapsamında Ar-Ge ve tasarım harcamalarının %100'ü kurum kazancından indirilebilir. Ar-Ge personeli gelir vergisi stopajı desteği (%95 doktora, %90 yüksek lisans, %80 diğer). SGK işveren payı desteği (%50). Ar-Ge merkezi şartı: tam zamanlı en az 15 Ar-Ge personeli. Teşvikten yararlanmak için TÜBİTAK/Sanayi Bakanlığı onayı gerekir."),
    # Tebliğler
    ("E-Fatura Uygulaması Genel Tebliği",
     "https://www.gib.gov.tr/gibmevzuat",
     "E-fatura, e-arşiv fatura, e-irsaliye ve e-defter uygulamalarına ilişkin usul ve esasları düzenler. 2024 yılında brüt satış hasılatı 3 milyon TL'yi aşan mükellefler e-fatura uygulamasına geçmek zorundadır. E-arşiv fatura limiti 5.000 TL (vergi dahil). GİB portal veya özel entegratör üzerinden düzenlenir. E-defter Luca, Logo, Netsis gibi uyumlu yazılımlarla tutulabilir."),
    ("KDV Beyanname Düzeni Tebliği",
     "https://www.gib.gov.tr/gibmevzuat",
     "KDV beyanname düzenine ilişkin usul ve esasları belirler. Aylık KDV beyannamesi takip eden ayın 28'ine kadar verilir. 3 aylık dönemlerde beyanname veren mükellefler (münhasıran BSMV'ye tabi işlemler yapanlar hariç). KDV1 (satış), KDV2 (tevkifat), KDV3 (ithalde alınan), KDV4 (1 No.lu beyanname verenler) formları mevcuttur."),
    # Genelgeler
    ("HMB Genelge 18.04.2025",
     None,
     "Hazine ve Maliye Bakanlığı genelgesi. Vergi uygulamalarına ilişkin yönlendirme ve açıklamalar içerir."),
    ("HMB Genelge 18.04.2025 E-55935724-010.06-7361",
     None,
     "Hazine ve Maliye Bakanlığı genelgesi (E-55935724-010.06-7361 sayılı). Vergi daireleri ve mal müdürlüklerinin uygulamalarına ilişkin teknik yönlendirme."),
    # Diğer kanunlar
    ("646 KHK",
     "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=646&MevzuatTur=4&MevzuatTertip=5",
     "646 sayılı Kanun Hükmünde Kararname kapsamında Vergi Denetim Kurulu (VDK) yapılanması düzenlenir. VDK, Maliye Bakanlığına bağlı olarak vergi inceleme yetkisini kullanan merkezi birimdir."),
    ("1 Seri No'lu Transfer Fiyatlandirmasi Tebligi",
     "https://www.gib.gov.tr/gibmevzuat",
     "Transfer fiyatlandırması yoluyla örtülü kazanç dağıtımı hakkında tebliğ. İlişkili kişi tanımı, emsallere uygunluk ilkesi, belgelendirme yükümlülükleri, yıllık transfer fiyatlandırması raporu hazırlama şartları ve peşin fiyatlandırma anlaşması süreçlerini düzenler."),
]


# ── YENİ KAYITLAR ──────────────────────────────────────────────────────────

NEW_RECORDS = [
    # ─── ÖZELGELER (15) ───
    {
        "mevzuat_type": "ozelge",
        "baslik": "KDV Tevkifat Uygulaması - İnşaat Taahhüt İşleri",
        "kisa_aciklama": "İnşaat taahhüt işlerinde KDV tevkifat oranı ve uygulaması hakkında GİB özelgesi. Yapım işlerinde 4/10 oranında KDV tevkifatı uygulanır.",
        "tam_metin": "GİB özelgesine göre, KDV Kanunu'nun 9. maddesi kapsamında yapım işlerinde alıcı tarafından 4/10 oranında KDV tevkifatı yapılması gerekmektedir. Tevkifat uygulaması belirlenmiş alıcılar (kamu kurumları, bankalar, sigorta şirketleri vb.) ve KDV mükellefleri tarafından uygulanır. Tevkifata tabi işlemlerde satıcı KDV1 beyannamesi, alıcı KDV2 beyannamesi verir.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["KDV", "tevkifat", "insaat"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "ozelge",
        "baslik": "Gayrimenkul Satışında KDV İstisnası Şartları",
        "kisa_aciklama": "Kurumların aktifinde en az 2 yıl süreyle yer alan taşınmazların satışında KDV istisnası uygulaması.",
        "tam_metin": "KVK Md.5/1-e ve KDVK Md.17/4-r kapsamında kurumların aktifinde en az 2 tam yıl süreyle bulunan taşınmazların satışında KDV istisnası uygulanır. İstisnadan yararlanma şartları: (1) Satışa konu taşınmaz en az 2 yıl aktifte kayıtlı olmalı, (2) Satış bedeli satışın yapıldığı yılı izleyen 2. yılın sonuna kadar tahsil edilmeli, (3) İstisna edilen kazanç 5 yıl süreyle özel fon hesabında tutulmalı, (4) Taşınmaz ticareti yapan kurumlar istisna kapsamı dışındadır.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["KDV", "istisna", "gayrimenkul", "KVK"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "ozelge",
        "baslik": "Stopaj Oranları - Serbest Meslek Kazancı",
        "kisa_aciklama": "Serbest meslek erbabına yapılan ödemelerden yapılacak gelir vergisi stopajı oranı ve uygulaması.",
        "tam_metin": "GVK Md.94/2-b kapsamında serbest meslek erbabına yapılan ödemelerden %20 oranında gelir vergisi stopajı yapılır. Avukat, SMMM, YMM, mimar, mühendis gibi serbest meslek erbabına yapılan ödemeler stopaja tabidir. Stopaj kesintisi ödemeyi yapan tarafından Muhtasar ve Prim Hizmet Beyannamesi ile beyan edilir. Beyanname takip eden ayın 26'sına kadar verilir ve aynı tarihte ödenir.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["stopaj", "serbest meslek", "GVK"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "ozelge",
        "baslik": "Kira Gelirlerinde Stopaj Uygulaması",
        "kisa_aciklama": "İşyeri kira ödemelerinde gelir vergisi stopaj oranı ve beyan yükümlülüğü.",
        "tam_metin": "GVK Md.94/5-a kapsamında 70. maddede yazılı mal ve hakların kiralanması karşılığında yapılan ödemelerden %20 oranında stopaj yapılır. İşyeri kira ödemesinde kiracı kurumlar veya vergi mükellefleri stopaj kesintisi yaparak Muhtasar Beyanname ile beyan eder. Konut kira ödemesinde stopaj uygulanmaz ancak kira geliri yıllık beyanname ile beyan edilir. 2026 yılı konut kira geliri istisna tutarı 33.000 TL'dir.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["stopaj", "kira", "GVK"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "ozelge",
        "baslik": "Yıllara Sari İnşaat İşlerinde Vergilendirme",
        "kisa_aciklama": "Yıllara yaygın inşaat ve onarım işlerinde gelir/kurumlar vergisi ve KDV uygulaması.",
        "tam_metin": "GVK Md.42-44 kapsamında birden fazla takvim yılına sirayet eden inşaat ve onarma işlerinde kar veya zarar işin bittiği yıl kesin olarak tespit edilir. Hakediş ödemelerinden %5 oranında stopaj yapılır (GVK Md.94/3). KDV açısından her hakediş döneminde KDV hesaplanır ve beyan edilir. İşin bitimi: geçici kabul tutanağının onaylandığı tarihtir.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["insaat", "yillara sari", "stopaj", "GVK"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "ozelge",
        "baslik": "E-Ticaret Kazançlarının Vergilendirilmesi",
        "kisa_aciklama": "İnternet üzerinden yapılan satışlarda gelir/kurumlar vergisi ve KDV yükümlülükleri.",
        "tam_metin": "E-ticaret faaliyetinden elde edilen kazançlar ticari kazanç kapsamında vergilendirilir. E-ticaret platformları (Trendyol, Hepsiburada, Amazon vb.) üzerinden satış yapan mükellefler vergi mükellefi olmak zorundadır. Yıllık brüt satış hasılatı 3 milyon TL'yi aşanlar e-fatura uygulamasına geçmelidir. KDV oranları mal/hizmet türüne göre %1, %10, %20 olarak uygulanır. 2024'ten itibaren e-ticaret aracı hizmet sağlayıcıları bilgi verme yükümlülüğüne tabidir.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["e-ticaret", "KDV", "ticari kazanc"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "ozelge",
        "baslik": "Binek Otomobil Gider Kısıtlaması",
        "kisa_aciklama": "İşletme aktifindeki binek otomobillerin giderlerinin indirim sınırları ve KDV uygulaması.",
        "tam_metin": "GVK Md.40/5 ve 68/5 kapsamında binek otomobil giderlerinin %70'i indirilebilir. 2026 yılı gider kısıtlama tutarları: ÖTV ve KDV hariç alım bedeli 1.150.000 TL'yi aşanlar için amortisman sınırı uygulanır. Kiralık binek otolarda aylık KDV hariç 26.000 TL üzeri KKEG'dir. Binek otomobile ait akaryakıt, bakım-onarım, sigorta giderlerinin %70'i indirilebilir, %30'u KKEG'dir. KDV indirimi: binek oto alımında ödenen KDV indirim konusu yapılamaz, gider veya maliyet olarak dikkate alınır.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["binek oto", "gider kisitlama", "GVK", "KKEG"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "ozelge",
        "baslik": "Yemek Fişi ve Yemek Kartı İstisnası",
        "kisa_aciklama": "Çalışanlara verilen yemek bedelinin gelir vergisi ve SGK primi istisnası uygulaması.",
        "tam_metin": "GVK Md.23/8 kapsamında işverenler tarafından çalışanlara verilen günlük yemek bedeli 2026 yılı için 270 TL'ye kadar gelir vergisinden istisnadır. İstisna tutarını aşan kısım ücret olarak vergilendirilir. Yemek kartı (Multinet, Ticket, Sodexo) ile verilen yemek bedellerinde de aynı istisna uygulanır. SGK açısından günlük yemek bedeli brüt asgari ücretin %6'sını aşmayan kısmı prime esas kazanca dahil edilmez.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["yemek bedeli", "istisna", "GVK", "SGK"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "ozelge",
        "baslik": "Fatura Düzenleme Süresi ve Cezası",
        "kisa_aciklama": "VUK kapsamında fatura düzenleme süresi, şekil şartları ve süresinde düzenlenmeme cezası.",
        "tam_metin": "VUK Md.231/5 kapsamında fatura, malın teslimi veya hizmetin yapıldığı tarihten itibaren azami 7 gün içinde düzenlenir. Süresinde düzenlenmeyen fatura için VUK Md.353/1 uyarınca özel usulsüzlük cezası kesilir. Fatura düzenlenmemesi veya eksik düzenlenmesi halinde her bir belge için 2026 yılında 6.900 TL (yıllık toplamda 690.000 TL üst sınır). E-fatura mükellefleri elektronik ortamda düzenlemek zorundadır.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["fatura", "VUK", "ceza", "usulsuzluk"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "ozelge",
        "baslik": "Teknoloji Geliştirme Bölgesi (Teknopark) Kazanç İstisnası",
        "kisa_aciklama": "Teknoloji geliştirme bölgelerinde faaliyet gösteren mükelleflerin kazanç istisnası ve diğer avantajları.",
        "tam_metin": "4691 sayılı Kanun kapsamında teknoloji geliştirme bölgelerinde yazılım, Ar-Ge ve tasarım faaliyetlerinden elde edilen kazançlar 31.12.2028'e kadar kurumlar vergisinden istisnadır. Bu bölgelerde çalışan Ar-Ge ve destek personelinin ücretleri gelir vergisi stopajından istisnadır (%95 doktora, %90 YL, %80 diğer). SGK işveren payının %50'si Hazinece karşılanır. İstisna yalnızca bölgede fiilen yapılan faaliyetlerden elde edilen kazançlara uygulanır.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["teknopark", "Ar-Ge", "istisna", "KVK"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "ozelge",
        "baslik": "KDV İade Talebi ve Mahsup İşlemleri",
        "kisa_aciklama": "İhracat, indirimli oran ve tam istisna kapsamında KDV iade talep süreci ve belgeleri.",
        "tam_metin": "KDVK Md.32 kapsamında iade hakkı doğuran işlemler: ihracat teslimleri, uluslararası taşımacılık, diplomatik istisna, indirimli orana tabi teslimler. İade talebi internet vergi dairesi üzerinden yapılır. Gerekli belgeler: standart iade talep dilekçesi, satış faturaları listesi, indirilecek KDV listesi, yüklenilen KDV listesi. Nakden iade için YMM raporu veya teminat gerekebilir. Mahsup yoluyla iade daha hızlı sonuçlanır.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["KDV", "iade", "ihracat", "mahsup"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "ozelge",
        "baslik": "Ortaklara Borç Para Verilmesi (Adat Faizi)",
        "kisa_aciklama": "Şirketin ortaklarına borç para vermesi halinde adat faizi hesaplanması ve vergisel sonuçları.",
        "tam_metin": "KVK Md.13 kapsamında kurumların ortaklarına borç para vermesi transfer fiyatlandırması kapsamında değerlendirilir. Emsallere uygun faiz hesaplanması zorunludur. TCMB kısa vadeli avans faiz oranı emsal olarak kullanılabilir. Hesaplanan faiz üzerinden %20 KDV hesaplanır ve fatura düzenlenir. Faiz geliri kurum kazancına dahil edilir. Ortaklar cari hesabı VDK incelemelerinde öncelikli kontrol konusudur.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["transfer fiyatlandirmasi", "adat", "ortaklar cari", "KVK"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "ozelge",
        "baslik": "Damga Vergisi Uygulaması - Sözleşmeler",
        "kisa_aciklama": "Ticari sözleşmelerde damga vergisi oranları ve istisna kapsamındaki kağıtlar.",
        "tam_metin": "488 sayılı Damga Vergisi Kanunu kapsamında sözleşmelerde binde 9,48 oranında damga vergisi uygulanır. 2026 yılı üst sınır 16.961.383 TL'dir (tek kağıt için). Damga vergisi istisnası uygulanan kağıtlar: ihracat sözleşmeleri, bankalarla yapılan kredi sözleşmeleri, Ar-Ge projesi kapsamındaki sözleşmeler, yatırım teşvik belgesi kapsamındaki sözleşmeler. E-imzalı sözleşmelerde de damga vergisi uygulanır.",
        "kurum": "HMB", "trust_class": "A",
        "kapsam_etiketleri": '["damga vergisi", "sozlesme", "istisna"]',
        "canonical_url": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=488&MevzuatTur=1&MevzuatTertip=4",
    },
    {
        "mevzuat_type": "ozelge",
        "baslik": "İhracatta KDV İstisnası ve İade",
        "kisa_aciklama": "Mal ihracatı ve hizmet ihracatında KDV istisnası uygulaması ve iade prosedürü.",
        "tam_metin": "KDVK Md.11 ve 12 kapsamında ihracat teslimleri KDV'den istisnadır (tam istisna). İhracatçı yüklendiği KDV'yi iade olarak talep edebilir. İade yöntemleri: nakden iade (YMM raporu veya teminat ile), mahsup (vergi borçlarına), iade hesap dönemi sonu veya münferit beyanname ile talep edilebilir. Hizmet ihracatında istisna şartları: (1) Hizmet yurt dışındaki müşteriye yapılmalı, (2) Hizmet bedeli döviz olarak Türkiye'ye getirilmeli, (3) Hizmetten yurt dışında yararlanılmalı.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["ihracat", "KDV", "istisna", "iade"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "ozelge",
        "baslik": "Yatırım İndirimi ve Yatırım Teşvik Belgesi",
        "kisa_aciklama": "Yatırım teşvik belgesi kapsamında vergi indirimi, gümrük muafiyeti ve SGK desteği.",
        "tam_metin": "2012/3305 sayılı Bakanlar Kurulu Kararı kapsamında yatırım teşvik belgesi alan mükelleflere sağlanan destekler: KDV istisnası (yatırım malı alımında), gümrük vergisi muafiyeti (ithal makine ekipman), vergi indirimi (KV oranı indirimli uygulanır - bölgesel destekler %15-90 arası), SGK işveren payı desteği, faiz desteği. 6. bölge yatırımlarında en yüksek destek oranları uygulanır.",
        "kurum": "HMB", "trust_class": "A",
        "kapsam_etiketleri": '["yatirim tesvik", "KDV istisna", "vergi indirimi"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },

    # ─── TEBLİĞLER (15) ───
    {
        "mevzuat_type": "teblig",
        "baslik": "KDV Genel Uygulama Tebliği",
        "kisa_aciklama": "KDV Kanunu uygulamasına ilişkin kapsamlı tebliğ. Tevkifat oranları, istisna uygulamaları ve iade prosedürleri.",
        "tam_metin": "KDV Genel Uygulama Tebliği, 3065 sayılı KDV Kanunu'nun uygulamasına ilişkin tüm usul ve esasları düzenler. Tebliğ 4 bölümden oluşur: (I) Mükellefiyet, (II) İstisna, (III) Matrah-oran-indirim, (IV) İade-vergilendirme. Tevkifat oranları: yapım işleri 4/10, temizlik-bahçe-çevre bakım 9/10, personel hizmeti 9/10, danışmanlık 9/10. İade talepleri internet vergi dairesi üzerinden yapılır.",
        "kurum": "GIB", "trust_class": "A",
        "mevzuat_no": None,
        "kapsam_etiketleri": '["KDV", "tevkifat", "istisna", "iade", "teblig"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "teblig",
        "baslik": "Muhtasar ve Prim Hizmet Beyannamesi Tebliği",
        "kisa_aciklama": "Muhtasar beyanname ile SGK prim bildirgesinin birleştirilmesi ve uygulama esasları.",
        "tam_metin": "Muhtasar ve Prim Hizmet Beyannamesi (MPHB) ile gelir vergisi stopajı ve SGK prim bildirimi tek beyannamede birleştirilmiştir. Beyanname takip eden ayın 26'sına kadar e-beyanname sistemi üzerinden verilir. Stopaj tutarı aynı ayın 26'sında, SGK primleri aynı ayın sonuna kadar ödenir. MPHB'de bildirilecek kalemler: personel ücretleri, serbest meslek ödemeleri, kira ödemeleri, yıllara sari inşaat hakedişleri.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["muhtasar", "SGK", "stopaj", "beyanname"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "teblig",
        "baslik": "VUK Genel Tebliği - Reeskont Oranı",
        "kisa_aciklama": "Vergi Usul Kanunu kapsamında senete bağlı alacak ve borçlarda reeskont işlemi ve oranları.",
        "tam_metin": "VUK Md.281-285 kapsamında vadesi gelmemiş senete bağlı alacak ve borçlar değerleme günündeki kıymetlerine irca olunabilir (reeskont). İç iskonto yöntemi uygulanır. Reeskont oranı TCMB avans işlemlerinde uygulanan faiz oranıdır. Reeskont ayrılması ihtiyaridir ancak alacak için reeskont ayıran mükellef borç senetleri için de reeskont ayırmak zorundadır. Reeskont tutarı gelir/gider olarak dönem sonuçlarına yansıtılır.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["reeskont", "VUK", "degerleme"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "teblig",
        "baslik": "E-Defter Genel Tebliği (Sıra No:1)",
        "kisa_aciklama": "Elektronik defter (e-defter) tutma zorunluluğu, uygulama esasları ve teknik gereksinimler.",
        "tam_metin": "VUK Md.242 kapsamında e-defter uygulaması zorunluluğu ve usul esasları düzenlenir. E-defter mükellefleri yevmiye defteri ve defteri kebiri elektronik ortamda tutmak zorundadır. E-defter beratları aylık olarak GİB'e iletilir. Berat yükleme süresi defterin ait olduğu ayı takip eden 3. ayın son gününe kadardır. Uyumlu yazılımlar: Luca, Logo, Netsis, Mikro, Eta, Zirve. Mali mühür veya e-imza zorunludur.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["e-defter", "VUK", "elektronik"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "teblig",
        "baslik": "Kurumlar Vergisi Genel Tebliği (Seri No:1)",
        "kisa_aciklama": "KVK uygulamasına ilişkin genel tebliğ. İstisnalar, indirimler ve beyanname düzeni.",
        "tam_metin": "Kurumlar Vergisi Genel Tebliği, 5520 sayılı KVK'nın uygulamasına ilişkin açıklamalar içerir. İştirak kazançları istisnası şartları, gayrimenkul satış kazancı istisnası (%50 istisna, 2 yıl elde tutma), yurt dışı iştirak kazançları, serbest bölge kazanç istisnası, Ar-Ge indirimi (%100), sponsorluk harcamaları indirimi, nakdi sermaye artışı indirimi (TCMB faiz oranı x %50) konularında detaylı açıklamalar yer alır.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["KVK", "istisna", "indirim", "teblig"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "teblig",
        "baslik": "Gelir Vergisi Genel Tebliği (Seri No:311)",
        "kisa_aciklama": "2026 yılı gelir vergisi tarifesi, istisna tutarları ve beyanname düzeni.",
        "tam_metin": "2026 yılı gelir vergisi tarifesi: 0-158.000 TL %15, 158.000-350.000 TL %20, 350.000-1.200.000 TL %27, 1.200.000-4.300.000 TL %35, 4.300.000 TL üzeri %40. Ücret gelirlerinde farklı tarife uygulanır. Konut kira geliri istisnası 33.000 TL. Engellilik indirimi tutarları 1. derece 9.000 TL/ay, 2. derece 5.200 TL/ay, 3. derece 2.300 TL/ay. Yıllık beyanname Mart ayının son günü verilir.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["GVK", "tarife", "istisna", "beyanname"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "teblig",
        "baslik": "Ba-Bs Formu Bildirimi Tebliği",
        "kisa_aciklama": "Ba (alış) ve Bs (satış) bildirim formlarının düzenlenmesi ve verilme süreleri.",
        "tam_metin": "VUK Md.148-149 kapsamında bilanço esasına göre defter tutan mükellefler aylık Ba-Bs formlarını vermek zorundadır. Bir kişi veya kurumdan KDV hariç 5.000 TL ve üzerinde mal/hizmet alımı (Ba) veya satışı (Bs) yapılması halinde bildirim yapılır. Formlar takip eden ayın son gününe kadar e-beyanname sistemi üzerinden verilir. Süresinde verilmeyen formlar için VUK Md.355 uyarınca özel usulsüzlük cezası kesilir.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["Ba-Bs", "bildirim", "VUK"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "teblig",
        "baslik": "Enflasyon Düzeltmesi Uygulama Tebliği",
        "kisa_aciklama": "VUK Mükerrer Md.298 kapsamında enflasyon düzeltmesi uygulama usul ve esasları.",
        "tam_metin": "2024 yılından itibaren yeniden uygulanan enflasyon düzeltmesinin usul ve esaslarını düzenler. Düzeltmeye tabi kalemler: stoklar, maddi duran varlıklar, maddi olmayan duran varlıklar, avanslar, öz sermaye kalemleri. Düzeltme katsayısı Yİ-ÜFE endeksi ile hesaplanır. Parasal kalemler (kasa, banka, alacak, borç) düzeltmeye tabi değildir. Düzeltme farkları gelir tablosunda 698-Enflasyon Düzeltme Hesabında muhasebeleştirilir.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["enflasyon", "duzeltme", "VUK", "degerleme"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "teblig",
        "baslik": "ÖTV Kanunu Uygulama Tebliği",
        "kisa_aciklama": "Özel Tüketim Vergisi Kanunu uygulamasına ilişkin tebliğ. ÖTV listeleri ve vergilendirme esasları.",
        "tam_metin": "4760 sayılı ÖTV Kanunu kapsamında 4 listede yer alan malların vergilendirilmesi düzenlenir. (I) sayılı liste: petrol ürünleri, doğalgaz, LPG - maktu vergi. (II) sayılı liste: motorlu taşıtlar - %10 ile %220 arası. (III) sayılı liste: alkollü içkiler, tütün - maktu+nispi karma vergi. (IV) sayılı liste: dayanıklı tüketim malları, elektronik - %6.7 ile %50 arası. ÖTV beyannamesi teslimin yapıldığı ayı izleyen ayın 15'ine kadar verilir.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["OTV", "teblig", "vergilendirme"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "teblig",
        "baslik": "Amortisman Oranları Genel Tebliği",
        "kisa_aciklama": "VUK kapsamında amortismana tabi iktisadi kıymetlerin faydalı ömür ve amortisman oranları.",
        "tam_metin": "VUK Md.315 kapsamında Maliye Bakanlığı her iktisadi kıymetin faydalı ömrünü ve amortisman oranını belirler. Yaygın oranlar: binalar 50 yıl (%2), taşıtlar 5 yıl (%20), bilgisayar ve yazılım 3-4 yıl (%25-33), mobilya ve dekorasyon 5-10 yıl, makine teçhizat 5-15 yıl. Normal amortisman dışında azalan bakiyeler yöntemi (normal oranın 2 katı, %50'yi aşamaz) seçilebilir. Seçilen yöntem en az 5 yıl değiştirilmez.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["amortisman", "VUK", "deger dusumu"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "teblig",
        "baslik": "Elektronik Tebligat Sistemi Tebliği",
        "kisa_aciklama": "Vergi dairelerinin tebligatlarının elektronik ortamda yapılmasına ilişkin usul ve esaslar.",
        "tam_metin": "VUK Md.107/A kapsamında vergi daireleri tarafından yapılacak tebligatlar elektronik ortamda yapılır. Gelir vergisi, kurumlar vergisi, KDV mükellefleri e-tebligat sistemine kayıt olmak zorundadır. Tebligat, muhatabın elektronik adresine ulaştığı tarihi izleyen 5. günün sonunda yapılmış sayılır. E-tebligat adresi internet vergi dairesi üzerinden başvuru ile alınır. Zorunlu olmasına rağmen başvuru yapmayanlara VUK Md.148 uyarınca ceza uygulanır.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["e-tebligat", "VUK", "elektronik"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "teblig",
        "baslik": "Vergi Usul Kanunu Genel Tebliği - Usulsüzlük Cezaları",
        "kisa_aciklama": "VUK kapsamında usulsüzlük ve özel usulsüzlük cezalarının 2026 yılı tutarları.",
        "tam_metin": "2026 yılı VUK usulsüzlük ceza tutarları: 1. derece usulsüzlük (sermaye şirketleri) 1.100 TL, 2. derece 550 TL. Özel usulsüzlük cezaları: fatura vermeme/almama 6.900 TL, Ba-Bs formu vermeme 4.600 TL, e-fatura yerine kağıt fatura düzenleme 6.900 TL, e-defter beratını süresinde iletmeme 4.600 TL. VUK 376 kapsamında uzlaşma veya cezada indirim talep edilebilir (1/3 indirim ilk tarhiyatta, 1/6 dava açmamak şartıyla).",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["ceza", "usulsuzluk", "VUK"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "teblig",
        "baslik": "Harçlar Kanunu Genel Tebliği - Yargı Harçları",
        "kisa_aciklama": "Yargı, noter, tapu ve ticaret sicili harçlarının 2026 yılı güncel tutarları.",
        "tam_metin": "492 sayılı Harçlar Kanunu kapsamında 2026 yılı harç tutarları: vergi mahkemesi başvuru harcı 576 TL, temyiz harcı 1.725 TL, noter harcı (düzenleme şeklinde) binde 1,13 oranında, tapu harcı (alım-satım) binde 20, ticaret sicili tescil harcı işleme göre değişir. İhracat işlemleri ve bazı yatırım teşvik belgesi kapsamındaki işlemler harçtan istisnadır.",
        "kurum": "HMB", "trust_class": "A",
        "kapsam_etiketleri": '["harc", "yargi", "noter", "tapu"]',
        "canonical_url": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=492&MevzuatTur=1&MevzuatTertip=4",
    },

    # ─── SİRKÜLERLER (10) ───
    {
        "mevzuat_type": "sirkular",
        "baslik": "Geçici Vergi Dönemleri ve Beyanname Süreleri Sirküleri",
        "kisa_aciklama": "Geçici vergi dönemleri, beyanname verme ve ödeme tarihleri hakkında GİB sirküleri.",
        "tam_metin": "GİB Sirküleri kapsamında geçici vergi dönemleri ve beyanname tarihleri: 1. Dönem (Ocak-Mart) beyanname 17 Mayıs, ödeme 17 Mayıs. 2. Dönem (Ocak-Haziran) beyanname 17 Ağustos, ödeme 17 Ağustos. 3. Dönem (Ocak-Eylül) beyanname 17 Kasım, ödeme 17 Kasım. 4. dönem geçici vergi beyannamesi kaldırılmıştır. Geçici vergi oranı kurumlar için %25, gelir vergisi mükellefleri için tarifenin ilk dilimi (%15) uygulanır.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["gecici vergi", "beyanname", "sirkular"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "sirkular",
        "baslik": "Yeniden Değerleme Oranı Sirküleri (2026)",
        "kisa_aciklama": "2026 yılı yeniden değerleme oranı ve vergi tutarlarına etkisi.",
        "tam_metin": "GİB Sirküleri ile 2026 yılı yeniden değerleme oranı açıklanmıştır. Bu oran VUK kapsamındaki maktu had ve tutarların (cezalar, fatura düzenleme sınırı, amortisman sınırı, usulsüzlük cezaları vb.) güncellenmesinde kullanılır. Yeniden değerleme oranı Yİ-ÜFE'nin son 12 aylık ortalamasına göre hesaplanır. 2025 yılı oranı %43,93 olarak belirlenmiştir.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["yeniden degerleme", "VUK", "oran"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "sirkular",
        "baslik": "Beyanname Verme Süreleri Uzatılması Sirküleri",
        "kisa_aciklama": "Mücbir sebep veya teknik arıza nedeniyle beyanname verme sürelerinin uzatılması.",
        "tam_metin": "VUK Md.17 kapsamında Maliye Bakanlığı mücbir sebep veya teknik arıza halinde beyanname verme sürelerini uzatabilir. Genellikle süre uzatımı son gün hafta sonuna denk geldiğinde takip eden iş günü otomatik uygulanır. Deprem, sel gibi doğal afetlerde bölgesel mücbir sebep ilan edilebilir. Mücbir sebep süresince vergi cezası ve gecikme zammı işlemez.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["beyanname", "sure uzatma", "mucbir sebep"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "sirkular",
        "baslik": "KDV Tevkifat Oranları Güncel Sirküleri",
        "kisa_aciklama": "KDV tevkifat oranlarının güncel listesi ve uygulama açıklamaları.",
        "tam_metin": "GİB Sirküleri kapsamında güncel KDV tevkifat oranları: temizlik, çevre ve bahçe bakım hizmetleri 9/10, personel temin hizmetleri 9/10, yapım işleri 4/10, makine-teçhizat bakım onarım 7/10, yemek servisi 5/10, servis taşımacılığı 5/10, baskı ve basım hizmetleri 5/10, kargo ve kurye 5/10, danışmanlık ve denetim hizmetleri 9/10. Tevkifat belirlenmiş alıcılar tarafından uygulanır.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["KDV", "tevkifat", "oran", "sirkular"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "sirkular",
        "baslik": "Asgari Ücret ve SGK Parametreleri Sirküleri (2026)",
        "kisa_aciklama": "2026 yılı asgari ücret, SGK tavan-taban, AGİ ve ilgili parametreler.",
        "tam_metin": "2026 yılı asgari ücret parametreleri: brüt asgari ücret 28.768,40 TL/ay (tahmini), net asgari ücret 22.850 TL/ay (tahmini). SGK tavan: asgari ücret x 7,5 = 215.763 TL. SGK taban: asgari ücret = 28.768,40 TL. SGK prim oranları: %14 işçi payı, %20,5 işveren payı (5 puanlık indirimle %15,5). Kıdem tazminatı tavanı 46.678 TL (tahmini). AGİ uygulaması 2023'ten itibaren asgari ücrete dahil edilmiştir.",
        "kurum": "GIB", "trust_class": "B",
        "kapsam_etiketleri": '["asgari ucret", "SGK", "prim", "2026"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "sirkular",
        "baslik": "Gecikme Zammı ve Gecikme Faizi Oranları",
        "kisa_aciklama": "6183 sayılı AATUHK kapsamında gecikme zammı ve VUK kapsamında gecikme faizi oranları.",
        "tam_metin": "6183 sayılı AATUHK Md.51 kapsamında gecikme zammı oranı aylık %3,5'tir (2024 yılı güncel). VUK Md.112 kapsamında gecikme faizi oranı gecikme zammı oranı ile aynıdır. Gecikme zammı vade tarihinden ödeme tarihine kadar her ay için hesaplanır. Ay kesirlerinde 1 aya kadar olan süreler 1 ay sayılır. Pişmanlık zammı oranı da aynıdır. VUK Md.371 kapsamında kendiliğinden beyan halinde %50 oranında gecikme faizi uygulanır.",
        "kurum": "HMB", "trust_class": "A",
        "kapsam_etiketleri": '["gecikme zammi", "faiz", "AATUHK", "6183"]',
        "canonical_url": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6183&MevzuatTur=1&MevzuatTertip=4",
    },

    # ─── YÖNETMELİKLER (8) ───
    {
        "mevzuat_type": "yonetmelik",
        "baslik": "SGK İşyeri Bildirgesi ve İşçi Giriş-Çıkış Yönetmeliği",
        "kisa_aciklama": "SGK işyeri tescili, sigortalı işe giriş-çıkış bildirimi usul ve esasları.",
        "tam_metin": "5510 sayılı Kanun kapsamında işverenler işyerini en geç sigortalı çalıştırmaya başladığı tarihte SGK'ya bildirmek zorundadır. Sigortalı işe giriş bildirimi işe başlama tarihinden 1 gün önce (inşaat ve balıkçılık sektöründe aynı gün), işten çıkış bildirimi çıkış tarihinden itibaren 10 gün içinde yapılır. Bildirimler e-Sigorta sistemi üzerinden yapılır. Süresinde bildirim yapılmaması halinde idari para cezası uygulanır.",
        "kurum": "SGK", "trust_class": "B",
        "kapsam_etiketleri": '["SGK", "ise giris", "bildirge", "sigorta"]',
        "canonical_url": "https://www.sgk.gov.tr/",
    },
    {
        "mevzuat_type": "yonetmelik",
        "baslik": "Kişisel Verilerin Korunması Yönetmeliği (KVKK)",
        "kisa_aciklama": "6698 sayılı KVKK kapsamında veri sorumlusu yükümlülükleri ve VERBİS kaydı.",
        "tam_metin": "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında yıllık çalışan sayısı 50'den fazla veya yıllık mali bilanço toplamı 100 milyon TL'den fazla olan veri sorumluları VERBİS'e (Veri Sorumluları Sicil Bilgi Sistemi) kayıt olmak zorundadır. Kişisel veri işleme şartları: açık rıza, kanun hükmü, sözleşmenin ifası, meşru menfaat. Veri ihlali halinde 72 saat içinde Kurul'a bildirim zorunludur. İdari para cezaları 100.000 TL - 10.000.000 TL arası.",
        "kurum": "HMB", "trust_class": "B",
        "kapsam_etiketleri": '["KVKK", "kisisel veri", "VERBiS"]',
        "canonical_url": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6698&MevzuatTur=1&MevzuatTertip=5",
    },
    {
        "mevzuat_type": "yonetmelik",
        "baslik": "Ticaret Sicili Yönetmeliği",
        "kisa_aciklama": "TTK kapsamında ticaret sicili tescil, ilan ve düzeltme işlemlerinin usul ve esasları.",
        "tam_metin": "6102 sayılı TTK kapsamında tüm ticaret şirketlerinin tescil işlemleri MERSİS (Merkezi Sicil Kayıt Sistemi) üzerinden yapılır. Kuruluş, sermaye artırımı/azaltımı, unvan değişikliği, adres değişikliği, müdür/yönetim kurulu değişikliği gibi işlemler tescile tabidir. Tescili gerektiren işlemler 15 gün içinde başvurulmalıdır. TTSG (Türkiye Ticaret Sicil Gazetesi) ilanları tescilden sonra yayımlanır.",
        "kurum": "HMB", "trust_class": "A",
        "kapsam_etiketleri": '["ticaret sicili", "TTK", "MERSiS", "tescil"]',
        "canonical_url": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6102&MevzuatTur=1&MevzuatTertip=5",
    },
    {
        "mevzuat_type": "yonetmelik",
        "baslik": "İş Sağlığı ve Güvenliği Yönetmeliği",
        "kisa_aciklama": "6331 sayılı İSG Kanunu kapsamında işveren yükümlülükleri ve risk değerlendirmesi.",
        "tam_metin": "6331 sayılı İş Sağlığı ve Güvenliği Kanunu kapsamında tüm işyerleri risk değerlendirmesi yapmak, iş güvenliği uzmanı ve işyeri hekimi bulundurmak zorundadır. Tehlike sınıfına göre yükümlülükler: az tehlikeli işyerleri (50+ çalışan: tam zamanlı uzman), tehlikeli (20+ çalışan), çok tehlikeli (10+ çalışan). İSG eğitimleri: az tehlikeli 8 saat, tehlikeli 12 saat, çok tehlikeli 16 saat. Bildirim: iş kazaları 3 iş günü içinde SGK'ya bildirilir.",
        "kurum": "SGK", "trust_class": "B",
        "kapsam_etiketleri": '["ISG", "is guvenligi", "risk degerlendirmesi"]',
        "canonical_url": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6331&MevzuatTur=1&MevzuatTertip=5",
    },
    {
        "mevzuat_type": "yonetmelik",
        "baslik": "Bağımsız Denetim Yönetmeliği",
        "kisa_aciklama": "KGK kapsamında bağımsız denetim zorunluluğu kriterleri ve denetim standartları.",
        "tam_metin": "6102 sayılı TTK ve KGK düzenlemeleri kapsamında bağımsız denetime tabi şirket kriterleri: aktif toplamı 150 milyon TL, net satış hasılatı 300 milyon TL, çalışan sayısı 150 kişi (2026 yılı - bu kriterlerden ikisini sağlayanlar). Bağımsız denetim raporu türleri: olumlu görüş, şartlı görüş, olumsuz görüş, görüş bildirmekten kaçınma. YMM'ler bağımsız denetim yapabilir.",
        "kurum": "HMB", "trust_class": "A",
        "kapsam_etiketleri": '["bagimsiz denetim", "KGK", "TTK"]',
        "canonical_url": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6102&MevzuatTur=1&MevzuatTertip=5",
    },
    {
        "mevzuat_type": "yonetmelik",
        "baslik": "E-İrsaliye Uygulaması Yönetmeliği",
        "kisa_aciklama": "Elektronik irsaliye (e-irsaliye) düzenleme zorunluluğu ve uygulama esasları.",
        "tam_metin": "VUK Md.230 kapsamında e-irsaliye uygulaması, mal hareketlerinin elektronik ortamda takibini sağlar. E-irsaliye zorunluluğu: e-fatura mükellefiyeti bulunan ve brüt satış hasılatı 25 milyon TL'yi aşan mükellefler. E-irsaliye malın fiili sevkinden önce düzenlenmelidir. Araçta bulunması gereken belge e-irsaliye yanıt belgesidir. GİB portal veya özel entegratör üzerinden düzenlenir.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["e-irsaliye", "VUK", "elektronik"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },

    # ─── GENELGELER (8) ───
    {
        "mevzuat_type": "genelge",
        "baslik": "SGK Prim Teşvikleri Uygulama Genelgesi",
        "kisa_aciklama": "İşveren SGK prim teşvikleri, 5 puanlık indirim ve genç istihdam teşviki uygulama esasları.",
        "tam_metin": "SGK prim teşvikleri: (1) 5510/81-ı: Tüm işverenler %5 indirim (malullük-yaşlılık-ölüm sigortası işveren payından), (2) 6111: İşsiz gençlerin istihdamı - 12 ay süreyle SGK primi Hazinece karşılanır, (3) 7252: Normalleşme desteği - kısa çalışma ödeneğinden normal çalışmaya geçen işyerlerine 3 ay destek, (4) 7103: İlave istihdam teşviki - 12 ay süreyle prim ve ücret desteği. Teşvikler e-Bildirge sisteminde beyan edilir.",
        "kurum": "SGK", "trust_class": "B",
        "kapsam_etiketleri": '["SGK", "tesvik", "prim", "istihdam"]',
        "canonical_url": "https://www.sgk.gov.tr/",
    },
    {
        "mevzuat_type": "genelge",
        "baslik": "Vergi Dairesi İşlem ve Beyanname Kabul Genelgesi",
        "kisa_aciklama": "Vergi dairelerinde beyanname kabulü, tarhiyat ve tahsilat işlemlerine ilişkin genelge.",
        "tam_metin": "GİB genelgesi kapsamında vergi dairelerinin beyanname kabul, tarhiyat ve tahsilat işlemleri düzenlenir. Tüm beyannameler e-beyanname sistemi üzerinden verilir. Elden veya posta ile beyanname kabul edilmez (istisnai durumlar hariç). Vergi borçlarının ödeme süresi: KDV takip eden ayın 28'i, Muhtasar takip eden ayın 26'sı, Kurumlar Vergisi Nisan sonu, Gelir Vergisi Mart sonu. Taksitli ödeme seçenekleri mevcuttur.",
        "kurum": "GIB", "trust_class": "A",
        "kapsam_etiketleri": '["beyanname", "vergi dairesi", "tahsilat"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "genelge",
        "baslik": "HMB Vergi İnceleme Süreçleri Genelgesi",
        "kisa_aciklama": "VDK vergi inceleme süreçleri, inceleme süreleri ve mükellef hakları.",
        "tam_metin": "Hazine ve Maliye Bakanlığı Vergi Denetim Kurulu (VDK) vergi incelemesi süreçleri: inceleme yazısı tebliği, defter ve belge isteme, inceleme tutanağı düzenleme, inceleme raporu yazma. İnceleme süreleri: tam inceleme 1 yıl (6 ay uzatma), sınırlı inceleme 6 ay (6 ay uzatma). Mükellef hakları: SMMM/YMM/avukat bulundurma hakkı, tutanağa şerh düşme hakkı, uzlaşma talep hakkı.",
        "kurum": "HMB", "trust_class": "A",
        "kapsam_etiketleri": '["vergi inceleme", "VDK", "mukellef haklari"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },
    {
        "mevzuat_type": "genelge",
        "baslik": "Uzlaşma Komisyonları Çalışma Genelgesi",
        "kisa_aciklama": "VUK Ek Md.1-12 kapsamında uzlaşma komisyonlarının çalışma usul ve esasları.",
        "tam_metin": "VUK Ek Md.1-12 kapsamında tarhiyat öncesi ve tarhiyat sonrası uzlaşma müesseseleri düzenlenir. Tarhiyat öncesi uzlaşma: inceleme raporunun tebliğinden önce talep edilir. Tarhiyat sonrası uzlaşma: vergi/ceza ihbarnamesinin tebliğinden itibaren 30 gün içinde talep edilir. Uzlaşma sağlanırsa vergi ve cezanın uzlaşılan kısmı kesinleşir, dava açılamaz. Uzlaşma sağlanamazsa dava yolu açıktır (30 gün içinde vergi mahkemesine).",
        "kurum": "HMB", "trust_class": "A",
        "kapsam_etiketleri": '["uzlasma", "VUK", "ceza", "tarhiyat"]',
        "canonical_url": "https://www.gib.gov.tr/gibmevzuat",
    },

    # ─── DANIŞTAY KARARLARI (8) ───
    {
        "mevzuat_type": "danistay_karar",
        "baslik": "Danıştay 4. Daire - Sahte Fatura Kullanımı Emsal Karar",
        "kisa_aciklama": "Sahte fatura (naylon fatura) kullanımında KDV indirimi reddi ve vergi ziyaı cezası.",
        "tam_metin": "Danıştay 4. Daire kararı: Sahte veya muhteviyatı itibariyle yanıltıcı belge kullanan mükellefin KDV indirimi reddedilir. Sahte fatura kullanımının tespitinde: (1) Ba-Bs form çapraz kontrolü, (2) Alt firma incelemeleri, (3) Nakit akış analizi, (4) Mal/hizmet alım gerçekliği. Mükellef iyi niyetini ve gerçek bir ticari ilişkinin varlığını ispatlayarak cezadan kurtulabilir. İspat yükü mükelleftedir.",
        "kurum": "DANISTAY", "trust_class": "A",
        "kapsam_etiketleri": '["sahte fatura", "KDV", "ceza", "Danistay"]',
        "canonical_url": "https://www.danistay.gov.tr/",
    },
    {
        "mevzuat_type": "danistay_karar",
        "baslik": "Danıştay 3. Daire - Transfer Fiyatlandırması Emsal Karar",
        "kisa_aciklama": "İlişkili kişilerle yapılan işlemlerde transfer fiyatlandırması düzeltmesi ve örtülü kazanç dağıtımı.",
        "tam_metin": "Danıştay 3. Daire kararı: KVK Md.13 kapsamında ilişkili kişilerle yapılan işlemlerde emsallere uygunluk ilkesine uyulmaması halinde örtülü kazanç dağıtımı yapıldığı kabul edilir. Emsal fiyat belirleme yöntemleri arasında en güvenilir sonucu veren yöntem tercih edilmelidir. Karşılaştırılabilir fiyat yöntemi öncelikli uygulanır. Belgelendirme yükümlülüğü (yıllık TP raporu) yerine getirilmezse ispat yükü mükellefe geçer.",
        "kurum": "DANISTAY", "trust_class": "A",
        "kapsam_etiketleri": '["transfer fiyatlandirmasi", "KVK", "Danistay", "emsal"]',
        "canonical_url": "https://www.danistay.gov.tr/",
    },
    {
        "mevzuat_type": "danistay_karar",
        "baslik": "Danıştay VDDK - Kasa Fazlası Adat Hesaplaması Emsal Karar",
        "kisa_aciklama": "Kasa hesabı fazlalığında adat faizi hesaplaması ve gelir kaydedilmesi.",
        "tam_metin": "Danıştay Vergi Dava Daireleri Kurulu kararı: Bilanço esasına göre defter tutan mükelleflerde kasa hesabında gerçek dışı bakiye oluşması (kasa fazlası) halinde, fazla tutar üzerinden adat yöntemiyle faiz hesaplanarak gelir kaydedilir. Kasa mevcudunun fiili sayım ile uyuşmaması vergi incelemesi başlatma gerekçesidir. SMMM'ler kasa hesabını aylık olarak kontrol etmeli ve gerçek dışı bakiyeleri düzeltmelidir.",
        "kurum": "DANISTAY", "trust_class": "A",
        "kapsam_etiketleri": '["kasa fazlasi", "adat", "VUK", "Danistay"]',
        "canonical_url": "https://www.danistay.gov.tr/",
    },
    {
        "mevzuat_type": "danistay_karar",
        "baslik": "Danıştay 9. Daire - Şüpheli Alacak Karşılığı Emsal Karar",
        "kisa_aciklama": "Şüpheli alacak karşılığı ayırma şartları ve süresinde ayrılmamanın sonuçları.",
        "tam_metin": "Danıştay 9. Daire kararı: VUK Md.323 kapsamında şüpheli alacak karşılığı, alacağın şüpheli hale geldiği hesap döneminde ayrılmalıdır. Sonraki dönemlerde karşılık ayırma hakkı kullanılamaz. Şüphelilik şartları: (1) Ticari veya zirai kazançla ilgili olmalı, (2) Dava veya icra safhasında olmalı, (3) Teminatsız veya teminatı aşan kısım için ayrılmalı. Grup şirketlerinden alacaklarda ve hatır senetlerinde karşılık ayrılamaz.",
        "kurum": "DANISTAY", "trust_class": "A",
        "kapsam_etiketleri": '["supheli alacak", "karsilik", "VUK", "Danistay"]',
        "canonical_url": "https://www.danistay.gov.tr/",
    },
    {
        "mevzuat_type": "danistay_karar",
        "baslik": "Danıştay 7. Daire - KDV İade Reddi Emsal Karar",
        "kisa_aciklama": "KDV iade talebinin reddedilme nedenleri ve itiraz süreci.",
        "tam_metin": "Danıştay 7. Daire kararı: KDV iade taleplerinin reddedilme nedenleri: (1) Sahte fatura kullanımı şüphesi, (2) Alt firmalarda olumsuz tespit, (3) Belge eksikliği, (4) Olumsuz rapor. İade talebi reddedilen mükellef 30 gün içinde vergi mahkemesine dava açabilir. YMM raporuyla yapılan iadelerde YMM müteselsil sorumludur. Teminat mektubu ile yapılan iadelerde inceleme sonucuna göre teminat iade edilir veya paraya çevrilir.",
        "kurum": "DANISTAY", "trust_class": "A",
        "kapsam_etiketleri": '["KDV", "iade", "red", "Danistay"]',
        "canonical_url": "https://www.danistay.gov.tr/",
    },
    {
        "mevzuat_type": "danistay_karar",
        "baslik": "Danıştay 4. Daire - Gayrimenkul Satış İstisnası Emsal Karar",
        "kisa_aciklama": "KVK 5/1-e kapsamında taşınmaz satış kazancı istisnası şartları ve uygulanması.",
        "tam_metin": "Danıştay 4. Daire kararı: KVK Md.5/1-e kapsamında gayrimenkul satış kazancı istisnasından yararlanma şartları: (1) Taşınmaz en az 2 tam yıl aktifte kayıtlı olmalı, (2) Satış bedeli 2 yıl içinde tahsil edilmeli, (3) İstisna kazanç (%50) 5 yıl özel fon hesabında tutulmalı, (4) Taşınmaz ticareti faaliyeti olmamalı. Fon hesabı 5 yıl içinde sermayeye ilave edilebilir veya işletmede bırakılabilir. Satış hasılatı kurumlar vergisi beyannamesinde gösterilmelidir.",
        "kurum": "DANISTAY", "trust_class": "A",
        "kapsam_etiketleri": '["gayrimenkul", "istisna", "KVK", "Danistay"]',
        "canonical_url": "https://www.danistay.gov.tr/",
    },
]


def run():
    """Ana çalıştırma fonksiyonu"""
    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Mevcut kayıtları güncelle (canonical_url + tam_metin)
        updated = 0
        for baslik, url, metin in UPDATES:
            cursor.execute("""
                UPDATE mevzuat_refs
                SET canonical_url = COALESCE(?, canonical_url),
                    tam_metin = ?,
                    updated_at = datetime('now')
                WHERE baslik = ?
            """, (url, metin, baslik))
            if cursor.rowcount > 0:
                updated += cursor.rowcount

        print(f"Güncellenen kayıt: {updated}")

        # 2. Yeni kayıtlar ekle
        inserted = 0
        for rec in NEW_RECORDS:
            rec_id = _id()
            src_code = f"SRC-{rec_id[:4].upper()}"
            try:
                cursor.execute("""
                    INSERT INTO mevzuat_refs (
                        id, src_code, mevzuat_type, mevzuat_no, madde, fikra,
                        baslik, kisa_aciklama, tam_metin, kurum, trust_class,
                        kapsam_etiketleri, affected_rules, canonical_url,
                        is_active, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, 1,
                              datetime('now'), datetime('now'))
                """, (
                    rec_id, src_code,
                    rec["mevzuat_type"],
                    rec.get("mevzuat_no"),
                    rec.get("madde"),
                    rec.get("fikra"),
                    rec["baslik"],
                    rec["kisa_aciklama"],
                    rec["tam_metin"],
                    rec["kurum"],
                    rec["trust_class"],
                    rec.get("kapsam_etiketleri", "[]"),
                    rec.get("canonical_url"),
                ))
                inserted += 1
            except Exception as e:
                print(f"HATA ({rec['baslik'][:40]}): {e}")

        conn.commit()
        print(f"Yeni eklenen kayıt: {inserted}")

        # 3. İstatistikler
        total = cursor.execute("SELECT COUNT(*) FROM mevzuat_refs").fetchone()[0]
        print(f"\nToplam kayıt: {total}")
        rows = cursor.execute(
            "SELECT mevzuat_type, COUNT(*) as cnt FROM mevzuat_refs GROUP BY mevzuat_type ORDER BY cnt DESC"
        ).fetchall()
        for r in rows:
            print(f"  {r[0]}: {r[1]}")

    # 4. FTS5 index'i yeniden oluştur
    count = rebuild_fts_index()
    print(f"\nFTS5 index yeniden oluşturuldu: {count} kayıt")

    # 5. Test araması
    with get_connection() as conn:
        cursor = conn.cursor()
        for term in ["kdv istisna", "transfer fiyatlandırması", "sgk prim", "sahte fatura"]:
            rows = cursor.execute(
                "SELECT baslik FROM mevzuat_refs_fts WHERE mevzuat_refs_fts MATCH ? LIMIT 3",
                (term,)
            ).fetchall()
            print(f"\nArama: '{term}' → {len(rows)} sonuç")
            for r in rows:
                print(f"  - {r[0][:60]}")


if __name__ == "__main__":
    run()
