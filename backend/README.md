# LYNTOS Backend (FastAPI)

## Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit if needed
uvicorn main:app --reload
```

### Test endpoints
- Health: http://127.0.0.1:8000/health
- Ping: http://127.0.0.1:8000/v1/ping
- KURGAN Risk (POST): http://127.0.0.1:8000/v1/kurgan/risk
```json
{
  "company_id": "demo-1",
  "nace_code": "55.10",
  "turnover": 1000000,
  "cash_flow_volatility": 0.25
}
```
