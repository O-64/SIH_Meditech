import { useState, useEffect, useRef } from "react";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Questionnaire from "./pages/Questionnaire";
import Home from "./pages/Home/Home";
import AdminLogin from "./pages/Admin/AdminLogin";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import CounsellorLogin from "./pages/Counsellor/CounsellorLogin";
import CounsellorDashboard from "./pages/Counsellor/CounsellorDashboard";
import CounsellorPending from "./pages/Counsellor/CounsellorPending";

const VIDEO_URL =
  "https://pub-1407f82391df4ab1951418d04be76914.r2.dev/uploads/5413db47-2061-43a7-830d-b4296e3fc258.mp4";

export default function App() {
  const [page, setPage] = useState("landing");
  const videoRef = useRef(null);

  useEffect(() => {
    // Only auto-redirect to home if we are on landing and a victim token is found
    const token = localStorage.getItem("token");
    if (token && window.location.hash !== "#admin" && window.location.hash !== "#counsellor") {
      // Keep victim session if already signed in
    }
  }, []);

  const showVideo =
    page === "landing" ||
    page === "login" ||
    page === "signup" ||
    page === "questionnaire" ||
    page === "admin_login" ||
    page === "counsellor_login";

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={{
          display: showVideo ? "block" : "none",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {page === "landing"              && <Landing              onNavigate={setPage} />}
      {page === "login"                && <Login                onNavigate={setPage} />}
      {page === "signup"               && <Signup               onNavigate={setPage} />}
      {page === "questionnaire"        && <Questionnaire        onNavigate={setPage} />}
      {page === "home"                 && <Home                 onNavigate={setPage} />}
      {page === "admin_login"          && <AdminLogin          onNavigate={setPage} />}
      {page === "admin_dashboard"      && <AdminDashboard      onNavigate={setPage} />}
      {page === "counsellor_login"     && <CounsellorLogin     onNavigate={setPage} />}
      {page === "counsellor_pending"   && <CounsellorPending   onNavigate={setPage} />}
      {page === "counsellor_dashboard" && <CounsellorDashboard onNavigate={setPage} />}
    </div>
  );
}