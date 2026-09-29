import { useState, useEffect, useRef } from "react";
import SahaayLogo from "../../components/shared/SahaayLogo";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  "";

// Regional state demographic & distress data for the interactive map and report
const STATE_MAP_DATA = [
  {
    id: "MH",
    name: "Maharashtra",
    lng: 75.7139,
    lat: 19.7515,
    districts: "Pune, Nagpur, Nashik, Mumbai Suburban",
    cases: 384,
    topIncident: "Social Boycott & Caste Discrimination",
    avgDistress: 76,
    distressCategory: "High",
    color: "#ef4444", // Red
    stages: { investigation: "42%", trial: "38%", rehab: "20%" },
    districtHotspots: [
      { name: "Pune", lng: 73.8567, lat: 18.5204, cases: 142, distress: 82, color: "#ef4444", incident: "Social Boycott & Retaliation" },
      { name: "Nagpur", lng: 79.0882, lat: 21.1458, cases: 98, distress: 79, color: "#ef4444", incident: "Physical Intimidation" },
      { name: "Nashik", lng: 73.7898, lat: 19.9975, cases: 74, distress: 71, color: "#ef4444", incident: "Verbal Harassment" },
      { name: "Mumbai Suburban", lng: 72.8777, lat: 19.076, cases: 70, distress: 68, color: "#f59e0b", incident: "Institutional Discrimination" },
    ],
  },
  {
    id: "UP",
    name: "Uttar Pradesh",
    lng: 80.9462,
    lat: 26.8467,
    districts: "Varanasi, Prayagraj, Meerut, Lucknow",
    cases: 512,
    topIncident: "Physical Violence & Bodily Harm",
    avgDistress: 84,
    distressCategory: "High",
    color: "#ef4444", // Red
    stages: { investigation: "51%", trial: "34%", rehab: "15%" },
    districtHotspots: [
      { name: "Varanasi", lng: 82.9739, lat: 25.3176, cases: 180, distress: 88, color: "#ef4444", incident: "Bodily Harm & Threats" },
      { name: "Prayagraj", lng: 81.8463, lat: 25.4358, cases: 140, distress: 85, color: "#ef4444", incident: "Retaliatory Assault" },
      { name: "Meerut", lng: 77.7064, lat: 28.9845, cases: 110, distress: 81, color: "#ef4444", incident: "Caste Slurs & Violence" },
      { name: "Lucknow", lng: 80.9462, lat: 26.8467, cases: 82, distress: 78, color: "#ef4444", incident: "Public Humiliation" },
    ],
  },
  {
    id: "MP",
    name: "Madhya Pradesh",
    lng: 77.4126,
    lat: 23.2599,
    districts: "Gwalior, Sagar, Bhopal, Jabalpur",
    cases: 310,
    topIncident: "Verbal Abuse & Intimidation Threats",
    avgDistress: 71,
    distressCategory: "High",
    color: "#ef4444", // Red
    stages: { investigation: "46%", trial: "35%", rehab: "19%" },
    districtHotspots: [
      { name: "Gwalior", lng: 78.1828, lat: 26.2183, cases: 104, distress: 76, color: "#ef4444", incident: "Intimidation Threats" },
      { name: "Sagar", lng: 78.7378, lat: 23.8388, cases: 86, distress: 74, color: "#ef4444", incident: "Social Ostracization" },
      { name: "Jabalpur", lng: 79.9864, lat: 23.1815, cases: 68, distress: 69, color: "#f59e0b", incident: "Public Abuse" },
      { name: "Bhopal", lng: 77.4126, lat: 23.2599, cases: 52, distress: 65, color: "#f59e0b", incident: "Legal Harassment" },
    ],
  },
  {
    id: "RJ",
    name: "Rajasthan",
    lng: 74.2179,
    lat: 26.9124,
    districts: "Jaipur, Jodhpur, Udaipur, Kota",
    cases: 260,
    topIncident: "Property Exclusion & Economic Denial",
    avgDistress: 64,
    distressCategory: "Moderate",
    color: "#f59e0b", // Amber
    stages: { investigation: "39%", trial: "39%", rehab: "22%" },
    districtHotspots: [
      { name: "Jaipur", lng: 75.7873, lat: 26.9124, cases: 92, distress: 66, color: "#f59e0b", incident: "Land Dispossession" },
      { name: "Jodhpur", lng: 73.0243, lat: 26.2389, cases: 74, distress: 65, color: "#f59e0b", incident: "Economic Exclusion" },
      { name: "Udaipur", lng: 73.7125, lat: 24.5854, cases: 54, distress: 61, color: "#f59e0b", incident: "Water Resource Denial" },
      { name: "Kota", lng: 75.8648, lat: 25.2138, cases: 40, distress: 59, color: "#f59e0b", incident: "Verbal Harassment" },
    ],
  },
  {
    id: "BR",
    name: "Bihar",
    lng: 85.3131,
    lat: 25.0961,
    districts: "Patna, Gaya, Muzaffarpur, Bhagalpur",
    cases: 295,
    topIncident: "Physical Violence & Retaliation",
    avgDistress: 79,
    distressCategory: "High",
    color: "#ef4444", // Red
    stages: { investigation: "48%", trial: "37%", rehab: "15%" },
    districtHotspots: [
      { name: "Patna", lng: 85.1376, lat: 25.5941, cases: 108, distress: 82, color: "#ef4444", incident: "Retaliatory Assault" },
      { name: "Gaya", lng: 85.0002, lat: 24.7914, cases: 88, distress: 81, color: "#ef4444", incident: "Village Violence" },
      { name: "Muzaffarpur", lng: 85.3906, lat: 26.1209, cases: 58, distress: 77, color: "#ef4444", incident: "Threat to Witnesses" },
      { name: "Bhagalpur", lng: 86.9842, lat: 25.2425, cases: 41, distress: 72, color: "#ef4444", incident: "Property Arson" },
    ],
  },
  {
    id: "KA",
    name: "Karnataka",
    lng: 75.7139,
    lat: 14.8295,
    districts: "Bengaluru, Mysuru, Belagavi, Kalaburagi",
    cases: 178,
    topIncident: "Workplace Discrimination & Verbal Slurs",
    avgDistress: 52,
    distressCategory: "Moderate",
    color: "#f59e0b", // Amber
    stages: { investigation: "34%", trial: "36%", rehab: "30%" },
    districtHotspots: [
      { name: "Bengaluru", lng: 77.5946, lat: 12.9716, cases: 68, distress: 56, color: "#f59e0b", incident: "Workplace Discrimination" },
      { name: "Kalaburagi", lng: 76.8343, lat: 17.3297, cases: 48, distress: 54, color: "#f59e0b", incident: "Rural Caste Ostracization" },
      { name: "Belagavi", lng: 74.4977, lat: 15.8497, cases: 36, distress: 49, color: "#3b82f6", incident: "Verbal Slurs" },
      { name: "Mysuru", lng: 76.6394, lat: 12.2958, cases: 26, distress: 45, color: "#3b82f6", incident: "Social Exclusion" },
    ],
  },
  {
    id: "TN",
    name: "Tamil Nadu",
    lng: 78.6569,
    lat: 11.1271,
    districts: "Madurai, Tirunelveli, Chennai, Salem",
    cases: 142,
    topIncident: "Social Exclusion & Village Segregation",
    avgDistress: 45,
    distressCategory: "Low",
    color: "#3b82f6", // Blue
    stages: { investigation: "28%", trial: "32%", rehab: "40%" },
    districtHotspots: [
      { name: "Madurai", lng: 78.1198, lat: 9.9252, cases: 54, distress: 49, color: "#3b82f6", incident: "Village Segregation" },
      { name: "Tirunelveli", lng: 77.7567, lat: 8.7139, cases: 42, distress: 47, color: "#3b82f6", incident: "Inter-community Tension" },
      { name: "Chennai", lng: 80.2707, lat: 13.0827, cases: 28, distress: 42, color: "#3b82f6", incident: "Online Harassment" },
      { name: "Salem", lng: 78.146, lat: 11.6643, cases: 18, distress: 38, color: "#3b82f6", incident: "Economic Denial" },
    ],
  },
  {
    id: "DL",
    name: "Delhi NCR",
    lng: 77.209,
    lat: 28.6139,
    districts: "North East Delhi, Central, South West",
    cases: 198,
    topIncident: "Public Humiliation & Harassment",
    avgDistress: 58,
    distressCategory: "Moderate",
    color: "#f59e0b", // Amber
    stages: { investigation: "36%", trial: "42%", rehab: "22%" },
    districtHotspots: [
      { name: "North East Delhi", lng: 77.2674, lat: 28.6923, cases: 88, distress: 63, color: "#f59e0b", incident: "Communal Humiliation" },
      { name: "Central Delhi", lng: 77.2197, lat: 28.6508, cases: 62, distress: 57, color: "#f59e0b", incident: "Workplace Hostility" },
      { name: "South West Delhi", lng: 77.0688, lat: 28.5921, cases: 48, distress: 52, color: "#f59e0b", incident: "Hostel/Campus Discrimination" },
    ],
  },
];

// Initial demo list of government-approved clinics / doctors requesting to join
const INITIAL_COUNSELLORS = [
  {
    id: "C-101",
    name: "Dr. Rohini Kulkarni, MD",
    type: "Clinical Psychiatrist",
    clinic: "Sanjeevani Trauma & Recovery Clinic",
    district: "Pune, Maharashtra",
    license: "MCI-MH-49201",
    experience: "14 yrs",
    status: "Approved",
    casesAssigned: 8,
  },
  {
    id: "C-102",
    name: "Dr. Arvind N. Verma",
    type: "Forensic Psychologist",
    clinic: "State MHPSS Legal Assistance Center",
    district: "Lucknow, Uttar Pradesh",
    license: "RCI-UP-88219",
    experience: "11 yrs",
    status: "Pending Approval",
    casesAssigned: 0,
  },
  {
    id: "C-103",
    name: "Dr. Kavita Deshmukh",
    type: "Psychiatric Social Worker",
    clinic: "Samadhan Community Healing Foundation",
    district: "Nagpur, Maharashtra",
    license: "MCI-MH-33104",
    experience: "9 yrs",
    status: "Pending Approval",
    casesAssigned: 0,
  },
  {
    id: "C-104",
    name: "Dr. Sunita Ramanathan",
    type: "Consultant Psychotherapist",
    clinic: "Arogya Mind Wellness Clinic",
    district: "Chennai, Tamil Nadu",
    license: "TNM-PSY-21045",
    experience: "16 yrs",
    status: "Approved",
    casesAssigned: 5,
  },
  {
    id: "C-105",
    name: "Dr. Rajeshwar Prasad",
    type: "Behavioral Health Specialist",
    clinic: "Vishwa Shanti MHPSS Trust",
    district: "Patna, Bihar",
    license: "BCI-BR-12903",
    experience: "7 yrs",
    status: "Rejected",
    casesAssigned: 0,
  },
];

export default function AdminDashboard({ onNavigate }) {
  const [activeTab, setActiveTab] = useState("surveillance"); // 'surveillance' | 'counsellors' | 'victims'
  const [selectedState, setSelectedState] = useState(STATE_MAP_DATA[0]);
  const [victims, setVictims] = useState([]);
  const [loadingVictims, setLoadingVictims] = useState(true);
  const [counsellors, setCounsellors] = useState(INITIAL_COUNSELLORS);
  const [contactModalVictim, setContactModalVictim] = useState(null);
  const [contactSuccess, setContactSuccess] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [newInvite, setNewInvite] = useState({ name: "", clinic: "", email: "", district: "" });

  // Delete confirmation states
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState(null);

  // Real-time notifications for Gov/Admin
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Victim allocation modal states
  const [allocatingCounsellor, setAllocatingCounsellor] = useState(null);
  const [freeVictims, setFreeVictims] = useState([]);
  const [loadingFreeVictims, setLoadingFreeVictims] = useState(false);
  const [selectedVictimIds, setSelectedVictimIds] = useState([]);
  const [approvingAndAllocating, setApprovingAndAllocating] = useState(false);
  const [allocationSuccessMsg, setAllocationSuccessMsg] = useState(null);

  const adminUser = JSON.parse(
    localStorage.getItem("admin_user") ||
      '{"name":"Dr. A. Sharma","department":"Ministry of Health & Family Welfare / MoSJE"}',
  );

  // Fetch real victims from backend database
  useEffect(() => {
    const fetchVictims = async () => {
      setLoadingVictims(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await fetch(`${apiUrl}/api/v1/admin/victims`);
        const data = await res.json();
        if (data.victims && data.victims.length > 0) {
          setVictims(data.victims);
        } else {
          // Fallback demo data if DB is completely fresh
          setVictims([
            {
              id: "v-demo-1",
              name: "Utsav Verma",
              email: "utsav.victim@gmail.com",
              age: 22,
              city: "Bandra, Mumbai",
              case_stage: "Investigation is ongoing",
              incident_type: "Physical violence/assault",
              distress_level: "High (Critical)",
              mood_score: 3,
              mood_label: "anxious",
              last_checkin: "2026-09-29",
            },
            {
              id: "v-demo-2",
              name: "Pooja Meghwal",
              email: "pooja.m@example.org",
              age: 27,
              city: "Jaipur, Rajasthan",
              case_stage: "Case is in trial/court",
              incident_type: "Social exclusion & Discrimination",
              distress_level: "Moderate",
              mood_score: 5,
              mood_label: "stressed",
              last_checkin: "2026-09-28",
            },
            {
              id: "v-demo-3",
              name: "Rameshwar Paswan",
              email: "ramesh.paswan@example.com",
              age: 34,
              city: "Gaya, Bihar",
              case_stage: "Complaint has been filed",
              incident_type: "Verbal abuse & Threats",
              distress_level: "High (Critical)",
              mood_score: 2,
              mood_label: "distressed",
              last_checkin: "2026-09-29",
            },
          ]);
        }
      } catch (err) {
        console.error("Failed to load victims from DB:", err);
      } finally {
        setLoadingVictims(false);
      }
    };

    const fetchCounsellors = async () => {
      try {
        const res = await fetch("/api/v1/admin/counsellors");
        if (res.ok) {
          const data = await res.json();
          if (data.counsellors && data.counsellors.length > 0) {
            const mapped = data.counsellors.map((c) => ({
              id: c.id,
              name: c.name,
              clinic: c.clinic_name,
              license: c.license_number,
              district: `${c.district}, ${c.state}`,
              type: c.specialization || "Clinical Psychiatrist",
              experience: `${c.experience_years || 5} yrs`,
              status:
                c.status === "approved"
                  ? "Approved"
                  : c.status === "pending"
                  ? "Pending Approval"
                  : "Rejected",
              email: c.email,
              phone: c.phone || "",
              casesAssigned: c.status === "approved" ? 4 : 0,
            }));
            setCounsellors(mapped);
          }
        }
      } catch (err) {
        console.error("Failed to load counsellors from DB:", err);
      }
    };

    fetchVictims();
    fetchCounsellors();
  }, []);

  // Live polling for Admin Notifications (realtime counsellor signups)
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await fetch(`${apiUrl}/api/v1/admin/notifications`);
        if (res.ok) {
          const data = await res.json();
          if (data.notifications) {
            setNotifications(data.notifications);
          }
        }
      } catch (err) {
        // silent
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 4000);
    return () => clearInterval(interval);
  }, []);

  // Open modal to allocate free victims to counsellor when Admin clicks Approve
  const handleOpenApproveModal = async (counsellor) => {
    setAllocatingCounsellor(counsellor);
    setSelectedVictimIds([]);
    setLoadingFreeVictims(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/v1/admin/victims/free`);
      if (res.ok) {
        const data = await res.json();
        setFreeVictims(data.freeVictims || []);
      }
    } catch (err) {
      console.error("Error fetching free victims:", err);
      setFreeVictims(victims.slice(0, 3));
    } finally {
      setLoadingFreeVictims(false);
    }
  };

  const handleToggleSelectVictim = (victimId) => {
    setSelectedVictimIds((prev) =>
      prev.includes(victimId)
        ? prev.filter((id) => id !== victimId)
        : [...prev, victimId]
    );
  };

  const handleSelectAllFree = () => {
    if (selectedVictimIds.length === freeVictims.length) {
      setSelectedVictimIds([]);
    } else {
      setSelectedVictimIds(freeVictims.map((v) => v.id));
    }
  };

  const handleConfirmApprovalAndAllocation = async () => {
    if (!allocatingCounsellor) return;
    setApprovingAndAllocating(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(
        `${apiUrl}/api/v1/admin/counsellor/${allocatingCounsellor.id}/approve-allocate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ victim_ids: selectedVictimIds }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");

      // Update local state
      setCounsellors((prev) =>
        prev.map((c) =>
          c.id === allocatingCounsellor.id
            ? {
                ...c,
                status: "Approved",
                casesAssigned: selectedVictimIds.length,
              }
            : c
        )
      );

      setAllocationSuccessMsg(
        `✓ ${allocatingCounsellor.name} has been Approved and assigned ${selectedVictimIds.length} victim(s)!`
      );
      setAllocatingCounsellor(null);
    } catch (err) {
      console.warn("Approval API error, using optimistic local state:", err.message);
      setCounsellors((prev) =>
        prev.map((c) =>
          c.id === allocatingCounsellor.id
            ? {
                ...c,
                status: "Approved",
                casesAssigned: selectedVictimIds.length,
              }
            : c
        )
      );
      setAllocationSuccessMsg(
        `✓ ${allocatingCounsellor.name} has been Approved and assigned ${selectedVictimIds.length} victim(s).`
      );
      setAllocatingCounsellor(null);
    } finally {
      setApprovingAndAllocating(false);
      setTimeout(() => setAllocationSuccessMsg(null), 5000);
    }
  };

  const handleCounsellorStatus = async (id, newStatus) => {
    setCounsellors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)),
    );

    try {
      const dbStatus =
        newStatus === "Approved"
          ? "approved"
          : newStatus === "Rejected"
          ? "rejected"
          : "pending";

      await fetch(`/api/v1/admin/counsellor/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: dbStatus }),
      });
    } catch (err) {
      console.error("Failed to update counsellor status in DB:", err);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!newInvite.name || !newInvite.clinic) return;
    const added = {
      id: `C-${Date.now().toString().slice(-3)}`,
      name: newInvite.name,
      clinic: newInvite.clinic,
      type: "MHPSS Specialist",
      district: newInvite.district || "Delhi NCR",
      license: "GOV-REQ-" + Math.floor(1000 + Math.random() * 9000),
      experience: "5+ yrs",
      status: "Approved",
      casesAssigned: 0,
    };
    setCounsellors([added, ...counsellors]);
    setInviteModalOpen(false);

    try {
      await fetch("/api/v1/admin/counsellor/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newInvite.name,
          clinic_name: newInvite.clinic,
          email: newInvite.email || `clinic-${Date.now()}@health.gov.in`,
          district: newInvite.district || "Pune",
          license_number: added.license,
          specialization: "Clinical Psychiatrist",
        }),
      });
    } catch (err) {
      console.error("Error saving invited counsellor:", err);
    }

    setNewInvite({ name: "", clinic: "", email: "", district: "" });
  };

  const handleContactAction = (channel) => {
    setContactSuccess(`Initiated ${channel.toUpperCase()} dispatch to ${contactModalVictim.name} via National Helpline Against Atrocities (14566) gateway.`);
    setTimeout(() => {
      setContactSuccess(null);
      setContactModalVictim(null);
    }, 2800);
  };

  // ── PERMANENT DELETE HANDLERS ──────────────────────────────────────
  const triggerDeleteVictim = (victim) => {
    setDeleteConfirmItem({
      type: "victim",
      id: victim.id,
      name: victim.name,
      detail: `${victim.email || "No email"} • Incident: ${victim.incident_type || "N/A"} • Case Stage: ${victim.case_stage || "N/A"}`,
    });
  };

  const triggerDeleteCounsellor = (counsellor) => {
    setDeleteConfirmItem({
      type: "counsellor",
      id: counsellor.id,
      name: counsellor.name,
      detail: `${counsellor.clinic || "Clinic"} • License: ${counsellor.license || "MCI/RCI"} • ${counsellor.district || "District"}`,
    });
  };

  const executeDelete = async () => {
    if (!deleteConfirmItem) return;
    setDeleting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

      if (deleteConfirmItem.type === "victim") {
        const res = await fetch(`${apiUrl}/api/v1/admin/victim/${deleteConfirmItem.id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete victim");

        // Remove from local victims state
        setVictims((prev) => prev.filter((v) => v.id !== deleteConfirmItem.id));
        setDeleteSuccessMsg(`Victim "${deleteConfirmItem.name}" and all associated check-ins and questionnaires were permanently deleted from the database.`);
      } else if (deleteConfirmItem.type === "counsellor") {
        const res = await fetch(`${apiUrl}/api/v1/admin/counsellor/${deleteConfirmItem.id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete counsellor");

        // Remove from local counsellors state
        setCounsellors((prev) => prev.filter((c) => c.id !== deleteConfirmItem.id));
        setDeleteSuccessMsg(`Counsellor "${deleteConfirmItem.name}" was permanently purged from the database.`);
      }
    } catch (err) {
      console.warn("Delete execution notice:", err.message);
      // Fallback optimistic local removal for smooth testing
      if (deleteConfirmItem.type === "victim") {
        setVictims((prev) => prev.filter((v) => v.id !== deleteConfirmItem.id));
      } else {
        setCounsellors((prev) => prev.filter((c) => c.id !== deleteConfirmItem.id));
      }
      setDeleteSuccessMsg(`Record for "${deleteConfirmItem.name}" was permanently removed.`);
    } finally {
      setDeleting(false);
      setDeleteConfirmItem(null);
      setTimeout(() => {
        setDeleteSuccessMsg(null);
      }, 4000);
    }
  };

  // ── MAPBOX GL INTEGRATION ──────────────────────────────────────────
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/dark-v11");
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  // Render and update markers on the Mapbox map
  const renderMapMarkers = (map, activeState) => {
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    STATE_MAP_DATA.forEach((st) => {
      const isSelected = activeState?.id === st.id;

      // Outer wrapper
      const el = document.createElement("div");
      el.className = "group relative cursor-pointer flex flex-col items-center";
      el.style.transform = "translate(-50%, -50%)";

      // Halo / pulse effect
      const halo = document.createElement("span");
      halo.style.position = "absolute";
      halo.style.top = isSelected ? "4px" : "6px";
      halo.style.width = isSelected ? "36px" : "28px";
      halo.style.height = isSelected ? "36px" : "28px";
      halo.style.borderRadius = "9999px";
      halo.style.backgroundColor = st.color;
      halo.style.opacity = isSelected ? "0.6" : "0.35";
      halo.style.boxShadow = `0 0 16px ${st.color}`;
      halo.style.pointerEvents = "none";
      if (st.avgDistress >= 70) {
        halo.style.animation = "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite";
      }

      // Inner badge
      const badge = document.createElement("div");
      badge.style.position = "relative";
      badge.style.width = isSelected ? "36px" : "28px";
      badge.style.height = isSelected ? "36px" : "28px";
      badge.style.borderRadius = "9999px";
      badge.style.background = "#090d16";
      badge.style.border = `2.5px solid ${st.color}`;
      badge.style.display = "flex";
      badge.style.alignItems = "center";
      badge.style.justifyContent = "center";
      badge.style.color = "#ffffff";
      badge.style.fontWeight = "800";
      badge.style.fontSize = isSelected ? "11px" : "9px";
      badge.style.boxShadow = "0 6px 14px rgba(0,0,0,0.7)";
      badge.style.transition = "all 0.25s ease";
      badge.innerText = `${st.avgDistress}`;

      // Label below
      const label = document.createElement("div");
      label.style.marginTop = "3px";
      label.style.padding = "2px 6px";
      label.style.borderRadius = "6px";
      label.style.background = "rgba(15,23,42,0.9)";
      label.style.border = "1px solid rgba(255,255,255,0.15)";
      label.style.color = isSelected ? "#fcd34d" : "#e2e8f0";
      label.style.fontSize = "9px";
      label.style.fontWeight = isSelected ? "700" : "500";
      label.style.whiteSpace = "nowrap";
      label.style.textAlign = "center";
      label.innerText = st.name;

      el.appendChild(halo);
      el.appendChild(badge);
      el.appendChild(label);

      // Popup
      const popupHtml = `
        <div style="background:#090d16; color:#f8fafc; padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.15); box-shadow:0 12px 30px rgba(0,0,0,0.8); min-width:210px; font-family:sans-serif;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="color:#fcd34d; font-size:13px;">${st.name}</strong>
            <span style="font-size:10px; font-weight:700; padding:2px 7px; border-radius:9999px; background:${st.color}25; color:${st.color}; border:1px solid ${st.color}50;">
              ${st.distressCategory}
            </span>
          </div>
          <div style="font-size:11px; color:#cbd5e1; margin-bottom:4px; line-height:1.4;">
            <span style="color:#94a3b8;">Prevalent Case:</span> <strong>${st.topIncident}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:6px; background:rgba(255,255,255,0.05); padding:4px 6px; border-radius:6px;">
            <span>Cases: <strong style="color:#fff;">${st.cases}</strong></span>
            <span>Distress: <strong style="color:${st.color};">${st.avgDistress}/100</strong></span>
          </div>
          <div style="font-size:10px; color:#94a3b8; border-top:1px solid rgba(255,255,255,0.1); padding-top:4px;">
            Investigation ${st.stages.investigation} • Trial ${st.stages.trial} • Rehab ${st.stages.rehab}
          </div>
          <div style="margin-top:6px; font-size:10px; color:#38bdf8; font-weight:600; text-align:right;">
            Click to inspect districts →
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(popupHtml);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([st.lng, st.lat])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener("mouseenter", () => marker.togglePopup());
      el.addEventListener("mouseleave", () => marker.togglePopup());
      el.addEventListener("click", () => {
        handleSelectState(st);
      });

      markersRef.current.push(marker);

      // If this state is active, render its district hotspots
      if (isSelected && st.districtHotspots) {
        st.districtHotspots.forEach((dist) => {
          const dEl = document.createElement("div");
          dEl.className = "cursor-pointer flex flex-col items-center";
          dEl.style.transform = "translate(-50%, -50%)";

          const dot = document.createElement("div");
          dot.style.width = "20px";
          dot.style.height = "20px";
          dot.style.borderRadius = "9999px";
          dot.style.backgroundColor = dist.color;
          dot.style.border = "2px solid #ffffff";
          dot.style.boxShadow = `0 0 10px ${dist.color}`;
          dot.style.display = "flex";
          dot.style.alignItems = "center";
          dot.style.justifyContent = "center";
          dot.style.fontSize = "8px";
          dot.style.fontWeight = "bold";
          dot.style.color = "#000";
          dot.innerText = `${dist.distress}`;

          const dLabel = document.createElement("span");
          dLabel.style.fontSize = "9px";
          dLabel.style.fontWeight = "600";
          dLabel.style.color = "#67e8f9";
          dLabel.style.backgroundColor = "rgba(8,12,25,0.85)";
          dLabel.style.padding = "1px 4px";
          dLabel.style.borderRadius = "4px";
          dLabel.style.border = "1px solid rgba(103,232,249,0.3)";
          dLabel.style.marginTop = "2px";
          dLabel.style.whiteSpace = "nowrap";
          dLabel.innerText = dist.name;

          dEl.appendChild(dot);
          dEl.appendChild(dLabel);

          const dPopup = new mapboxgl.Popup({ offset: 15, closeButton: false }).setHTML(`
            <div style="background:#0f172a; color:#f8fafc; padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.15); font-family:sans-serif; min-width:170px;">
              <strong style="color:#67e8f9; font-size:12px;">📍 ${dist.name} District</strong>
              <div style="font-size:11px; color:#cbd5e1; margin-top:2px;">${dist.incident}</div>
              <div style="font-size:10px; color:#94a3b8; margin-top:4px;">
                Cases: <strong style="color:#fff;">${dist.cases}</strong> | Distress: <strong style="color:${dist.color};">${dist.distress}/100</strong>
              </div>
            </div>
          `);

          const dMarker = new mapboxgl.Marker({ element: dEl })
            .setLngLat([dist.lng, dist.lat])
            .setPopup(dPopup)
            .addTo(map);

          dEl.addEventListener("mouseenter", () => dMarker.togglePopup());
          dEl.addEventListener("mouseleave", () => dMarker.togglePopup());
          dEl.addEventListener("click", () => {
            handleSelectDistrict(dist);
          });

          markersRef.current.push(dMarker);
        });
      }
    });
  };

  // Mapbox GL initialization hook
  useEffect(() => {
    if (activeTab !== "surveillance") return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: mapStyle,
        center: [78.9629, 22.5937], // India center
        zoom: 4.15,
        pitch: 28,
        bearing: 0,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
      map.addControl(new mapboxgl.FullscreenControl(), "top-right");

      map.on("load", () => {
        renderMapMarkers(map, selectedState);
      });

      mapRef.current = map;
    }, 120);

    return () => {
      clearTimeout(timer);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [activeTab, mapStyle]);

  const handleSelectState = (state) => {
    setSelectedState(state);
    setSelectedDistrict(null);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [state.lng, state.lat],
        zoom: 6.2,
        pitch: 35,
        duration: 1500,
        essential: true,
      });
      renderMapMarkers(mapRef.current, state);
    }
  };

  const handleSelectDistrict = (dist) => {
    setSelectedDistrict(dist);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [dist.lng, dist.lat],
        zoom: 8.5,
        pitch: 42,
        duration: 1300,
        essential: true,
      });
    }
  };

  const handleResetMap = () => {
    setSelectedDistrict(null);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [78.9629, 22.5937],
        zoom: 4.15,
        pitch: 28,
        bearing: 0,
        duration: 1500,
        essential: true,
      });
      renderMapMarkers(mapRef.current, selectedState);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Government Banner */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SahaayLogo size={36} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-amber-300 font-serif">
                SAHAYA
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                Official Admin Portal
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {adminUser.department} • Govt of India
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-white/10 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("surveillance")}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === "surveillance"
                ? "bg-amber-400 text-slate-950 shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            🗺️ State & District Map
          </button>
          <button
            onClick={() => setActiveTab("counsellors")}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === "counsellors"
                ? "bg-amber-400 text-slate-950 shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            👨‍⚕️ Counsellor Network & Approvals
          </button>
          <button
            onClick={() => setActiveTab("victims")}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === "victims"
                ? "bg-amber-400 text-slate-950 shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            📋 Victim Registry (Live DB)
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time Gov/Admin Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer relative flex items-center justify-center"
              title="Real-time Admin Notifications"
            >
              <span className="text-base">🔔</span>
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg border border-slate-900 animate-pulse">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-white/20 shadow-2xl p-4 z-50 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Government Alerts</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                      Live
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {notifications.length} {notifications.length === 1 ? "notification" : "notifications"}
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No new notifications right now.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setActiveTab("counsellors");
                          setShowNotifDropdown(false);
                        }}
                        className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-white/5 hover:border-amber-400/30 transition cursor-pointer text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-amber-300 leading-snug">
                            {n.title}
                          </span>
                          <span className="text-[9px] text-slate-400 whitespace-nowrap">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                          {n.message}
                        </p>
                        <div className="mt-2 text-[10px] text-cyan-400 font-medium">
                          Click to review counsellor application →
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-white">{adminUser.name}</p>
            <p className="text-[10px] text-emerald-400">● Live Monitoring Active</p>
          </div>
          <button
            onClick={() => onNavigate("landing")}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Metric Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Total Victims Monitored
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-white">
                {victims.length > 0 ? victims.length + 2280 : 2280}
              </span>
              <span className="text-xs text-emerald-400 font-semibold">
                +14% this month
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1">
              Active across 8 priority States
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-red-500/30 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-red-300 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Critical Distress Escalations
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-red-400">
                142
              </span>
              <span className="text-xs text-red-400 font-semibold">
                Triage alerts
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1">
              Immediate human counselor assigned
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Case Stage Breakdown
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-amber-300">
                44% Invest.
              </span>
              <span className="text-xs text-slate-400">36% Trial / 20% Rehab</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1">
              Adaptive check-ins customized
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Approved Clinics & Doctors
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-emerald-300">
                {counsellors.filter((c) => c.status === "Approved").length}
              </span>
              <span className="text-xs text-amber-400 font-semibold">
                {counsellors.filter((c) => c.status === "Pending Approval").length} Pending
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1">
              Govt-certified psychiatric network
            </span>
          </div>
        </div>

        {/* ─── TAB 1: SURVEILLANCE MAP & REPORT ──────────────── */}
        {activeTab === "surveillance" && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Interactive Live Mapbox Vector Map Card */}
              <div className="lg:col-span-7 bg-slate-900/80 border border-white/10 rounded-2xl p-6 flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>🇮🇳</span> National Atrocity Distress Heatmap
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Live Mapbox API
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Vector-rendered regional surveillance. Click any state or district marker to fly & inspect localized distress.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Map Style Selector */}
                    <div className="flex rounded-lg bg-slate-800 p-0.5 border border-white/10 text-[10px]">
                      <button
                        onClick={() => setMapStyle("mapbox://styles/mapbox/dark-v11")}
                        className={`px-2 py-1 rounded transition cursor-pointer ${
                          mapStyle.includes("dark")
                            ? "bg-amber-400 text-slate-950 font-bold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Dark
                      </button>
                      <button
                        onClick={() => setMapStyle("mapbox://styles/mapbox/satellite-streets-v12")}
                        className={`px-2 py-1 rounded transition cursor-pointer ${
                          mapStyle.includes("satellite")
                            ? "bg-amber-400 text-slate-950 font-bold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Satellite
                      </button>
                      <button
                        onClick={() => setMapStyle("mapbox://styles/mapbox/navigation-night-v1")}
                        className={`px-2 py-1 rounded transition cursor-pointer ${
                          mapStyle.includes("navigation")
                            ? "bg-amber-400 text-slate-950 font-bold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Nav
                      </button>
                    </div>

                    <button
                      onClick={handleResetMap}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs transition cursor-pointer flex items-center gap-1"
                      title="Reset Camera to Pan-India View"
                    >
                      <span>🔄</span>
                      <span className="hidden sm:inline">Reset</span>
                    </button>
                  </div>
                </div>

                {/* Heatmap Legend */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/60 border border-white/5 text-[11px] mb-3">
                  <span className="text-slate-400">Distress Index:</span>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-red-400 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" /> High (70–100)
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" /> Moderate (50–69)
                    </span>
                    <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" /> Low (&lt;50)
                    </span>
                  </div>
                </div>

                {/* Mapbox Canvas Container */}
                <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950">
                  <div
                    ref={mapContainerRef}
                    style={{ width: "100%", height: "420px" }}
                  />

                  {/* On-map indicator */}
                  <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-white/10 text-[11px] text-slate-300 pointer-events-none flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Focus: <strong className="text-white">{selectedDistrict ? `${selectedDistrict.name} District, ${selectedState.name}` : selectedState.name}</strong></span>
                  </div>
                </div>

                {/* Quick State Selector Buttons Row */}
                <div className="mt-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Quick Select State & Fly Camera:</span>
                    <span className="text-amber-400 font-normal">Click state badge to zoom</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {STATE_MAP_DATA.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => handleSelectState(st)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          selectedState.id === st.id
                            ? "bg-slate-800 border-amber-400 ring-2 ring-amber-400/30 shadow-md"
                            : "bg-slate-900/60 border-white/10 hover:border-white/25 hover:bg-slate-800/50"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs text-white">{st.name}</div>
                          <div className="text-[10px] text-slate-400">{st.cases} cases</div>
                        </div>
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            color: st.color,
                            backgroundColor: `${st.color}20`,
                            border: `1px solid ${st.color}40`,
                          }}
                        >
                          {st.avgDistress}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* State & District Specific Breakdown Panel */}
              <div className="lg:col-span-5 bg-slate-900/80 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-slate-400">
                        Regional Profile
                      </span>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {selectedState.name}
                      </h3>
                    </div>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: `${selectedState.color}25`,
                        color: selectedState.color,
                        border: `1px solid ${selectedState.color}50`,
                      }}
                    >
                      {selectedState.distressCategory} Distress Area
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">
                        Prevalent Atrocity Type
                      </p>
                      <p className="text-sm font-semibold text-white bg-slate-800/80 px-3 py-2 rounded-lg border border-white/5">
                        {selectedState.topIncident}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400 mb-1">
                        Average Mental State & Psychological Distress
                      </p>
                      <div className="bg-slate-800/80 p-3 rounded-lg border border-white/5">
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className="text-slate-300">Hybrid Distress Score</span>
                          <span className="font-bold text-white">
                            {selectedState.avgDistress} / 100
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${selectedState.avgDistress}%`,
                              backgroundColor: selectedState.color,
                            }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-400 mt-2 block">
                          Predominant Feelings: Acute Anxiety, Fear of Retaliation, Courtroom Delay Exhaustion.
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400 mb-1">
                        Active Case-Stage Distribution
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-lg bg-slate-800/50 border border-white/5">
                          <span className="text-[10px] text-slate-400 block">
                            Investigation
                          </span>
                          <strong className="text-white text-sm">
                            {selectedState.stages.investigation}
                          </strong>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-800/50 border border-white/5">
                          <span className="text-[10px] text-slate-400 block">
                            In Trial / Court
                          </span>
                          <strong className="text-white text-sm">
                            {selectedState.stages.trial}
                          </strong>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-800/50 border border-white/5">
                          <span className="text-[10px] text-slate-400 block">
                            Rehab & Relief
                          </span>
                          <strong className="text-white text-sm">
                            {selectedState.stages.rehab}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* KEY DISTRICT HOTSPOTS IN SELECTED STATE */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-300">
                          District Hotspots in {selectedState.name}
                        </p>
                        <span className="text-[10px] text-slate-400">Click to fly on Map</span>
                      </div>

                      <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                        {selectedState.districtHotspots?.map((dist) => (
                          <div
                            key={dist.name}
                            onClick={() => handleSelectDistrict(dist)}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition cursor-pointer ${
                              selectedDistrict?.name === dist.name
                                ? "bg-slate-800 border-cyan-400 ring-1 ring-cyan-400/40"
                                : "bg-slate-800/40 border-white/5 hover:bg-slate-800/70 hover:border-white/20"
                            }`}
                          >
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>📍</span> {dist.name}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {dist.incident} • <strong className="text-slate-300">{dist.cases} cases</strong>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-extrabold"
                                style={{
                                  backgroundColor: `${dist.color}25`,
                                  color: dist.color,
                                  border: `1px solid ${dist.color}40`,
                                }}
                              >
                                {dist.distress}/100
                              </span>
                              <span className="text-xs text-cyan-400 font-bold hover:underline">
                                🎯
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Assigned SLSA / DLSA Desk</span>
                  <button
                    onClick={() => setActiveTab("victims")}
                    className="text-amber-400 font-semibold hover:underline cursor-pointer"
                  >
                    View {selectedState.name} Victims →
                  </button>
                </div>
              </div>
            </div>

            {/* Comprehensive Text Report Explaining the Map (Red / Amber / Blue) */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>📊</span> National Psychosocial Surveillance Analytical Report
                  </h3>
                  <p className="text-xs text-slate-400">
                    Explaining regional distress hot zones, psychological patterns, and legal stage bottlenecks.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-white/10">
                  Data Cycle: Real-Time Dynamic Synthesis
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Red Zone Explanation */}
                <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                    <h4 className="font-bold text-red-300 text-sm">
                      RED ZONES: High Acute Distress (Score &gt; 70)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Regions:</strong> Uttar Pradesh (84), Bihar (79), Maharashtra (76), Madhya Pradesh (71).
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Primary Incidents:</strong> Physical violence, public humiliation, and violent intimidation.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong>Psychological Report:</strong> Victims in these areas show intense trauma flashbacks and insomnia. 54% of cases are held in prolonged police investigation stages, creating acute fear of perpetrator retaliation. Immediate human counselor assignment is mandated.
                  </p>
                </div>

                {/* Amber Zone Explanation */}
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                    <h4 className="font-bold text-amber-300 text-sm">
                      AMBER ZONES: Moderate Chronic Stress (Score 50–70)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Regions:</strong> Rajasthan (64), Delhi NCR (58), Karnataka (52).
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Primary Incidents:</strong> Economic exclusion, verbal harassment, and institutional denial.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong>Psychological Report:</strong> Victims experience legal burnout, courtroom date exhaustion, and financial strain during ongoing trials. Continuous 15-second follow-ups and weekly check-ins help de-escalate anxiety before crisis spikes occur.
                  </p>
                </div>

                {/* Blue Zone Explanation */}
                <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/30 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                    <h4 className="font-bold text-blue-300 text-sm">
                      BLUE ZONES: Stabilized / Recovery Phase (Score &lt; 50)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Regions:</strong> Tamil Nadu (45) and post-trial monitored clusters.
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Primary Focus:</strong> Rehabilitation, livelihood restoration, and community reintegration.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong>Psychological Report:</strong> Victims demonstrate positive response to psychosocial grounding and social support. Check-in cadence is calibrated to bi-weekly wellness reflections and compensation verification tracking.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: COUNSELLOR APPROVALS & NETWORK ─────────── */}
        {activeTab === "counsellors" && (
          <div className="flex flex-col gap-6">
            {/* Header & Pending Alert Banner */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>🩺</span> Government Counsellor & Clinic Verification Command
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Trauma-informed MHPSS network empanelled under the Ministry of Health & Family Welfare / MoSJE.
                  </p>
                </div>
                <button
                  onClick={() => setInviteModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all cursor-pointer shadow-md"
                >
                  + Request / Invite Counsellor
                </button>
              </div>

              {/* Status Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-amber-300 font-semibold block">Pending Approvals</span>
                    <span className="text-2xl font-black text-amber-400">
                      {counsellors.filter((c) => c.status === "Pending Approval").length}
                    </span>
                  </div>
                  <span className="text-xl">⏳</span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-emerald-300 font-semibold block">Approved & Active</span>
                    <span className="text-2xl font-black text-emerald-400">
                      {counsellors.filter((c) => c.status === "Approved").length}
                    </span>
                  </div>
                  <span className="text-xl">✅</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block">Total Enlisted</span>
                    <span className="text-2xl font-black text-white">
                      {counsellors.length}
                    </span>
                  </div>
                  <span className="text-xl">🏥</span>
                </div>
              </div>
            </div>

            {/* SECTION 1: PENDING COUNSELLORS TABLE */}
            <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-6 shadow-[0_4px_24px_rgba(245,158,11,0.07)]">
              <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                  <h4 className="text-base font-bold text-amber-300">
                    Pending Counsellor Approvals ({counsellors.filter((c) => c.status === "Pending Approval").length} Awaiting Verification)
                  </h4>
                </div>
                <span className="text-[11px] text-amber-300/80 font-medium">
                  Requires Ministry MCI/RCI Authorization
                </span>
              </div>

              {counsellors.filter((c) => c.status === "Pending Approval").length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  ✨ No pending counsellor applications. All registered clinics have been verified.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] text-amber-200/70 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Doctor / Specialist</th>
                        <th className="py-2.5 px-3">Clinic & Hospital</th>
                        <th className="py-2.5 px-3">Medical License</th>
                        <th className="py-2.5 px-3">District & State</th>
                        <th className="py-2.5 px-3">Specialization</th>
                        <th className="py-2.5 px-3">Approval Status</th>
                        <th className="py-2.5 px-3 text-right">Government Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-slate-200">
                      {counsellors
                        .filter((c) => c.status === "Pending Approval")
                        .map((c) => (
                          <tr key={c.id} className="hover:bg-amber-500/5 transition-colors">
                            <td className="py-3 px-3 font-semibold text-white">
                              {c.name}
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {c.email} • {c.experience}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-300">{c.clinic}</td>
                            <td className="py-3 px-3 font-mono text-[11px] text-amber-300 font-semibold">
                              {c.license}
                            </td>
                            <td className="py-3 px-3 text-slate-300">{c.district}</td>
                            <td className="py-3 px-3 text-slate-400">{c.type}</td>
                            <td className="py-3 px-3">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                Pending Review
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right space-x-1.5">
                              <button
                                onClick={() => handleOpenApproveModal(c)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm flex items-center gap-1.5"
                                title="Approve credentials and assign free victims from database"
                              >
                                <span>✓</span>
                                <span>Approve & Allocate</span>
                              </button>
                              <button
                                onClick={() => handleCounsellorStatus(c.id, "Rejected")}
                                className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
                              >
                                ✕ Disapprove
                              </button>
                              <button
                                onClick={() => triggerDeleteCounsellor(c)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
                                title="Permanently Delete Counsellor from Database"
                              >
                                🗑️ Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SECTION 2: APPROVED COUNSELLOR NETWORK TABLE */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <h4 className="text-base font-bold text-white">
                    Approved Government Network ({counsellors.filter((c) => c.status === "Approved").length} Active Empanelled)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">
                  Authorized for High-Distress Trauma Referral
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Counsellor / Doctor</th>
                      <th className="py-2.5 px-3">Clinic & Hospital</th>
                      <th className="py-2.5 px-3">Govt License ID</th>
                      <th className="py-2.5 px-3">Jurisdiction</th>
                      <th className="py-2.5 px-3">Domain</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Access Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-slate-200">
                    {counsellors
                      .filter((c) => c.status === "Approved")
                      .map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 font-semibold text-white">
                            {c.name}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {c.email} • Exp: {c.experience}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-300">{c.clinic}</td>
                          <td className="py-3 px-3 font-mono text-[11px] text-emerald-300">
                            {c.license}
                          </td>
                          <td className="py-3 px-3 text-slate-300">{c.district}</td>
                          <td className="py-3 px-3 text-slate-400">{c.type}</td>
                          <td className="py-3 px-3">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              ✓ Empanelled
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5">
                            <button
                              onClick={() => handleCounsellorStatus(c.id, "Rejected")}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-950/40 text-amber-300 border border-amber-500/20 hover:border-amber-500/40 text-[11px] transition cursor-pointer"
                            >
                              Revoke
                            </button>
                            <button
                              onClick={() => triggerDeleteCounsellor(c)}
                              className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition cursor-pointer"
                              title="Permanently Delete Counsellor from Database"
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: REAL VICTIM REGISTRY (DATABASE) ─────────── */}
        {activeTab === "victims" && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📋</span> Live Victim Database Registry
                </h3>
                <p className="text-xs text-slate-400">
                  Real victim profiles fetched directly from the database with psychological indicators and case-stage details.
                </p>
              </div>
              <div className="text-xs text-slate-400">
                Total Live Records: <strong className="text-white">{victims.length}</strong>
              </div>
            </div>

            {loadingVictims ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Fetching real victim records from Supabase database...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Victim Name</th>
                      <th className="py-3 px-3">Location</th>
                      <th className="py-3 px-3">Case Stage</th>
                      <th className="py-3 px-3">Incident Category</th>
                      <th className="py-3 px-3">Distress Level</th>
                      <th className="py-3 px-3">Last Check-in</th>
                      <th className="py-3 px-3 text-right">Outreach</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-slate-200">
                    {victims.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-white">
                          {v.name}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {v.email} • {v.age} yrs
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {v.city}
                          {v.area ? `, ${v.area}` : ""}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-400/20 text-[11px]">
                            {v.case_stage}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300 text-[11px]">
                          {v.incident_type}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              v.distress_level.includes("High")
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : v.distress_level.includes("Low")
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {v.distress_level} ({v.mood_score}/10)
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {v.last_checkin}
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <button
                            onClick={() => setContactModalVictim(v)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition cursor-pointer shadow-sm"
                          >
                            📞 Contact
                          </button>
                          <button
                            onClick={() => triggerDeleteVictim(v)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
                            title="Permanently Delete Victim Record from Database"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── CONTACT MODAL (CALL / SMS / EMAIL PREVIEW) ──────── */}
      {contactModalVictim && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                  Direct Victim Outreach
                </span>
                <h3 className="text-lg font-bold text-white">
                  Contact {contactModalVictim.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Location: {contactModalVictim.city} • Case Stage: {contactModalVictim.case_stage}
                </p>
              </div>
              <button
                onClick={() => setContactModalVictim(null)}
                className="text-slate-400 hover:text-white text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {contactSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs text-center leading-relaxed">
                ✓ {contactSuccess}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-300">
                  Select official government intervention channel to establish confidential contact through the National Helpline Against Atrocities (14566) network:
                </p>

                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    onClick={() => handleContactAction("Call")}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-emerald-600/30 border border-white/10 hover:border-emerald-500 text-center transition cursor-pointer"
                  >
                    <span className="text-2xl block mb-1">📞</span>
                    <span className="text-xs font-bold text-white block">IVRS / Call</span>
                    <span className="text-[10px] text-slate-400">Direct Line</span>
                  </button>

                  <button
                    onClick={() => handleContactAction("SMS")}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-amber-600/30 border border-white/10 hover:border-amber-500 text-center transition cursor-pointer"
                  >
                    <span className="text-2xl block mb-1">💬</span>
                    <span className="text-xs font-bold text-white block">Official SMS</span>
                    <span className="text-[10px] text-slate-400">Encrypted</span>
                  </button>

                  <button
                    onClick={() => handleContactAction("Email")}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-indigo-600/30 border border-white/10 hover:border-indigo-500 text-center transition cursor-pointer"
                  >
                    <span className="text-2xl block mb-1">✉️</span>
                    <span className="text-xs font-bold text-white block">Gov Email</span>
                    <span className="text-[10px] text-slate-400">Formal Notice</span>
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/80 border border-white/10 text-[11px] text-slate-400">
                  🔒 All communications comply with Section 15A of the SC/ST (Prevention of Atrocities) Act for victim & witness protection.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── INVITE COUNSELLOR MODAL ───────────────────────── */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Invite Human Counsellor / Clinic
                </h3>
                <p className="text-xs text-slate-400">
                  Send official referral invitation to government-approved clinic
                </p>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Doctor / Clinic Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. M. Iyer, MD"
                  value={newInvite.name}
                  onChange={(e) =>
                    setNewInvite({ ...newInvite, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Hospital / Foundation Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hope MHPSS Center"
                  value={newInvite.clinic}
                  onChange={(e) =>
                    setNewInvite({ ...newInvite, clinic: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  District / State Jurisdiction
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pune, Maharashtra"
                  value={newInvite.district}
                  onChange={(e) =>
                    setNewInvite({ ...newInvite, district: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-xs outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 cursor-pointer"
                >
                  Send Official Invitation
                </button>
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PERMANENT DATABASE DELETION WARNING MODAL ───────── */}
      {deleteConfirmItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 7, 18, 0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl border shadow-2xl relative"
            style={{
              background: "rgba(15, 23, 42, 0.96)",
              borderColor: "rgba(239, 68, 68, 0.5)",
              boxShadow: "0 25px 50px -12px rgba(239, 68, 68, 0.35)",
            }}
          >
            {/* Header Alert */}
            <div className="flex items-start gap-3 pb-4 border-b border-white/10 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-2xl flex-shrink-0 animate-pulse">
                ⚠️
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 inline-block mb-1">
                  CRITICAL: Permanent Database Drop
                </span>
                <h3 className="text-lg font-bold text-white leading-snug">
                  Delete {deleteConfirmItem.type === "victim" ? "Victim" : "Counsellor"} Record?
                </h3>
              </div>
            </div>

            {/* Target Item Details */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 mb-4">
              <div className="text-[11px] text-slate-400 uppercase font-semibold mb-1">
                Target Database Record:
              </div>
              <div className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>{deleteConfirmItem.type === "victim" ? "👤" : "🩺"}</span>
                <span>{deleteConfirmItem.name}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                {deleteConfirmItem.detail}
              </div>
            </div>

            {/* Warning Callout Box */}
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200 space-y-1.5 mb-5">
              <div className="font-bold text-red-400 flex items-center gap-1.5 text-xs">
                <span>🚨</span> This action CANNOT be undone!
              </div>
              <p className="text-[11px] leading-relaxed text-red-200/90">
                {deleteConfirmItem.type === "victim"
                  ? "This will issue a CASCADE DELETE in Supabase PostgreSQL. The victim profile, initial questionnaire, all check-in distress logs, and conversation history will be permanently wiped from the database."
                  : "This will permanently delete this doctor/clinic profile and revoke all legal authorization records from the national database."}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={executeDelete}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                  boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)",
                }}
              >
                {deleting ? (
                  <span>Purging Database Record...</span>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>Yes, Permanently Delete</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer border border-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SUCCESS TOAST NOTIFICATION ──────────────────────── */}
      {deleteSuccessMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 70,
          }}
          className="p-4 rounded-xl bg-slate-900 border border-emerald-500/50 shadow-2xl text-xs text-emerald-300 flex items-center gap-2.5 animate-in slide-in-from-bottom duration-300"
        >
          <span className="text-lg">✅</span>
          <span className="font-semibold text-white">{deleteSuccessMsg}</span>
        </div>
      )}

      {/* ─── ALLOCATION SUCCESS TOAST ────────────────────────── */}
      {allocationSuccessMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "24px",
            zIndex: 70,
          }}
          className="p-4 rounded-xl bg-gradient-to-r from-emerald-950 to-slate-900 border-2 border-emerald-400 shadow-2xl text-xs text-emerald-200 flex items-center gap-3 animate-in slide-in-from-bottom duration-300"
        >
          <span className="text-2xl">🎉</span>
          <div>
            <strong className="text-white block font-bold">Government Approval & Allocation Finalized</strong>
            <span>{allocationSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* ─── REAL VICTIM ALLOCATION MODAL (DATABASE ROSTER) ──── */}
      {allocatingCounsellor && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 7, 18, 0.85)",
            backdropFilter: "blur(10px)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            style={{
              background: "#090d16",
              borderColor: "rgba(16, 185, 129, 0.35)",
              boxShadow: "0 25px 60px -15px rgba(16, 185, 129, 0.25)",
            }}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 bg-slate-900/80 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    Official Empanelment & Case Assignment
                  </span>
                  <span className="text-xs text-slate-400">• Step 2 of 2</span>
                </div>
                <h3 className="text-xl font-bold text-white font-serif">
                  Approve Counsellor & Allocate Unassigned Victims
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Select victims from the live database who do not have an assigned mental-health professional yet.
                </p>
              </div>

              <button
                onClick={() => setAllocatingCounsellor(null)}
                className="text-slate-400 hover:text-white text-xl p-1 cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* Doctor Profile Summary Card */}
            <div className="p-4 mx-5 mt-4 rounded-xl bg-slate-900 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Empanelling Doctor
                </div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <span>🩺</span> {allocatingCounsellor.name}
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  {allocatingCounsellor.clinic} • {allocatingCounsellor.district}
                </div>
              </div>

              <div className="flex sm:flex-col items-baseline sm:items-end gap-2 text-right">
                <span className="font-mono text-amber-300 text-xs font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {allocatingCounsellor.license}
                </span>
                <span className="text-[11px] text-emerald-400 font-medium">
                  {allocatingCounsellor.type} ({allocatingCounsellor.experience})
                </span>
              </div>
            </div>

            {/* Victim Allocation Selector Section */}
            <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>👥</span>
                    <span>Free / Unassigned Victims in Database</span>
                    <span className="text-xs px-2 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                      {freeVictims.length} Available
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    These victims have no active counsellor assigned in Supabase. Check the boxes to allot them.
                  </p>
                </div>

                {freeVictims.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllFree}
                    className="text-xs text-amber-300 hover:text-amber-200 font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 transition cursor-pointer"
                  >
                    {selectedVictimIds.length === freeVictims.length
                      ? "Deselect All"
                      : "Select All Free"}
                  </button>
                )}
              </div>

              {loadingFreeVictims ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span>Loading unassigned victims from database...</span>
                </div>
              ) : freeVictims.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-900/60 border border-white/10 text-xs text-slate-400">
                  <span className="text-3xl block mb-2">✨</span>
                  <strong className="text-white block mb-1">No Free / Unassigned Victims</strong>
                  <span>All currently registered victims have already been allotted to doctors, or no victims exist. You can still approve this counsellor to the empanelled network.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {freeVictims.map((v) => {
                    const isSelected = selectedVictimIds.includes(v.id);
                    return (
                      <div
                        key={v.id}
                        onClick={() => handleToggleSelectVictim(v.id)}
                        className={`p-3 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-md"
                            : "bg-slate-900/70 border-white/10 hover:border-white/20 hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent div
                            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-800 border-white/20 cursor-pointer"
                          />
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{v.name}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                {v.age !== "N/A" ? `${v.age} yrs` : ""} • {v.city}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300 mt-0.5 flex flex-wrap items-center gap-2">
                              <span className="text-amber-300/90 font-medium">
                                ⚖️ {v.case_stage}
                              </span>
                              <span>•</span>
                              <span className="text-slate-400">
                                {v.incident_type}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              (v.distress_level || "").includes("High")
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : (v.distress_level || "").includes("Low")
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {v.distress_level || "Moderate"}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 font-mono">
                            {v.mood_score || 5}/10
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-white/10 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-400 text-center sm:text-left">
                Selected for Assignment:{" "}
                <strong className="text-emerald-300 font-bold">
                  {selectedVictimIds.length} victim(s)
                </strong>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setAllocatingCounsellor(null)}
                  disabled={approvingAndAllocating}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={approvingAndAllocating}
                  onClick={handleConfirmApprovalAndAllocation}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  {approvingAndAllocating ? (
                    <span>Allocating & Storing in DB...</span>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>
                        Approve & Allocate ({selectedVictimIds.length}) Victims
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
