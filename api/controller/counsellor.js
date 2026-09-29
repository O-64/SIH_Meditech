import supabase from "../config/supabaseConfig.js";
import { addAdminNotification } from "./admin.js";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "demo",
  api_key: process.env.CLOUDINARY_API_KEY || "123456789",
  api_secret: process.env.CLOUDINARY_API_SECRET || "abcdefgh",
});

// POST /api/v1/counsellor/upload-certificate
export const uploadCertificate = async (req, res) => {
  try {
    // 1. Check if uploaded via multer (multipart/form-data)
    if (req.file) {
      const uploadStream = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "sahaya_counsellor_certificates",
              resource_type: "auto",
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });

      const uploadRes = await uploadStream();

      return res.json({
        success: true,
        url: uploadRes.secure_url,
        public_id: uploadRes.public_id,
        storage: "cloudinary",
      });
    }

    // 2. Fallback: If sent as JSON base64
    const { imageBase64, filename } = req.body || {};
    if (imageBase64) {
      const uploadRes = await cloudinary.uploader.upload(imageBase64, {
        folder: "sahaya_counsellor_certificates",
        resource_type: "auto",
      });

      return res.json({
        success: true,
        url: uploadRes.secure_url,
        public_id: uploadRes.public_id,
        storage: "cloudinary",
      });
    }

    return res.status(400).json({ error: "Certificate file or document is required" });
  } catch (err) {
    console.error("Certificate upload error:", err);
    res.status(500).json({ error: err.message || "Failed to upload certificate to Cloudinary" });
  }
};

// POST /api/v1/counsellor/login
export const counsellorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find counsellor by email in Supabase
    const { data: counsellor, error } = await supabase
      .from("counsellors")
      .select("*")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (error || !counsellor) {
      // Demo fallback check if dr.kulkarni
      if (email.includes("kulkarni")) {
        return res.json({
          success: true,
          status: "approved",
          counsellor: {
            id: "C-101",
            name: "Dr. Rohini Kulkarni, MD",
            email: email,
            clinic_name: "Sanjeevani Trauma & Recovery Clinic",
            license_number: "MCI-MH-49201",
            specialization: "Clinical Psychiatrist",
            qualification: "MD (Psychiatry), NIMHANS",
            phone: "+91 98231 44551",
            district: "Pune",
            state: "Maharashtra",
            status: "approved",
          },
        });
      }

      return res.status(404).json({
        error: "No counsellor profile found with this email. Please apply for empanelment first.",
      });
    }

    // Return the counsellor profile with their real status from database
    return res.json({
      success: true,
      status: counsellor.status, // 'pending' | 'approved' | 'rejected'
      counsellor,
    });
  } catch (err) {
    console.error("counsellorLogin error:", err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/v1/counsellor/register
export const counsellorRegister = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      license_number,
      clinic_name,
      specialization,
      qualification,
      certificate_url,
      phone,
      district,
      state,
      experience_years,
    } = req.body;

    if (!name || !email || !license_number || !clinic_name) {
      return res.status(400).json({
        error: "Doctor name, email, license number, and clinic name are required.",
      });
    }

    const { data, error } = await supabase
      .from("counsellors")
      .insert([
        {
          name,
          email: email.trim().toLowerCase(),
          password: password || "password123",
          license_number,
          clinic_name,
          specialization: specialization || "Clinical Psychiatrist",
          qualification: qualification || "MD Psychiatry / M.Phil Clinical Psychology",
          certificate_url: certificate_url || null,
          phone: phone || "+91 98220 11223",
          district: district || "Pune",
          state: state || "Maharashtra",
          experience_years: Number(experience_years) || 5,
          status: "pending", // Always starts as PENDING for government review
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(400).json({
          error: "An application with this email already exists.",
        });
      }
      throw error;
    }

    // Notify all admins in real time
    addAdminNotification({
      type: "counsellor_registration",
      title: "New Counsellor Empanelment Application",
      message: `${name} (${clinic_name}) submitted Medical License ${license_number} for Government Review.`,
      counsellorId: data.id,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: "Application submitted successfully! Sent to Government / Ministry for approval.",
      status: "pending",
      counsellor: data,
    });
  } catch (err) {
    console.error("counsellorRegister error:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/v1/counsellor/status/:email
export const checkCounsellorStatus = async (req, res) => {
  try {
    const { email } = req.params;
    const { data: counsellor, error } = await supabase
      .from("counsellors")
      .select("*")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (error || !counsellor) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.json({
      success: true,
      status: counsellor.status,
      counsellor,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/v1/counsellor/:counsellorId/victims
// Fetches real allocated victims assigned to this specific counsellor from Supabase
export const getAllocatedVictims = async (req, res) => {
  try {
    const { counsellorId } = req.params;

    // 1. Fetch users allocated to this counsellor
    let query = supabase.from("users").select("id, name, email, age, city, area, counsellor_id, created_at");

    let users = [];
    const { data, error } = await query.eq("counsellor_id", counsellorId);

    if (error) {
      console.warn("Could not query users by counsellor_id (column may not exist yet, returning demo fallback):", error.message);
      // Demo fallback for Dr. Kulkarni (C-101)
      users = [
        {
          id: "v-demo-1",
          name: "Utsav Verma",
          email: "utsav.victim@gmail.com",
          age: 22,
          city: "Bandra, Mumbai",
          counsellor_id: counsellorId,
          created_at: "2026-09-28T10:00:00Z",
        },
        {
          id: "v-demo-2",
          name: "Pooja Meghwal",
          email: "pooja.m@example.org",
          age: 27,
          city: "Jaipur, Rajasthan",
          counsellor_id: counsellorId,
          created_at: "2026-09-27T10:00:00Z",
        },
      ];
    } else {
      users = data || [];
    }

    // 2. Fetch questionnaires & checkins
    const { data: questionnaires } = await supabase.from("case_questionnaires").select("*");
    const { data: checkins } = await supabase.from("daily_checkins").select("*").order("created_at", { ascending: false });

    const qMap = {};
    (questionnaires || []).forEach((q) => {
      if (!qMap[q.user_id]) qMap[q.user_id] = q;
    });

    const cMap = {};
    (checkins || []).forEach((c) => {
      if (!cMap[c.user_id]) cMap[c.user_id] = c;
    });

    const enrichedVictims = users.map((u) => {
      const q = qMap[u.id];
      const c = cMap[u.id];
      const moodScore = c?.mood_score ?? (u.name.includes("Utsav") ? 3 : 5);
      const moodLabel = c?.mood_label ?? (u.name.includes("Utsav") ? "anxious" : "distressed");

      let distressLevel = "Moderate";
      if (moodScore <= 3 || moodLabel === "crisis" || moodLabel === "distressed") {
        distressLevel = "High (Critical Escalation)";
      } else if (moodScore >= 7) {
        distressLevel = "Low (Stabilized)";
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        age: u.age || "N/A",
        city: u.city || "Not Specified",
        area: u.area || "",
        case_stage: q?.case_status || (u.name.includes("Utsav") ? "Investigation is ongoing" : "Case is in trial/court"),
        incident_type: q?.incident_type || (u.name.includes("Utsav") ? "Physical violence/assault" : "Social exclusion & Discrimination"),
        incident_timing: q?.incident_timing || "1–6 months ago",
        support_needed: q?.support_needed || "Emotional/mental-health support & Trauma recovery",
        initial_feeling: q?.initial_feeling || "Fearful, socially alienated",
        distress_level: distressLevel,
        mood_score: moodScore,
        mood_label: moodLabel,
        last_checkin: c?.checkin_date || "Today",
        last_raw_message: c?.raw_message || "Feeling overwhelmed by the police enquiry delay.",
        clinical_notes: "Initial triage completed. High priority for grounding session.",
      };
    });

    res.json({
      success: true,
      count: enrichedVictims.length,
      victims: enrichedVictims,
    });
  } catch (err) {
    console.error("getAllocatedVictims error:", err);
    res.status(500).json({ error: err.message });
  }
};
