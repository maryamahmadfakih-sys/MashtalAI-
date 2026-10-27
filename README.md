# 🌱 MASHTAL – Intelligent Agriculture Platform

Senior project: a smart irrigation and crop-health web app.

| Part | Folder | Technology | Hosted on |
|---|---|---|---|
| Website | `frontend/` | React, Supabase (login + data), Open-Meteo (weather) | Render |
| AI server | `ai-backend/` | Python, FastAPI, XGBoost, Google Gemini (plant vision) | Render |

## Features
- Live weather and weather-based soil estimates for the selected city
- Irrigation control with automatic rain pause
- **Mashtal AI**: upload a plant photo → plant name, disease, severity and a treatment plan
- Works on desktop, iPad and phone

## Run it on your computer

**1. AI server**
```bash
cd ai-backend
python -m venv venv
venv\Scripts\activate            # Windows  (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env           # then put your Gemini key inside .env
uvicorn server:app --reload --host 0.0.0.0
```

**2. Website**
```bash
cd frontend
npm install
npm start
```
Open http://localhost:3000

## Retrain the irrigation model
```bash
cd ai-backend
python main.py      # reads training data from Supabase and writes mashtal_ultra_ai.pkl
```

## Secrets
API keys are **never** stored in this repository.
- Locally: `ai-backend/.env` (ignored by git)
- Online: Render → Environment (`GEMINI_API_KEY`) and Vercel → Environment Variables (`REACT_APP_API_URL`)
