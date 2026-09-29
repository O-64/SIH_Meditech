import dotenv from "dotenv";
dotenv.config();

import supabase from "../config/supabaseConfig.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const signup = async (req, res) => {
  try {
    const { name, email, password, age, city, area } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email and password are required" });
    }

    // check if user already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // auto detect timezone — send this from frontend via req.body
    const timezone = req.body.timezone || "Asia/Kolkata";

    // insert user
    const { data: user, error } = await supabase
      .from("users")
      .insert({
        name,
        email,
        password: hashedPassword,
        age,
        city,
        area,
        timezone,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // sign JWT with supabase UUID
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // don't send password back
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({ token, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const submitQuestionnaire = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      incident_type,
      incident_timing,
      case_status,
      support_needed,
      initial_feeling,
    } = req.body;

    if (!incident_type || !case_status || !initial_feeling) {
      return res.status(400).json({ error: "Please answer the required questions." });
    }

    // Map initial feeling to a baseline mood score and label
    const feelingMap = {
      "Calm / okay": { mood_label: "okay", mood_score: 7 },
      "Slightly stressed": { mood_label: "stressed", mood_score: 5 },
      "Worried or anxious": { mood_label: "anxious", mood_score: 4 },
      "Very distressed": { mood_label: "distressed", mood_score: 2 },
      "I feel unsafe or unable to cope": { mood_label: "crisis", mood_score: 1 },
      "Prefer not to say": { mood_label: "okay", mood_score: 5 },
    };

    const initialMood = feelingMap[initial_feeling] || { mood_label: "okay", mood_score: 5 };

    // 1. Try inserting into case_questionnaires table
    let questionnaireId = null;
    try {
      const { data: qData, error: qError } = await supabase
        .from("case_questionnaires")
        .insert({
          user_id: userId,
          incident_type,
          incident_timing: incident_timing || "Prefer not to say",
          case_status,
          support_needed: support_needed || "I am not sure yet",
          initial_feeling,
        })
        .select()
        .single();

      if (!qError && qData) {
        questionnaireId = qData.id;
        console.log("✓ Saved to case_questionnaires table:", questionnaireId);
      } else {
        console.warn("Notice: case_questionnaires insert note:", qError?.message);
      }
    } catch (tblErr) {
      console.warn("Table case_questionnaires:", tblErr.message);
    }

    // 2. Also initialize/sync baseline daily checkin for today with context
    const today = new Date().toISOString().split("T")[0];
    const rawSummary = `[SAHAYA Initial Case Assessment] Type: ${incident_type} | Timing: ${incident_timing} | Stage: ${case_status} | Support: ${support_needed} | Feeling: ${initial_feeling}`;

    const { data: existingCheckin } = await supabase
      .from("daily_checkins")
      .select("id")
      .eq("user_id", userId)
      .eq("checkin_date", today)
      .maybeSingle();

    if (existingCheckin) {
      await supabase
        .from("daily_checkins")
        .update({
          mood_score: initialMood.mood_score,
          mood_label: initialMood.mood_label,
          raw_message: rawSummary,
        })
        .eq("id", existingCheckin.id);
    } else {
      await supabase.from("daily_checkins").insert({
        user_id: userId,
        checkin_date: today,
        mood_score: initialMood.mood_score,
        mood_label: initialMood.mood_label,
        raw_message: rawSummary,
      });
    }

    res.status(201).json({
      success: true,
      message: "Initial Case Questionnaire recorded successfully",
      questionnaireId,
      initialMood,
      case_stage: case_status,
    });
  } catch (err) {
    console.error("submitQuestionnaire error:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/v1/auth/my-counsellor
export const getMyCounsellor = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check user for counsellor_id
    const { data: user, error: uErr } = await supabase
      .from("users")
      .select("id, name, counsellor_id")
      .eq("id", userId)
      .single();

    if (uErr || !user || !user.counsellor_id) {
      return res.json({ allocated: false, counsellor: null });
    }

    const { data: counsellor, error: cErr } = await supabase
      .from("counsellors")
      .select("id, name, phone, clinic_name, specialization, license_number, qualification")
      .eq("id", user.counsellor_id)
      .single();

    if (cErr || !counsellor) {
      return res.json({ allocated: false, counsellor: null });
    }

    res.json({
      allocated: true,
      counsellor,
    });
  } catch (err) {
    console.error("getMyCounsellor error:", err);
    res.status(500).json({ error: err.message });
  }
};

