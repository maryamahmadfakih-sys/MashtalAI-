import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import {
  FaThLarge,
  FaTint,
  FaExclamationTriangle,
  FaHistory,
  FaCog,
  FaUserCircle,
  FaBell,
  FaMoon,
  FaCloudSun,
  FaRobot,
} from "react-icons/fa";


function Settings() {
  const navigate = useNavigate();

  // 📦 Parse the shared configuration snapshot directly from disk cache
  const savedConfig = JSON.parse(localStorage.getItem("mashtal_system_config")) || {};

  // 🧠 Initialize interactive UI states
  const [name, setName] = useState(savedConfig.profileName || "Maryam Fakih");
  const [notifications, setNotifications] = useState(savedConfig.notificationsEnabled ?? true);
  const [theme, setTheme] = useState(savedConfig.activeTheme || "Light");

  // Keep these as standard constants so handleSaveSettings can pack them safely without throwing ESLint unused state warnings
  const threshold = savedConfig.moistureThreshold || 38;
  const duration = savedConfig.pumpLimitMinutes || 25;

  const isDark = theme === "Dark";

  // Dynamic values based on Light/Dark active appearance
  const themeContainerStyle = {
    ...styles.container,
    backgroundColor: isDark ? "#121413" : "#F4F7F5",
  };

  const themeCardStyle = {
    ...styles.card,
    backgroundColor: isDark ? "#1E2220" : "#FFFFFF",
    borderColor: isDark ? "#2D3430" : "#E5EAE7",
    color: isDark ? "#E5EAE7" : "#333333",
  };

  const themeInputStyle = {
    ...styles.input,
    backgroundColor: isDark ? "#252B28" : "#FFFFFF",
    color: isDark ? "#FFFFFF" : "#333333",
    borderColor: isDark ? "#3D4842" : "#CCCCCC",
  };

  // 🟢 Handles updating configuration settings across application files
  const handleSaveSettings = () => {
    try {
      const userConfig = {
        profileName: name,
        moistureThreshold: threshold, // Safely preserved for Dashboard/Alerts
        pumpLimitMinutes: duration,   // Safely preserved for Dashboard/Irrigation
        notificationsEnabled: notifications,
        activeTheme: theme
      };
      localStorage.setItem("mashtal_system_config", JSON.stringify(userConfig));

      // 📜 Log directly to Global History Matrix
      const currentHistory = JSON.parse(localStorage.getItem("mashtal_history")) || [];
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const logEntry = { 
        time: timestamp, 
        action: "System Optimization Parameters Updated in Matrix Settings ⚙️" 
      };
      localStorage.setItem("mashtal_history", JSON.stringify([logEntry, ...currentHistory]));

      alert("Configuration Matrix Saved Successfully!");
    } catch (err) {
      alert("Error saving local configuration metadata profile.");
    }
  };

  return (
    <div className="app-shell" style={themeContainerStyle}>
      {/* SIDEBAR */}
      <aside className="app-sidebar" style={styles.sidebar}>
        {/* LOGO */}
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>🌱</div>
          <div>
            <h2 style={styles.logoText}>MASHTAL</h2>
            <span style={styles.logoSubtext}>Intelligent Agriculture Platform</span>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="app-nav" style={styles.navMenu}>
          <div style={styles.menuItem} onClick={() => navigate("/dashboard")}>
            <FaThLarge style={styles.menuIcon} />
            Dashboard
          </div>

          {/*Weather*/}
          <div style={styles.menuItem} onClick={() => navigate("/weather")}>
            <FaCloudSun style={styles.menuIcon} /> Weather
          </div>

          <div style={styles.menuItem} onClick={() => navigate("/irrigation")}>
            <FaTint style={styles.menuIcon} />
            Irrigation
          </div>

          <div style={styles.menuItem} onClick={() => navigate("/mashtal-ai")}>
            <FaRobot style={styles.menuIcon} /> Mashtal AI 
          </div>

          <div style={styles.menuItem} onClick={() => navigate("/alerts")}>
            <FaExclamationTriangle style={styles.menuIcon} />
            Alerts
          </div>

          <div style={styles.menuItem} onClick={() => navigate("/history")}><FaHistory style={styles.menuIcon} /> History</div>

          {/* SETTINGS ACTIVE */}
          <div style={{ ...styles.menuItem, ...styles.activeMenuItem }} onClick={() => navigate("/settings")}>
            <FaCog style={styles.menuIcon} />
            Settings
          </div>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="app-main" style={styles.mainContent}>
        {/* HEADER BLOCK */}
        <div style={styles.headerSection}>
          <div>
            <h1 style={{ ...styles.pageTitle, color: isDark ? "#52B788" : "#1B4332" }}>⚙️ Settings</h1>
            <p style={styles.pageSubtitle}>Manage your smart agriculture system preferences</p>
          </div>
          <button style={styles.saveButton} onClick={handleSaveSettings}>
            Save Configuration
          </button>
        </div>

        {/* GROUPED SECTIONS */}
        <div style={styles.sectionWrapper}>
          <h3 style={{ ...styles.sectionHeading, color: isDark ? "#A3B899" : "#526E60" }}>User & Display Options</h3>
          
          <div style={styles.settingsGrid}>
            {/* PROFILE */}
            <div style={themeCardStyle}>
              <div style={{ ...styles.cardTitle, color: isDark ? "#52B788" : "#1B4332" }}>
                <FaUserCircle /> Profile Information
              </div>
              <label style={styles.fieldLabel}>Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={themeInputStyle}
                placeholder="Enter your name"
              />
            </div>

            {/* NOTIFICATIONS */}
            <div style={themeCardStyle}>
              <div style={{ ...styles.cardTitle, color: isDark ? "#52B788" : "#1B4332" }}>
                <FaBell /> System Alerts Notifications
              </div>
              <p style={{ fontSize: "14px", margin: "0 0 15px 0" }}>
                Toggle browser push notifications synced with the active core alerts system matrix.
              </p>
              <button
                style={{
                  ...styles.toggleButton,
                  backgroundColor: notifications ? "#2D6A4F" : "#D32F2F",
                }}
                onClick={() => setNotifications(!notifications)}
              >
                Notifications : {notifications ? "ON" : "OFF"}
              </button>
            </div>

            {/* APPEARANCE */}
            <div style={themeCardStyle}>
              <div style={{ ...styles.cardTitle, color: isDark ? "#52B788" : "#1B4332" }}>
                <FaMoon /> Appearance Mode
              </div>
              <label style={styles.fieldLabel}>UI Context Color Scheme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                style={themeInputStyle}
              >
                <option value="Light">Light Mode</option>
                <option value="Dark">Dark Mode</option>
              </select>
            </div>
          </div>
        </div>
      </main>
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
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "40px",
  },
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
  headerSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "35px",
  },
  pageTitle: { margin: 0, fontSize: "30px", fontWeight: "700" },
  pageSubtitle: { color: "#666666", marginTop: "6px", fontSize: "14px" },
  sectionWrapper: {
    display: "flex",
    flexDirection: "column",
  },
  sectionHeading: {
    fontSize: "15px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "1px",
    margin: "0 0 15px 0",
  },
  settingsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "24px",
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
  fieldLabel: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "6px",
    opacity: 0.8,
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "10px",
    border: "1px solid",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s",
  },
  toggleButton: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "10px",
    color: "white",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "background-color 0.2s",
  },
  saveButton: {
    padding: "12px 24px",
    border: "none",
    borderRadius: "10px",
    backgroundColor: "#1B4332",
    color: "white",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(27, 67, 50, 0.2)",
    transition: "transform 0.1s, opacity 0.2s",
  }
};

export default Settings;