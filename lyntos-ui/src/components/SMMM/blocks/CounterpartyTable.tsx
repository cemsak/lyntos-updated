"use client";
export default function CounterpartyTable({ rows }: { rows: any[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 overflow-auto">
      <div className="text-sm text-slate-500 mb-2">Karşı Firma Riskleri</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th>Ünvan</th>
            <th>VKN</th>
            <th>Risk</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((r, i) => (
            <tr key={i} className="border-t">
              <td className="py-1">{r.unvan}</td>
              <td className="py-1">{r.vergi_no}</td>
              <td className="py-1">{r.risk}</td>
              <td className="py-1">{r.durum}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
