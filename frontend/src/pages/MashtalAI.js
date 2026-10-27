import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaThLarge, 
  FaTint, 
  FaExclamationTriangle, 
  FaHistory, 
  FaCog, 
  FaCloudSun, 
  FaRobot, 
  FaCamera, 
  FaSync, 
  FaLeaf, 
  FaCheckCircle,
  FaFolderOpen,
  FaSeedling,
  FaBug,
  FaShieldAlt,
  FaHeartbeat
} from "react-icons/fa";

// 🌐 AI server address: set REACT_APP_API_URL on Vercel (e.g. https://mashtal-ai.onrender.com).
// Locally it falls back to port 8000 on the same computer that serves the site.
const API_URL = (process.env.REACT_APP_API_URL || `http://${window.location.hostname}:8000`).replace(/\/$/, "");

function MashtalAI() {
  const navigate = useNavigate();
  
  // 🧠 Load system configurations to detect current theme (Light or Dark)
  const [theme] = useState(() => {
    const saved = localStorage.getItem("mashtal_system_config");
    return saved ? JSON.parse(saved).activeTheme : "Light";
  });
  const isDark = theme === "Dark";

  // 📹 Camera and System Core States
  const [cameraActive, setCameraActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // 💾 PERSISTENCE CORRECTION: Initialize state from local cache so data stays after navigation
  const [capturedImage, setCapturedImage] = useState(() => {
    return localStorage.getItem("mashtal_cached_image") || null;
  });
  
  const [aiReport, setAiReport] = useState(() => {
    const savedReport = localStorage.getItem("mashtal_cached_report");
    return savedReport ? JSON.parse(savedReport) : null;
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null); 

  // 📹 Start Camera Broadcast
  const startCamera = async () => {
    // Clear out old cache items cleanly to begin a clean scan session
    setCapturedImage(null);
    setAiReport(null);
    localStorage.removeItem("mashtal_cached_image");
    localStorage.removeItem("mashtal_cached_report");
    
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      alert("Unable to access camera. Please check your system permissions.");
      setCameraActive(false);
    }
  };

  // 🛑 Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  // 📸 Capture Image Frame from Video
  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL("image/jpeg");
      setCapturedImage(imageData);
      localStorage.setItem("mashtal_cached_image", imageData); // Cache image state
      stopCamera(); 
      
      executeAiDiagnosis(imageData); 
    }
  };

  // 📁 Handle Photo Upload from Local Storage File System
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file format (PNG, JPG, JPEG).");
      return;
    }

    setCapturedImage(null);
    setAiReport(null);
    localStorage.removeItem("mashtal_cached_image");
    localStorage.removeItem("mashtal_cached_report");
    stopCamera();

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result); 
      localStorage.setItem("mashtal_cached_image", reader.result); // Cache image base64
      executeAiDiagnosis(reader.result); 
    };
    reader.readAsDataURL(file);
  };

  // 🌱 Same soil model as the Dashboard (computeAgronomicData): soil values are
  // calculated from the weather, using the user's moisture threshold and manual override.
  const computeSoilFromWeather = (weather) => {
    const { temp, humidity, weatherCode, rainPredictedSoon } = weather;

    let manualActive = false;
    let manualMode = "auto";
    try {
      const o = JSON.parse(localStorage.getItem("mashtal_manual_override"));
      if (o) { manualActive = o.active; manualMode = o.mode || "auto"; }
    } catch (e) { /* ignore */ }

    const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
    const avp = svp * (humidity / 100);
    const vpd = parseFloat((svp - avp).toFixed(2));

    let dynamicLimit = 30;
    try {
      const cfg = JSON.parse(localStorage.getItem("mashtal_system_config"));
      if (cfg && cfg.moistureThreshold !== undefined) dynamicLimit = Number(cfg.moistureThreshold);
    } catch (e) { /* keep default */ }

    let calculatedMoisture = 42;
    if (manualMode === "manual") {
      calculatedMoisture = manualActive ? 68 : 31;
    } else if (weatherCode >= 51) {
      calculatedMoisture = Math.min(82, 65 + (weatherCode - 50) * 1.5);
    } else if (rainPredictedSoon && calculatedMoisture >= dynamicLimit) {
      calculatedMoisture = dynamicLimit + 5;
    } else {
      const depletionFactor = vpd > 1.5 ? 6 : 0;
      calculatedMoisture = Math.max(25, Math.round(45 - depletionFactor));
      if (calculatedMoisture < dynamicLimit || vpd > 2.0) {
        calculatedMoisture = dynamicLimit + 6;
      }
    }

    return {
      soil_moisture: calculatedMoisture,
      temperature: Math.round(temp - 2),
      humidity: Math.min(98, Math.round(humidity * 1.05))
    };
  };

  // 📡 Get fresh weather (same Open-Meteo request as the Dashboard), then compute soil values
  const getLiveReadings = async () => {
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem("mashtal_global_weather")); } catch (e) { /* ignore */ }
    const city = (cached && cached.name) || "Beirut";

    try {
      const geo = await (await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
      )).json();
      const place = geo.results && geo.results[0];
      if (place) {
        const wx = await (await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
          `&current=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code&timezone=auto`
        )).json();
        if (wx.current && wx.daily) {
          const rainPredictedSoon = wx.daily.weather_code
            .slice(1, 3)
            .some((code) => (code >= 51 && code <= 67) || code >= 95);
          const weather = {
            temp: Math.round(wx.current.temperature_2m),
            humidity: wx.current.relative_humidity_2m,
            weatherCode: wx.current.weather_code,
            rainPredictedSoon
          };
          return { ...computeSoilFromWeather(weather), source: `live weather for ${city}` };
        }
      }
    } catch (err) {
      console.error("Live weather fetch failed, using cached weather:", err);
    }

    // Offline: use the Dashboard's last saved weather
    if (cached && cached.temp !== undefined && cached.humidity !== undefined) {
      return { ...computeSoilFromWeather(cached), source: `cached weather for ${city} (offline)` };
    }

    return { temperature: 28.5, humidity: 60.0, soil_moisture: 35.0, source: "⚠️ default values (no weather data)" };
  };

  // 🤖 AI Diagnosis Engine - Linked to your Sovereign Python Server
  const executeAiDiagnosis = async (base64Image) => {
    if (!base64Image) return;
    setAnalyzing(true);
    setAiReport(null);

    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, "");

    try {
      const live = await getLiveReadings();
      let soilType = 1;
      try {
        const cfg = JSON.parse(localStorage.getItem("mashtal_system_config")) || {};
        const st = Number(cfg.soilType);
        if (st >= 1 && st <= 3) soilType = st;
      } catch (e) { /* keep default */ }
      const sensorInfo = `${live.soil_moisture}% soil moisture · ${live.temperature}°C · ${live.humidity}% humidity — ${live.source}`;

      const response = await fetch(`${API_URL}/predict_irrigation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          temperature: live.temperature,
          humidity: live.humidity,
          soil_moisture: live.soil_moisture,
          soil_type: soilType,
          lat: 30.0444,
          lon: 31.2357,
          image_data: cleanBase64 
        })
      });

      if (!response.ok) {
        throw new Error(`Sovereign AI Server returned error code: ${response.status}`);
      }

      const aiResult = await response.json();
      const analytics = aiResult.vision_analytics;
      const rawStatus = analytics?.health_status_msg || "";

      const isFailedState = 
        rawStatus.toLowerCase().includes("failed") || 
        rawStatus.toLowerCase().includes("unable to confidently identify") ||
        !analytics;

      let processedReport = null;

      if (isFailedState) {
        processedReport = {
          plantType: "Unknown Specimen",
          disease: "Analysis Low Confidence",
          severity: "Action Urged",
          healthScore: analytics?.confidence || "0.00%",
          status: rawStatus || "Validation Threshold Missed",
          recommendation: aiResult.cognitive_report || "Reviewing alternate crop telemetry...",
          treatmentPlan: analytics?.real_treatment_plan || "Upload a clearer image focused only on the plant foliage.",
          pumpDuration: aiResult.duration_minutes || 0,
          sensorInfo
        };
      } else {
        const isHealthy = 
          analytics.real_disease_name.toLowerCase().includes("healthy") || 
          analytics.real_disease_name.toLowerCase().includes("none");

        processedReport = {
          plantType: analytics.real_plant_name,
          disease: analytics.real_disease_name,
          severity: isHealthy ? "Optimal" : "Action Urged",
          healthScore: analytics.confidence, 
          status: rawStatus,
          recommendation: aiResult.cognitive_report,
          treatmentPlan: analytics.real_treatment_plan,
          pumpDuration: aiResult.duration_minutes,
          sensorInfo
        };
      }

      // Update current live page view state
      setAiReport(processedReport);

      // Save UI presentation report state cache so data survives cross-navigation checks
      localStorage.setItem("mashtal_cached_report", JSON.stringify(processedReport));

      // 💾 THE CRITICAL DATA BRIDGE INTERFACE: Save to shared LocalStorage for Irrigation Page tracking!
      const overridePayload = {
        ai_decision: aiResult.ai_decision !== undefined ? aiResult.ai_decision : 1, 
        duration_minutes: Number(aiResult.duration_minutes) || 20, 
        cognitive_report: aiResult.cognitive_report || processedReport.recommendation,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem("mashtal_cognitive_override", JSON.stringify(overridePayload));

      // 📜 Record directly to LocalStorage History logs
      const currentHistory = JSON.parse(localStorage.getItem("mashtal_history")) || [];
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const logEntry = { 
        time: timestamp, 
        action: `Sovereign AI Scan Completed: ${analytics?.real_plant_name || 'Crop Checked'} [${aiResult.duration_minutes}m target] 📸🍃` 
      };
      localStorage.setItem("mashtal_history", JSON.stringify([logEntry, ...currentHistory]));

    } catch (error) {
      console.error("AI Server Integration Offline. Executing safe localized simulation...", error);
      
      // 🛡️ Fallback Simulation Block if server can't be reached
      setTimeout(() => {
        const simulatedReport = {
          plantType: "Rose Specimen (Simulated)",
          disease: "Healthy Foliage Context",
          severity: "Optimal",
          healthScore: "94.20%",
          status: "Python Server Offline Connection Timeout",
          recommendation: "✅ [Local Simulation Mode]: Infrastructure defaults active. Valve telemetry closed.",
          treatmentPlan: "Maintain standardized watering routines. Ensure clean sub-drainage parameters.",
          pumpDuration: 0
        };
        
        setAiReport(simulatedReport);
        localStorage.setItem("mashtal_cached_report", JSON.stringify(simulatedReport));
      }, 1200);
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const pageBg = isDark ? "#121413" : "#F4F7F5";
  const cardBg = isDark ? "#1E2220" : "#FFFFFF";
  const textColor = isDark ? "#E5EAE7" : "#333333";
  const accentColor = isDark ? "#52B788" : "#1B4332";
  const subBorderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";

  return (
    <div className="app-shell" style={{ ...styles.container, backgroundColor: pageBg, color: textColor }}>
      
      {/* SIDEBAR NAVIGATION GRID */}
      <aside className="app-sidebar" style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>🌱</div>
          <div>
            <h2 style={styles.logoText}>MASHTAL</h2>
            <span style={styles.logoSubtext}>Intelligent Agriculture Platform</span>
          </div>
        </div>

        <nav className="app-nav" style={styles.navMenu}>
          <div style={styles.menuItem} onClick={() => navigate("/dashboard")}>
            <FaThLarge style={styles.menuIcon} /> Dashboard
          </div>
          <div style={styles.menuItem} onClick={() => navigate("/weather")}>
             <FaCloudSun style={styles.menuIcon} /> Weather
          </div>
          <div style={styles.menuItem} onClick={() => navigate("/irrigation")}>
            <FaTint style={styles.menuIcon} /> Irrigation
          </div>
          <div style={{ ...styles.menuItem, ...styles.activeMenuItem }} onClick={() => navigate("/mashtal-ai")}>
            <FaRobot style={styles.menuIcon} /> Mashtal AI 
          </div>
          <div style={styles.menuItem} onClick={() => navigate("/alerts")}>
            <FaExclamationTriangle style={styles.menuIcon} /> Alerts
          </div>
          <div style={styles.menuItem} onClick={() => navigate("/history")}>
            <FaHistory style={styles.menuIcon} /> History
          </div>
          <div style={styles.menuItem} onClick={() => navigate("/settings")}>
            <FaCog style={styles.menuIcon} /> Settings
          </div>
        </nav>
      </aside>

      {/* MAIN CONTENT WORKSPACE AREA */}
      <main className="app-main" style={styles.mainContent}>
        <header style={styles.header}>
          <div style={styles.titleGroup}>
            <h1 style={{ ...styles.pageTitle, color: accentColor }}><FaRobot /> Cognitive AI Core | Computer Vision</h1>
            <p style={styles.pageSubtitle}>Real-time crop health diagnostics and pest detection via live telemetry</p>
          </div>
        </header>

        <div style={styles.workspace}>
          
          {/* CAMERA BLOCK */}
          <div style={{ ...styles.card, backgroundColor: cardBg, borderColor: isDark ? "#2D3430" : "#E5EAE7" }}>
            <h3 style={{ ...styles.cardTitle, color: accentColor }}><FaCamera /> Biometric Scanner Lens</h3>
            <p style={{ fontSize: "14px", marginBottom: "15px", opacity: 0.8 }}>Align your camera lens or upload a photo of the crop foliage to run diagnostic checks.</p>

            <div style={styles.videoContainer}>
              {cameraActive && (
                <video ref={videoRef} autoPlay playsInline style={styles.videoStream} />
              )}
              {capturedImage && (
                <img src={capturedImage} alt="Captured Plant" style={styles.videoStream} />
              )}
              {!cameraActive && !capturedImage && (
                <div style={styles.placeholderScreen}>
                  <FaLeaf style={{ fontSize: "60px", color: "#2D6A4F", marginBottom: "15px" }} />
                  <span>Scanner core is ready</span>
                </div>
              )}
              {analyzing && (
                <div style={styles.analyzerOverlay}>
                  <div style={styles.scanLine}></div>
                  <FaSync style={styles.spinIcon} />
                  <span style={{ marginTop: "10px", fontWeight: "600" }}>Executing Sovereign AI Analysis...</span>
                </div>
              )}
            </div>

            <input 
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: "none" }}
            />

            <div style={styles.controlsRow}>
              {!cameraActive ? (
                <>
                  <button onClick={startCamera} style={styles.primaryBtn}>
                    <FaCamera /> {capturedImage ? "Rescan Mirror" : "Open Camera"}
                  </button>
                  <button onClick={() => fileInputRef.current.click()} style={styles.uploadBtn}>
                    <FaFolderOpen /> Upload Photo
                  </button>
                </>
              ) : (
                <button onClick={captureSnapshot} style={styles.captureBtn}>
                  📸 Capture & Analyze Framework
                </button>
              )}
              {cameraActive && (
                <button onClick={stopCamera} style={styles.dangerBtn}>Cancel</button>
              )}
            </div>
          </div>

          {/* DIAGNOSTIC REPORT BLOCK */}
          <div style={{ ...styles.card, backgroundColor: cardBg, borderColor: isDark ? "#2D3430" : "#E5EAE7" }}>
            <h3 style={{ ...styles.cardTitle, color: accentColor }}><FaLeaf /> Diagnostic Medical Report (AI Metadata)</h3>
            
            {aiReport ? (
              <div style={styles.reportContent}>
                
                {/* 🌿 Botanical Identification */}
                <div style={{ ...styles.reportRow, borderBottomColor: subBorderColor }}>
                  <span style={styles.labelSpan}><FaSeedling style={{ color: "#2D6A4F" }} /> Plant Type Identified:</span>
                  <strong style={styles.valueStrong}>{aiReport.plantType}</strong>
                </div>

                {/* 🦠 Pathology Tracker */}
                <div style={{ ...styles.reportRow, borderBottomColor: subBorderColor }}>
                  <span style={styles.labelSpan}><FaBug style={{ color: "#D32F2F" }} /> Disease / Pathology:</span>
                  <strong style={{ ...styles.valueStrong, color: /none|healthy/i.test(aiReport.disease) ? "#2E7D32" : "#D32F2F" }}>
                    {aiReport.disease}
                  </strong>
                </div>

                {/* 📊 Condition Scale */}
                <div style={{ ...styles.reportRow, borderBottomColor: subBorderColor }}>
                  <span style={styles.labelSpan}><FaHeartbeat style={{ color: "#E28743" }} /> Current Severity State:</span>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: aiReport.severity.includes("Optimal") ? "#E8F5E9" : 
                    aiReport.severity.includes("Error") ? "#FFEBEE" : "#FFF3E0",
                    color: aiReport.severity.includes("Optimal") ? "#2E7D32" : 
                    aiReport.severity.includes("Error") ? "#C62828" : "#E65100"
                  }}>
                  {aiReport.severity}
                  </span>
                </div>

                {/* 🛡️ Vision Core Confidence */}
                <div style={{ ...styles.reportRow, borderBottomColor: subBorderColor }}>
                  <span style={styles.labelSpan}><FaCheckCircle style={{ color: "#2196F3" }} /> Classification Confidence:</span>
                  <strong style={styles.valueStrong}>{aiReport.healthScore}</strong>
                </div>

                {/* ⏱️ Automated Pump Metric */}
                {aiReport.pumpDuration !== undefined && (
                  <div style={{ ...styles.reportRow, borderBottomColor: subBorderColor }}>
                    <span style={styles.labelSpan}>⏱️ AI Computed Pump Target:</span>
                    <strong style={{ color: "#E63946" }}>{aiReport.pumpDuration} Minutes</strong>
                  </div>
                )}

                {/* 📡 Live sensor data used for the pump decision */}
                {aiReport.sensorInfo && (
                  <div style={{ fontSize: "12.5px", opacity: 0.75, marginTop: "-6px" }}>
                    📡 Based on: {aiReport.sensorInfo}
                  </div>
                )}
                
                {/* 💡 Irrigation Engine Notes */}
                <div style={{ ...styles.recommendationBox, backgroundColor: isDark ? "#1A2E3B" : "#E3F2FD", borderLeft: "4px solid #2196F3" }}>
                  <strong style={{ color: isDark ? "#64B5F6" : "#0D47A1", display: "block", marginBottom: "4px" }}>📋 Core Hydro Logic Context:</strong>
                  <p style={{ margin: 0, fontSize: "13.5px", lineHeight: "1.5", color: isDark ? "#E5EAE7" : "#0D47A1" }}>{aiReport.recommendation}</p>
                </div>

                {/* 🧪 Treatment & Botanical Care Plan */}
                <div style={{ ...styles.recommendationBox, backgroundColor: isDark ? "#142E1B" : "#E8F5E9", borderLeft: "4px solid #2D6A4F" }}>
                  <strong style={{ color: isDark ? "#52B788" : "#1B4332", display: "block", marginBottom: "4px" }}><FaShieldAlt /> Suggested Treatment Plan:</strong>
                  <p style={{ margin: 0, fontSize: "13.5px", lineHeight: "1.5", color: isDark ? "#E5EAE7" : "#1B4332" }}>{aiReport.treatmentPlan}</p>
                </div>

              </div>
            ) : (
              <div style={styles.emptyReport}>
                <p>Awaiting crop capture parameters to populate smart matrix report details...</p>
              </div>
            )}
          </div>

        </div>
      </main>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
    fontFamily: "system-ui, -apple-system, sans-serif",
    transition: "background-color 0.3s ease",
    direction: "ltr"
  },
  sidebar: {
    width: "260px",
    height: "100vh",
    background: "linear-gradient(180deg, #1B4332, #081C15)",
    color: "#FFFFFF",
    padding: "30px 24px",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    boxShadow: "4px 0 15px rgba(0,0,0,0.1)",
    zIndex: 10,
  },
  logoContainer: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" },
  logoIcon: { fontSize: "30px" },
  logoText: { fontSize: "22px", fontWeight: "700", margin: 0, letterSpacing: "0.5px" },
  logoSubtext: { fontSize: "11px", color: "#A3B899" },
  navMenu: { display: "flex", flexDirection: "column", gap: "10px" },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px 18px",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "500",
    color: "#D8E2DC",
    cursor: "pointer",
    transition: "background-color 0.2s ease, color 0.2s ease",
  },
  activeMenuItem: {
    backgroundColor: "#2D6A4F",
    color: "#FFFFFF",
    fontWeight: "600",
    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
  },
  menuIcon: { fontSize: "18px" },
  mainContent: {
    flex: 1,
    padding: "40px 50px",
    boxSizing: "border-box",
    height: "100vh",
    overflow: "auto",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "35px" },
  titleGroup: { textAlign: "left" },
  pageTitle: { margin: 0, fontSize: "30px", fontWeight: "700" },
  pageSubtitle: { color: "#666666", marginTop: "6px", fontSize: "14px" },
  workspace: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: "28px",
    alignItems: "start"
  },
  card: {
    padding: "25px",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
    border: "1px solid",
    transition: "all 0.3s ease",
  },
  cardTitle: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "17px",
    fontWeight: "700",
    marginBottom: "20px",
  },
  videoContainer: {
    width: "100%",
    height: "320px",
    backgroundColor: "#000",
    borderRadius: "15px",
    overflow: "hidden",
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "20px"
  },
  videoStream: { width: "100%", height: "100%", objectFit: "cover" },
  placeholderScreen: { color: "#aaa", display: "flex", flexDirection: "column", alignItems: "center" },
  controlsRow: { display: "flex", gap: "10px" },
  primaryBtn: {
    padding: "12px 20px",
    backgroundColor: "#1B4332",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  uploadBtn: {
    padding: "12px 20px",
    backgroundColor: "#2D6A4F",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: 1,
    justifyContent: "center"
  },
  captureBtn: {
    padding: "12px 24px",
    backgroundColor: "#2D6A4F",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    flex: 1
  },
  dangerBtn: {
    padding: "12px 20px",
    backgroundColor: "#D32F2F",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600"
  },
  analyzerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5
  },
  scanLine: {
    position: "absolute",
    width: "100%",
    height: "4px",
    backgroundColor: "#52B788",
    boxShadow: "0 0 15px #52B788",
    top: 0,
    animation: "scan 2s linear infinite"
  },
  spinIcon: { fontSize: "30px", animation: "spin 1s linear infinite" },
  reportContent: { display: "flex", flexDirection: "column", gap: "16px" },
  reportRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px dashed",
    paddingBottom: "10px",
    fontSize: "14.5px"
  },
  labelSpan: { display: "flex", alignItems: "center", gap: "8px", fontWeight: "500", opacity: 0.95 },
  valueStrong: { fontWeight: "700" },
  statusBadge: { fontSize: "12px", fontWeight: "700", padding: "4px 10px", borderRadius: "6px" },
  recommendationBox: { padding: "14px", borderRadius: "12px", marginTop: "4px" },
  emptyReport: { color: "#888", textAlign: "center", padding: "50px 0", fontSize: "15px" }
};

try {
  const styleSheet = document.styleSheets[0] || document.head.appendChild(document.createElement('style')).sheet;
  styleSheet.insertRule(`
    @keyframes scan {
      0% { top: 0%; }
      50% { top: 100%; }
      100% { top: 0%; }
    }
  `, styleSheet.cssRules.length);

  styleSheet.insertRule(`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `, styleSheet.cssRules.length);
} catch (e) {
  console.error("Animation injection safely caught layout fallback:", e);
}

export default MashtalAI;