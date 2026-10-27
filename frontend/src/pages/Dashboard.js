import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";

import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  FaThLarge,
  FaTint,
  FaExclamationTriangle,
  FaHistory,
  FaCog,
  FaRegBell,
  FaSun,
  FaLeaf,
  FaCloudSun,
  FaCompass,
  FaCloudRain,
  FaRobot,
  FaSignal,
  FaUser,
  FaSignOutAlt
} from "react-icons/fa";

export default function Dashboard() {
  const navigate = useNavigate();
  const [aiMessage, setAiMessage] = useState("");
  const [historicalData, setHistoricalData] = useState([]);
  const fileInputRef = useRef(null);

  // PROFILE IMAGE STATE
  const [profileImage, setProfileImage] = useState(() => {
    return (
      localStorage.getItem("mashtal_profile_image") ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60"
    );
  });

  // Profile interaction hooks state flags
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);
  
  // Dynamic App-wide Settings Integration Configuration
  const [appConfig, setAppConfig] = useState(() => {
    const saved = localStorage.getItem("mashtal_system_config");
    return saved ? JSON.parse(saved) : { profileName: "Maryam Fakih", moistureThreshold: 30, notificationsEnabled: true, activeTheme: "Light" };
  });

  const isDark = appConfig.activeTheme === "Dark";
  const userThreshold = appConfig.moistureThreshold || 30;

  // LIVE METEOROLOGICAL TELEMETRY
  const [dashboardWeather, setDashboardWeather] = useState({
    name: "Beirut",
    temp: 24,
    humidity: 50,
    weatherCode: 0,
    icon: "☀️",
    sunlightLux: 45000,
    forecast: null,
    rainPredictedSoon: false
  });

  // ENTERPRISE AGRONOMIC SENSOR SNAPSHOTS
  const [liveSensors, setLiveSensors] = useState({
    soilMoisture: 42,
    soilTemp: 23,
    soilHumidity: 55,
    canopyHealth: 96,
    solenoidState: "Closed",
    irrigationStatusText: "Monitoring System",
    vpd: 1.2,
    et0: 0.15,
    lastUpdated: new Date().toISOString()
  });

  // ATMOSPHERE MATRIX BALANCER 
  const [balancer, setBalancer] = useState({
    score: 100,
    status: "Optimal Balance",
    color: "#219653",
    pressure: 1013
  });

  // Handle outside layout clicks to drop focus down safely 
  useEffect(() => {
    function handleOutsideClick(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleUserLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Auth clearance error:", err);
    } finally {
      localStorage.removeItem("mashtal_system_config");
      navigate("/login");
    }
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Image = reader.result;
      setProfileImage(base64Image);
      localStorage.setItem("mashtal_profile_image", base64Image);
      setShowProfileMenu(false);
    };
    reader.readAsDataURL(file);
  };

  const runAI = useCallback((weather, sensors) => {
    const moisture = sensors.soilMoisture;
    const weatherCode = weather.weatherCode;
    const isRaining = weatherCode >= 51; 
    const rainUpcoming = weather.rainPredictedSoon;

    const liveConfig = JSON.parse(localStorage.getItem("mashtal_system_config")) || { moistureThreshold: 30 };
    const activeLimit = liveConfig.moistureThreshold;

    if (sensors.solenoidState === "Manual Flush (ON)") {
      setAiMessage(`⚙️ MANUAL OVERRIDE ENGAGED: Valve loop forced OPEN via control system settings. Disregarding meteorological indicators until returned to automated control.`);
      return;
    } else if (sensors.solenoidState === "Manual Shutdown (OFF)") {
      setAiMessage(`⚠️ MANUAL OVERRIDE ENGAGED: Valve forced CLOSED via control system settings. Safety locks are currently overriding automated algorithm inputs.`);
      return;
    }

    if (isRaining) {
      setAiMessage(`🌧️ Precipitation tracking is active in ${weather.name}. Natural rainfall is replenishing the topsoil matrix. Automated irrigation systems have been hard-paused.`);
    } else if (rainUpcoming && moisture > activeLimit) {
      setAiMessage(`🔮 PREDICTIVE WATER MANAGEMENT: Meteor models flag imminent rain within the 24-hour vector. Valve automation holding system in standby to prevent resource over-saturation.`);
    } else if (sensors.vpd > 2.0 && moisture < (activeLimit + 10)) {
      setAiMessage(`🔥 HIGH EVAPOTRANSPIRATION RISK: Vapor Pressure Deficit is critical (${sensors.vpd} kPa). Microclimate drying power is elevated; preventive irrigation cycle advised.`);
    } else if (moisture < activeLimit) {
      setAiMessage(`🔥 CRITICAL FLUID DEFICIT: Ground sensor arrays registered values beneath target threshold boundaries (${activeLimit}%). Drip networks have been instructed to initialize autonomous line flushes.`);
    } else if (moisture < (activeLimit + 7)) {
      setAiMessage("🌱 Soil hydration boundaries are narrowing. Standard target drip irrigation scheduled for late evening to prevent evaporation loss.");
    } else {
      setAiMessage("✅ Ecosystem equilibrium balanced perfectly. Current soil fluid levels completely support regional leaf transpiration rates.");
    }
  }, []);

  const writeSnapshotToSupabase = useCallback(async (sensorPayload) => {
    try {
      const { error } = await supabase
        .from("sensor_readings")
        .insert([
          {
            device_id: 1,
            soil_moisture: sensorPayload.soilMoisture,
            temperature: sensorPayload.soilTemp,
            humidity: sensorPayload.soilHumidity,
            light_level: dashboardWeather.sunlightLux,
            recorded_at: sensorPayload.lastUpdated
          }
        ]);

      if (error) {
        console.error("Failed compiling snapshot payload row to Supabase:", error.message);
      }
    } catch (err) {
      console.error("Network fault pushing to database storage:", err);
    }
  }, [dashboardWeather.sunlightLux]);

  const computeAgronomicData = useCallback((weatherData) => {
    const { temp, humidity, weatherCode, sunlightLux, rainPredictedSoon } = weatherData;
    
    let manualActive = false;
    let manualMode = "auto";
    const overridePayload = localStorage.getItem("mashtal_manual_override");
    
    if (overridePayload) {
      try {
        const parsedOverride = JSON.parse(overridePayload);
        manualActive = parsedOverride.active;
        manualMode = parsedOverride.mode || "auto";
      } catch(e) {
        console.error("Error parsing manual bridge flag state structures", e);
      }
    }

    const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3)); 
    const avp = svp * (humidity / 100); 
    const vpd = parseFloat((svp - avp).toFixed(2)); 

    const solarRadiationKw = sunlightLux / 120000; 
    const estimatedEt0 = parseFloat((0.0023 * solarRadiationKw * (temp + 17.8) * Math.sqrt(Math.max(0, temp - 10))).toFixed(2));

    const currentConfig = JSON.parse(localStorage.getItem("mashtal_system_config")) || { moistureThreshold: 30 };
    const dynamicLimit = currentConfig.moistureThreshold;

    let calculatedMoisture = 42; 
    let statusText = "System Monitoring";
    let valve = "Closed";

    if (manualMode === "manual") {
      valve = manualActive ? "Manual Flush (ON)" : "Manual Shutdown (OFF)";
      statusText = manualActive ? "User Flush Triggered" : "User System HOLD";
      calculatedMoisture = manualActive ? 68 : 31; 
    } else {
      if (weatherCode >= 51) {
        calculatedMoisture = Math.min(82, 65 + (weatherCode - 50) * 1.5);
        statusText = "Precipitation Hold";
        valve = "Auto Lock (Raining)";
      } else if (rainPredictedSoon && calculatedMoisture >= dynamicLimit) {
        statusText = "Predictive Standby";
        valve = "Auto Off (Rain Expected)";
        calculatedMoisture = dynamicLimit + 5; 
      } else {
        const depletionFactor = vpd > 1.5 ? 6 : 0;
        calculatedMoisture = Math.max(25, Math.round(45 - depletionFactor));
        
        if (calculatedMoisture < dynamicLimit || vpd > 2.0) {
          statusText = "Watering Triggered";
          valve = "Autonomous Open (ON)";
          calculatedMoisture = dynamicLimit + 6; 
        } else {
          statusText = "Ecosystem Balanced";
          valve = "Autonomous Closed (OFF)";
        }
      }
    }

    const sensorPayload = {
      soilMoisture: calculatedMoisture,
      soilTemp: Math.round(temp - 2),
      soilHumidity: Math.min(98, Math.round(humidity * 1.05)),
      canopyHealth: vpd > 2.2 ? 86 : 97,
      solenoidState: valve,
      irrigationStatusText: statusText,
      vpd: vpd,
      et0: estimatedEt0,
      lastUpdated: new Date().toISOString()
    };

    setLiveSensors(sensorPayload);
    runAI(weatherData, sensorPayload);

    localStorage.setItem("mashtal_sensor_snapshot", JSON.stringify(sensorPayload));
    writeSnapshotToSupabase(sensorPayload);

    const mockHistory = Array.from({ length: 6 }, (_, i) => {
      const targetTime = new Date();
      targetTime.setHours(targetTime.getHours() - (6 - i) * 2);
      return {
        time: targetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        soil: Math.round(calculatedMoisture + (Math.sin(i) * 2.5)),
        temp: Math.round(sensorPayload.soilTemp - (5 - i) * 0.4)
      };
    });
    setHistoricalData(mockHistory);

  }, [runAI, writeSnapshotToSupabase]);

  const fetchLinkedWeather = useCallback(async () => {
  try {
    const updatedConfig = localStorage.getItem("mashtal_system_config");
    if (updatedConfig) {
      setAppConfig(JSON.parse(updatedConfig));
    }

    const savedWeather = localStorage.getItem("mashtal_global_weather");
    let targetCity = "Beirut";
    if (savedWeather) {
      const parsed = JSON.parse(savedWeather);
      targetCity = parsed.name || "Beirut";
    }

    // 1. GEO API Fetch
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(targetCity)}&count=1&language=en&format=json`
    );
    const geoData = await geoResponse.json();

    if (geoData.results && geoData.results.length > 0) {
      const { latitude, longitude } = geoData.results[0];

      // 2. WEATHER API Fetch
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,surface_pressure,weather_code,shortwave_radiation&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`
      );
      
      const weatherData = await weatherResponse.json();

      // 🔥 CRITICAL PROTECTION: Check if the API response is valid before drilling into it
      if (!weatherData || !weatherData.current || !weatherData.daily) {
        throw new TypeError("API response structure is incomplete or missing data blocks.");
      }

      const current = weatherData.current;
      const daily = weatherData.daily;
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      let liveIcon = "☀️";
      if (current.weather_code >= 1 && current.weather_code <= 3) liveIcon = "⛅";
      if (current.weather_code >= 45 && current.weather_code <= 48) liveIcon = "☁️";
      if (current.weather_code >= 51 && current.weather_code <= 67) liveIcon = "🌦️";
      if (current.weather_code >= 95) liveIcon = "⛈️";

      const calculatedLux = Math.round((current.shortwave_radiation || 0) * 120);
      let rainUpcoming = false;

      const formattedForecast = daily.time.slice(0, 3).map((timeStr, index) => {
        const dayName = days[new Date(timeStr).getDay()];
        const code = daily.weather_code[index];
        let icon = "☀️";

        if (code >= 1 && code <= 3) icon = "⛅";
        if (code >= 45 && code <= 48) icon = "☁️";
        if (code >= 51 && code <= 67) {
          icon = "🌦️";
          if (index > 0) rainUpcoming = true;
        }
        if (code >= 95) {
          icon = "⛈️";
          if (index > 0) rainUpcoming = true;
        }

        return {
          day: dayName,
          icon: icon,
          maxTemp: Math.round(daily.temperature_2m_max[index]),
          minTemp: Math.round(daily.temperature_2m_min[index])
        };
      });

      const freshWeatherObj = {
        name: targetCity,
        temp: Math.round(current.temperature_2m),
        humidity: current.relative_humidity_2m,
        weatherCode: current.weather_code,
        icon: liveIcon,
        sunlightLux: calculatedLux === 0 ? 450 : calculatedLux,
        forecast: formattedForecast,
        rainPredictedSoon: rainUpcoming
      };

      const livePressure = current.surface_pressure || 1013;
      const liveHumidity = current.relative_humidity_2m || 50;
      const pressureDeviation = Math.abs(1013 - livePressure);
      const humidityDeviation = Math.abs(55 - liveHumidity);

      const score = Math.max(0, Math.min(100, Math.round(100 - (pressureDeviation * 0.5 + humidityDeviation * 0.8))));

      let status = "Optimal Balance";
      let color = "#219653";
      if (score < 85 && score >= 70) {
        status = "Atmospheric Load Shift";
        color = "#E05315";
      } else if (score < 70) {
        status = "Barometric Shift Variance";
        color = "#EB5757";
      }

      setBalancer({ score, status, color, pressure: livePressure });
      setDashboardWeather(freshWeatherObj);

      localStorage.setItem("mashtal_global_weather", JSON.stringify(freshWeatherObj));
      computeAgronomicData(freshWeatherObj);
    }

  } catch (err) {
    console.error("Dashboard engine experienced calculation anomalies", err);
    
    // 🛡️ FALLBACK: If network fails, try to read the last successful run from cache 
    // so charts and tables still function with historical data.
    const cachedWeather = localStorage.getItem("mashtal_global_weather");
    if (cachedWeather) {
      console.log("Network dropped. Recovering dashboard state from offline cache...");
      computeAgronomicData(JSON.parse(cachedWeather));
    }
  }
}, [computeAgronomicData]);

  useEffect(() => {
    fetchLinkedWeather();
    const interval = setInterval(fetchLinkedWeather, 300000);
    return () => clearInterval(interval);
  }, [fetchLinkedWeather]);

  const loggedAlertsCount = (JSON.parse(localStorage.getItem("mashtal_alerts")) || []).length;

  const dynamicContainerStyle = {
    ...styles.dashboardContainer,
    backgroundColor: isDark ? "#121413" : "#F4F7F5",
    color: isDark ? "#E5EAE7" : "#333333"
  };

  const dynamicCardPanelStyle = {
    ...styles.rightColumnPanelCard,
    backgroundColor: isDark ? "#1E2220" : "#FFFFFF",
    borderColor: isDark ? "#2D3430" : "#E5EAE7",
    color: isDark ? "#E5EAE7" : "#333333"
  };

  return (
    <div className="app-shell" style={dynamicContainerStyle}>
      
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
          <div style={{ ...styles.menuItem, ...styles.activeMenuItem }} onClick={() => navigate("/dashboard")}>
            <FaThLarge style={styles.menuIcon} /> Dashboard
          </div>
          <div style={styles.menuItem} onClick={() => navigate("/weather")}>
            <FaCloudSun style={styles.menuIcon} /> Weather
          </div>
          <div style={styles.menuItem} onClick={() => navigate("/irrigation")}>
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

      {/* MAIN CONTENT WORKSPACE */}
      <main className="app-main" style={styles.mainContent}>
        
        {/* TOP DASHBOARD HEADER NAVBAR */}
        <header className="dash-header" style={styles.topHeader}>
          <div>
            <h1 style={{ ...styles.pageTitle, color: isDark ? "#52B788" : "#1A1A1A" }}>
              Dashboard ({dashboardWeather.name} {dashboardWeather.icon} {dashboardWeather.temp}°C)
            </h1>
          </div>
          <div style={styles.headerRight}>
            
            <div style={styles.notificationBadgeContainer} onClick={() => navigate("/alerts")}>
              <FaRegBell style={{ ...styles.headerNotificationIcon, color: isDark ? "#A3B899" : "#4F4F4F" }} />
              {appConfig.notificationsEnabled && (liveSensors.soilMoisture < userThreshold || loggedAlertsCount > 0) && (
                <span style={styles.badgeCount}>
                  {loggedAlertsCount > 0 ? loggedAlertsCount : "1"}
                </span>
              )}
            </div>

            <div style={styles.profileContainer} onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }} ref={profileRef}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: isDark ? "#E5EAE7" : "#333" }}>
                {appConfig.profileName}
              </span>
              <img src={profileImage} alt="User Profile" style={styles.profileImg} />
              <span style={{ ...styles.profileDropdownArrow, transform: showProfileMenu ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>▼</span>

              {showProfileMenu && (
                <div style={{ ...styles.profileDropdownMenu, backgroundColor: isDark ? "#1E2220" : "#FFFFFF", borderColor: isDark ? "#2D3430" : "#E5EAE7", boxShadow: isDark ? "0 10px 25px rgba(0,0,0,0.5)" : "0 10px 25px rgba(0,0,0,0.08)" }}>
                  <div style={{ ...styles.dropdownItem, cursor: "pointer", color: isDark ? "#E5EAE7" : "#333333" }} onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}>
                    <FaUser size={12} style={{ marginRight: "8px", color: "#2D6A4F" }} />
                    Change Picture
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfileImageChange} style={{ display: "none" }} />
                  </div>
                  <div style={{ ...styles.dropdownItem, color: isDark ? "#E5EAE7" : "#333333" }} onClick={() => navigate("/settings")}>
                    <FaCog size={12} style={{ marginRight: "8px", color: "#2D6A4F" }} />
                    Settings
                  </div>
                  <div style={{ ...styles.dropdownItem, ...styles.dropdownLogoutItem }} onClick={handleUserLogout}>
                    <FaSignOutAlt size={12} style={{ marginRight: "8px" }} />
                    Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* TWO COLUMN ASYMMETRIC GRID SYSTEM */}
        <div className="dash-grid" style={styles.gridContainer}>
          
          {/* LEFT PANELS COLUMN */}
          <div style={styles.leftColumn}>
            
            {/* SENSOR DATA CARDS ROW */}
            <section style={styles.cardRowSection}>
              <h3 style={{ ...styles.sectionHeaderTitle, color: isDark ? "#A3B899" : "#4F4F4F" }}>Precision Field Array Telemetry</h3>
              <div className="dash-sensors" style={styles.sensorGrid}>
                <div style={{ ...styles.sensorCard, backgroundColor: isDark ? "#1B2A4A" : "#EBF3FF" }}>
                  <div style={{ ...styles.cardHeader, color: "#2F80ED" }}><FaTint /> Volumetric Water (VWC)</div>
                  <div style={{ ...styles.cardValue, color: isDark ? "#FFFFFF" : "#1A1A1A" }}>{liveSensors.soilMoisture}%</div>
                  <div style={{ ...styles.cardFooter, color: "#2F80ED", display: "flex", alignItems: "center", gap: "4px" }}>
                    <FaSignal size={10} /> Live Snap | {liveSensors.soilMoisture < userThreshold ? "🚨 Critical Deficit" : "🟢 Stable VWC"}
                  </div>
                </div>
                <div style={{ ...styles.sensorCard, backgroundColor: isDark ? "#3E2215" : "#FFF2EC" }}>
                  <div style={{ ...styles.cardHeader, color: "#E05315" }}>Core Soil Temp</div>
                  <div style={{ ...styles.cardValue, color: isDark ? "#FFFFFF" : "#1A1A1A" }}>{liveSensors.soilTemp}°C</div>
                  <div style={{ ...styles.cardFooter, color: "#A4431B" }}>🌤️ Air Temp: {dashboardWeather.temp}°C</div>
                </div>
                <div style={{ ...styles.sensorCard, backgroundColor: isDark ? "#143521" : "#EAF7ED" }}>
                  <div style={{ ...styles.cardHeader, color: "#219653" }}>☁️ Subsurface Humidity</div>
                  <div style={{ ...styles.cardValue, color: isDark ? "#FFFFFF" : "#1A1A1A" }}>{liveSensors.soilHumidity}%</div>
                  <div style={{ ...styles.cardFooter, color: "#219653" }}>💨 Atmo Air RH: {dashboardWeather.humidity}%</div>
                </div>
                <div style={{ ...styles.sensorCard, backgroundColor: isDark ? "#3A3113" : "#FFF9E6" }}>
                  <div style={{ ...styles.cardHeader, color: "#D4A306" }}><FaSun /> Shortwave Radiation</div>
                  <div style={{ ...styles.cardValue, color: isDark ? "#FFFFFF" : "#1A1A1A" }}>{dashboardWeather.sunlightLux.toLocaleString()} lx</div>
                  <div style={{ ...styles.cardFooter, color: "#C68A00" }}>{dashboardWeather.sunlightLux > 35000 ? "☀️ High Solar Loading" : "⛅ Diffuse Exposure"}</div>
                </div>
              </div>
            </section>

            {/* SMART IRRIGATION & ANALYTICS DOUBLE BOX */}
            <div style={styles.analyticsSplitRow}>
              <div style={{ ...styles.innerBoxCard, backgroundColor: isDark ? "#1E2220" : "#FFFFFF" }}>
                <h3 style={{ ...styles.sectionHeaderTitle, color: isDark ? "#A3B899" : "#4F4F4F" }}>Smart Actuator Routing</h3>
                <div style={{ ...styles.irrigationStatusBox, backgroundColor: liveSensors.solenoidState.includes("Shutdown") ? "#FCEBEC" : liveSensors.solenoidState.includes("ON") ? "#EAF7ED" : "#EBF3FF" }}>
                  <div style={styles.irrigationIconWrapper}>
                    <FaLeaf size={24} color={liveSensors.solenoidState.includes("ON") ? "#219653" : "#D32F2F"} />
                  </div>
                  <div>
                    <h4 style={{ ...styles.statusMainText, color: liveSensors.solenoidState.includes("ON") ? "#219653" : "#333" }}>{liveSensors.irrigationStatusText}</h4>
                    <span style={{ ...styles.statusSubtext, color: "#555" }}>{liveSensors.solenoidState}</span>
                  </div>
                </div>
                <div style={{ ...styles.predictionIndicatorRow, backgroundColor: dashboardWeather.rainPredictedSoon ? "#EBF3FF" : (isDark ? "#252B28" : "#F4F7F5") }}>
                  <FaCloudRain color={dashboardWeather.rainPredictedSoon ? "#2F80ED" : "#828282"} />
                  <span style={{ fontSize: "13px", fontWeight: "600", color: dashboardWeather.rainPredictedSoon ? "#2F80ED" : (isDark ? "#E5EAE7" : "#4F4F4F") }}>
                    {dashboardWeather.rainPredictedSoon ? "Rain Prediction Flag: Valve Automation Hold" : "No Impending Precipitation Events"}
                  </span>
                </div>
              </div>

              <div style={{ ...styles.innerBoxCard, backgroundColor: isDark ? "#1E2220" : "#FFFFFF" }}>
                <h3 style={{ ...styles.sectionHeaderTitle, color: isDark ? "#A3B899" : "#4F4F4F" }}>Hydration Delta Vector Mapping</h3>
                <div style={styles.chartWrapperContainer}>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={historicalData}>
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#828282' }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Line type="monotone" name="Soil VWC %" dataKey="soil" stroke="#219653" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" name="Core Soil Temp" dataKey="temp" stroke="#E05315" strokeWidth={1} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* LOGICAL ACTIVITY LOG */}
            <section style={{ ...styles.tableSection, backgroundColor: isDark ? "#1E2220" : "#FFFFFF" }}>
              <h3 style={{ ...styles.sectionHeaderTitle, color: isDark ? "#A3B899" : "#4F4F4F" }}>Agronomic Activity Feed Log</h3>
              <div style={styles.tableResponsiveWrapper}>
                <table style={styles.historyTable}>
                  <thead>
                    <tr>
                      <th style={styles.tableTh}>System Logging Index</th>
                      <th style={styles.tableTh}>Status Code</th>
                      <th style={styles.tableTh}>Environmental Telemetry Snapshot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalData.slice(0, 4).map((entry, index) => (
                      <tr key={index} style={{ ...styles.tableTr, borderBottomColor: isDark ? "#2D3430" : "#F2F2F2" }}>
                        <td style={{ ...styles.tableTd, color: isDark ? "#E5EAE7" : "#333" }}>{entry.time}</td>
                        <td style={styles.tableTd}>
                          <span style={{ ...styles.statusTableBadge, backgroundColor: entry.soil < userThreshold ? '#FFF2EC' : '#EAF7ED', color: entry.soil < userThreshold ? '#E05315' : '#219653' }}>
                            {entry.soil < userThreshold ? "⚠️ VWC Critical Low" : "✅ Structural Equilibrium"}
                          </span>
                        </td>
                        <td style={{ ...styles.tableTd, color: isDark ? "#A3B899" : "#666" }}>
                          Soil Volumetric Water Content: {entry.soil}% VWC | Subsurface thermal signature: {entry.temp}°C
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* RIGHT PANELS COLUMN */}
          <div style={styles.rightColumn}>
            <div style={dynamicCardPanelStyle}>
              <h3 style={{ ...styles.sectionHeaderTitle, color: isDark ? "#A3B899" : "#4F4F4F" }}>Weather ({dashboardWeather.name})</h3>
              <div style={styles.weatherForecastStrip}>
                {dashboardWeather.forecast ? (
                  dashboardWeather.forecast.map((day, idx) => (
                    <div key={idx} style={{ ...styles.forecastDayItem, backgroundColor: isDark ? "#252B28" : "#F9FBFA" }}>
                      <span style={styles.forecastDayName}>{day.day}</span>
                      <div style={styles.forecastWeatherIcon}>{day.icon}</div>
                      <span style={{ ...styles.forecastMaxTemp, color: isDark ? "#FFFFFF" : "#333333" }}>{day.maxTemp}°C</span>
                      <span style={styles.forecastMinTemp}>{day.minTemp}°C</span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: "12px", color: "#828282" }}>Refreshing tracking arrays...</div>
                )}
              </div>
            </div>

            <div style={dynamicCardPanelStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 style={{ ...styles.sectionHeaderTitle, color: isDark ? "#A3B899" : "#4F4F4F", margin: 0 }}>Atmosphere Balancer</h3>
                <span style={{ fontSize: "22px", fontWeight: "800", color: isDark ? "#52B788" : "#1A1A1A" }}>{balancer.score}%</span>
              </div>
              <div style={{ ...styles.alertStatusAlertBox, borderLeftColor: balancer.color, backgroundColor: isDark ? "#252B28" : "#FDFDFD" }}>
                <div style={styles.alertHeaderRow}>
                  <span style={{ color: balancer.color, fontWeight: "800", display: "flex", alignItems: "center", gap: "6px" }}><FaCompass /> {balancer.status}</span>
                </div>
                <p style={{ ...styles.alertContentParagraph, color: isDark ? "#E5EAE7" : "#4F4F4F" }}>
                  Ambient Air Relative Humidity is mapping at <strong>{dashboardWeather.humidity}%</strong> against the 55% target calibration. Regional barometric configuration tracks at <strong>{Math.round(balancer.pressure)} hPa</strong>.
                </p>
              </div>
            </div>

            <div style={dynamicCardPanelStyle}>
              <h3 style={{ ...styles.sectionHeaderTitle, color: isDark ? "#A3B899" : "#4F4F4F" }}>AI Core Diagnostic Engine</h3>
              <p style={{ ...styles.fertilizerMainMetaText, color: isDark ? "#E5EAE7" : "#333" }}>Target Vector Domain: <strong>{dashboardWeather.name} Grid Node</strong></p>
              <div style={{ ...styles.scientificInsightsBlock, backgroundColor: isDark ? "#252B28" : "#F4F7F5", borderColor: isDark ? "#3D4842" : "#E5EAE7", color: isDark ? "#E5EAE7" : "#555" }}>
                <div>💧 VPD: <strong>{liveSensors.vpd} kPa</strong></div>
                <div>🌱 Loss ($ET_0$): <strong>{liveSensors.et0} mm/hr</strong></div>
              </div>
              <div style={{ ...styles.dynamicAiMessageBox, backgroundColor: isDark ? "#142D1E" : "#F4FDF7", borderColor: "#6FCF97" }}>
                <span style={styles.aiRobotLabelTag}>🤖 Diagnostic System Matrix Output:</span>
                <p style={{ ...styles.aiMessageBody, color: isDark ? "#81C784" : "#1B4332" }}>{aiMessage}</p>
              </div>
            </div>

            <div style={dynamicCardPanelStyle}>
              <div style={styles.leafHealthHeaderRow}>
                <h3 style={{ ...styles.sectionHeaderTitle, color: isDark ? "#A3B899" : "#4F4F4F" }}>Canopy Health Index (NDVI)</h3>
                <span style={styles.leafPercentageText}>🌿 {liveSensors.canopyHealth}%</span>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

// Inline Style Object configurations placeholder to prevent layout crashes
const styles = {
  dashboardContainer: { display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif" , overflow: "hidden" },
  sidebar: { width: "260px",height: "100vh", background: "linear-gradient(180deg, #1B4332, #081C15)", color: "#FFFFFF", padding: "30px 24px" },
  logoContainer: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" },
  logoIcon: { fontSize: "30px" },
  logoText: { fontSize: "22px", fontWeight: "700", margin: 0 },
  logoSubtext: { fontSize: "11px", color: "#A3B899" },
  navMenu: { display: "flex", flexDirection: "column", gap: "10px" },
  menuItem: { display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", borderRadius: "12px", color: "#D8E2DC", cursor: "pointer" },
  activeMenuItem: { backgroundColor: "#2D6A4F", color: "#FFFFFF" },
  menuIcon: { fontSize: "18px" },
  mainContent: { flex: 1, padding: "40px 50px" , minHeight: "0" ,overflowY: "auto", boxSizing: "border-box" },
  topHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" },
  pageTitle: { fontSize: "24px", fontWeight: "700" },
  headerRight: { display: "flex", alignItems: "center", gap: "20px" },
  notificationBadgeContainer: { position: "relative", cursor: "pointer" },
  headerNotificationIcon: { fontSize: "20px" },
  badgeCount: { position: "absolute", top: "-5px", right: "-5px", backgroundColor: "#EB5757", color: "#fff", borderRadius: "50%", padding: "2px 6px", fontSize: "10px" },
  profileContainer: { display: "flex", alignItems: "center", gap: "10px", position: "relative", cursor: "pointer" },
  profileImg: { width: "35px", height: "35px", borderRadius: "50%" },
  profileDropdownArrow: { fontSize: "10px" },
  profileDropdownMenu: { position: "absolute", top: "45px", right: 0, border: "1px solid", borderRadius: "8px", width: "160px", padding: "8px", zIndex: 10 },
  dropdownItem: { padding: "8px", fontSize: "13px", display: "flex", alignItems: "center" },
  dropdownLogoutItem: { color: "#EB5757" },
  gridContainer: { display: "flex", gap: "30px" ,gridTemplateColumns: "2fr 1fr",alignItems: "start" },
  leftColumn: { flex: 2, display: "flex", flexDirection: "column", gap: "30px" , minWidth: "0" },
  rightColumn: { flex: 1, display: "flex", flexDirection: "column", gap: "30px" , minWidth: "0" },
  cardRowSection: { display: "flex", flexDirection: "column", gap: "12px" },
  sectionHeaderTitle: { fontSize: "14px", fontWeight: "700", textTransform: "uppercase", margin: 0 },
  sensorGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" },
  sensorCard: { padding: "20px", borderRadius: "14px" },
  cardHeader: { fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" },
  cardValue: { fontSize: "28px", fontWeight: "800", margin: "10px 0" },
  cardFooter: { fontSize: "12px", fontWeight: "500" },
  analyticsSplitRow: { display: "flex", gap: "20px" },
  innerBoxCard: { flex: 1, padding: "20px", borderRadius: "14px", border: "1px solid #E5EAE7" },
  irrigationStatusBox: { display: "flex", gap: "12px", alignItems: "center", padding: "14px", borderRadius: "10px", margin: "15px 0" },
  irrigationIconWrapper: { width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center" },
  statusMainText: { margin: 0, fontSize: "15px", fontWeight: "700" },
  statusSubtext: { fontSize: "12px" },
  predictionIndicatorRow: { display: "flex", alignItems: "center", gap: "8px", padding: "10px", borderRadius: "8px" },
  chartWrapperContainer: { marginTop: "15px" },
  tableSection: { padding: "20px", borderRadius: "14px" },
  tableResponsiveWrapper: { marginTop: "15px", overflowX: "auto" },
  historyTable: { width: "100%", borderCollapse: "collapse" },
  tableTh: { textAlign: "left", padding: "12px", fontSize: "12px", color: "#828282", borderBottom: "1px solid #E5EAE7" },
  tableTr: { borderBottom: "1px solid" },
  tableTd: { padding: "12px", fontSize: "13px" },
  statusTableBadge: { padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "600" },
  rightColumnPanelCard: { padding: "24px", borderRadius: "16px", border: "1px solid" },
  weatherForecastStrip: { display: "flex", gap: "10px", marginTop: "15px" },
  forecastDayItem: { flex: 1, padding: "12px", borderRadius: "10px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" },
  forecastDayName: { fontSize: "12px", color: "#828282", fontWeight: "600" },
  forecastWeatherIcon: { fontSize: "18px" },
  forecastMaxTemp: { fontSize: "14px", fontWeight: "700" },
  forecastMinTemp: { fontSize: "11px", color: "#828282" },
  alertStatusAlertBox: { borderLeft: "4px solid", padding: "12px", borderRadius: "0 8px 8px 0", marginTop: "15px" },
  alertHeaderRow: { display: "flex", fontSize: "13px" },
  alertContentParagraph: { fontSize: "12px", margin: "8px 0 0 0", lineHeight: "1.5" },
  fertilizerMainMetaText: { fontSize: "13px", margin: "8px 0" },
  scientificInsightsBlock: { display: "flex", justifyContent: "space-between", padding: "10px", border: "1px solid", borderRadius: "8px", fontSize: "12px", margin: "10px 0" },
  dynamicAiMessageBox: { padding: "14px", border: "1px solid", borderRadius: "10px", marginTop: "12px" },
  aiRobotLabelTag: { fontSize: "11px", color: "#219653", fontWeight: "700" },
  aiMessageBody: { fontSize: "12px", margin: "6px 0 0 0", fontWeight: "500", lineHeight: "1.4" },
  leafHealthHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  leafPercentageText: { fontSize: "16px", fontWeight: "700" }
};