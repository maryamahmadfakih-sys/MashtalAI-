import React from "react";
import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import Login from "./login/Login";
import Dashboard from "./pages/Dashboard";
import Irrigation from "./pages/Irrigation";
import Alerts from "./pages/Alerts";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Weather from "./pages/Weather";
import MashtalAI from "./pages/MashtalAI";

function App() {
  return ( 
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login/>} />
      <Route path="/dashboard" element= {<Dashboard/>} />
      <Route path="/irrigation" element={<Irrigation />} />
     <Route path="/alerts" element={<Alerts />} />
     <Route path="/history" element={<History />} />
     <Route path="/settings" element={<Settings />} />
     <Route path="/weather" element={<Weather />} />
     <Route path="/mashtal-ai" element={<MashtalAI />} />
    </Routes>
    </BrowserRouter>
  );
}

export default App;
