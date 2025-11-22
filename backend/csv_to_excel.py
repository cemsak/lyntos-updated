import pandas as pd

csv_path = 'data/luca/beyanname/converted/mizan_beyanname_analiz.csv'
excel_path = 'data/luca/beyanname/converted/mizan_beyanname_analiz.xlsx'

df = pd.read_csv(csv_path)
df.to_excel(excel_path, index=False)
print(f"Excel raporu oluşturuldu: {excel_path}")