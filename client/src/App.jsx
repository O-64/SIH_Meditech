import { useState, useEffect, useRef } from "react";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home/Home";

const VIDEO_URL =
  "https://pub-1407f82391df4ab1951418d04be76914.r2.dev/uploads/5413db47-2061-43a7-830d-b4296e3fc258.mp4";

export default function App() {
  const [page, setPage] = useState("landing");
  const videoRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setPage("home");
  }, []);

  const showVideo = page === "landing" || page === "login" || page === "signup";

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

      {page === "landing" && <Landing onNavigate={setPage} />}
      {page === "login"   && <Login   onNavigate={setPage} />}
      {page === "signup"  && <Signup  onNavigate={setPage} />}
      {page === "home"    && <Home    onNavigate={setPage} />}
    </div>
  );
}