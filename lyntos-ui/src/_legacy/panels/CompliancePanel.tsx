import React, { useState } from "react";
import { ComplianceData } from "../../lib/complianceParser";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";

type Props = { data: ComplianceData | null };

export default function CompliancePanel({ data }: Props) {
  const [open, setOpen] = useState(false);

  const infoText = (
    <div style={{lineHeight:1.7, fontSize:"1.03em"}}>
      <b>Nedir?</b> Vergi ve SGK mevzuatına uyumdur. <br/>
      <b>Ne işe yarar?</b> Eksik/gecikmeli iş/riskleri gösterir.<br/>
      <b>SMMM için:</b> Tavsiye & aksiyon — ceza riskini azaltma.<br/>
      <b>Kullanım:</b> Infoya tıkla, detay incele!
    </div>
  );

  return (
    <div className="bg-white shadow rounded-2xl p-6 mb-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-lg font-bold text-blue-900">Uyum Paneli</div>
        <IconButton onClick={()=>setOpen(true)}><InfoOutlinedIcon/></IconButton>
      </div>
      <Dialog open={open} onClose={()=>setOpen(false)}>
        <DialogTitle>Panel Bilgi Notu</DialogTitle>
        <DialogContent>{infoText}</DialogContent>
      </Dialog>
      {/* Her kutu, veriyle ya da yoksa "veri yok" mesajıyla */}
      <div className="space-y-4">
        <PanelSection title="Risk Analizi" value={data?.risk} />
        <PanelSection title="Bulgu" value={data?.bulgu} />
        <PanelSection title="Uyarı" value={data?.uyari} />
        <PanelSection title="Skor" value={data?.skor} />
        <PanelSection title="Aksiyonlar" value={
          data?.aksiyonlar && data.aksiyonlar.length
            ? <ul className="list-disc pl-5">{data.aksiyonlar.map((x,i)=><li key={i}>{x}</li>)}</ul>
            : undefined
        } />
      </div>
    </div>
  );
}
function PanelSection({title, value}:{title:string, value?:any}) {
  return (
    <div>
      <div className="font-semibold">{title}</div>
      <div>{(value && value!=="") ? value : <span className="text-gray-400">Veri yok.</span>}</div>
    </div>
  );
}