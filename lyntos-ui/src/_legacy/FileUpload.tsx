import React, { useState } from "react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function FileUpload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [veriTipi, setVeriTipi] = useState("banka");
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("veri_tipi", veriTipi);

    try {
      const res = await fetch("http://localhost:8000/upload/", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Sunucu hatası: " + res.status);
      const data = await res.json();
      setLoading(false);
      toast.success(`Dosya başarıyla yüklendi: ${data.filename}`);
      onUploaded && onUploaded(data);
    } catch (err) {
      setLoading(false);
      toast.error("Yükleme başarısız: " + err.message);
    }
  };

  return (
    <form onSubmit={handleUpload} className="p-4 border rounded mb-4">
      <ToastContainer position="top-center" />
      <label>Dosya seç:</label>
      <input type="file" onChange={e => setFile(e.target.files[0])} required />
      <label className="ml-2">Veri Tipi:</label>
      <select value={veriTipi} onChange={e => setVeriTipi(e.target.value)} className="ml-2">
        <option value="banka">Banka</option>
        <option value="mizan">Mizan</option>
        <option value="beyanname">Beyanname</option>
        <option value="edefter">E-defter</option>
        <option value="musteri">Müşteri</option>
      </select>
      <button type="submit" className="ml-2 px-3 py-1 bg-blue-600 text-white rounded" disabled={loading}>
        {loading ? "Yüklüyor..." : "Yükle"}
      </button>
    </form>
  );
}