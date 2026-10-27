import React, { useState, useEffect } from "react"; 
import { useNavigate } from "react-router-dom";
import {
  FaThLarge, FaTint, FaExclamationTriangle, FaHistory, FaCloudSun, FaCog, FaRobot, FaHandPaper, FaThermometerHalf, FaCloudRain, FaDatabase, FaWind, FaHourglassHalf
} from "react-icons/fa";

function Irrigation() {
  const navigate = useNavigate();
  
  // 🌓 Dynamic Theme Synchronizer (Read-Only Matrix)
  const isDark = (() => {
    const saved = localStorage.getItem("mashtal_system_config");
    return saved ? JSON.parse(saved).activeTheme === "Dark" : false;
  })();

  // Core Operational States
  const [pumpActive, setPumpActive] = useState(false);
  const [controlMode, setControlMode] = useState("auto"); 
  const [currentSoilMoisture, setCurrentSoilMoisture] = useState(42);
  const [isRainingNow, setIsRainingNow] = useState(false);
  
  // Environmental, Weather, & Countdown States
  const [currentAirTemp, setCurrentAirTemp] = useState(24);
  const [rainPredictedSoon, setRainPredictedSoon] = useState(false);
  const [automationMessage, setAutomationMessage] = useState("");
  const [reasonTag, setReasonTag] = useState("System Initializing");
  const [agronomicMetrics, setAgronomicMetrics] = useState({ vpd: 1.2, et0: 0.15, age: 0 });
  const [aiMinutesLeft, setAiMinutesLeft] = useState(0);

  // 🎛️ GLOBAL COMPONENT SCOPE
  const savedConfig = JSON.parse(localStorage.getItem("mashtal_system_config")) || { moistureThreshold: 38 };
  const userThreshold = savedConfig.moistureThreshold;

  // Poll Local Storage for real-time dashboard data streams + Embedded Field Simulator
  useEffect(() => {
    let tickCounter = 0;

    const syncWithDashboardData = () => {
      const savedSensors = localStorage.getItem("mashtal_sensor_snapshot");
      const savedWeather = localStorage.getItem("mashtal_global_weather");
      const savedOverride = localStorage.getItem("mashtal_manual_override");
      const savedCognitive = localStorage.getItem("mashtal_cognitive_override");

      let moisture = currentSoilMoisture;
      let rainingNow = false;
      let ambientTemp = 27; // Centered matching your active live screenshot
      let rainUpcoming = true; // Matches screenshot layout
      let sensorPacket = { vpd: 0.5, et0: 0.12, lastUpdated: new Date().toISOString() };

      // -------------------------------------------------------------
      // 🌟 INTERNAL SIMULATOR ENGINE (Unfreezes stale data automatically)
      // -------------------------------------------------------------
      tickCounter++;
      if (savedSensors) {
        const parsedSensors = JSON.parse(savedSensors);
        moisture = parsedSensors.soilMoisture !== undefined ? parsedSensors.soilMoisture : moisture;
      }

      if (pumpActive) {
        // Water pump running: Increase moisture by 1% roughly every 3 loops
        if (tickCounter % 3 === 0) {
          moisture = Math.min(65, moisture + 1);
        }
      } else {
        // System resting: Evaporates very slowly (1% drop every 60 intervals)
        if (tickCounter % 60 === 0) {
          moisture = Math.max(20, moisture - 1);
        }
      }

      // Re-write back into local storage with zero-latency timestamp to unfreeze indicators
      const forcedSnapshot = {
        soilMoisture: moisture,
        vpd: sensorPacket.vpd,
        et0: sensorPacket.et0,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem("mashtal_sensor_snapshot", JSON.stringify(forcedSnapshot));
      // -------------------------------------------------------------

      // 1. Process Weather Data
      if (savedWeather) {
        const weather = JSON.parse(savedWeather);
        rainingNow = weather.weatherCode >= 51; 
        ambientTemp = weather.temp || 27;
        rainUpcoming = weather.rainPredictedSoon !== undefined ? weather.rainPredictedSoon : true;
      }
      setIsRainingNow(rainingNow);
      setCurrentAirTemp(ambientTemp);
      setRainPredictedSoon(rainUpcoming);

      // 2. Process Ground Sensors
      setCurrentSoilMoisture(moisture);

      // 3. Track Signal/Data Freshness
      const pulseDelta = new Date() - new Date(forcedSnapshot.lastUpdated);
      const dataAgeSeconds = Math.round(pulseDelta / 1000);
      const isDataStale = pulseDelta > 60000 * 120; 

      setAgronomicMetrics({
        vpd: forcedSnapshot.vpd || 0.5,
        et0: forcedSnapshot.et0 || 0.12,
        age: dataAgeSeconds
      });

      // 4. Handle Active Manual User Overrides
      if (savedOverride) {
        const override = JSON.parse(savedOverride);
        if (override.mode === "manual") {
          setControlMode("manual");
          setPumpActive(override.active);
          setReasonTag("Manual Override Mode");
          setAiMinutesLeft(0);
          setAutomationMessage(
            override.active 
              ? "The water valve was forced OPEN by the user. Automatic weather protection controls are paused." 
              : "The water valve was forced CLOSED by the user. Automatic weather protection controls are paused."
          );
          return; 
        }
      }

      // 🤖 5. SMART COGNITIVE AI CORE INTERCEPT ENGINE
      if (savedCognitive) {
        const cognitiveData = JSON.parse(savedCognitive);
        const scanTime = new Date(cognitiveData.timestamp);
        const elapsedMinutes = (new Date() - scanTime) / 60000;
        const totalDurationAllowed = Number(cognitiveData.duration_minutes) || 20;
        const remainingTime = totalDurationAllowed - elapsedMinutes;

        const isAiActionRequired = 
          cognitiveData.ai_decision === 1 || 
          cognitiveData.ai_decision === true ||
          (cognitiveData.cognitive_report && cognitiveData.cognitive_report.toLowerCase().includes("open"));

        if (remainingTime > 0 && isAiActionRequired) {
          setControlMode("auto");
          setAiMinutesLeft(Math.ceil(remainingTime));
          
          if (rainUpcoming && moisture > 50) {
            setPumpActive(false);
            setReasonTag("AI Weather Lockout");
            setAutomationMessage(`AI session is active, but pump is held OFF because rain is predicted soon and soil moisture (${moisture}%) is above 50%.`);
            return;
          } 
          else if (!rainingNow && moisture < 50) {
            setPumpActive(true);
            setReasonTag("Cognitive Override");
            setAutomationMessage(cognitiveData.cognitive_report || `Valves opened via multi-modal diagnostics. Running on AI Session Clock.`);
            return;
          } 
          else if (rainingNow) {
            setPumpActive(false);
            setReasonTag("AI Rain Pause");
            setAutomationMessage("AI core cycle paused because it is actively raining right now.");
            return;
          }
          else {
            setPumpActive(false);
            setReasonTag("AI Conditional Hold");
            setAutomationMessage(`Pump held back. Balance check failed (Moisture: ${moisture}%, Rain Forecast: ${rainUpcoming ? "Yes" : "No"}).`);
            return;
          }
          
        } else if (remainingTime <= 0) {
          const currentLogs = JSON.parse(localStorage.getItem("mashtal_history")) || [];
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          localStorage.setItem("mashtal_history", JSON.stringify([
            { time: timestamp, action: "🛑 AI Irrigation Cycle Expired: Valves returned automatically to secure field restrictions." },
            ...currentLogs
          ]));

          localStorage.removeItem("mashtal_cognitive_override");
          setAiMinutesLeft(0);
        }
      }

      // 📈 6. DYNAMIC MOISTURE VELOCITY & PREDICTIVE CALCULATION CORE
      const moistureHistory = JSON.parse(localStorage.getItem("mashtal_moisture_trend")) || [];
      const currentTime = Date.now();
      
      moistureHistory.push({ moisture: moisture, timestamp: currentTime });
      const rollingHistory = moistureHistory.filter(item => currentTime - item.timestamp < 300000);
      localStorage.setItem("mashtal_moisture_trend", JSON.stringify(rollingHistory));

      let moistureVelocity = 0; 
      if (rollingHistory.length > 1) {
        const oldest = rollingHistory[0];
        const newest = rollingHistory[rollingHistory.length - 1];
        const timeDeltaMinutes = (newest.timestamp - oldest.timestamp) / 60000;
        if (timeDeltaMinutes > 0) {
          moistureVelocity = (newest.moisture - oldest.moisture) / timeDeltaMinutes;
        }
      }

      const CEILING_TARGET = 55;
      const ESTIMATED_LAG_MINUTES = 15; 
      const predictedPeakMoisture = moisture + (moistureVelocity * ESTIMATED_LAG_MINUTES);

      // 7. STANDARD AUTOMATED LOGIC CONTROL FLOW
      setControlMode("auto");
      setAiMinutesLeft(0);

      if (isDataStale) {
        setPumpActive(false);
        setReasonTag("Hardware Error");
        setAutomationMessage("The ground sensors have stopped sending signals. The valve was safely locked OFF to prevent flooding the field.");
      } 
      else if (rainingNow) {
        setPumpActive(false);
        setReasonTag("Active Rain Lockout");
        setAutomationMessage("The valve is turned off because it is currently raining on your fields right now.");
      } 
      else if (rainUpcoming && moisture > userThreshold) { 
        setPumpActive(false);
        setReasonTag("Rain Forecast Standby");
        setAutomationMessage("The system is skipping this watering schedule to save water because weather models show rain is coming within 24 hours.");
      } 
      else if (pumpActive && predictedPeakMoisture >= CEILING_TARGET) {
        setPumpActive(false); 
        setReasonTag("Predictive Buffer Triggered");
        setAutomationMessage(`Valve shut down early at ${moisture}% because velocity (+${moistureVelocity.toFixed(2)}%/min) indicates residual surface water will carry soil to the ${CEILING_TARGET}% target.`);
      }
      else if (sensorPacket.vpd > 2.0 && moisture < (userThreshold + 7)) { 
        setPumpActive(true);
        setReasonTag("High Air Dryness (VPD)");
        setAutomationMessage("The valve was opened early because the surrounding air is extremely hot and dry, making crops thirsty before soil drops below limits.");
      } 
      else if (moisture < userThreshold) { 
        setPumpActive(true);  
        setReasonTag("Soil Dryness Limit Hit");
        setAutomationMessage(`The irrigation system is running because soil moisture dropped below your critical ${userThreshold}% configured boundary (Current: ${moisture}%).`);
      } 
      else if (moisture >= CEILING_TARGET) {
        setPumpActive(false); 
        setReasonTag("Max Moisture Ceiling");
        setAutomationMessage(`The valve is closed because your soil has reached full water capacity safely (>= ${CEILING_TARGET}%).`);
      } 
      else {
        setPumpActive(false);
        setReasonTag("Normal Standing Limits");
        setAutomationMessage("The fields do not require water right now. All moisture, temperature, and atmospheric indicators are within healthy limits.");
      }
    };

    syncWithDashboardData();
    const interval = setInterval(syncWithDashboardData, 1000);
    return () => clearInterval(interval);
  }, [userThreshold, pumpActive, currentSoilMoisture]);

  const handlePumpToggle = () => {
    const nextPumpState = !pumpActive;
    
    setPumpActive(nextPumpState);
    setControlMode("manual");
    setReasonTag("Manual Override Mode");
    setAiMinutesLeft(0);

    localStorage.removeItem("mashtal_cognitive_override");

    localStorage.setItem("mashtal_manual_override", JSON.stringify({
      mode: "manual",
      active: nextPumpState,
      timestamp: new Date().toISOString()
    }));
    
    const statusMessage = nextPumpState 
      ? "Manual Irrigation Sequence Started 🟢" 
      : "Hard Shutdown - Pump Stopped Manual Override 🔴";
    
    const currentHistory = JSON.parse(localStorage.getItem("mashtal_history")) || [];
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    localStorage.setItem("mashtal_history", JSON.stringify([{ time: timestamp, action: statusMessage }, ...currentHistory]));
  };

  const resetToAutoMode = () => {
    setControlMode("auto");
    setAiMinutesLeft(0);
    localStorage.removeItem("mashtal_cognitive_override"); 
    localStorage.setItem("mashtal_manual_override", JSON.stringify({
      mode: "auto",
      active: false,
      timestamp: new Date().toISOString()
    }));
  };

  // Theme Object Interpolation Maps
  const containerStyle = { ...styles.container, backgroundColor: isDark ? "#121413" : "#F4F7F5" };
  const cardStyle = { ...styles.card, backgroundColor: isDark ? "#1E2220" : "#FFFFFF", borderColor: isDark ? "#2D3430" : "#E5EAE7" };
  const titleStyle = { ...styles.pageTitle, color: isDark ? "#52B788" : "#1B4332" };
  const cardTitleStyle = { ...styles.cardTitle, color: isDark ? "#52B788" : "#1B4332", borderBottomColor: isDark ? "#2D3430" : "#E5EAE7" };
  const labelStyle = { ...styles.statusLabel, color: isDark ? "#A3B899" : "#4F4F4F" };
  const valueStyle = { ...styles.statusValue, color: isDark ? "#FFFFFF" : "#111111" };
  
  const textMessageColor = isDark ? "#E5EAE7" : "#222222";
  const innerRowBg = isDark ? "#252B28" : "#FFFFFF";
  const borderRowColor = isDark ? "#3D4842" : "#E5EAE7";

  return (
    <div className="app-shell" style={containerStyle}>
      {/* SIDEBAR NAVIGATION */}
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
          <div style={{ ...styles.menuItem, ...styles.activeMenuItem }} onClick={() => navigate("/irrigation")}>
            <FaTint style={styles.menuIcon} /> Irrigation
          </div>
          <div style={styles.menuItem} onClick={() => navigate("/mashtal-ai")}>
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

      {/* MAIN LAYOUT */}
      <main className="app-main" style={styles.mainContent}>
        <h1 style={titleStyle}>💧 Hydro-Matrix Irrigation Core</h1>

        {isRainingNow && (
          <div style={{ ...styles.rainBanner, backgroundColor: isDark ? "#1A2638" : "#EBF3FF", borderColor: isDark ? "#2B4263" : "#BFDBFE" }}>
            <FaCloudRain /> <strong>Live Precipitation Warning:</strong> Rainfall detected over your grid system. System automation features are paused to avoid overwatering.
          </div>
        )}

        <div style={{ display: "flex", gap: "28px", flexWrap: "wrap" }}>
          
          {/* PRIMARY WATER CONTROL ACTUATOR */}
          <div className="irr-card" style={cardStyle}>
            <h2 style={cardTitleStyle}>Water Valve Controller</h2>
            
            <div style={{ ...styles.modeStrip, backgroundColor: isDark ? "#252B28" : "#F0F2F1" }}>
              <button 
                onClick={resetToAutoMode}
                style={{ ...styles.modeButton, color: isDark ? "#A3B899" : "#555", ...(controlMode === "auto" ? styles.activeAutoBtn : {}) }}
              >
                <FaRobot /> AI Auto Mode
              </button>
              <button 
                onClick={() => {
                  setControlMode("manual");
                  localStorage.setItem("mashtal_manual_override", JSON.stringify({ mode: "manual", active: pumpActive, timestamp: new Date().toISOString() }));
                }}
                style={{ ...styles.modeButton, color: isDark ? "#A3B899" : "#555", ...(controlMode === "manual" ? styles.activeManualBtn : {}) }}
              >
                <FaHandPaper /> Manual Control
              </button>
            </div>

            <div style={styles.statusRow}>
              <span style={labelStyle}>Valve State:</span>
              <span style={pumpActive ? styles.statusBadgeOn : styles.statusBadgeOff}>
                {pumpActive ? "WATER FLOWING (ON)" : "VALVE LOCKED (OFF)"}
              </span>
            </div>

            <div style={{ ...styles.reasonHighlightRow, backgroundColor: isDark ? "#252B28" : "#F4F7F5", borderColor: borderRowColor }}>
              <span style={{ ...styles.reasonLabelText, color: isDark ? "#A3B899" : "#555" }}>Active Trigger:</span>
              <span style={{
                ...styles.reasonValueBadge, 
                color: reasonTag === "Cognitive Override" || reasonTag === "Predictive Buffer Triggered" ? "#52B788" : (reasonTag === "AI Weather Lockout" || reasonTag === "AI Rain Pause" ? "#FF6B6B" : (isDark ? "#A3B899" : "#1B4332"))
              }}>
                {reasonTag}
              </span>
            </div>

            {/* AI Session Clock Count Display Row */}
            {aiMinutesLeft > 0 && (
              <div style={{ 
                ...styles.reasonHighlightRow, 
                backgroundColor: (reasonTag === "AI Weather Lockout" || reasonTag === "AI Rain Pause") ? (isDark ? "#3D1D1D" : "#FFEBEE") : (isDark ? "#4A2E1B" : "#FFF3E0"), 
                borderColor: (reasonTag === "AI Weather Lockout" || reasonTag === "AI Rain Pause") ? (isDark ? "#5C2626" : "#FFCDD2") : (isDark ? "#6E4524" : "#FFE0B2") 
              }}>
                <span style={{ ...styles.reasonLabelText, color: (reasonTag === "AI Weather Lockout" || reasonTag === "AI Rain Pause") ? "#FF6B6B" : "#FFA726", display: "flex", alignItems: "center", gap: "6px" }}>
                  <FaHourglassHalf /> AI Session Clock:
                </span>
                <span style={{ ...styles.reasonValueBadge, color: (reasonTag === "AI Weather Lockout" || reasonTag === "AI Rain Pause") ? "#FF6B6B" : "#FFA726", fontWeight: "800" }}>
                  {aiMinutesLeft} mins left
                </span>
              </div>
            )}
            
            <div style={styles.statusRow}>
              <span style={labelStyle}>Water Pipe Flow Rate:</span>
              <span style={valueStyle}>
                {pumpActive ? "0.75 Liters / sec" : "0.00 Liters / sec"}
              </span>
            </div>

            <button 
              onClick={handlePumpToggle} 
              style={{
                ...styles.button,
                backgroundColor: pumpActive ? "#D32F2F" : "#2E7D32",
              }}
            >
              {pumpActive ? "⚠️ Force Shut Valve Off" : "▶️ Force Open Valve On"}
            </button>
          </div>

          {/* DYNAMIC READOUT OF REASONS AND METRICS */}
          <div className="irr-card" style={{ ...cardStyle, width: "500px" }}>
            <h2 style={cardTitleStyle}>Why is this happening? (Live Field Status)</h2>
            
            <div style={{ 
              ...styles.infoBox, 
              backgroundColor: (reasonTag === "AI Weather Lockout" || reasonTag === "AI Rain Pause") ? (isDark ? "#3D1D1D" : "#FFEBEE") : (reasonTag === "Cognitive Override" || reasonTag === "Predictive Buffer Triggered" ? (isDark ? "#1B3D2B" : "#E8F5E9") : (isDark ? "#173024" : "#E8F5E9")), 
              borderLeft: (reasonTag === "AI Weather Lockout" || reasonTag === "AI Rain Pause") ? "4px solid #C62828" : (reasonTag === "Cognitive Override" ? "4px solid #E65100" : "4px solid #2E7D32") 
            }}>
              <strong style={{ display: "block", marginBottom: "6px", fontSize: "14px", color: isDark ? "#FFFFFF" : "#111111" }}>
                {aiMinutesLeft > 0 ? "🤖 Vision Intelligence Override:" : "📋 Automation Engine Decision:"}
              </strong>
              <p style={{ margin: 0, fontSize: "13.5px", lineHeight: "1.5", color: textMessageColor, fontWeight: "500" }}>
                {automationMessage}
              </p>
            </div>

            <h4 style={styles.subGridSectionTitle}>Live Environment Verification Checks</h4>
            <div style={{ ...styles.metricsTableGrid, backgroundColor: borderRowColor, borderColor: borderRowColor }}>
              
              <div style={{ ...styles.tableMetricRow, backgroundColor: innerRowBg }}>
                <div style={{ ...styles.metricNameCell, color: isDark ? "#E5EAE7" : "#4F4F4F" }}><FaTint color="#2F80ED" /> Soil Moisture</div>
                <div style={{ ...styles.metricValueCell, color: isDark ? "#FFFFFF" : "#111" }}>{currentSoilMoisture}%</div>
                <div style={{ ...styles.metricFeedbackCell, color: isDark ? "#A3B899" : "#555" }}>
                  {currentSoilMoisture < userThreshold ? "⚠️ Below Core Limit" : "✅ Dynamic Ground Stable"}
                </div>
              </div>

              <div style={{ ...styles.tableMetricRow, backgroundColor: innerRowBg }}>
                <div style={{ ...styles.metricNameCell, color: isDark ? "#E5EAE7" : "#4F4F4F" }}><FaThermometerHalf color="#E05315" /> Air Temp</div>
                <div style={{ ...styles.metricValueCell, color: isDark ? "#FFFFFF" : "#111" }}>{currentAirTemp}°C</div>
                <div style={{ ...styles.metricFeedbackCell, color: isDark ? "#A3B899" : "#555" }}>
                  {currentAirTemp > 32 ? "⚠️ Evaporation Danger" : "✅ Safe Temperature"}
                </div>
              </div>

              <div style={{ ...styles.tableMetricRow, backgroundColor: innerRowBg }}>
                <div style={{ ...styles.metricNameCell, color: isDark ? "#E5EAE7" : "#4F4F4F" }}><FaWind color="#828282" /> Air Dryness (VPD)</div>
                <div style={{ ...styles.metricValueCell, color: isDark ? "#FFFFFF" : "#111" }}>{agronomicMetrics.vpd} kPa</div>
                <div style={{ ...styles.metricFeedbackCell, color: isDark ? "#A3B899" : "#555" }}>
                  {agronomicMetrics.vpd > 2.0 ? "⚠️ Air pulling moisture" : "✅ Moderate Air Draft"}
                </div>
              </div>

              <div style={{ ...styles.tableMetricRow, backgroundColor: innerRowBg }}>
                <div style={{ ...styles.metricNameCell, color: isDark ? "#E5EAE7" : "#4F4F4F" }}><FaCloudRain color="#56CCF2" /> 24h Rain Forecast</div>
                <div style={{ ...styles.metricValueCell, color: isDark ? "#FFFFFF" : "#111" }}>{rainPredictedSoon ? "Yes" : "No"}</div>
                <div style={{ ...styles.metricFeedbackCell, color: isDark ? "#A3B899" : "#555" }}>
                  {rainPredictedSoon ? "🌧️ Rain Threat Flagged" : "☀️ Clear weather verified"}
                </div>
              </div>

            </div>

            <div style={{ ...styles.hardwareFooterRow, borderTopColor: borderRowColor }}>
              <FaDatabase color={agronomicMetrics.age > 7200 ? "#E05315" : "#219653"} />
              <span style={{ color: isDark ? "#A3B899" : "#666" }}>
                Last field data transmission received <strong>{agronomicMetrics.age} seconds ago</strong>.
              </span>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}

const styles = {
  container: { display: "flex", height: "100vh", overflow: "hidden", fontFamily: "system-ui, -apple-system, sans-serif" },
  sidebar: { width: "260px", height: "100vh", background: "linear-gradient(180deg, #1B4332, #081C15)", color: "#FFFFFF", padding: "30px 24px", display: "flex", flexDirection: "column", boxSizing: "border-box" },
  logoContainer: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" },
  logoIcon: { fontSize: "30px" },
  logoText: { fontSize: "22px", fontWeight: "700", margin: 0 },
  logoSubtext: { fontSize: "11px", color: "#A3B899" },
  navMenu: { display: "flex", flexDirection: "column", gap: "10px" },
  menuItem: { display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", borderRadius: "12px", fontSize: "15px", fontWeight: "500", color: "#D8E2DC", cursor: "pointer" },
  activeMenuItem: { backgroundColor: "#2D6A4F", color: "#FFFFFF", fontWeight: "600" },
  menuIcon: { fontSize: "18px" },
  mainContent: { flex: 1, padding: "40px 50px", height: "100vh", overflowY: "auto", boxSizing: "border-box"  },
  pageTitle: { fontSize: "28px", fontWeight: "700", marginBottom: "30px" },
  rainBanner: { display: "flex", alignItems: "center", gap: "10px", color: "#2F80ED", padding: "14px 20px", borderRadius: "12px", marginBottom: "24px", fontSize: "14px", border: "1px solid" },
  card: { padding: "25px", borderRadius: "16px", boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.04)", border: "1px solid", width: "340px", boxSizing: "border-box" },
  cardTitle: { fontSize: "17px", marginTop: 0, marginBottom: "20px", borderBottom: "1px solid", paddingBottom: "10px", fontWeight: "700" },
  modeStrip: { display: "flex", gap: "6px", padding: "4px", borderRadius: "8px", marginBottom: "20px" },
  modeButton: { flex: 1, border: "none", background: "none", padding: "10px 6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" },
  activeAutoBtn: { backgroundColor: "#2E7D32", color: "#fff", boxShadow: "0px 2px 6px rgba(46, 125, 50, 0.2)" },
  activeManualBtn: { backgroundColor: "#E65100", color: "#fff", boxShadow: "0px 2px 6px rgba(230, 81, 0, 0.2)" },
  statusRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  statusLabel: { fontSize: "14px", fontWeight: "500" },
  statusValue: { fontSize: "14px", fontWeight: "700" },
  statusBadgeOn: { fontSize: "11px", fontWeight: "700", backgroundColor: "#E8F5E9", color: "#2E7D32", padding: "6px 12px", borderRadius: "8px", letterSpacing: "0.5px" },
  statusBadgeOff: { fontSize: "11px", fontWeight: "700", backgroundColor: "#FFEBEE", color: "#C62828", padding: "6px 12px", borderRadius: "8px", letterSpacing: "0.5px" },
  reasonHighlightRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: "10px", marginBottom: "16px", border: "1px solid" },
  reasonLabelText: { fontSize: "13px", fontWeight: "500" },
  reasonValueBadge: { fontSize: "12px", fontWeight: "700" },
  button: { marginTop: "10px", width: "100%", padding: "14px", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer", boxShadow: "0px 4px 12px rgba(0,0,0,0.05)", transition: "all 0.2s" },
  infoBox: { padding: "14px", borderRadius: "10px", fontSize: "13px" },
  subGridSectionTitle: { fontSize: "13px", color: "#828282", textTransform: "uppercase", letterSpacing: "0.5px", margin: "24px 0 12px 0" },
  metricsTableGrid: { display: "flex", flexDirection: "column", gap: "1px", borderRadius: "12px", overflow: "hidden", border: "1px solid" },
  tableMetricRow: { display: "grid", gridTemplateColumns: "1.2fr 0.6fr 1.2fr", padding: "12px 14px", alignItems: "center", gap: "8px" },
  metricNameCell: { fontSize: "13.5px", display: "flex", alignItems: "center", gap: "8px", fontWeight: "500" },
  metricValueCell: { fontSize: "14px", fontWeight: "700" },
  metricFeedbackCell: { fontSize: "12.5px", fontWeight: "600", textAlign: "right" },
  hardwareFooterRow: { display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", marginTop: "20px", borderTop: "1px solid", paddingTop: "14px" }
};

export default Irrigation;