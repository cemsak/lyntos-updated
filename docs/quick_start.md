# LYNTOS Pro Clean Workspace v1.0 (Hakkı Özkan Edition) – Quick Start

## 1) Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

## 2) Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://127.0.0.1:5173
