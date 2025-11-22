import pandas as pd
from fpdf import FPDF

excel_path = 'data/luca/beyanname/converted/mizan_beyanname_analiz.xlsx'
pdf_path = 'data/luca/beyanname/converted/mizan_beyanname_analiz.pdf'

df = pd.read_excel(excel_path)
pdf = FPDF()
pdf.add_page()
pdf.set_font("Arial", size=8)
pdf.cell(200, 10, txt="Mizan Beyanname Analiz Raporu", ln=True, align="C")

for i, row in df.iterrows():
    line = " | ".join(str(x) for x in row.values)
    pdf.cell(0, 10, line, ln=True)

pdf.output(pdf_path)
print(f"PDF dosyası oluşturuldu: {pdf_path}")