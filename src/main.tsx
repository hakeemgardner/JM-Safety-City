import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "mapbox-gl/dist/mapbox-gl.css";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router";
import App from "./App.tsx";
import IncidentReportPage from "./pages/IncidentReportPage.tsx";
import EvaluatorPage from "./pages/EvaluatorPage.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/IncidentReportPage" element={<IncidentReportPage />} />
        <Route path="/EvaluatorPage" element={<EvaluatorPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
