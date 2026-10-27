import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaThLarge, FaTint, FaExclamationTriangle, FaHistory, FaCloudSun, FaCog, FaRobot, FaDownload
} from "react-icons/fa";

function History() {
  const navigate = useNavigate();
  
  // 🌓 Dynamic Theme Synchronizer Hook
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("mashtal_system_config");
    return saved ? JSON.parse(saved).activeTheme : "Light";
  });
  const isDark = theme === "Dark";
    
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    // Read directly from real local browser data caches
    const savedLogs = JSON.parse(localStorage.getItem("mashtal_history")) || [];
    setHistory(savedLogs);
    setLoading(false);
  }, []);

  const clearLogs = () => {
    if (window.confirm("Are you sure you want to delete all operational history log files?")) {
      localStorage.removeItem("mashtal_history");
      setHistory([]);
    }
  };

  // 📊 EXPORT TO CSV DATA FUNCTION
  const exportToCSV = () => {
    if (history.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Timestamp,Operation Action/Event"].join(",") + "\n"
      + history.map(item => `"${item.time}","${item.action.replace(/"/g, '""')}"`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mashtal_operational_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dynamic Theme Interpolations
  const containerStyle = { ...styles.container, backgroundColor: isDark ? "#121413" : "#F4F7F5" };
  const pageTitleStyle = { ...styles.pageTitle, color: isDark ? "#52B788" : "#1B4332" };
  const tableCardStyle = { 
    ...styles.tableCard, 
    backgroundColor: isDark ? "#1E2220" : "#FFFFFF", 
    borderColor: isDark ? "#2D3531" : "#E5EAE7",
    boxShadow: isDark ? "0px 8px 24px rgba(0, 0, 0, 0.3)" : "0px 8px 24px rgba(0, 0, 0, 0.04)"
  };
  const thStyle = { 
    ...styles.th, 
    color: isDark ? "#A3B899" : "#526E60", 
    borderBottomColor: isDark ? "#2D3531" : "#E5EAE7" 
  };
  const trStyle = { 
    ...styles.tr, 
    borderBottomColor: isDark ? "#2D3531" : "#E5EAE7" 
  };
  const tdTimeStyle = { ...styles.tdTime, color: isDark ? "#A3B899" : "#777777" };
  const statusMessageStyle = { ...styles.statusMessage, color: isDark ? "#A3B899" : "#526E60" };

  const clearButtonStyle = {
    ...styles.clearButton,
    backgroundColor: isDark ? "#3D1D1D" : "#FFEBEE",
    color: isDark ? "#FFA8A8" : "#C62828"
  };

  const exportButtonStyle = {
    ...styles.exportButton,
    backgroundColor: isDark ? "#173024" : "#E8F5E9",
    color: isDark ? "#A3B899" : "#2E7D32"
  };

  return (
    <div className="app-shell" style={containerStyle}>
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
          <div style={styles.menuItem} onClick={() => navigate("/dashboard")}><FaThLarge style={styles.menuIcon} /> Dashboard</div>
          <div style={styles.menuItem} onClick={() => navigate("/weather")}><FaCloudSun style={styles.menuIcon} /> Weather</div>
          <div style={styles.menuItem} onClick={() => navigate("/irrigation")}><FaTint style={styles.menuIcon} /> Irrigation</div>
          <div style={styles.menuItem} onClick={() => navigate("/mashtal-ai")}><FaRobot style={styles.menuIcon} /> Mashtal AI </div>
          <div style={styles.menuItem} onClick={() => navigate("/alerts")}><FaExclamationTriangle style={styles.menuIcon} /> Alerts</div>
          <div style={{ ...styles.menuItem, ...styles.activeMenuItem }} onClick={() => navigate("/history")}><FaHistory style={styles.menuIcon} /> History</div>
          <div style={styles.menuItem} onClick={() => navigate("/settings")}><FaCog style={styles.menuIcon} /> Settings</div>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="app-main" style={styles.mainContent}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h1 style={pageTitleStyle}>📜 Operational History Logs</h1>
          <div style={{ display: "flex", gap: "12px" }}>
            {history.length > 0 && (
              <>
                <button onClick={exportToCSV} style={exportButtonStyle}>
                  <FaDownload /> Export Data CSV
                </button>
                <button onClick={clearLogs} style={clearButtonStyle}>Clear Archive</button>
              </>
            )}
          </div>
        </div>

        <div style={tableCardStyle}>
          {loading && <p style={statusMessageStyle}>Syncing logs...</p>}
          
          {!loading && history.length === 0 && (
            <p style={statusMessageStyle}>📭 History index empty. Operational changes or AI Diagnostic overrides will register logs here!</p>
          )}

          {!loading && history.length > 0 && (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={thStyle}>Time Stamp</th>
                  <th style={thStyle}>Infrastructure Action / Event Profile</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, index) => (
                  <tr key={index} style={trStyle}>
                    <td style={tdTimeStyle}>{item.time}</td>
                    <td style={styles.tdAction}>
                      <span style={getActionBadgeStyle(item.action, isDark)}>
                        {item.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

const getActionBadgeStyle = (action, isDark) => {
  let base = { padding: "8px 14px", borderRadius: "8px", fontSize: "13.5px", fontWeight: "600", display: "inline-block", lineHeight: "1.4" };
  
  // Custom smart styling depending on event types mapped across Appearance state matrices
  if (action.includes("🤖") || action.includes("AI")) {
    return { 
      ...base, 
      backgroundColor: isDark ? "#4A3718" : "#FFF3E0", 
      color: isDark ? "#FBD38D" : "#E65100", 
      borderLeft: "4px solid #FB8C00" 
    };
  }
  if (action.includes("🟢") || action.includes("Started") || action.includes("OPEN")) {
    return { 
      ...base, 
      backgroundColor: isDark ? "#173024" : "#E8F5E9", 
      color: isDark ? "#A3B899" : "#2E7D32", 
      borderLeft: "4px solid #4CAF50" 
    };
  }
  if (action.includes("🔴") || action.includes("Stopped") || action.includes("Error")) {
    return { 
      ...base, 
      backgroundColor: isDark ? "#3D1D1D" : "#FFEBEE", 
      color: isDark ? "#FFA8A8" : "#C62828", 
      borderLeft: "4px solid #F44336" 
    };
  }
  return { 
    ...base, 
    backgroundColor: isDark ? "#252B28" : "#ECEFF1", 
    color: isDark ? "#E5EAE7" : "#37474F" 
  };
};

const styles = {
  container: { display: "flex", height: "100vh", overflow: "hidden", fontFamily: "system-ui, sans-serif" },
  sidebar: { width: "260px", height: "100vh", background: "linear-gradient(180deg, #1B4332, #081C15)", color: "#FFFFFF", padding: "30px 24px", display: "flex", flexDirection: "column", boxSizing: "border-box" },
  logoContainer: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" },
  logoIcon: { fontSize: "30px" },
  logoText: { fontSize: "22px", fontWeight: "700", margin: 0 },
  logoSubtext: { fontSize: "11px", color: "#A3B899" },
  navMenu: { display: "flex", flexDirection: "column", gap: "10px" },
  menuItem: { display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", borderRadius: "12px", fontSize: "15px", fontWeight: "500", color: "#D8E2DC", cursor: "pointer" },
  activeMenuItem: { backgroundColor: "#2D6A4F", color: "#FFFFFF", fontWeight: "600" },
  menuIcon: { fontSize: "18px" },
  mainContent: { flex: 1, padding: "40px 50px", boxSizing: "border-box", height: "100vh", overflow: "auto" },
  pageTitle: { fontSize: "28px", fontWeight: "700", margin: 0 },
  clearButton: { padding: "10px 16px", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" },
  exportButton: { padding: "10px 16px", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" },
  tableCard: { borderRadius: "16px", padding: "10px 24px", border: "1px solid" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "18px 12px", fontSize: "13px", borderBottom: "2px solid", textTransform: "uppercase", textAlign: "left", letterSpacing: "0.5px" },
  tr: { borderBottom: "1px solid" },
  tdTime: { padding: "18px 12px", fontSize: "14px", fontWeight: "600", width: "160px" },
  tdAction: { padding: "18px 12px", fontSize: "14px" },
  statusMessage: { textAlign: "center", padding: "40px 0", fontWeight: "500", fontSize: "15px" }
};

export default History;