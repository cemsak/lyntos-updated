from fastapi import FastAPI, File, UploadFile, Form
import shutil
import os

from fastapi.middleware.cors import CORSMiddleware  # <-- EKLE

from auto_analyze import analyze_uploaded_file

app = FastAPI()

# CORS MIDDLEWARE EKLE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # veya ["*"] testte
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...), veri_tipi: str = Form(...)):
    path_map = {
        "banka": "data/banka/",
        "mizan": "data/luca/",
        "beyanname": "data/luca/",
        "edefter": "data/edefter/",
        "musteri": "data/musteriler/",
    }
    os.makedirs(path_map.get(veri_tipi, "data/other/"), exist_ok=True)
    save_path = path_map.get(veri_tipi, "data/other/") + file.filename
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    # Dosya yüklendikten sonra analiz fonksiyonu otomatik çağrılır:
    analiz_sonucu = analyze_uploaded_file(veri_tipi, save_path)
    return {
        "filename": file.filename,
        "veri_tipi": veri_tipi,
        "status": "uploaded",
        "analiz_sonucu": analiz_sonucu
    }