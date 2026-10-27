import os
import numpy as np
import pandas as pd
import joblib
import requests
from xgboost import XGBClassifier, XGBRegressor

print("🌌 Starting MASHTAL V6 Engine Training Factory...")
SUPABASE_URL = "https://drtnhykkcvnhmtcwedxx.supabase.co/rest/v1/training_data"
SUPABASE_HEADERS = {
    "apikey": "sb_publishable_61tdoMJ_orGIFiYNXeZNTA_ZhJG6AMP",
    "Authorization": "Bearer sb_publishable_61tdoMJ_orGIFiYNXeZNTA_ZhJG6AMP",
    "Content-Type": "application/json"
}

print("Loading real sensor data from Supabase...")
try:
    response = requests.get(SUPABASE_URL, headers=SUPABASE_HEADERS) # 👈 Fixed headers variable match here
    records = response.json()
    df = pd.DataFrame(records)
    print(f"✅ Successfully loaded {len(df)} rows from cloud.")
except Exception as e:
    print(f"❌ Failed to fetch data: {e}")
    exit()

# Fill missing columns automatically if Supabase does not contain them

if "future_rain_prob" not in df.columns:
    df["future_rain_prob"] = 0.0

if "wind_speed" not in df.columns:
    df["wind_speed"] = 10.0

if "soil_type" not in df.columns:
    df["soil_type"] = 2

if "weather_temp" not in df.columns:
    df["weather_temp"] = df["temperature"]

if "current_hour" not in df.columns:
    df["current_hour"] = 12  

irrigation_labels = []
irrigation_minutes = []
temp_diff_list = []
vpd_list = []

print("🧠 Processing environmental rules engine...")
for idx, row in df.iterrows():
    moist = row["soil_moisture"]
    s_temp = row["temperature"]
    w_temp = row["weather_temp"]
    hour = row["current_hour"]
    s_type = row["soil_type"]
    f_rain = row["future_rain_prob"]
    wind = row["wind_speed"]
    
    t_diff = w_temp - s_temp
    vpd = ((100 - row["humidity"]) / 100) * np.exp(s_temp / 15)
    
    temp_diff_list.append(t_diff)
    vpd_list.append(vpd)
    
    is_peak_sun = 11 <= hour <= 16
    
    if f_rain > 60 and moist > 20:
        irrigation = 0  
    elif moist < 15:
        irrigation = 1  
    elif s_type == 3 and moist < 38 and wind > 25:
        irrigation = 1  
    elif w_temp >= 36 and moist < 45 and not is_peak_sun:
        irrigation = 1
    elif vpd > 2.0 and moist < 50:
        irrigation = 1  
    elif moist < 40 and hour in [5, 6, 19, 20]:
        irrigation = 1  
    else:
        irrigation = 0
        
    irrigation_labels.append(irrigation)
    
    if irrigation == 1:
        base_minutes = (100 - moist) * 0.3 + (w_temp * 0.25) + (vpd * 2.5)
        if s_type == 3: base_minutes *= 1.35  
        if s_type == 1: base_minutes *= 0.75  
        if wind > 30: base_minutes *= 1.15   
        if f_rain > 35: base_minutes *= 0.5   
        minutes = max(5, min(int(base_minutes), 60))
    else:
        minutes = 0
    irrigation_minutes.append(minutes)

df["temp_diff"] = temp_diff_list
df["vpd"] = vpd_list
df["irrigation"] = irrigation_labels
df["minutes"] = irrigation_minutes

features = [
    "temperature", "humidity", "soil_moisture", "weather_temp", 
    "current_hour", "soil_type", "future_rain_prob", "wind_speed", 
    "temp_diff", "vpd"
]

X = df[features]
y_class = df["irrigation"]
y_reg = df["minutes"]

print("⏳ Training XGBoost Classifier (Decisions)...")
model_decision = XGBClassifier(n_estimators=300, max_depth=6, learning_rate=0.05, random_state=42)
model_decision.fit(X, y_class)

print("⏳ Training XGBoost Regressor (Duration)...")
model_minutes = XGBRegressor(n_estimators=300, max_depth=6, learning_rate=0.05, random_state=42)
model_minutes.fit(X, y_reg)

ultra_ai = {"decision_model": model_decision, "minutes_model": model_minutes}
joblib.dump(ultra_ai, "mashtal_ultra_ai.pkl")

print("\n🚀 Success! 'mashtal_ultra_ai.pkl' generated and synced with backend expectations.")