#!/usr/bin/env python3
import argparse
from pathlib import Path
import csv

def parse_tr_number(s: str) -> float:
    s = (s or "").strip()
    if not s or s == "-":
        return 0.0
    # Türkçe sayı: 1.234,56 -> 1234.56
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0

def fmt_tr_number(x: float) -> str:
    # ÖNEMLİ: mizan_parser '.' karakterini binlik ayırıcı kabul edip siliyor.
    # Bu yüzden ondalık ayıracı MUTLAKA ',' olmalı. Binlik koymuyoruz.
    return f"{x:.2f}".replace(".", ",")

def find_col(header, candidates):
    norm = [ (c or "").strip().upper() for c in header ]
    for cand in candidates:
        c = cand.strip().upper()
        for i, h in enumerate(norm):
            if h == c:
                return i
    # gevşek eşleşme (içeriyorsa)
    for cand in candidates:
        c = cand.strip().upper()
        for i, h in enumerate(norm):
            if c and c in h:
                return i
    return None

def read_mizan_table(path: Path):
    with path.open("r", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f, delimiter=";"))
    header_idx = None
    for i, r in enumerate(rows):
        if not r:
            continue
        if (r[0] or "").strip().upper() == "HESAP KODU":
            header_idx = i
            break
    if header_idx is None:
        raise RuntimeError(f"HESAP KODU başlığı bulunamadı: {path}")

    header = [ (c or "").strip() for c in rows[header_idx] ]
    data = rows[header_idx+1:]
    # boş satırları atma, ama kolon sayısını header'a eşitle
    fixed = []
    for r in data:
        if not any((c or "").strip() for c in r):
            continue
        if len(r) < len(header):
            r = list(r) + [""] * (len(header) - len(r))
        fixed.append(r[:len(header)])
    return header, fixed

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--period-dir", required=True)
    ap.add_argument("--cum", required=True, help="Q2 kümülatif dosya adı (örn mizan_cum.csv)")
    ap.add_argument("--base", required=True, help="Q1 kümülatif dosya adı (örn mizan_base.csv)")
    ap.add_argument("--out", required=True, help="çıktı dosya adı (genelde mizan.csv)")
    ap.add_argument("--pl-prefixes", default="6,7", help="delta uygulanacak hesap sınıfları (örn 6,7 veya 6,7,8,9)")
    args = ap.parse_args()

    period_dir = Path(args.period_dir).expanduser().resolve()
    cum_path = period_dir / args.cum
    base_path = period_dir / args.base
    out_path = period_dir / args.out

    if not cum_path.exists():
        raise SystemExit(f"CUM dosyası yok: {cum_path}")
    if not base_path.exists():
        raise SystemExit(f"BASE dosyası yok: {base_path}")

    header_c, rows_c = read_mizan_table(cum_path)
    header_b, rows_b = read_mizan_table(base_path)

    # kolonlar (cum header üzerinden)
    i_code = find_col(header_c, ["HESAP KODU", "Hesap Kodu", "Kod"])
    i_borc = find_col(header_c, ["BORÇ", "Borç", "Borç Toplamı"])
    i_alacak = find_col(header_c, ["ALACAK", "Alacak", "Alacak Toplamı"])
    i_bb = find_col(header_c, ["BORÇ BAKİYESİ", "BORÇ BAKİYE", "Bakiye Borç", "Borç Bakiye"])
    i_ba = find_col(header_c, ["ALACAK BAKİYESİ", "ALACAK BAKİYE", "Bakiye Alacak", "Alacak Bakiye"])

    missing = [("HESAP KODU", i_code), ("BORÇ", i_borc), ("ALACAK", i_alacak), ("BORÇ BAKİYESİ", i_bb), ("ALACAK BAKİYESİ", i_ba)]
    miss = [name for name, idx in missing if idx is None]
    if miss:
        raise SystemExit(f"Beklenen kolon(lar) bulunamadı (cum header): {miss}\nHeader: {header_c}")

    # base index: hesap_kodu -> (borc, alacak, bb, ba)
    base_map = {}
    for r in rows_b:
        code = (r[i_code] or "").strip()
        if not code:
            continue
        base_map[code] = (
            parse_tr_number(r[i_borc]),
            parse_tr_number(r[i_alacak]),
            parse_tr_number(r[i_bb]),
            parse_tr_number(r[i_ba]),
        )

    pl_prefixes = tuple(p.strip() for p in args.pl_prefixes.split(",") if p.strip())
    changed = 0

    out_rows = []
    for r in rows_c:
        code = (r[i_code] or "").strip()
        if not code:
            out_rows.append(r)
            continue

        # varsayılan: cum satırını aynen taşı
        newr = list(r)

        # sadece P&L sınıflarında delta uygula
        if code.startswith(pl_prefixes):
            c_borc = parse_tr_number(r[i_borc])
            c_alacak = parse_tr_number(r[i_alacak])
            c_bb = parse_tr_number(r[i_bb])
            c_ba = parse_tr_number(r[i_ba])

            b_borc, b_alacak, b_bb, b_ba = base_map.get(code, (0.0, 0.0, 0.0, 0.0))

            # borc/alacak toplamları: fark (negatif çıkarsa 0'a kırp)
            d_borc = c_borc - b_borc
            d_alacak = c_alacak - b_alacak
            if d_borc < 0: d_borc = 0.0
            if d_alacak < 0: d_alacak = 0.0

            # bakiye: net fark -> borç/alacak bakiyesi olarak yeniden yaz
            net_c = c_bb - c_ba
            net_b = b_bb - b_ba
            d_net = net_c - net_b
            if d_net >= 0:
                d_bb, d_ba = d_net, 0.0
            else:
                d_bb, d_ba = 0.0, abs(d_net)

            newr[i_borc] = fmt_tr_number(d_borc)
            newr[i_alacak] = fmt_tr_number(d_alacak)
            newr[i_bb] = fmt_tr_number(d_bb)
            newr[i_ba] = fmt_tr_number(d_ba)
            changed += 1

        out_rows.append(newr)

    # yaz
    with out_path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(header_c)
        w.writerows(out_rows)

    print(f"OK: wrote {out_path}")
    print(f"Rows total: {len(out_rows)} | P&L rows delta-applied: {changed} | prefixes: {pl_prefixes}")

if __name__ == "__main__":
    main()
