import os
import io
import json
import base64
import time
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np
import joblib
import requests

app = FastAPI(title="MASHTAL Cloud AI Server")

# Enable CORS for frontend website integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 🔑 Google Gemini vision key (free at https://aistudio.google.com/apikey)
# Best: set it as an environment variable instead of pasting it here.
# Load a local ".env" file if present (never uploaded to GitHub - see .gitignore)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# "gemini-flash-latest" always points to Google's newest Flash model,
# so this keeps working when old model versions are retired.
# Tried in order: if one is overloaded (503) or retired (404), the next one is used.
GEMINI_MODELS = [
    os.getenv("GEMINI_MODEL", "gemini-flash-latest"),
    "gemini-flash-lite-latest",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
]
GEMINI_TIMEOUT = 30  # seconds per model before moving to the next one
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def shrink_image(clean_base64, max_side=1024):
    """Resize big phone photos to ~1024px JPEG so the upload to Gemini is fast.
    Needs Pillow (pip install pillow); if it's missing the original is sent."""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(base64.b64decode(clean_base64)))
        img = img.convert("RGB")
        img.thumbnail((max_side, max_side))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return base64.b64encode(buf.getvalue()).decode(), "image/jpeg"
    except ImportError:
        print("ℹ️ Pillow not installed - sending full-size image (run: pip install pillow)")
    except Exception as e:
        print(f"ℹ️ Could not resize image ({e}) - sending original")
    return None, None
if not GEMINI_API_KEY:
    print("⚠️ GEMINI_API_KEY is not set - add it to ai-backend/.env (local) or to Render's Environment settings.")
else:
    print(f"✅ Cloud Vision Pipeline Active (Google Gemini, key {GEMINI_API_KEY[:4]}...)")

# 🚀 Load predictive ML models from your main.py training factory
try:
    print("⏳ Loading XGBoost brain models...")
    ultra_ai = joblib.load(os.path.join(os.path.dirname(os.path.abspath(__file__)), "mashtal_ultra_ai.pkl"))
    model_decision = ultra_ai["decision_model"]
    model_minutes = ultra_ai["minutes_model"]
    print("✅ XGBoost predictive models active")
except Exception as e:
    print(f"⚠️ XGBoost loading warning: {e}")


def analyze_plant_health_with_llm(image_base64):
    try:
        # Split "data:image/png;base64,XXXX" into mime type + raw base64
        mime_type = "image/jpeg"
        if "," in image_base64:
            header, clean_base64 = image_base64.split(",", 1)
            if header.startswith("data:") and ";" in header:
                mime_type = header[5:].split(";")[0] or "image/jpeg"
        else:
            clean_base64 = image_base64
        clean_base64 = clean_base64.strip()

        # The frontend strips the "data:image/...;base64," label, so detect the
        # real image type from the first bytes instead of assuming JPEG.
        signatures = {"/9j/": "image/jpeg", "iVBOR": "image/png", "UklGR": "image/webp",
                      "R0lGOD": "image/gif", "AAAAG": "image/heic", "AAAAI": "image/heic"}
        for sig, mt in signatures.items():
            if clean_base64.startswith(sig):
                mime_type = mt
                break

        small, small_type = shrink_image(clean_base64)
        if small:
            clean_base64, mime_type = small, small_type
        print(f"🔎 Sending {len(clean_base64) * 3 // 4 // 1024} KB image to Gemini...")

        prompt = (
            "You are an expert plant pathologist and agronomist. Analyze this plant image carefully.\n"
            "1. Identify the plant (common + scientific name).\n"
            "2. Diagnose any disease, pest, nutrient deficiency or abiotic stress (water, heat, sunburn). "
            "If the plant looks healthy, say 'Healthy'.\n"
            "3. Give a practical treatment plan a farmer can follow: immediate actions, organic/biological "
            "options, chemical options (name the active ingredient, e.g. copper hydroxide, mancozeb), "
            "irrigation/watering advice, and prevention.\n"
            "If the image is not a plant, set plant_name to 'Not a plant' and confidence_score low."
        )

        schema = {
            "type": "OBJECT",
            "properties": {
                "plant_name": {"type": "STRING"},
                "scientific_name": {"type": "STRING"},
                "disease_name": {"type": "STRING"},
                "disease_type": {"type": "STRING", "description": "fungal, bacterial, viral, pest, nutrient deficiency, abiotic, or none"},
                "is_damaged": {"type": "BOOLEAN"},
                "severity": {"type": "STRING", "description": "none, low, moderate, or severe"},
                "confidence_score": {"type": "NUMBER", "description": "0-100"},
                "symptoms": {"type": "STRING"},
                "immediate_actions": {"type": "STRING"},
                "organic_treatment": {"type": "STRING"},
                "chemical_treatment": {"type": "STRING"},
                "irrigation_advice": {"type": "STRING"},
                "prevention": {"type": "STRING"},
            },
            "required": ["plant_name", "disease_name", "is_damaged", "confidence_score",
                         "immediate_actions", "organic_treatment", "chemical_treatment", "prevention"],
        }

        body = {
            "contents": [{"parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": mime_type, "data": clean_base64}},
            ]}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
                "responseSchema": schema,
                "thinkingConfig": {"thinkingLevel": "low"},  # much faster answers
            },
        }

        def call_gemini(url, req_body):
            try:
                r = requests.post(url, headers={"x-goog-api-key": GEMINI_API_KEY},
                                  json=req_body, timeout=(10, GEMINI_TIMEOUT))
            except requests.exceptions.Timeout:
                fake = requests.models.Response()
                fake.status_code = 504  # treat "no answer in time" like "busy"
                fake._content = b"timed out"
                return fake
            if r.status_code in (401, 403):
                # Newer "AQ." style keys: retry passing the key as a URL parameter
                r2 = requests.post(url, params={"key": GEMINI_API_KEY}, json=req_body,
                                   timeout=(10, GEMINI_TIMEOUT))
                if r2.status_code in (200, 404):
                    r = r2
            return r

        started = datetime.now()
        errors = []
        r = None
        for model in GEMINI_MODELS:
            url = GEMINI_URL.format(model=model)
            for attempt in range(2):  # retry once if Google is busy
                r = call_gemini(url, body)
                if r.status_code == 400 and "thinking" in r.text.lower():
                    # Model doesn't support thinkingLevel -> send without it
                    body["generationConfig"].pop("thinkingConfig", None)
                    r = call_gemini(url, body)
                if r.status_code in (429, 500, 503) and attempt == 0:  # 504 = timeout: skip retry, move on
                    print(f"⏳ {model} busy (HTTP {r.status_code}), retrying in 3s...")
                    time.sleep(3)
                    continue
                break
            if r.status_code == 200:
                break
            if r.status_code in (404, 429, 500, 503, 504):
                # retired, overloaded or too slow -> try the next model
                print(f"↪️ {model} unavailable (HTTP {r.status_code}), trying next model")
                errors.append(f"{model}: HTTP {r.status_code}")
                continue
            raise RuntimeError(f"Gemini HTTP {r.status_code}: {r.text[:300]}")
        else:
            raise RuntimeError("All Gemini models busy or unavailable, try again in a minute ("
                               + "; ".join(errors) + ")")
        print(f"✅ Gemini ({model}) answered in {(datetime.now() - started).seconds}s")

        text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
        ai_data = json.loads(text)

        sections = [
            ("Immediate actions", ai_data.get("immediate_actions")),
            ("Organic / biological", ai_data.get("organic_treatment")),
            ("Chemical", ai_data.get("chemical_treatment")),
            ("Irrigation", ai_data.get("irrigation_advice")),
            ("Prevention", ai_data.get("prevention")),
        ]
        treatment = " | ".join(f"{k}: {v}" for k, v in sections if v) or "No structural treatment required."

        return {
            "is_damaged": bool(ai_data.get("is_damaged", False)),
            "confidence": float(ai_data.get("confidence_score", 90.0)),
            "status": "AI Deep-Scan completed successfully via Cloud Core",
            "plant_name": ai_data.get("plant_name", "Unknown Plant Variety"),
            "disease_name": ai_data.get("disease_name", "Healthy"),
            "treatment": treatment,
            "details": ai_data,
        }

    except Exception as e:
        print(f"Vision API Error: {e}")
        return {
            "is_damaged": False, "confidence": 50.0, "status": f"Scan fallback active: {str(e)}",
            "plant_name": "Detected Crop Specimen", "disease_name": "Healthy / Managed",
            "treatment": "Maintain standardized sub-drainage and monitor foliage directly.",
            "details": {},
        }



# API SCHEMAS & ROUTING ENDPOINTS

class MultiModalInput(BaseModel):
    temperature: float
    humidity: float
    soil_moisture: float
    soil_type: int = Field(1, ge=1, le=3)
    image_data: str 
    lat: float = 30.0444
    lon: float = 31.2357


@app.post("/predict_irrigation")
def predict_irrigation(data: MultiModalInput):
    try:
        vision_res = analyze_plant_health_with_llm(data.image_data)
        is_damaged = vision_res["is_damaged"]
        vision_confidence = vision_res["confidence"]
        vision_status = vision_res["status"]
        
        weather_temp = data.temperature
        future_rain_prob = 0.0
        wind_speed = 10.0

        current_hour = datetime.now().hour
        temp_diff = weather_temp - data.temperature
        vpd = ((100 - data.humidity) / 100) * np.exp(data.temperature / 15)
        
        input_data = [[
            data.temperature, data.humidity, data.soil_moisture, 
            weather_temp, current_hour, data.soil_type, future_rain_prob, 
            wind_speed, temp_diff, vpd
        ]]
        
        # Base machine learning calculations
        try:
            decision = int(model_decision.predict(input_data)[0])
            minutes = int(np.round(model_minutes.predict(input_data)[0]))
        except Exception:
            decision = 1 if data.soil_moisture < 50 else 0
            minutes = 0

        # 🎯 DYNAMIC SOIL MOISTURE TIMER SCALING ENGINE
        # Force decision to off if moisture has scaled past limits
        if data.soil_moisture >= 50:
            decision = 0
            minutes = 0
        else:
            decision = 1
            # Linear Scaling formula: Drier fields get more minutes automatically
            # 20% moisture or lower = 40 mins | 49% moisture = ~10 mins
            moisture_ratio = (data.soil_moisture - 20) / (50 - 20)
            scaled_minutes = 40 - (moisture_ratio * (40 - 10))
            
            # Constrain values between 10 and 40 minutes safely
            minutes = int(np.clip(scaled_minutes, 10, 40))

        # Handle structural plant disease alerts while keeping constraints
        if is_damaged and data.soil_moisture < 50:
            decision = 1
            minutes = min(45, minutes + 10)  # Give a slight disease boost but cap at 45m
            vision_status += " [Valves forced OPEN to support botanical stress mitigation]."

        if decision == 1:
            report = f"🎯 [Joint Decision]: Pumps active for {minutes} mins. Diagnostics: {vision_status}"
        else:
            report = f"✅ [Stable Environmental State]: Irrigation closed. Verification: {vision_status}"

        return {
            "ai_decision": decision,
            "duration_minutes": minutes,
            "cognitive_report": report,
            "vision_analytics": {
                "confidence": f"{vision_confidence:.2f}%",
                "health_status_msg": vision_status,
                "real_plant_name": vision_res["plant_name"],
                "real_disease_name": vision_res["disease_name"],
                "real_treatment_plan": vision_res["treatment"],
                "scientific_name": vision_res["details"].get("scientific_name", ""),
                "disease_type": vision_res["details"].get("disease_type", ""),
                "severity": vision_res["details"].get("severity", ""),
                "symptoms": vision_res["details"].get("symptoms", ""),
                "treatment_details": {
                    "immediate_actions": vision_res["details"].get("immediate_actions", ""),
                    "organic": vision_res["details"].get("organic_treatment", ""),
                    "chemical": vision_res["details"].get("chemical_treatment", ""),
                    "irrigation": vision_res["details"].get("irrigation_advice", ""),
                    "prevention": vision_res["details"].get("prevention", ""),
                }
            },
            "system_state": "Sovereign Multi-Modal Active"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
def health():
    """Simple check that the server is awake (used by Render and to wake it up)."""
    return {"status": "ok", "service": "MASHTAL AI"}
