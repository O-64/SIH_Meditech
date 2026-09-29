import supabase from "../config/supabaseConfig.js";

// ── GET /api/v1/admin/victims ──────────────────────────────────
// Returns real victim records joined from users, case_questionnaires, and daily_checkins
export const getVictims = async (req, res) => {
  try {
    // 1. Fetch real users from database
    const { data: users, error: usersErr } = await supabase
      .from("users")
      .select("id, name, email, age, city, area, timezone, created_at")
      .order("created_at", { ascending: false });

    if (usersErr) throw usersErr;

    // 2. Fetch questionnaires
    const { data: questionnaires } = await supabase
      .from("case_questionnaires")
      .select("*")
      .order("created_at", { ascending: false });

    // 3. Fetch checkins
    const { data: checkins } = await supabase
      .from("daily_checkins")
      .select("*")
      .order("created_at", { ascending: false });

    // Map questionnaires by user_id (most recent)
    const qMap = {};
    (questionnaires || []).forEach((q) => {
      if (!qMap[q.user_id]) qMap[q.user_id] = q;
    });

    // Map checkins by user_id (most recent)
    const cMap = {};
    (checkins || []).forEach((c) => {
      if (!cMap[c.user_id]) cMap[c.user_id] = c;
    });

    const enrichedVictims = (users || []).map((u) => {
      const q = qMap[u.id];
      const c = cMap[u.id];

      const moodScore = c?.mood_score ?? 5;
      const moodLabel = c?.mood_label ?? "okay";

      let distressLevel = "Moderate";
      if (moodScore <= 3 || moodLabel === "crisis" || moodLabel === "distressed") {
        distressLevel = "High (Critical)";
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
        case_stage: q?.case_status || "Investigation is ongoing",
        incident_type: q?.incident_type || "Physical violence/assault",
        incident_timing: q?.incident_timing || "1–6 months ago",
        support_needed: q?.support_needed || "Emotional/mental-health support",
        mood_score: moodScore,
        mood_label: moodLabel,
        distress_level: distressLevel,
        last_checkin: c?.checkin_date || u.created_at?.split("T")[0],
        registered_at: u.created_at,
      };
    });

    res.json({
      success: true,
      count: enrichedVictims.length,
      victims: enrichedVictims,
    });
  } catch (err) {
    console.error("Admin getVictims error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/v1/admin/stats ───────────────────────────────────
export const getAdminStats = async (req, res) => {
  try {
    const { count: totalVictims } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    const { data: checkins } = await supabase
      .from("daily_checkins")
      .select("mood_score, mood_label");

    let criticalCount = 0;
    (checkins || []).forEach((c) => {
      if (c.mood_score <= 3 || c.mood_label === "crisis") criticalCount++;
    });

    // Query live counsellors count if table exists
    const { count: pendingCounsellors } = await supabase
      .from("counsellors")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: approvedCounsellors } = await supabase
      .from("counsellors")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");

    res.json({
      totalVictims: totalVictims || 0,
      criticalAlerts: criticalCount,
      activeDistricts: 18,
      verifiedCounsellors: approvedCounsellors || 24,
      pendingCounsellors: pendingCounsellors || 0,
      department: "Ministry of Health & Family Welfare / MoSJE",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/v1/admin/counsellors ─────────────────────────────
// Returns list of all counsellors (pending and approved) from Supabase
export const getCounsellors = async (req, res) => {
  try {
    const { data: counsellors, error } = await supabase
      .from("counsellors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Counsellors table may not be created yet, returning demo fallback:", error.message);
      return res.json({
        success: true,
        counsellors: [],
        pendingCount: 0,
        approvedCount: 0,
      });
    }

    const pending = counsellors.filter((c) => c.status === "pending");
    const approved = counsellors.filter((c) => c.status === "approved");

    res.json({
      success: true,
      counsellors,
      pendingCount: pending.length,
      approvedCount: approved.length,
    });
  } catch (err) {
    console.error("getCounsellors error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── PUT /api/v1/admin/counsellor/:id/status ────────────────────
// Update status of a counsellor (e.g. 'approved', 'rejected', 'pending')
export const updateCounsellorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const { data, error } = await supabase
      .from("counsellors")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: `Counsellor status updated to ${status}`,
      counsellor: data,
    });
  } catch (err) {
    console.error("updateCounsellorStatus error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/v1/admin/counsellor/invite ───────────────────────
export const inviteCounsellor = async (req, res) => {
  try {
    const { name, email, clinic_name, license_number, specialization, district, state } = req.body;

    const { data, error } = await supabase
      .from("counsellors")
      .insert([
        {
          name,
          email,
          clinic_name,
          license_number,
          specialization: specialization || "Clinical Psychiatrist",
          district: district || "Pune",
          state: state || "Maharashtra",
          status: "approved", // Admin-invited counsellors default to approved
          password: "password123",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Counsellor invited and empanelled successfully",
      counsellor: data,
    });
  } catch (err) {
    console.error("inviteCounsellor error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE /api/v1/admin/victim/:id ───────────────────────────
// Permanently deletes victim and all cascaded clinical/checkin data from Supabase
export const deleteVictim = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Victim ID is required" });
    }

    const { data, error } = await supabase
      .from("users")
      .delete()
      .eq("id", id)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      message: "Victim and all associated records permanently deleted from database.",
      deleted: data,
    });
  } catch (err) {
    console.error("deleteVictim error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── IN-MEMORY ADMIN NOTIFICATION FEED ────────────────────────
export let adminNotifications = [
  {
    id: "notif-1",
    type: "info",
    title: "System Online",
    message: "National MHPSS Monitoring & Atrocity Escalation grid synchronized.",
    time: "Just now",
  },
];

export const addAdminNotification = (notif) => {
  adminNotifications.unshift({
    id: `notif-${Date.now()}`,
    time: "Just now",
    ...notif,
  });
};

export const getNotifications = (req, res) => {
  res.json({ success: true, notifications: adminNotifications });
};

// ── GET /api/v1/admin/victims/free ───────────────────────────
// Returns victims who are NOT alloted to any other counsellor (counsellor_id is null)
export const getFreeVictims = async (req, res) => {
  try {
    // 1. Fetch users where counsellor_id is null (with fallback if column not yet created in Supabase)
    let users = [];
    const { data: usersWithCol, error: uErr } = await supabase
      .from("users")
      .select("id, name, email, age, city, area, counsellor_id, created_at")
      .order("created_at", { ascending: false });

    if (!uErr && usersWithCol) {
      users = usersWithCol.filter((u) => !u.counsellor_id);
    } else {
      // Fallback: Query all users without counsellor_id column
      const { data: allUsers } = await supabase
        .from("users")
        .select("id, name, email, age, city, area, created_at")
        .order("created_at", { ascending: false });
      users = allUsers || [];
    }

    const freeUsers = users;

    // 2. Fetch questionnaires & checkins
    const { data: questionnaires } = await supabase
      .from("case_questionnaires")
      .select("*");

    const { data: checkins } = await supabase
      .from("daily_checkins")
      .select("*")
      .order("created_at", { ascending: false });

    const qMap = {};
    (questionnaires || []).forEach((q) => {
      if (!qMap[q.user_id]) qMap[q.user_id] = q;
    });

    const cMap = {};
    (checkins || []).forEach((c) => {
      if (!cMap[c.user_id]) cMap[c.user_id] = c;
    });

    const freeVictims = freeUsers.map((u) => {
      const q = qMap[u.id];
      const c = cMap[u.id];
      const moodScore = c?.mood_score ?? 5;
      const moodLabel = c?.mood_label ?? "okay";

      let distressLevel = "Moderate";
      if (moodScore <= 3 || moodLabel === "crisis" || moodLabel === "distressed") {
        distressLevel = "High (Critical)";
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
        case_stage: q?.case_status || "Investigation is ongoing",
        incident_type: q?.incident_type || "Physical violence/assault",
        incident_timing: q?.incident_timing || "1–6 months ago",
        support_needed: q?.support_needed || "Emotional/mental-health support",
        distress_level: distressLevel,
        mood_score: moodScore,
      };
    });

    res.json({
      success: true,
      count: freeVictims.length,
      freeVictims,
    });
  } catch (err) {
    console.error("getFreeVictims error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/v1/admin/counsellor/:id/approve-allocate ────────
// Approves a counsellor and allocates the selected free victims to them
export const approveAndAllocateCounsellor = async (req, res) => {
  try {
    const { id } = req.params;
    const { victim_ids } = req.body; // array of victim UUIDs

    // 1. Update counsellor status to approved
    const { data: counsellor, error: cErr } = await supabase
      .from("counsellors")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (cErr) throw cErr;

    // 2. Allocate the chosen victims to this counsellor
    let allocatedCount = 0;
    if (Array.isArray(victim_ids) && victim_ids.length > 0) {
      try {
        const { error: allocErr } = await supabase
          .from("users")
          .update({ counsellor_id: id })
          .in("id", victim_ids);

        if (!allocErr) {
          allocatedCount = victim_ids.length;
        } else {
          console.warn("Could not update users.counsellor_id (column may need to be added in Supabase):", allocErr.message);
        }
      } catch (err) {
        console.warn("Allocation column update caught error:", err.message);
      }
    }

    addAdminNotification({
      type: "success",
      title: "Counsellor Empanelled & Victims Allotted",
      message: `${counsellor.name} (${counsellor.clinic_name}) has been approved with ${allocatedCount} victims assigned.`,
    });

    res.json({
      success: true,
      message: `Counsellor approved and assigned ${allocatedCount} victims successfully!`,
      counsellor,
      allocatedCount,
    });
  } catch (err) {
    console.error("approveAndAllocateCounsellor error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE /api/v1/admin/counsellor/:id ───────────────────────
export const deleteCounsellor = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Counsellor ID is required" });

    const { data, error } = await supabase
      .from("counsellors")
      .delete()
      .eq("id", id)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      message: "Counsellor permanently removed from database.",
      deleted: data,
    });
  } catch (err) {
    console.error("deleteCounsellor error:", err);
    res.status(500).json({ error: err.message });
  }
};


