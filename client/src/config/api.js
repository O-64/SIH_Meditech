// Helper to dynamically resolve backend API URL
// Supports both laptop (localhost) and mobile phone (LAN IP e.g. 192.168.x.x)
export const getApiUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:5000";
    }
    // If accessing from mobile using local network IP, automatically match the host IP on port 5000
    if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      return `http://${hostname}:5000`;
    }
  }
  return import.meta.env.VITE_API_URL || "http://localhost:5000";
};

export const API_URL = getApiUrl();
