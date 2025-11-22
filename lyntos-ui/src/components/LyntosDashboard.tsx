"use client";
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAnalyze, type PanelData } from "@/lib/api";
import { parseComplianceMarkdown } from "@/lib/complianceParser";

import FileUpload from "@/components/FileUpload";
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import InfoIcon from "@mui/icons-material/InfoOutlined";
import CloseIcon from "@mui/icons-material/Close";

import BankReconcileLine from "@/components/panels/BankReconcileLine";
import MizanPanel from "@/components/panels/MizanPanel";
import CounterpartyPanel from "@/components/panels/CounterpartyPanel";
import CompliancePanel from "@/components/panels/CompliancePanel";
import AIAnalysisPanel from "@/components/panels/AIAnalysisPanel";
import VDKExpertPanel from "@/components/panels/VDKExpertPanel";

import FMEAPanel from "@/components/panels/FMEAPanel";
import BowTiePanel from "@/components/panels/BowTiePanel";
import FraudPanel from "@/components/panels/FraudPanel";
import FiveWhys from "@/components/panels/FiveWhys";
import ReasonCards from "@/components/panels/ReasonCards";
import IshikawaLite from "@/components/panels/IshikawaLite";
import BenfordPanel from "@/components/panels/BenfordPanel";
import CAPAPanel from "@/components/panels/CAPAPanel";
import Matrix13 from "@/components/panels/Matrix13";
import { AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";

// ----- Bilgi içerikleri merkezi
const PANEL_INFOS = {
  kurgan: "‘Kurgan Skoru’ bütün algoritmaların ortak risk skorudur. Firma/dönemin risk barometresi olarak değerlendirilir.",
  smiyb: "SMİYB Riski: Sahte veya yanıltıcı belge/işlem ağırlığı. Kritik ise mükellef ceza riskiyle karşılaşabilir.",
  radar: "Radar Analizi: Birden fazla risk sinyali/farklı modüllerden gelen çapraz alarmın ortak skoru.",
  beyan: "Beyan Uyum: Firmadaki beyannamelerin mevzuata uygun, zamanında ve eksizsiz girildiği skala.",
  riskPie: (
    <div>
      <b>Risk Dağılımı Grafiği:</b><br />
      Grafik SMİYB (Yüksek Risk – kırmızı), RADAR (Orta Risk – sarı), BEYAN (Düşük Risk – yeşil) skoru bazında dönemin risk tablosunu gösterir.<br />
      Yükseklik, firmanın o alandaki tehlikesini/öncelik sırasını remiz eder. SMMM bu renk ve oranlara göre riskli alanlara öncelik vermeli.<br/>
      Kırmızı ağırlıklıysa: Sahte belge/yanıltıcı işlem<br/>
      Sarı fazlaysa: Risk sinyali çoktur ama kanıtlanmamıştır<br/>
      Yeşil yüksekse: Mevzuat uyumu genellikle iyi demektir.
    </div>
  ),
};

const SMMM_NAME = "HAKKI ÖZKAN";

// ------ MODAL ANALYZES ------
const MODALS = [
  { key: "fmea",   title: "FMEA Risk Analizi", comp: FMEAPanel, info: <>Hata modları, tespit, neden, kanıt, sonuç ve öneri şeklinde detaylanır.</> },
  { key: "bowtie", title: "BowTie Kontrol",    comp: BowTiePanel, info: <>Risk ve önlem zinciri neden, tespit, delil ve öneriyle gösterilir.</> },
  { key: "fraud",  title: "Ağ/Fraud Analizi",  comp: FraudPanel, info: <>İşlem ağı, bulgu, tespit, kanıt ve öneriyle analiz edilir.</> },
  { key: "fivewhy",title: "5 Neden Analizi",   comp: FiveWhys, info: <>Kök neden zinciri (her adımda neden, kanıt, çözüm akışı açıklamalı). </> },
  { key: "smiyb",  title: "SMİYB Analiz",      comp: ReasonCards, info: <>Sahte belge/yanıltıcı işlemlerin neden, kanıt, sonuç ve önerileri.</> },
  { key: "ishikawa",title:"Ishikawa Analizi",  comp: IshikawaLite, info: <>Neden-sonuç haritası: kategori, delil, öneri. </> },
  { key: "matrix13",title:"Matrix 13",         comp: Matrix13, info: <>13 farklı risk başlığı altında tespit, öneri ve sonuca detaylı bakabilirsin.</> },
  { key: "benford", title:"Benford Outlier",   comp: BenfordPanel, info: <>Sayısal sapma istatistikleri: neden, kanıt-bulgu, sonuç ve öneri açıklamalı</> },
  { key: "capa",    title:"CAPA/8D İzleme",    comp: CAPAPanel, info: <>Düzeltici aksiyon zinciri (neden, kanıt, önlem ve öneri açıklamalı)</> },
];

// ----------- ANA DOSYA, HİÇBİR EKSİK OLMADAN -----------
export default function LyntosDashboard() {
  const [filters, setFilters] = useState<{ firma: string; donem: string }>(() => (
    typeof window !== "undefined" ? (JSON.parse(localStorage.getItem("lyntos_filters")||"null") || { firma: "OZKANLAR", donem: "2025-Q3" }) : { firma: "OZKANLAR", donem: "2025-Q3" }
  ));
  const [kpiInfo, setKpiInfo] = useState<string|null>(null);
  const [modalKey, setModalKey] = useState<string|null>(null);
  const [pieInfoOpen, setPieInfoOpen] = useState(false);

  const q = useQuery<PanelData>({
    queryKey: ["analyze", filters.firma, filters.donem],
    queryFn: () => fetchAnalyze(filters),
    staleTime: 5 * 60 * 1000,
  });

  // KPI kartları
  const kpis = useMemo(() => {
    const d = q.data;
    if (!d) return [];
    const trend = d.trend ?? [];
    const last = trend.at(-1)?.score ?? 0;
    const prev = trend.at(-2)?.score ?? last;
    const pctRaw = prev ? Math.round(((last - prev) / Math.abs(prev)) * 100) : 0;
    return [
      { key: "kurgan", title: "Kurgan Skoru", value: Math.round(d?.parts?.kurgan ?? d?.kurgan ?? 0), hint: d?.donem ?? "", delta: pctRaw },
      { key: "smiyb", title: "SMİYB Riski", value: Math.round(d?.parts?.smiyb ?? 0), hint: "Sahte belge tespiti", delta: pctRaw },
      { key: "radar", title: "RADAR Analizi", value: Math.round(d?.parts?.radar ?? 0), hint: "Çoklu sinyal skoru", delta: pctRaw },
      { key: "beyan", title: "Beyan Uyum", value: Math.round(d?.parts?.beyan ?? 0), hint: "Vergi & SGK disiplin", delta: pctRaw },
    ];
  }, [q.data]);

  const riskPieData = [
    { label: "Yüksek Risk", value: Math.round(q.data?.parts?.smiyb ?? 0), color: "#c0392b" },
    { label: "Orta Risk", value: Math.round(q.data?.parts?.radar ?? 0), color: "#f1c40f" },
    { label: "Düşük Risk", value: Math.round(q.data?.parts?.beyan ?? 0), color: "#27ae60" },
  ].filter(d => d.value > 0);

  // Ana detaylı paneller
  const bigPanels = [
    {
      key: "bank",
      title: "Banka Detaylı Analizi",
      desc: "Banka hesaplarının tamamı için mutabakat, eksik, kanıt, neden, öneri.",
      Comp: BankReconcileLine,
    },
    {
      key: "mizan",
      title: "Mizan Detaylı Analizi",
      desc: "Tüm kayıtlardaki hata, tutarsızlık ve düzeltme önerileri.",
      Comp: MizanPanel,
    },
    {
      key: "counterparty",
      title: "Karşı Taraf Detaylı Analizi",
      desc: "Firmadaki müşteri/tedarikçi risk, alarm, tespit ve öneri incele.",
      Comp: CounterpartyPanel,
    },
    {
      key: "compliance",
      title: "Beyanname / SGK Detaylı Analizi",
      desc: "Vergi/SGK işlemlerinin mevzuatta tam uyumu, yapılan eksik/gecikmeli işler, öneri ve detaylarla.",
      Comp: CompliancePanel,
      parse: parseComplianceMarkdown,
    }
  ];

  // CURRENT MODAL
  const currentModal = MODALS.find(m => m.key === modalKey);

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* HEADER */}
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <img src="/lyntos-logo.svg" alt="Lyntos Logo" className="h-8 w-8" />
          <span className="text-xl font-bold text-blue-800">LYNTOS SMMM Paneli</span>
        </div>
        <div className="flex items-center gap-3">
          <Avatar name={SMMM_NAME} />
          <span className="text-base font-semibold text-slate-800">{SMMM_NAME}</span>
          <button className="ml-3 px-3 py-1 rounded bg-slate-100 text-xs text-slate-700 hover:bg-blue-100" onClick={() => alert("Çıkış yapıldı!")}>Çıkış Yap</button>
        </div>
      </header>
      {/* Dosya Yükleme */}
      <FileUpload onUploaded={() => window.location.reload()} />

      {/* Filtre barı */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 px-8 py-4 bg-white border-b">
        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium text-slate-700">Firma:</span>
          <select value={filters.firma} onChange={e => setFilters({ ...filters, firma: e.target.value })} className="border px-2 py-1 rounded">
            <option>OZKANLAR</option>
            {/* Diğer firmaları ekle */}
          </select>
          <span className="text-sm font-medium ml-3 text-slate-700">Dönem:</span>
          <select value={filters.donem} onChange={e => setFilters({ ...filters, donem: e.target.value })} className="border px-2 py-1 rounded">
            <option>2025-Q3</option>
            {/* Diğer dönemler */}
          </select>
          <button className="ml-3 px-3 py-1 rounded bg-blue-700 text-white font-semibold hover:bg-blue-900"
            onClick={() => typeof window !== "undefined" && localStorage.setItem("lyntos_filters", JSON.stringify(filters))}
          >Uygula</button>
        </div>
      </div>

      {/* KPI KARTLARI: bilgi penceresi ile */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 my-8 px-8">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.key}
            className="bg-white rounded-2xl p-6 shadow flex flex-col items-start gap-3 cursor-pointer group hover:shadow-lg transition"
            onClick={() => setKpiInfo(kpi.key)}
          >
            <span className="font-bold text-lg mb-1">{kpi.title}
              <InfoIcon className="ml-2 inline-block text-blue-600 group-hover:text-blue-900" style={{fontSize:22,verticalAlign:"middle"}} />
            </span>
            <span className="text-4xl font-extrabold">{kpi.value}</span>
            <div className="text-xs text-slate-500">{kpi.hint}</div>
          </div>
        ))}
      </section>
      <Modal open={!!kpiInfo} onClose={() => setKpiInfo(null)}>
        <div className="bg-white rounded-2xl p-6 shadow max-w-md">
          <button className="absolute right-3 top-3 text-gray-400 hover:text-red-500" onClick={()=>setKpiInfo(null)}><CloseIcon/></button>
          <h3 className="text-xl font-bold text-blue-900 mb-2">{kpis.find(k=>k.key===kpiInfo)?.title} Bilgisi</h3>
          <div className="text-base">{kpiInfo && PANEL_INFOS[kpiInfo]}</div>
        </div>
      </Modal>

      {/* Risk Pie Chart alanı bilgi tuşuyla */}
      {riskPieData.length > 0 && (
        <section className="bg-white rounded-2xl mx-8 my-6 p-6 shadow flex flex-col items-start relative">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-lg text-slate-800">Risk Dağılımı</h3>
            <button onClick={()=>setPieInfoOpen(true)}>
              <InfoIcon className="text-blue-600 hover:text-blue-900" />
            </button>
          </div>
          <PieChart width={280} height={150}>
            <Pie data={riskPieData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={60}
              label={({ label, value }) => `${label}: ${value}`} fill="#8884d8">
              {riskPieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
            </Pie>
            <Tooltip />
          </PieChart>
        </section>
      )}
      <Modal open={pieInfoOpen} onClose={()=>setPieInfoOpen(false)}>
        <div className="bg-white rounded-2xl p-6 shadow max-w-md">
          <button className="absolute right-3 top-3 text-gray-400 hover:text-red-500" onClick={()=>setPieInfoOpen(false)}><CloseIcon/></button>
          <h3 className="text-xl font-bold text-blue-900 mb-2">Risk Dağılımı Grafiği Bilgi</h3>
          <div>{PANEL_INFOS.riskPie}</div>
        </div>
      </Modal>

      {/* Ana detaylı büyük analiz panelleri */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8 px-8 my-8">
        {bigPanels.map(({key,title,desc,Comp,parse}) => (
          <div key={key} className="bg-white rounded-2xl shadow p-6 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl font-bold text-blue-900">{title}</span>
              <button title="Detay" className="hover:bg-blue-100 rounded p-1" onClick={() => setModalKey(key)}>
                <InfoIcon />
              </button>
            </div>
            <span className="block text-gray-600 text-sm mb-2">{desc}</span>
            <Comp data={parse ? parse(q.data?.[key] || "") : (q.data?.[key] || {})} />
          </div>
        ))}
      </div>

      {/* ALTTA AI+VDK yan yana */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-blue-800">AI Analizi</h2>
            <button className="hover:bg-blue-100 rounded p-1" onClick={()=>setModalKey('ai')}><InfoIcon/></button>
          </div>
          <AIAnalysisPanel data={q.data?.ai ?? {}} />
        </div>
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-700">VDK Uzman Analizi</h2>
            <button className="hover:bg-blue-100 rounded p-1" onClick={()=>setModalKey('vdk')}><InfoIcon/></button>
          </div>
          <VDKExpertPanel data={q.data?.vdk ?? {}} />
        </div>
      </div>

      {/* MODAL ANALYZES */}
      {modalKey && (
        <Modal open={!!modalKey} onClose={()=>setModalKey(null)}>
          <div className="bg-white p-6 rounded-2xl shadow max-w-2xl relative">
            <button className="absolute right-3 top-3 text-gray-400 hover:text-red-500" onClick={()=>setModalKey(null)}><CloseIcon/></button>
            <h2 className="text-xl font-bold text-blue-900 mb-2">
              {(MODALS.find(m=>m.key===modalKey)?.title)||modalKey}
            </h2>
            <div className="text-sm text-sky-800 mb-3">
              {(MODALS.find(m=>m.key===modalKey)?.info)}
            </div>
            {(() => {
              const ModalComp = MODALS.find(m=>m.key===modalKey)?.comp;
              let modalData = q.data?.[modalKey] ?? {};
              if (modalKey === "compliance" && ModalComp && parseComplianceMarkdown)
                modalData = parseComplianceMarkdown(q.data?.[modalKey]||"");
              return ModalComp && <ModalComp data={modalData} />;
            })()}
          </div>
        </Modal>
      )}

      {/* FOOTER */}
      <footer className="bg-white border-t p-6 mt-12 text-center text-sm text-slate-500">
        <div>
          <b>Bu panel, SMMM {SMMM_NAME} özel hazırlanmıştır.</b><br />
          LYNTOS SMMM Paneli &copy; 2025 • Tüm hakları saklıdır ·
          <a href="mailto:destek@lyntos.com" className="text-blue-700 underline ml-2">destek@lyntos.com</a>
        </div>
      </footer>
    </div>
  );
}