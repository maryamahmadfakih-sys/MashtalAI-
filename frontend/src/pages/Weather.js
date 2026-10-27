import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom"; 
import axios from "axios";
import {
  FaThLarge,
  FaTint,
  FaExclamationTriangle,
  FaHistory,
  FaCog,
  FaCloudSun,
  FaWind,
  FaRobot,
  FaCompass,
} from "react-icons/fa";

// 🔑 Your Brand New WeatherAPI.com Key Loaded Perfectly
const API_KEY = "a2e185fef88449c7b15150920262605";

export default function Weather() {
  const navigate = useNavigate();

  // 🌓 Dynamic Theme Synchronizer Hook
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("mashtal_system_config");
    return saved ? JSON.parse(saved).activeTheme : "Light";
  });
  const isDark = theme === "Dark";
    
  const [weather, setWeather] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bgImage, setBgImage] = useState("https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1000&auto=format&fit=crop&q=80");

  const [countries, setCountries] = useState([
    { code: "LB", name: "Lebanon" },
    { code: "US", name: "United States" },
    { code: "FR", name: "France" },
    { code: "AE", name: "United Arab Emirates" },
    { code: "SA", name: "Saudi Arabia" },
    { code: "EG", name: "Egypt" },
    { code: "JO", name: "Jordan" },
    { code: "CA", name: "Canada" },
    { code: "BR", name: "Brazil" },
    { code: "AU", name: "Australia" }
  ]);

  // Initialize city from storage
  const [city, setCity] = useState(() => {
    const saved = localStorage.getItem("mashtal_global_weather");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name) return parsed.name;
      } catch (e) { console.error(e); }
    }
    return "Beirut";
  });

  // Initialize country code from storage
  const [countryCode, setCountryCode] = useState(() => {
    const saved = localStorage.getItem("mashtal_global_country_code");
    return saved || "LB"; 
  });

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

  // Safe action history logger
  const syncWeatherData = useCallback(() => {
    const currentHistory = JSON.parse(localStorage.getItem("mashtal_history")) || [];
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const logEntry = { time: timestamp, action: "Atmospheric Telemetry Synced with Meteorological Nodes ☁️" };
    localStorage.setItem("mashtal_history", JSON.stringify([logEntry, ...currentHistory]));
  }, []);

  // WeatherAPI.com Master Execution Block
  const fetchWeatherMetrics = useCallback(async (targetCity, targetCountryCode) => {
    if (!targetCity || !targetCity.trim()) return;
    try {
      setIsLoading(true);
      setSearchError("");

      // WeatherAPI.com handles searching natively via query string without needing a secondary coordinates call
      const weatherResponse = await axios.get(
        `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${encodeURIComponent(targetCity.trim())}&aqi=no`
      );

      const data = weatherResponse.data;

      // Extract metrics based on the WeatherAPI JSON payload schema
      const locationName = data.location.name;
      const locationCountry = data.location.country;
      const currentTemp = data.current.temp_c;
      const currentHumidity = data.current.humidity;
      const currentPressure = data.current.pressure_mb;
      const currentWind = data.current.wind_kph;
      const conditionText = data.current.condition.text;
      const conditionIcon = data.current.condition.icon; 
      const isRaining = conditionText.toLowerCase().includes("rain") || conditionText.toLowerCase().includes("drizzle");

      setWeather({
        name: locationName,
        country: locationCountry,
        temp: currentTemp,
        humidity: currentHumidity,
        pressure: currentPressure,
        wind_speed: currentWind,
        description: conditionText,
        icon: conditionIcon // Uses the full remote link provided by WeatherAPI natively
      });

      // Synchronize input controls
      setCity(locationName);

      // Persist telemetry tracking values safely into storage
      localStorage.setItem("mashtal_global_country_code", targetCountryCode.toUpperCase());
      localStorage.setItem("mashtal_global_weather", JSON.stringify({
        name: locationName,
        country: locationCountry,
        temp: currentTemp,
        humidity: currentHumidity,
        weatherCode: isRaining ? 600 : 100, // Normalized fallback flag structures
        weather_code: isRaining ? 600 : 100,
        rainPredictedSoon: isRaining
      }));

      // Background contextual imagery assignment rules
      let searchKeyword = "farmland,sunny";
      if (isRaining) searchKeyword = "rainy,field";
      else if (conditionText.toLowerCase().includes("cloud") || conditionText.toLowerCase().includes("overcast")) searchKeyword = "cloudy,countryside";
      else if (conditionText.toLowerCase().includes("mist") || conditionText.toLowerCase().includes("fog")) searchKeyword = "foggy,nature";

      setBgImage(`https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&auto=format&fit=crop&q=80&sig=${Math.floor(Math.random() * 1000)}&keywords=${searchKeyword}`);

      syncWeatherData();

    } catch (error) {
      console.error("FULL WEATHER ERROR:", error.response?.data || error.message || error);
      setWeather(null);
      if (error.response?.status === 403 || error.response?.status === 401) {
        setSearchError("API Key validation error. Verify account configuration inside WeatherAPI dashboard.");
      } else {
        setSearchError("Weather network handshake failed. Try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [syncWeatherData]);

  const handleManualSearch = () => {
    fetchWeatherMetrics(city, countryCode);
  };

  const handleCountryDropdownChange = (e) => {
    const val = e.target.value;
    setCountryCode(val);
    localStorage.setItem("mashtal_global_country_code", val);
  };

  useEffect(() => {
    const savedCountry = localStorage.getItem("mashtal_global_country_code");
    const savedWeather = localStorage.getItem("mashtal_global_weather");
    
    let initialCity = "Beirut";
    let initialCountry = "LB";

    if (savedCountry) {
      initialCountry = savedCountry;
    }
    
    if (savedWeather) {
      try {
        const parsed = JSON.parse(savedWeather);
        if (parsed.name) initialCity = parsed.name;
      } catch (e) { console.error(e); }
    }

    if (savedCountry) {
      setCountries((prev) => {
        if (!prev.some(c => c.code === savedCountry)) {
          return [...prev, { code: savedCountry, name: savedCountry }];
        }
        return prev;
      });
      setCountryCode(savedCountry);
    }

    fetchWeatherMetrics(initialCity, initialCountry);
  }, [fetchWeatherMetrics]);

  // Dynamic Content Overlay Matrix
  const mainOverlayStyle = {
    ...styles.mainContent,
    backgroundImage: isDark
      ? `linear-gradient(rgba(18, 20, 19, 0.88), rgba(18, 20, 19, 0.96)), url(${bgImage})`
      : `linear-gradient(rgba(244, 247, 245, 0.85), rgba(244, 247, 245, 0.95)), url(${bgImage})`
  };

  const titleStyle = { ...styles.pageTitle, color: isDark ? "#52B788" : "#1B4332" };
  const subtitleStyle = { ...styles.pageSubtitle, color: isDark ? "#A3B899" : "#444444" };
  
  const searchBarStyle = { ...styles.searchBar, backgroundColor: isDark ? "#1E2220" : "#FFFFFF", boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 4px 20px rgba(0,0,0,0.06)" };
  const selectInputStyle = { ...styles.selectInput, backgroundColor: isDark ? "#252B28" : "#F4F7F5", color: isDark ? "#E5EAE7" : "#1B4332", borderColor: isDark ? "#3D4842" : "#E5EAE7" };
  const inputStyle = { ...styles.input, backgroundColor: isDark ? "#121413" : "#FFFFFF", color: isDark ? "#FFFFFF" : "#111111", borderColor: isDark ? "#3D4842" : "#E5EAE7" };
  const searchButtonStyle = { ...styles.searchButton, backgroundColor: isDark ? "#2D6A4F" : "#1B4332" };

  const weatherCardStyle = { 
    ...styles.weatherCard, 
    backgroundColor: isDark ? "rgba(30, 34, 32, 0.94)" : "rgba(255, 255, 255, 0.94)", 
    borderColor: isDark ? "rgba(61, 72, 66, 0.4)" : "rgba(255, 255, 255, 0.8)" 
  };
  const cityNameStyle = { ...styles.cityName, color: isDark ? "#52B788" : "#1B4332" };
  const countryBadgeStyle = { ...styles.countryBadge, backgroundColor: isDark ? "#2D6A4F" : "#1B4332", color: "#FFFFFF" };
  const temperatureStyle = { ...styles.temperature, color: isDark ? "#FFFFFF" : "#081C15" };
  const conditionDescriptionStyle = { ...styles.conditionDescription, color: isDark ? "#A3B899" : "#2D6A4F" };
  
  const detailsGridStyle = { ...styles.detailsGrid, borderTopColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)" };
  const metricIconStyle = { ...styles.metricIcon, color: isDark ? "#52B788" : "#2D6A4F" };
  const detailLabelStyle = { ...styles.detailLabel, color: isDark ? "#A3B899" : "#555555" };
  const detailValueStyle = { ...styles.detailValue, color: isDark ? "#FFFFFF" : "#1B4332" };

  return (
    <div className="app-shell" style={{ ...styles.container, backgroundColor: isDark ? "#121413" : "#F4F7F5" }}>
      {/* SIDEBAR */}
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
          <div style={{ ...styles.menuItem, ...styles.activeMenuItem }} onClick={() => navigate("/weather")}>
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

      {/* MAIN CONTENT AREA */}
      <main className="app-main" style={mainOverlayStyle}>
        <h1 style={titleStyle}>🌤 Regional Crop Weather App</h1>
        <p style={subtitleStyle}>Select specific country boundaries to compute regional agricultural safety runtimes</p>

        {/* SEARCH CONTROLS */}
        <div style={searchBarStyle}>
          <select 
            value={countryCode} 
            onChange={handleCountryDropdownChange}
            style={selectInputStyle}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Type city name..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            style={inputStyle}
            onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
          />
          
          <button onClick={handleManualSearch} style={searchButtonStyle} disabled={isLoading}>
            {isLoading ? "Syncing..." : "Search"}
          </button>
        </div>

        {/* ERROR DISPLAY */}
        {searchError && <p style={styles.errorText}>{searchError}</p>}

        {/* WEATHER TELEMETRY CARD */}
        {weather && !isLoading && (
          <div style={weatherCardStyle}>
            <div style={styles.cardHeader}>
              <h2 style={cityNameStyle}>{weather.name}</h2>
              <span style={countryBadgeStyle}>{weather.country}</span>
            </div>
            
            <div style={styles.weatherInfoRow}>
              <img
                src={weather.icon.startsWith("http") ? weather.icon : `https:${weather.icon}`}
                alt="weather condition layout icon"
                style={styles.weatherIcon}
              />
              <div style={styles.tempContainer}>
                <span style={temperatureStyle}>{Math.round(weather.temp)}°C</span>
                <span style={conditionDescriptionStyle}>
                  {weather.description}
                </span>
              </div>
            </div>

            <div style={detailsGridStyle}>
              <div style={styles.detailItem}>
                <FaTint style={metricIconStyle} />
                <span style={detailLabelStyle}>Air Humidity</span>
                <span style={detailValueStyle}>{weather.humidity}%</span>
              </div>
              <div style={styles.detailItem}>
                <FaWind style={metricIconStyle} />
                <span style={detailLabelStyle}>Wind Speed</span>
                <span style={detailValueStyle}>{weather.wind_speed} km/h</span>
              </div>
              <div style={styles.detailItem}>
                <FaCompass style={metricIconStyle} />
                <span style={detailLabelStyle}>Atm. Pressure</span>
                <span style={detailValueStyle}>{Math.round(weather.pressure)} hPa</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { display: "flex", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" },
  sidebar: { width: "260px", background: "linear-gradient(180deg, #1B4332, #081C15)", color: "#FFFFFF", padding: "30px 24px", display: "flex", flexDirection: "column", boxSizing: "border-box", boxShadow: "4px 0 15px rgba(0,0,0,0.1)", zIndex: 2 },
  logoContainer: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" },
  logoIcon: { fontSize: "30px" },
  logoText: { fontSize: "22px", fontWeight: "700", margin: 0, letterSpacing: "0.5px" },
  logoSubtext: { fontSize: "11px", color: "#A3B899" },
  navMenu: { display: "flex", flexDirection: "column", gap: "10px" },
  menuItem: { display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", borderRadius: "12px", fontSize: "15px", fontWeight: "500", color: "#D8E2DC", cursor: "pointer", transition: "background-color 0.2s, color 0.2s" },
  activeMenuItem: { backgroundColor: "#2D6A4F", color: "#FFFFFF", fontWeight: "600", boxShadow: "0 4px 10px rgba(0,0,0,0.15)" },
  menuIcon: { fontSize: "18px" },
  mainContent: { flex: 1, padding: "40px 50px", boxSizing: "border-box", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", transition: "background-image 0.8s ease" },
  pageTitle: { fontSize: "28px", fontWeight: "700", margin: 0 },
  pageSubtitle: { marginTop: "6px", marginBottom: "25px", fontSize: "14px", fontWeight: "500" },
  searchBar: { display: "flex", gap: "12px", maxWidth: "650px", marginBottom: "20px", padding: "8px", borderRadius: "14px" },
  selectInput: { padding: "10px 14px", borderRadius: "10px", border: "1px solid", fontSize: "14px", fontWeight: "600", outline: "none", cursor: "pointer" },
  input: { flex: 1, padding: "12px 14px", borderRadius: "10px", border: "1px solid", fontSize: "15px", outline: "none" },
  searchButton: { padding: "12px 24px", border: "none", borderRadius: "10px", color: "white", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  errorText: { color: "#D32F2F", fontSize: "14px", fontWeight: "600", margin: "0 0 20px 4px" },
  weatherCard: { maxWidth: "480px", backdropFilter: "blur(8px)", borderRadius: "20px", padding: "30px", boxShadow: "0px 12px 30px rgba(0, 0, 0, 0.08)", border: "1px solid" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cityName: { margin: 0, fontSize: "26px", fontWeight: "800" },
  countryBadge: { padding: "4px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "700" },
  weatherInfoRow: { display: "flex", alignItems: "center", gap: "10px", margin: "10px 0" },
  weatherIcon: { width: "64px", height: "64px" },
  tempContainer: { display: "flex", flexDirection: "column" },
  temperature: { fontSize: "52px", fontWeight: "800", lineHeight: 1 },
  conditionDescription: { fontSize: "14px", textTransform: "capitalize", fontWeight: "600", marginTop: "4px" },
  detailsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", paddingTop: "20px", marginTop: "15px" },
  detailItem: { display: "flex", flexDirection: "column", alignItems: "center" },
  metricIcon: { marginBottom: "6px", fontSize: "16px" },
  detailLabel: { fontSize: "11px", fontWeight: "500", marginBottom: "2px" },
  detailValue: { fontSize: "15px", fontWeight: "700" },
};