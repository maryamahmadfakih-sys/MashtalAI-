import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaThLarge,
  FaTint,
  FaExclamationTriangle,
  FaHistory,
  FaCog,
  FaCloudSun,
  FaRobot
} from "react-icons/fa";

function Alerts() {
  const navigate = useNavigate();

  // 🌓 Dynamic Theme Synchronizer Hook
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("mashtal_system_config");
    return saved ? JSON.parse(saved).activeTheme : "Light";
  });
  const isDark = theme === "Dark";
  
  // Setup local state for dynamic live alerts array matrix
  const [alerts, setAlerts] = useState([]);
  
  // Ref tracking to monitor shifting critical alert metrics across polling ticks safely
  const lastCriticalCountRef = useRef(0);

  // Poll local storage to check for theme and configuration changes in real time
  useEffect(() => {
    const syncTheme = () => {
      const saved = localStorage.getItem("mashtal_system_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.activeTheme !== theme) {
          setTheme(parsed.activeTheme || "Light");
        }
      }
    };
    const themeInterval = setInterval(syncTheme, 1000);
    return () => clearInterval(themeInterval);
  }, [theme]);

  // 1. REQUEST BROWSER NOTIFICATION PERMISSIONS ON MOUNT
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // 2. HELPER FUNCTION TO TRIGGER THE POP-UP
  const sendNotification = (title, body) => {
    // Read user configuration dynamically from cache block
    const savedConfig = JSON.parse(localStorage.getItem("mashtal_system_config")) || {};
    const areNotificationsEnabled = savedConfig.notificationsEnabled ?? true;

    // Halt right here if notifications have been set to false by user toggle
    if (!areNotificationsEnabled) return;

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body: body,
        icon: "🌱",
      });
    }
  };

  // 3. CORE SYNCHRONIZATION ENGINE WITH DISK STORAGE
  useEffect(() => {
    const runSystemWideAudit = () => {
      // Pull configurations and parameters directly from shared disk snapshots
      const savedConfig = JSON.parse(localStorage.getItem("mashtal_system_config")) || { moistureThreshold: 38 };
      const savedSensors = localStorage.getItem("mashtal_sensor_snapshot");
      const savedWeather = localStorage.getItem("mashtal_global_weather");
      const savedCognitive = localStorage.getItem("mashtal_cognitive_override");
      const historyLogs = JSON.parse(localStorage.getItem("mashtal_history")) || [];
      
      const userThreshold = Number(savedConfig.moistureThreshold) || 38;
      const parsedAlerts = [];
      let alertCounter = 1;

      // 🔍 SCAN CONDITION A: Parse Historic Critical Exception Events From Stream
      historyLogs.forEach((log) => {
        if (log.action.includes("Low Moisture Alert") || log.action.includes("❌") || log.action.includes("Hardware Error")) {
          // Prevent filling the array with identical historic entries; prioritize tracking unique action points
          const isAlreadyTracked = parsedAlerts.some(a => a.message.includes(log.time));
          if (!isAlreadyTracked) {
            parsedAlerts.push({
              id: alertCounter++,
              type: "critical",
              message: `Historic Infrastructure Log [${log.time}]: ${log.action.replace(/[^a-zA-Z0-9\s:().,⚠️🛑❌🌧️🤖]/g, "")}`,
              icon: "📋"
            });
          }
        }
      });

      // 🔍 SCAN CONDITION B: Sensor Transmission Integrity & Stale Reading Checks
      if (savedSensors) {
        const sensorPacket = JSON.parse(savedSensors);
        const moisture = sensorPacket.soilMoisture;
        const vpd = sensorPacket.vpd || 1.2;
        const pulseDelta = new Date() - new Date(sensorPacket.lastUpdated || Date.now());
        
        // Check for 15-minute complete sensor data dropouts
        if (pulseDelta > 60000 * 15) {
          parsedAlerts.push({
            id: alertCounter++,
            type: "critical",
            message: `CRITICAL HARDWARE FAULT: Ground telemetry array offline. Last data packet received over ${Math.round(pulseDelta / 60000)} minutes ago. Automatic systems suspended.`,
            icon: "❌"
          });
        }

        // Live Real-Time Moisture Level Validation Check
        if (moisture < userThreshold) {
          parsedAlerts.push({
            id: alertCounter++,
            type: "critical",
            message: `CRITICAL HYDRATION BOUNDARY EXCEEDED: Subsoil moisture level dropped to ${moisture}%, breaking below your configured secure threshold limit of ${userThreshold}%.`,
            icon: "⚠️"
          });
        }

        // Vapor Pressure Deficit Atmospheric Moisture Absorption Danger Check
        if (vpd > 2.0) {
          parsedAlerts.push({
            id: alertCounter++,
            type: "warning",
            message: `ATMOSPHERIC FORCE WARNING: Excessive Air Dryness Detected (${vpd} kPa). Ambient environment is causing abnormal moisture loss across crop canopy.`,
            icon: "💨"
          });
        }
      }

      // 🔍 SCAN CONDITION C: Meteorological Weather Warnings & Rain Standbys
      if (savedWeather) {
        const weather = JSON.parse(savedWeather);
        const ambientTemp = weather.temp || 24;
        const rainingNow = weather.weatherCode >= 51;

        if (rainingNow) {
          parsedAlerts.push({
            id: alertCounter++,
            type: "warning",
            message: "WEATHER ACTUATOR INTERCEPT: Active precipitation running over field matrix coordinates. Automatic baseline irrigation cycles locked off.",
            icon: "🌧️"
          });
        }

        if (ambientTemp > 32) {
          parsedAlerts.push({
            id: alertCounter++,
            type: "warning",
            message: `HIGH AMBIENT THERMAL ELEVATION: Local field temperature at ${ambientTemp}°C. Accelerating evaporation risks on standard non-irrigated zones.`,
            icon: "🌡️"
          });
        }
      }

      // 🔍 SCAN CONDITION D: Cognitive Intelligence Override Tracking
      if (savedCognitive) {
        const cognitiveData = JSON.parse(savedCognitive);
        const scanTime = new Date(cognitiveData.timestamp);
        const elapsedMinutes = (new Date() - scanTime) / 60000;
        const totalDurationAllowed = Number(cognitiveData.duration_minutes) || 20;
        const remainingTime = totalDurationAllowed - elapsedMinutes;

        if (remainingTime > 0) {
          parsedAlerts.push({
            id: alertCounter++,
            type: "info",
            message: `ACTIVE COGNITIVE OVERRIDE: Multi-modal vision analysis diagnostics have taken system priority. Run duration clock: ${Math.ceil(remainingTime)} minutes remaining.`,
            icon: "🤖"
          });
        }
      }

      // Push final evaluated state back down into operational layout state
      setAlerts(parsedAlerts);
    };

    // Initialize immediate scanning cycle on component mount
    runSystemWideAudit();

    // Establish persistent polling hook to monitor updates across dashboards instantly
    const poolSyncInterval = setInterval(runSystemWideAudit, 1000);
    return () => clearInterval(poolSyncInterval);
  }, []);

  // 4. TRIGGER NATIVE NOTIFICATION EVENT HOOK WHEN CRITICAL ENTRIES SHIFT
  useEffect(() => {
    const activeCriticals = alerts.filter(a => a.type === "critical");
    
    // Only dispatch a window pop-up if the number of critical faults actively expands
    if (activeCriticals.length > lastCriticalCountRef.current) {
      sendNotification(
        "🚨 MASHTAL Safety Matrix Trip", 
        `Active telemetry scanning caught ${activeCriticals.length} infrastructure vulnerabilities requiring immediate correction.`
      );
    }
    
    // Cache the absolute historical checkpoint to verify the next state delta tick
    lastCriticalCountRef.current = activeCriticals.length;
  }, [alerts]); 

  // Theme Interpolations
  const containerStyle = { ...styles.container, backgroundColor: isDark ? "#121413" : "#F4F7F5" };
  const titleStyle = { ...styles.pageTitle, color: isDark ? "#52B788" : "#1B4332" };

  return (
    <div className="app-shell" style={containerStyle}>
      {/* SIDEBAR SYSTEM LINK LAYOUT */}
      <aside className="app-sidebar" style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>🌱</div>
          <div>
            <h2 style={styles.logoText}>MASHTAL</h2>
            <span style={styles.logoSubtext}>Intelligent Agriculture Platform</span>
          </div>
        </div>

        <nav className="app-nav" style={styles.navMenu}>
          <div style={styles.menuItem} onClick={() => navigate("/dashboard")}><FaThLarge style={styles.menuIcon} /> Dashboard</div>
          <div style={styles.menuItem} onClick={() => navigate("/weather")}><FaCloudSun style={styles.menuIcon} /> Weather</div>
          <div style={styles.menuItem} onClick={() => navigate("/irrigation")}><FaTint style={styles.menuIcon} /> Irrigation</div>
          <div style={styles.menuItem} onClick={() => navigate("/mashtal-ai")}><FaRobot style={styles.menuIcon} /> Mashtal AI </div>
          <div style={{ ...styles.menuItem, ...styles.activeMenuItem }} onClick={() => navigate("/alerts")}><FaExclamationTriangle style={styles.menuIcon} /> Alerts</div>
          <div style={styles.menuItem} onClick={() => navigate("/history")}><FaHistory style={styles.menuIcon} /> History</div>
          <div style={styles.menuItem} onClick={() => navigate("/settings")}><FaCog style={styles.menuIcon} /> Settings</div>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="app-main" style={styles.mainContent}>
        <h1 style={titleStyle}>🚨 System Alerts Registry</h1>

        <div style={styles.alertList}>
          {alerts.length === 0 ? (
            <div style={{
              ...styles.alertBox, 
              backgroundColor: isDark ? "#173024" : "#E8F5E9", 
              borderLeft: "5px solid #2E7D32", 
              color: isDark ? "#A3B899" : "#2E7D32"
            }}>
              <span style={styles.alertIcon}>✅</span>
              <span style={styles.alertText}>All telemetry structures operational. Ground grids reporting baseline nominal values.</span>
            </div>
          ) : (
            alerts.map((alert) => {
              const isCritical = alert.type === "critical";
              const isInfo = alert.type === "info";
              
              // Dark vs Light color palette matrices
              const boxColor = isDark 
                ? (isCritical ? "#3D1D1D" : isInfo ? "#1A2F4C" : "#4A3718") 
                : (isCritical ? "#FFF5F5" : isInfo ? "#EBF8FF" : "#FFF9E6");

              const borderAccent = isCritical ? "#E53E3E" : (isInfo ? "#3182CE" : "#DD6B20");

              const textTint = isDark 
                ? (isCritical ? "#FFA8A8" : isInfo ? "#90CDF4" : "#FBD38D") 
                : (isCritical ? "#C53030" : isInfo ? "#2B6CB0" : "#B7791F");

              const boxStyle = {
                ...styles.alertBox,
                backgroundColor: boxColor,
                borderLeft: `5px solid ${borderAccent}`,
                color: textTint,
              };

              return (
                <div key={alert.id} style={boxStyle}>
                  <span style={styles.alertIcon}>{alert.icon}</span>
                  <span style={styles.alertText}>{alert.message}</span>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: { display: "flex", height: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" },
  sidebar: { width: "260px", height: "100vh", background: "linear-gradient(180deg, #1B4332, #081C15)", color: "#FFFFFF", padding: "30px 24px", display: "flex", flexDirection: "column", boxSizing: "border-box", boxShadow: "4px 0 15px rgba(0,0,0,0.1)" },
  logoContainer: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" },
  logoIcon: { fontSize: "30px" },
  logoText: { fontSize: "22px", fontWeight: "700", margin: 0},
  logoSubtext: { fontSize: "11px", color: "#A3B899" },
  navMenu: { display: "flex", flexDirection: "column", gap: "10px" },
  menuItem: { display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", borderRadius: "12px", fontSize: "15px", fontWeight: "500", color: "#D8E2DC", cursor: "pointer"},
  activeMenuItem: { backgroundColor: "#2D6A4F", color: "#FFFFFF", fontWeight: "600", boxShadow: "0 4px 10px rgba(0,0,0,0.15)" },
  menuIcon: { fontSize: "18px"},
  mainContent: { flex: 1, padding: "40px 50px", boxSizing: "border-box", height:"100vh" , overflow: "auto" },
  pageTitle: { fontSize: "28px", fontWeight: "700", marginBottom: "24px", marginTop: 0 },
  alertList: { display: "flex", flexDirection: "column", gap: "16px", maxWidth: "900px" },
  alertBox: { display: "flex", alignItems: "center", padding: "18px 24px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" },
  alertIcon: { fontSize: "20px", marginRight: "14px", display: "flex", alignItems: "center" },
  alertText: { fontSize: "14px", fontWeight: "600", lineHeight: "1.4" },
};

export default Alerts;