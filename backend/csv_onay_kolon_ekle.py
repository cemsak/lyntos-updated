import pandas as pd
import os

csv_path = 'data/luca/beyanname/converted/mizan_beyanname_analiz.csv'

df = pd.read_csv(csv_path)
if 'onay' not in df.columns:
    df['onay'] = ""
if 'aciklama' not in df.columns:
    df['aciklama'] = ""

df.to_csv(csv_path, index=False)
print("Onay ve açıklama sütunu eklendi.")