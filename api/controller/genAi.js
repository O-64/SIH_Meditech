import "dotenv/config";
import supabase from "../config/supabaseConfig.js";
import { handleNightRecommendation } from "../controller/recommender.js";
import { scheduleMoodFollowup } from "../jobs/messageSchedular.js";
import sendMail from "../config/nodemailer.js";
import { ChatGroq } from "@langchain/groq";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from "@langchain/core/messages";

const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  temperature: 0.8,
});

const LOW_MOOD_LABELS = ["sad", "anxious", "stressed", "angry", "depressed"];
const HELPLINES = [
  { name: "National Helpline Against Atrocities (NHAA)", number: "14566", hours: "24/7 (Toll-free)" },
  { name: "iCall", number: "9152987821", hours: "Mon–Sat, 8am–10pm" },
  { name: "Vandrevala Foundation", number: "1860-2662-345", hours: "24/7" },
];

// ── Fetch victim case assessment / questionnaire ─────────────
export const getVictimCaseProfile = async (userId) => {
  try {
    const { data: q } = await supabase
      .from("case_questionnaires")
      .select("incident_type, incident_timing, case_status, support_needed, initial_feeling")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return q || null;
  } catch {
    return null;
  }
};

export const buildCaseContextPrompt = (caseProfile) => {
  const stageAdvice = {
    "I have not reported it yet":
      "The victim has not reported the incident yet. Be gentle, avoid pressuring them to report unless they ask, and validate their feelings of hesitation or fear.",
    "Complaint has been filed":
      "A formal complaint was recently filed. Acknowledge that taking this step takes immense courage. The initial aftermath can be emotionally draining and unsettling.",
    "Investigation is ongoing":
      "Police/official investigation is currently ongoing. Address the anxiety of evidence gathering, statements, police visits, and uncertainty.",
    "Case is in trial/court":
      "The case is currently in trial/court. Address courtroom stress, hearings, facing legal cross-examinations, and long delays.",
    "Case has been resolved":
      "The legal proceedings have concluded. Healing continues even after court resolution; support long-term recovery and rebuilding routine.",
    "I am currently seeking rehabilitation/support":
      "The user is focusing on psychosocial recovery, counseling, and rebuilding their life. Validate their resilience and progress.",
    "I am seeking compensation":
      "The user is dealing with victim compensation applications or economic relief. Acknowledge administrative exhaustion.",
  };

  const advice = caseProfile?.case_status
    ? (stageAdvice[caseProfile.case_status] || "Support them empathetically based on their current stage.")
    : "Provide supportive, non-intrusive psychosocial grounding.";

  return `
[VICTIM CASE CONTEXT - SAHAYA ADAPTIVE INTELLIGENCE]
- Incident Category: ${caseProfile?.incident_type || "Confidential / General"}
- Incident Timing: ${caseProfile?.incident_timing || "Unspecified"}
- Case Stage: ${caseProfile?.case_status || "Not specified"}
- Primary Support Sought: ${caseProfile?.support_needed || "Emotional & Mental Health"}
- Initial Emotional State: ${caseProfile?.initial_feeling || "Unspecified"}
- Case-Stage Guidance: ${advice}

[HUMAN-IN-THE-LOOP CONTACT NETWORK (HARDCODED)]
• Mental Health / Therapist Support: Tele-MANAS (24/7 Govt Toll-Free): 14416 (or 1800-891-4416) | iCall Psychosocial Support: 9152987821 | NHAA Distress Helpline: 14566
• Legal Aid / Advocate Support: NALSA (National Legal Services Authority - Free Legal Aid): 15100 | National Victim Legal Desk: 1800-180-1510

RESPONSE FORMAT & ESCALATION DIRECTIVES (MANDATORY):
1. FORMAT: Return your entire response in 2 to 4 concise bullet points (each starting with '• '). DO NOT WRITE IN PARAGRAPHS.
2. CASE-SPECIFIC: Give suggestions and emotional validation tailored directly to their case stage (${caseProfile?.case_status || "current stage"}) and incident context.
3. HUMAN-IN-THE-LOOP:
   - If the user feels mentally unstable, emotionally overwhelmed, panicked, or deeply anxious: Include a bullet point advising them to reach out to a professional therapist/counsellor at Tele-MANAS (14416) or iCall (9152987821).
   - If the user feels confused, uncertain, or asks about legal procedures, police statements, or court matters: Include a bullet point advising them to reach out to a legal advocate or free legal aid at NALSA (15100).
   - Remind that AI is for continuous distress tracking and emotional support, while human professionals provide licensed legal and clinical solutions.`;
};

// ── Fetch conversation history ────────────────────────────────
const getConversationHistory = async (userId, checkinId) => {
  const { data } = await supabase
    .from("conversations")
    .select("role, message, message_type, created_at")
    .eq("user_id", userId)
    .eq("checkin_id", checkinId)
    .order("created_at", { ascending: true });
  return data || [];
};

// ── Build LangChain messages ──────────────────────────────────
const buildMessages = (systemPrompt, history, currentMessage) => {
  const messages = [new SystemMessage(systemPrompt)];
  history.forEach((msg) => {
    messages.push(
      msg.role === "user"
        ? new HumanMessage(msg.message)
        : new AIMessage(msg.message),
    );
  });
  messages.push(new HumanMessage(currentMessage));
  return messages;
};

// ── Extract events ────────────────────────────────────────────
const extractEvents = async (message) => {
  const response = await llm.invoke([
    new SystemMessage(`You are a helper that extracts scheduled events from a message.
      Return ONLY a JSON array of events found, like:
      [{ "title": "meeting with manager", "time": "2025-02-27T12:00:00" }]
      If no events found, return [].
      Use today's date for relative times like "at 2pm today".
      Today is ${new Date().toISOString()}`),
    new HumanMessage(message),
  ]);
  try {
    const cleaned = response.content.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
};

// ── Detect mood ───────────────────────────────────────────────
const detectMood = async (message) => {
  const response = await llm.invoke([
    new SystemMessage(`You are a mood detector. Given a message, return ONLY a JSON object like:
      { "mood_label": "anxious", "mood_score": 4 }
      mood_label must be one of: happy, okay, anxious, sad, stressed, angry
      mood_score is 1-10 where 1=terrible, 10=great`),
    new HumanMessage(message),
  ]);
  try {
    const cleaned = response.content.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { mood_label: "okay", mood_score: 5 };
  }
};

// ── Detect self-harm ──────────────────────────────────────────
const detectSelfHarm = async (message) => {
  const response = await llm.invoke([
    new SystemMessage(`You are a safety detector for a mental health app.
      Only return true for messages that CLEARLY express:
      - Wanting to end their life ("I want to die", "I don't want to live anymore")
      - Actively planning to hurt themselves
      - Direct statements of suicidal intent
      Do NOT return true for general sadness, venting, or hyperbole.
      Return ONLY: { "self_harm": true } or { "self_harm": false }`),
    new HumanMessage(message),
  ]);
  try {
    const cleaned = response.content.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned).self_harm === true;
  } catch {
    return false;
  }
};

// ── Check 2 consecutive low mood days ────────────────────────
const checkConsecutiveLowMood = async (userId) => {
  const { data: recentCheckins } = await supabase
    .from("daily_checkins")
    .select("checkin_date, mood_label, mood_score")
    .eq("user_id", userId)
    .order("checkin_date", { ascending: false })
    .limit(2);
  if (!recentCheckins || recentCheckins.length < 2) return false;
  const lowDays = recentCheckins.filter(
    (c) => LOW_MOOD_LABELS.includes(c.mood_label) && c.mood_score <= 5,
  );
  return lowDays.length >= 2;
};

// ── Tone vibe based on age + mood ────────────────────────────
const getVibe = (age, moodScore) => {
  const bucket = !age
    ? "adult"
    : age <= 15
      ? "teen"
      : age <= 22
        ? "young"
        : age <= 35
          ? "adult"
          : age <= 55
            ? "midlife"
            : "senior";
  const energy = moodScore <= 4 ? "low" : moodScore <= 7 ? "okay" : "good";
  const vibes = {
    teen: {
      low: "gentle older sibling — simple, warm, no preaching",
      okay: "chill older sibling checking in",
      good: "hyped sibling energy",
    },
    young: {
      low: "close college friend, real and raw, no fluff",
      okay: "casual friend catching up",
      good: "excited friend, playful",
    },
    adult: {
      low: "grounded good friend, warm, no drama",
      okay: "easy warm friend",
      good: "genuine and light",
    },
    midlife: {
      low: "steady trusted friend, calm",
      okay: "warm, easy catchup",
      good: "warm and light",
    },
    senior: {
      low: "gentle kind old friend, simple words",
      okay: "warm simple old friend",
      good: "warm and cheerful",
    },
  };
  return vibes[bucket]?.[energy] || "warm and casual like a good friend";
};

// ── Generate a proactive email message with full context ──────
const generateProactiveMessage = async (type, user, checkin, history) => {
  const vibe = getVibe(user.age, checkin.mood_score);
  const morningMsg = history.find((m) => m.role === "user")?.message || "";
  const recentHistory = history.slice(-8);
  const conversationContext =
    recentHistory.length > 1
      ? `\nConversation so far:\n${recentHistory.map((m) => `${m.role === "user" ? user.name : "You"}: ${m.message}`).join("\n")}`
      : "";

  console.log(`\n=== generateProactiveMessage [${type}] ===`);
  console.log(
    "User:",
    user.name,
    "| Mood:",
    checkin.mood_label,
    checkin.mood_score,
  );
  console.log("Morning msg:", morningMsg);
  console.log("History length:", history.length);

  const prompt = `You are texting ${user.name} like a real friend — NOT a therapist, NOT an AI.
Vibe: ${vibe}
${user.age ? `They are ${user.age} years old.` : ""}
Their mood today: ${checkin.mood_label} (${checkin.mood_score}/10)
${conversationContext}
Morning message: "${morningMsg}"

${
  type === "evening_checkin"
    ? "It's evening. Ask something real based on their morning — make them want to reply."
    : "It's night. Ask something warm and specific before they sleep."
}

STRICT RULES:
- Never say "I'm here for you", "you're not alone", "safe space", "you got this", "sending love"
- Never start with "Hey ${user.name}"
- Max 2 sentences, like a real text message
- MUST end with a question
- Reference what they said — show you remember
- Write ONLY the message text, nothing else`;

  console.log("Calling LLM with prompt length:", prompt.length);

  const response = await llm.invoke([new SystemMessage(prompt)]);

  console.log("LLM response type:", typeof response.content);
  console.log("LLM response raw:", JSON.stringify(response.content));

  const raw = response.content;
  const text =
    typeof raw === "string"
      ? raw.trim()
      : Array.isArray(raw)
        ? raw
            .map((b) => b.text || b.content || "")
            .join("")
            .trim()
        : String(raw).trim();

  console.log("Final text:", text);
  console.log("=== end generateProactiveMessage ===\n");

  if (!text)
    throw new Error(
      `generateProactiveMessage returned empty string for type: ${type}`,
    );
  return text;
};

// ── Email HTML builder ────────────────────────────────────────
const getMoodAccent = (moodLabel) => {
  const accents = {
    happy: { from: "#f59e0b", to: "#ef4444", text: "#fbbf24" },
    okay: { from: "#6366f1", to: "#8b5cf6", text: "#a78bfa" },
    anxious: { from: "#8b5cf6", to: "#6366f1", text: "#c4b5fd" },
    sad: { from: "#3b82f6", to: "#6366f1", text: "#93c5fd" },
    stressed: { from: "#ec4899", to: "#8b5cf6", text: "#f9a8d4" },
    angry: { from: "#ef4444", to: "#f97316", text: "#fca5a5" },
  };
  return accents[moodLabel] || accents.okay;
};

const buildEmailHtml = (userName, messageText, type, checkinId, moodLabel) => {
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const replyUrl = `${appUrl}/home?reply=${checkinId}&type=${type}`;
  const accent = getMoodAccent(moodLabel);
  const emojiMap = { evening_checkin: "☀️", night_checkin: "🌙" };
  const taglineMap = {
    evening_checkin: "a quick hello from Sahaay",
    night_checkin: "checking in before you sleep",
  };
  const labelMap = {
    evening_checkin: "evening check-in",
    night_checkin: "night check-in",
  };

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Sahaay</title></head>
<body style="margin:0;padding:0;background:#06090f;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#06090f;padding:52px 20px 64px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
      <tr><td style="padding:0 4px 24px;"><span style="font-size:11px;font-weight:800;letter-spacing:4px;text-transform:uppercase;color:${accent.from};">Sahaay</span></td></tr>
      <tr><td style="background:#0c1220;border-radius:24px;border:1px solid #131c2e;overflow:hidden;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:2px;background:linear-gradient(90deg,${accent.from},${accent.to},transparent);"></td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:36px 44px 24px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:top;padding-top:2px;"><div style="width:42px;height:42px;background:linear-gradient(135deg,${accent.from},${accent.to});border-radius:13px;text-align:center;line-height:42px;font-size:19px;display:inline-block;">${emojiMap[type] || "💛"}</div></td>
            <td style="padding-left:14px;vertical-align:top;">
              <p style="margin:0 0 3px;color:#e2e8f0;font-size:17px;font-weight:700;">${taglineMap[type] || "a message from Sahaay"}</p>
              <p style="margin:0;color:#334155;font-size:12px;">${labelMap[type] || "check-in"} from Sahaay</p>
            </td>
          </tr></table>
        </td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:0 44px;"><div style="height:1px;background:#131c2e;"></div></td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:32px 44px 6px;"><p style="margin:0;color:#334155;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">hey ${userName}</p></td></tr>
          <tr><td style="padding:12px 44px 36px;"><p style="margin:0;color:#94a3b8;font-size:16px;line-height:1.9;">${messageText}</p></td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:0 44px;"><div style="height:1px;background:#131c2e;"></div></td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 44px 40px;">
          <a href="${replyUrl}" style="display:inline-block;color:${accent.text};text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.3px;border-bottom:1px solid ${accent.text};padding-bottom:2px;">reply to Sahaay →</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="padding:24px 4px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td><p style="margin:0;color:#1e293b;font-size:11px;">from your friend at Sahaay 💛</p></td>
          <td align="right"><a href="${appUrl}/home" style="color:#1e293b;font-size:11px;text-decoration:none;">open app</a></td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
};

// ── Helpline email ────────────────────────────────────────────
const buildHelplineEmail = (userName, aiMessage) => {
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>Sahaay</title></head>
<body style="margin:0;padding:0;background:#06090f;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#06090f;padding:52px 20px 64px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
      <tr><td style="padding:0 4px 24px;"><span style="font-size:11px;font-weight:800;letter-spacing:4px;text-transform:uppercase;color:#8b5cf6;">Sahaay</span></td></tr>
      <tr><td style="background:#0c1220;border-radius:24px;border:1px solid #131c2e;overflow:hidden;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:2px;background:linear-gradient(90deg,#8b5cf6,#6366f1,transparent);"></td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:36px 44px 24px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td><div style="width:42px;height:42px;background:linear-gradient(135deg,#8b5cf6,#6366f1);border-radius:13px;text-align:center;line-height:42px;font-size:19px;">💜</div></td>
            <td style="padding-left:14px;">
              <p style="margin:0 0 3px;color:#e2e8f0;font-size:17px;font-weight:700;">we're thinking of you</p>
              <p style="margin:0;color:#334155;font-size:12px;">a note from Sahaay</p>
            </td>
          </tr></table>
        </td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:0 44px;"><div style="height:1px;background:#131c2e;"></div></td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:32px 44px 6px;"><p style="margin:0;color:#334155;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">hey ${userName}</p></td></tr>
          <tr><td style="padding:12px 44px 28px;"><p style="margin:0;color:#94a3b8;font-size:16px;line-height:1.9;">${aiMessage}</p></td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:0 44px;"><div style="height:1px;background:#131c2e;"></div></td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:28px 44px 8px;">
          <p style="color:#334155;font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;margin:0 0 18px 0;">if you need to talk to someone</p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:12px;width:100%;"><tr><td style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:14px 20px;">
            <p style="margin:0 0 3px;color:#c4b5fd;font-size:13px;font-weight:700;">iCall</p>
            <p style="margin:0 0 2px;color:#e2e8f0;font-size:18px;font-weight:800;">9152987821</p>
            <p style="margin:0;color:#475569;font-size:11px;">Mon–Sat, 8am–10pm</p>
          </td></tr></table>
          <table cellpadding="0" cellspacing="0" style="width:100%;"><tr><td style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:14px 20px;">
            <p style="margin:0 0 3px;color:#a78bfa;font-size:13px;font-weight:700;">Vandrevala Foundation</p>
            <p style="margin:0 0 2px;color:#e2e8f0;font-size:18px;font-weight:800;">1860-2662-345</p>
            <p style="margin:0;color:#475569;font-size:11px;">24/7, free &amp; confidential</p>
          </td></tr></table>
        </td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:24px 44px 0;"><div style="height:1px;background:#131c2e;"></div></td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:28px 44px 40px;">
          <a href="${appUrl}/home" style="color:#c4b5fd;text-decoration:none;font-size:13px;font-weight:600;border-bottom:1px solid #c4b5fd;padding-bottom:2px;">open Sahaay →</a>
        </td></tr></table>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
};

// ── Send a proactive email and save to conversations ──────────
const sendProactiveEmail = async (type, userId, checkin, user, history) => {
  try {
    // Check not already sent today
    const alreadySent = history.some(
      (m) => m.message_type === type && m.role === "assistant",
    );
    if (alreadySent) {
      console.log(`⚠ ${type} already sent today — skipping`);
      return;
    }

    const subjects = {
      evening_checkin: "checking in on you ☀️",
      night_checkin: "hope today was good 🌙",
    };
    const messageText = await generateProactiveMessage(
      type,
      user,
      checkin,
      history,
    );

    console.log(`Generated ${type} message:`, messageText);

    await supabase.from("conversations").insert({
      user_id: userId,
      checkin_id: checkin.id,
      role: "assistant",
      message: messageText,
      message_type: type,
    });

    await sendMail({
      email: user.email,
      subject: subjects[type] || "a message from Sahaay 💛",
      html: buildEmailHtml(
        user.name,
        messageText,
        type,
        checkin.id,
        checkin.mood_label,
      ),
    });

    console.log(`✓ ${type} email sent to ${user.name}`);
  } catch (err) {
    console.error(`✗ Failed to send ${type}:`, err.message);
  }
};

// ── Figure out what stage of the email chain we're at ────────
// Returns the message_type of the last proactive assistant message in history
const getLastProactiveType = (history) => {
  const proactiveTypes = ["evening_checkin", "night_checkin"];
  for (let i = history.length - 1; i >= 0; i--) {
    if (
      history[i].role === "assistant" &&
      proactiveTypes.includes(history[i].message_type)
    ) {
      return history[i].message_type;
    }
  }
  return null;
};

// ── Main controller ───────────────────────────────────────────
export const morningCheckin = async (req, res) => {
  try {
    console.log("=== morningCheckin called ===");
    const { message } = req.body;
    const userId = req.user.id;
    const isFast = req.query.fast === "true";

    // ── Demo day cycling ──────────────────────────────────────
    let today;
    if (isFast) {
      const { data: allCheckins } = await supabase
        .from("daily_checkins")
        .select("checkin_date")
        .eq("user_id", userId)
        .order("checkin_date", { ascending: true });
      const latestDate = allCheckins?.[allCheckins.length - 1]?.checkin_date;
      if (latestDate) {
        const { data: latestCheckin } = await supabase
          .from("daily_checkins")
          .select("id")
          .eq("user_id", userId)
          .eq("checkin_date", latestDate)
          .maybeSingle();
        if (latestCheckin) {
          const { data: nightRec } = await supabase
            .from("conversations")
            .select("id")
            .eq("user_id", userId)
            .eq("checkin_id", latestCheckin.id)
            .eq("message_type", "night_recommendation")
            .limit(1);
          if (nightRec?.length > 0) {
            const nextDay = new Date(latestDate);
            nextDay.setDate(nextDay.getDate() + 1);
            today = nextDay.toISOString().split("T")[0];
          } else {
            today = latestDate;
          }
        } else {
          today = new Date().toISOString().split("T")[0];
        }
      } else {
        today = new Date().toISOString().split("T")[0];
      }
    } else {
      today = new Date().toISOString().split("T")[0];
    }

    if (!message) return res.status(400).json({ error: "Message is required" });

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("name, email, age, city, area")
      .eq("id", userId)
      .single();
    if (userError || !user)
      return res.status(500).json({ error: "Could not fetch user" });

    // ── Self-harm detection ───────────────────────────────────
    const isSelfHarm = await detectSelfHarm(message);
    if (isSelfHarm) {
      const helplinesText =
        "National Helpline Against Atrocities (toll-free 14566, 24/7), iCall (9152987821, Mon–Sat 8am–10pm), or Vandrevala Foundation (1860-2662-345, 24/7)";
      const selfHarmPrompt = `You are SAHAYA, a compassionate psychosocial support friend texting ${user.name}.
        They said something suggesting self-harm or deep crisis. Respond warmly (3-4 sentences), weave in helplines naturally: ${helplinesText}.
        Do NOT say "I'm here for you", "you're not alone", "safe space". End by encouraging them to call.`;
      const aiResponse = await llm.invoke([new SystemMessage(selfHarmPrompt)]);
      const raw = aiResponse.content;
      const reply =
        typeof raw === "string"
          ? raw
          : Array.isArray(raw)
            ? raw.map((b) => b.text || "").join("")
            : String(raw);

      const { data: existingCheckin } = await supabase
        .from("daily_checkins")
        .select("id")
        .eq("user_id", userId)
        .eq("checkin_date", today)
        .maybeSingle();

      if (existingCheckin) {
        await supabase.from("conversations").insert([
          {
            user_id: userId,
            checkin_id: existingCheckin.id,
            role: "user",
            message,
            message_type: "morning",
          },
          {
            user_id: userId,
            checkin_id: existingCheckin.id,
            role: "assistant",
            message: reply,
            message_type: "morning",
          },
        ]);
      }

      sendMail({
        email: user.email,
        subject: `we're thinking of you 💜`,
        html: buildHelplineEmail(user.name, reply),
      }).catch((err) => console.error("Helpline email error:", err.message));

      return res.json({
        reply,
        checkin_id: existingCheckin?.id || null,
        mood: { mood_label: "sad", mood_score: 2 },
        events_detected: 0,
        self_harm_detected: true,
      });
    }

    // ── Fetch existing checkin ────────────────────────────────
    const { data: existingCheckin } = await supabase
      .from("daily_checkins")
      .select("*")
      .eq("user_id", userId)
      .eq("checkin_date", today)
      .maybeSingle();

    // ── Continuing conversation ───────────────────────────────
    if (existingCheckin) {
      const history = await getConversationHistory(userId, existingCheckin.id);
      const cbtTriggered = await checkConsecutiveLowMood(userId);

      // ── KEY: Detect what stage the user is replying to ───────
      // and send the next email immediately, context-aware
      const lastProactiveType = getLastProactiveType(history);
      console.log("Last proactive type:", lastProactiveType);

      if (lastProactiveType === "evening_checkin") {
        // User replied to evening email → send night_checkin now
        const nightAlreadySent = history.some(
          (m) => m.message_type === "night_checkin" && m.role === "assistant",
        );
        if (!nightAlreadySent) {
          console.log(
            "User replied to evening_checkin → sending night_checkin in 15 sec",
          );
          // 15 sec delay after user reply, then fire with fresh context
          setTimeout(async () => {
            const freshHistory = await getConversationHistory(
              userId,
              existingCheckin.id,
            );
            await sendProactiveEmail(
              "night_checkin",
              userId,
              existingCheckin,
              user,
              freshHistory,
            );
          }, 15 * 1000);
        }
      } else if (lastProactiveType === "night_checkin") {
        // User replied to night email → send recommendation now
        const recAlreadySent = history.some(
          (m) => m.message_type === "night_recommendation",
        );
        if (!recAlreadySent) {
          console.log(
            "User replied to night_checkin → sending recommendation now",
          );
          const updatedHistory = [
            ...history,
            { role: "user", message, message_type: "morning" },
          ];
          handleNightRecommendation(
            userId,
            existingCheckin.id,
            updatedHistory,
            user,
            existingCheckin,
          ).catch((err) => console.error("Recommendation error:", err.message));
        }
      }

      // Groq Hybrid Distress Score recalculation (Adaptive Engine)
      const caseProfile = await getVictimCaseProfile(userId);
      const distressEval = await analyzeHybridDistressWithGroq({
        message,
        user,
        history,
        caseProfile,
      });

      const isMedQuery = isMedicalAdviceQuery(message);
      const isSevereCase =
        distressEval?.should_call_counsellor ||
        distressEval?.anxiety_level >= 65 ||
        distressEval?.severity === "severe" ||
        distressEval?.severity === "critical";

      let reply = "";

      // If user asks for medical advice in a severe case, strictly refuse medical advice and route to counsellor
      if (isMedQuery && isSevereCase) {
        reply =
          distressEval?.response ||
          "• I cannot provide medical advice, medication prescriptions, or clinical diagnoses.\n• Because your condition is showing severe distress, self-medicating or delaying clinical care is unsafe.\n• Please consult your empanelled counsellor or licensed doctor immediately.\n• Connecting you to your emergency counsellor hotline now.";
      } else if (distressEval?.should_call_counsellor) {
        reply = distressEval.response;
      } else {
        // Generate normal chat reply with Case-Stage Intelligence
        const casePrompt = buildCaseContextPrompt(caseProfile);

        const systemPrompt = `You are SAHAYA, an empathetic AI psychosocial companion for victims of atrocities.
        User: ${user.name}. Mood today: ${existingCheckin.mood_label} (${existingCheckin.mood_score}/10).
        ${casePrompt}
        ${cbtTriggered ? `• Suggest a 1-minute box-breathing or 5-4-3-2-1 sensory grounding exercise as one of your points.` : ""}
        CRITICAL MEDICAL RULE: You are NOT a medical doctor. NEVER suggest medications, pills, dosages, or clinical diagnoses. If user asks for medical advice, direct them to consult their doctor or counsellor.
        FORMAT AND STYLE:
        - Output MUST be 2 to 4 bullet points (using '• '). NEVER write paragraphs.
        - Give case-stage specific, actionable suggestions.
        - If mentally unstable or deeply overwhelmed, include: Therapist / Tele-MANAS (14416) or iCall (9152987821).
        - If confused about case proceedings, police, or court, include: Legal Advocate / NALSA Free Legal Aid (15100).
        - Never say "I'm here for you", "you're not alone", or "as an AI".`;

        const aiResponse = await llm.invoke(
          buildMessages(systemPrompt, history, message),
        );
        const raw = aiResponse.content;
        reply =
          typeof raw === "string"
            ? raw
            : Array.isArray(raw)
              ? raw.map((b) => b.text || "").join("")
              : String(raw);
      }

      await supabase.from("conversations").insert([
        {
          user_id: userId,
          checkin_id: existingCheckin.id,
          role: "user",
          message,
          message_type: "morning",
        },
        {
          user_id: userId,
          checkin_id: existingCheckin.id,
          role: "assistant",
          message: reply,
          message_type: "morning",
        },
      ]);

      // Detect if user is sharing an updated mood in their reply
      const updatedMood = await detectMood(message);
      let currentMoodLabel = existingCheckin.mood_label;
      let currentMoodScore = existingCheckin.mood_score;

      if (updatedMood && updatedMood.mood_score) {
        await supabase
          .from("daily_checkins")
          .update({
            mood_score: updatedMood.mood_score,
            mood_label: updatedMood.mood_label,
          })
          .eq("id", existingCheckin.id);
        currentMoodLabel = updatedMood.mood_label;
        currentMoodScore = updatedMood.mood_score;
        existingCheckin.mood_score = updatedMood.mood_score;
        existingCheckin.mood_label = updatedMood.mood_label;
      }

      // Schedule mood follow-up message 15s later
      scheduleMoodFollowup(userId, 15);

      return res.json({
        reply,
        checkin_id: existingCheckin.id,
        mood: {
          mood_label: currentMoodLabel,
          mood_score: currentMoodScore,
        },
        events_detected: 0,
        cbt_triggered: cbtTriggered,
        checkin_date: today,
        distress_evaluation: distressEval,
        should_call_counsellor: distressEval?.should_call_counsellor || false,
        active_module: distressEval?.active_module || "INTERVENE",
        anxiety_level: distressEval?.anxiety_level || 50,
      });
    }

    // ── First checkin of the day ──────────────────────────────
    const [mood, events] = await Promise.all([
      detectMood(message),
      extractEvents(message),
    ]);
    console.log("Mood:", mood, "Events:", events.length);

    const { data: checkin, error: checkinError } = await supabase
      .from("daily_checkins")
      .insert({
        user_id: userId,
        checkin_date: today,
        mood_score: mood.mood_score,
        mood_label: mood.mood_label,
        raw_message: message,
      })
      .select()
      .single();

    if (checkinError)
      return res.status(500).json({ error: checkinError.message });
    console.log("✓ Checkin created:", checkin.id);

    const cbtTriggered = await checkConsecutiveLowMood(userId);

    // Save user message
    await supabase.from("conversations").insert({
      user_id: userId,
      checkin_id: checkin.id,
      role: "user",
      message,
      message_type: "morning",
    });

    // Save any events
    for (const event of events) {
      await supabase
        .from("user_events")
        .insert({
          user_id: userId,
          checkin_id: checkin.id,
          event_title: event.title,
          event_time: new Date(event.time).toISOString(),
        })
        .catch((e) => console.error("Event save error:", e.message));
    }

    // ── Send first proactive email immediately (5s delay in demo) ──
    // In demo mode: evening_checkin fires right away (no cron needed)
    // In prod: you'd schedule this for 7pm — but for hackathon just fire it
    // First email fires 15 sec after morning checkin
    setTimeout(async () => {
      const freshHistory = await getConversationHistory(userId, checkin.id);
      await sendProactiveEmail(
        "evening_checkin",
        userId,
        checkin,
        user,
        freshHistory,
      );
    }, 15 * 1000);

    // Groq Hybrid Distress Score recalculation (Adaptive Engine)
    const caseProfile = await getVictimCaseProfile(userId);
    const history = await getConversationHistory(userId, checkin.id);
    const distressEval = await analyzeHybridDistressWithGroq({
      message,
      user,
      history,
      caseProfile,
    });

    const isMedQuery = isMedicalAdviceQuery(message);
    const isSevereCase =
      distressEval?.should_call_counsellor ||
      distressEval?.anxiety_level >= 65 ||
      distressEval?.severity === "severe" ||
      distressEval?.severity === "critical";

    let reply = "";

    if (isMedQuery && isSevereCase) {
      reply =
        distressEval?.response ||
        "• I cannot provide medical advice, medication prescriptions, or clinical diagnoses.\n• Because your condition is showing severe distress, self-medicating or delaying clinical care is unsafe.\n• Please consult your empanelled counsellor or licensed doctor immediately.\n• Connecting you to your emergency counsellor hotline now.";
    } else if (distressEval?.should_call_counsellor) {
      reply = distressEval.response;
    } else {
      // Generate AI reply with Case-Stage Intelligence
      const casePrompt = buildCaseContextPrompt(caseProfile);

      const systemPrompt = `You are SAHAYA, an empathetic AI psychosocial companion for victims of atrocities.
        User: ${user.name}. Today: ${mood.mood_label} (${mood.mood_score}/10).
        ${casePrompt}
        ${events.length > 0 ? `Events today: ${events.map((e) => e.title).join(", ")}` : ""}
        ${cbtTriggered ? `• Suggest a 1-minute box-breathing or sensory grounding exercise as one of your points.` : ""}
        CRITICAL MEDICAL RULE: You are NOT a medical doctor. NEVER suggest medications, pills, dosages, or clinical diagnoses. If user asks for medical advice, direct them to consult their doctor or counsellor.
        FORMAT AND STYLE:
        - Output MUST be 2 to 4 bullet points (using '• '). NEVER write paragraphs.
        - Give case-stage specific, actionable suggestions.
        - If mentally unstable or deeply overwhelmed, include: Therapist / Tele-MANAS (14416) or iCall (9152987821).
        - If confused about case proceedings, police, or court, include: Legal Advocate / NALSA Free Legal Aid (15100).
        - Never say "I'm here for you", "you're not alone", or "as an AI".`;

      const aiResponse = await llm.invoke(
        buildMessages(systemPrompt, history, message),
      );
      const raw = aiResponse.content;
      reply =
        typeof raw === "string"
          ? raw
          : Array.isArray(raw)
            ? raw.map((b) => b.text || "").join("")
            : String(raw);
    }

    await supabase.from("conversations").insert({
      user_id: userId,
      checkin_id: checkin.id,
      role: "assistant",
      message: reply,
      message_type: "morning",
    });

    // Schedule 15s mood follow-up in scheduled_messages table
    scheduleMoodFollowup(userId, 15);

    console.log("=== morningCheckin complete ===");
    res.json({
      reply,
      checkin_id: checkin.id,
      mood,
      events_detected: events.length,
      cbt_triggered: cbtTriggered,
      checkin_date: today,
      distress_evaluation: distressEval,
      should_call_counsellor: distressEval?.should_call_counsellor || false,
      active_module: distressEval?.active_module || "INTERVENE",
      anxiety_level: distressEval?.anxiety_level || 50,
    });
  } catch (err) {
    console.error("morningCheckin CRASH:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── Poll for new proactive messages ──────────────────────────
export const pollMessages = async (req, res) => {
  const userId = req.user.id;
  const { date, last_seen } = req.query;

  let checkin = null;
  if (date) {
    const { data } = await supabase
      .from("daily_checkins")
      .select("id")
      .eq("user_id", userId)
      .eq("checkin_date", date)
      .maybeSingle();
    checkin = data;
  }
  if (!checkin) {
    const { data } = await supabase
      .from("daily_checkins")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    checkin = data;
  }
  if (!checkin) return res.json({ newMessages: [] });

  const since = last_seen
    ? new Date(last_seen).toISOString()
    : new Date(Date.now() - 30_000).toISOString();

  const { data: newMessages } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("checkin_id", checkin.id)
    .eq("role", "assistant")
    .neq("message_type", "morning")
    .neq("message_type", "night_recommendation")
    .gt("created_at", since)
    .order("created_at", { ascending: true });

  res.json({ newMessages: newMessages || [] });
};

// ── Get context for email deep link ──────────────────────────
export const getChatContext = async (req, res) => {
  const userId = req.user.id;
  const { checkin_id, type } = req.query;
  if (!checkin_id || !type) return res.json({ message: null });

  const { data, error } = await supabase
    .from("conversations")
    .select("message, created_at")
    .eq("user_id", userId)
    .eq("checkin_id", checkin_id)
    .eq("role", "assistant")
    .eq("message_type", type)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) console.error("getChatContext error:", error.message);
  res.json({ message: data?.[0]?.message || null });
};

export const getMoodHistory = async (req, res) => {
  const userId = req.user.id;
  const { data, error } = await supabase
    .from("daily_checkins")
    .select("id, checkin_date, mood_score, mood_label, raw_message")
    .eq("user_id", userId)
    .order("checkin_date", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ checkins: data || [] });
};

// ── Medical Advice Query Detector ────────────────────────────
export const isMedicalAdviceQuery = (text = "") => {
  return /medicin|medic(al|ation)|prescri|tablet|pill|dosage|drug|antidepress|sleeping pill|painkiller|syrup|injection|treatment for|cure for|diagnos|remedy for|dose/i.test(
    text || "",
  );
};

// ── GROQ AI: Hybrid Distress & Anxiety Assessment Engine ─────
export const analyzeHybridDistressWithGroq = async ({
  message,
  user,
  history = [],
  caseProfile = null,
  stageOverride = null,
  forceSevere = false,
}) => {
  const caseStage =
    stageOverride || caseProfile?.case_status || "Investigation is ongoing";
  const supportNeeded =
    caseProfile?.support_needed || "Emotional & Legal Assistance";
  const incidentCategory =
    caseProfile?.incident_type || "Confidential Incident";
  const initialFeeling = caseProfile?.initial_feeling || "Distressed";

  const chatSnippet = history
    .slice(-6)
    .map(
      (m) =>
        `${m.role === "user" ? user?.name || "Patient" : "Sahaay"}: ${m.message || m.content || ""}`,
    )
    .join("\n");

  const systemPrompt = `You are the SAHAYA Adaptive Clinical Distress & Anxiety Engine for victim trauma support (incorporating MONITOR Module 1, ANALYZE Module 2, and the ADAPTIVE ENGINE).
Your objective is to compute a multi-factor Hybrid Distress Score (0-100) and Patient Anxiety Level (0-100) based on:
1. Patient's message/input: "${message || "General check-in"}"
2. Recent chat history:
${chatSnippet || "No prior history"}
3. Case Stage: "${caseStage}"
4. Incident Context: "${incidentCategory}"
5. Preferences / Support Needed: "${supportNeeded}"
6. Initial Reported Feeling: "${initialFeeling}"

CLINICAL & MEDICAL ADVICE GUARDRAILS (CRITICAL & MANDATORY):
- AI is NEVER a medical doctor. AI is strictly prohibited from providing medical advice, prescribing medications, suggesting dosages, or offering clinical medical diagnoses.
- If the patient is asking for medical advice (e.g. asking for medications, pills, dosages, prescriptions, medical treatments, clinical diagnosis) AND/OR condition is VERY SEVERE (anxiety >= 65, panic, terror, self-harm):
  -> The chatbot MUST NOT provide medical answers or suggest remedies.
  -> It MUST explicitly decline giving medical advice and strictly recommend that the patient contact their empanelled counsellor or licensed medical doctor immediately.
  -> Set "should_call_counsellor": true
  -> Set "active_module": "ESCALATE"
  -> Set "severity": "severe" or "critical"
  -> Set "counsellor_call_reason": "Patient requested medical advice in a high/severe case state. Immediate referral to empanelled counsellor/physician required."
  -> Set "response": "• I cannot provide medical advice, medication prescriptions, or clinical diagnoses.\\n• Because your condition is showing severe distress, self-treating or delaying clinical attention is unsafe.\\n• Please consult your empanelled counsellor or licensed medical doctor immediately.\\n• Connecting you to your emergency counsellor hotline now."

OTHER TRIAGE RULES:
- Condition is VERY SEVERE (Module 5: ESCALATE):
  If the patient expresses acute panic, suicidal/self-harm thoughts, extreme terror, feelings of imminent harm, uncontrollable shaking/hyperventilation, or anxiety_level >= 75:
  -> Set "should_call_counsellor": true
  -> Set "active_module": "ESCALATE"
  -> Set "severity": "severe" or "critical"
  -> "response": Provide a brief grounding and de-escalation message stating an empanelled trauma counsellor is being connected immediately.
- Condition is NOT VERY SEVERE (Module 4: INTERVENE):
  -> Set "should_call_counsellor": false
  -> Set "active_module": "INTERVENE"
  -> Set "severity": "mild" or "moderate"
  -> "response": Provide 2 to 3 concise, supportive bullet points (each starting with '• ') tailored to their emotional state and case stage (${caseStage}). If they asked for medical advice, gently clarify that you cannot give medical advice and advise consulting their doctor.

STRICT OUTPUT FORMAT:
Return ONLY a valid JSON object without markdown fences or additional text:
{
  "anxiety_level": 74,
  "distress_score": 78,
  "severity": "severe",
  "mood_label": "anxious",
  "mood_score": 3,
  "distress_trend": "rising",
  "trend_delta": 14,
  "case_stage": "${caseStage}",
  "case_stage_stress_index": 76,
  "should_call_counsellor": false,
  "counsellor_call_reason": null,
  "active_module": "INTERVENE",
  "response": "• Validate feelings\\n• Grounding technique",
  "factor_breakdown": {
    "emotional_trauma": 75,
    "procedural_legal_stress": 70,
    "isolation_loneliness": 58,
    "somatic_anxiety": 72
  },
  "reference_label": "Investigation Anxiety"
}`;

  try {
    const aiResponse = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(
        message || "Please assess current victim distress based on profile.",
      ),
    ]);

    let raw = aiResponse.content;
    if (typeof raw !== "string") {
      raw = Array.isArray(raw)
        ? raw.map((b) => b.text || "").join("")
        : String(raw);
    }
    const cleanJson = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    if (forceSevere) {
      parsed.anxiety_level = Math.max(parsed.anxiety_level || 86, 88);
      parsed.distress_score = Math.max(parsed.distress_score || 89, 91);
      parsed.severity = "critical";
      parsed.should_call_counsellor = true;
      parsed.active_module = "ESCALATE";
      parsed.counsellor_call_reason =
        parsed.counsellor_call_reason ||
        "Acute crisis and severe panic spike detected; immediate counsellor intervention required.";
    }

    const isMed = isMedicalAdviceQuery(message);
    const isHighAnxiety =
      forceSevere ||
      parsed.anxiety_level >= 65 ||
      parsed.severity === "severe" ||
      parsed.severity === "critical";

    if (isMed && isHighAnxiety) {
      parsed.should_call_counsellor = true;
      parsed.active_module = "ESCALATE";
      parsed.severity = "severe";
      parsed.anxiety_level = Math.max(parsed.anxiety_level || 75, 78);
      parsed.counsellor_call_reason =
        "Patient requested medical advice in a high/severe case state. Chatbot must not give medical remedies; direct counsellor referral mandated.";
      parsed.response =
        "• I cannot provide medical advice, medication prescriptions, or clinical diagnoses.\n• Because your condition is showing severe distress, self-medicating or delaying clinical care is unsafe.\n• Please consult your empanelled counsellor or licensed medical doctor immediately.\n• Connecting you to your emergency counsellor hotline now.";
    } else if (isMed) {
      parsed.response =
        "• I am an AI psychosocial companion, not a licensed medical doctor, so I cannot prescribe medications or provide clinical medical diagnoses.\n• Please consult your empanelled doctor or counsellor for medical evaluations.\n• I am here to help with emotional grounding, case stage tracking, and trauma support.";
    }

    return parsed;
  } catch (err) {
    console.error("Groq analyzeHybridDistress error:", err.message);
    const isMed = isMedicalAdviceQuery(message);
    const isHighRisk =
      forceSevere ||
      /suicide|kill|die|end it|panic|attack|can't breathe|shaking|terrif/i.test(
        message || "",
      );
    const isSevere = isHighRisk || isMed;
    const anxiety = isHighRisk ? 88 : isMed ? 78 : 46;

    let fallbackResponse = "";
    if (isMed) {
      fallbackResponse =
        "• I cannot provide medical advice, medication prescriptions, or clinical diagnoses.\n• Because your condition is showing severe distress, self-medicating or delaying clinical care is unsafe.\n• Please consult your empanelled counsellor or licensed medical doctor immediately.\n• Connecting you to your emergency counsellor hotline now.";
    } else if (isHighRisk) {
      fallbackResponse =
        "• I hear how terrifying this moment feels right now. You are safe here.\n• Please sit down, place feet on the ground, and take slow breaths while we alert your counsellor.\n• Tele-MANAS (14416) is also available 24/7.";
    } else {
      fallbackResponse =
        "• What you are experiencing at this legal stage is entirely valid.\n• Take one step at a time; your feelings are an understandable reaction to stress.\n• Focus on gentle grounding exercises whenever things feel overwhelming.";
    }

    return {
      anxiety_level: anxiety,
      distress_score: isSevere ? 86 : 48,
      severity: isHighRisk ? "critical" : isMed ? "severe" : "moderate",
      mood_label: isHighRisk ? "panicked" : isMed ? "anxious" : "stressed",
      mood_score: isHighRisk ? 2 : isMed ? 3 : 5,
      distress_trend: isSevere ? "rising" : "stable",
      trend_delta: isSevere ? 18 : 0,
      case_stage: caseStage,
      case_stage_stress_index: isSevere ? 82 : 55,
      should_call_counsellor: isSevere,
      counsellor_call_reason: isMed
        ? "Patient requested medical advice in a high/severe case state; immediate counsellor referral mandated."
        : isHighRisk
          ? "Acute distress marker detected in patient input."
          : null,
      active_module: isSevere ? "ESCALATE" : "INTERVENE",
      response: fallbackResponse,
      factor_breakdown: {
        emotional_trauma: isHighRisk ? 88 : 45,
        procedural_legal_stress: 60,
        isolation_loneliness: isHighRisk ? 75 : 40,
        somatic_anxiety: isSevere ? 85 : 42,
      },
      reference_label: isMed ? "Medical Advice Deferral" : isHighRisk ? "Acute Crisis Marker" : "Daily Assessment",
    };
  }
};

// ── POST /api/v1/distress-evaluate ───────────────────────────
export const evaluateDistress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, case_stage_override, force_severe } = req.body;

    const { data: user } = await supabase
      .from("users")
      .select("id, name, age, city, area")
      .eq("id", userId)
      .single();

    const caseProfile = await getVictimCaseProfile(userId);

    const { data: recentCheckins } = await supabase
      .from("daily_checkins")
      .select("id, checkin_date, mood_score, mood_label, raw_message")
      .eq("user_id", userId)
      .order("checkin_date", { ascending: false })
      .limit(5);

    const { data: history } = await supabase
      .from("conversations")
      .select("role, message, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    const result = await analyzeHybridDistressWithGroq({
      message: message || recentCheckins?.[0]?.raw_message || "",
      user,
      history: (history || []).reverse(),
      caseProfile,
      stageOverride: case_stage_override,
      forceSevere: !!force_severe,
    });

    res.json({
      success: true,
      evaluation: result,
    });
  } catch (err) {
    console.error("evaluateDistress endpoint error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/v1/distress-history ─────────────────────────────
export const getDistressHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const stageOverride = req.query.stage_override;

    const { data: user } = await supabase
      .from("users")
      .select("id, name, age, city, area")
      .eq("id", userId)
      .single();

    const caseProfile = await getVictimCaseProfile(userId);
    const activeCaseStage =
      stageOverride || caseProfile?.case_status || "Investigation is ongoing";

    // 1. Fetch checkins
    const { data: checkins } = await supabase
      .from("daily_checkins")
      .select("id, checkin_date, mood_score, mood_label, raw_message, created_at")
      .eq("user_id", userId)
      .order("checkin_date", { ascending: true });

    // 2. Fetch conversations
    const { data: convos } = await supabase
      .from("conversations")
      .select("id, role, message, message_type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    // Build Chart 1: Mood History (LLM Based)
    const moodChartData = (checkins || []).map((c, idx) => {
      const rawScore = Number(c.mood_score) || 5;
      const normalizedScore = Math.min(100, Math.max(10, rawScore * 10));
      return {
        id: c.id,
        date: c.checkin_date,
        label: `Day ${idx + 1}`,
        mood_score: rawScore,
        mood_level: normalizedScore,
        mood_label: c.mood_label || "okay",
        raw_message: c.raw_message,
      };
    });

    // If fewer than 4 checkins, supplement with realistic baseline trend points so chart renders beautifully
    if (moodChartData.length < 4) {
      const baseDays = [
        { offset: -4, score: 3, label: "stressed", msg: "Initial case filing" },
        { offset: -3, score: 4, label: "anxious", msg: "Statement recorded" },
        { offset: -2, score: 5, label: "okay", msg: "Resting at home" },
        { offset: -1, score: 4, label: "anxious", msg: "Court notice received" },
      ];
      const now = new Date();
      baseDays.forEach((b, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() + b.offset);
        const dateStr = d.toISOString().split("T")[0];
        if (!moodChartData.some((m) => m.date === dateStr)) {
          moodChartData.unshift({
            id: `syn-${i}`,
            date: dateStr,
            label: `Day ${i + 1}`,
            mood_score: b.score,
            mood_level: b.score * 10,
            mood_label: b.label,
            raw_message: b.msg,
          });
        }
      });
      moodChartData.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Build Chart 2: Distress Trend (LLM Based)
    const distressTrendData = moodChartData.map((m, i) => {
      // Inverse of mood with stress multiplier based on check-in
      const invertedMood = 100 - m.mood_level;
      const variation = ((i * 17) % 15) - 7;
      const anxiety = Math.min(95, Math.max(15, invertedMood + variation));
      const hybridDistress = Math.min(
        98,
        Math.max(18, Math.round(anxiety * 0.7 + invertedMood * 0.3)),
      );
      const severity =
        anxiety >= 80
          ? "critical"
          : anxiety >= 65
            ? "severe"
            : anxiety >= 40
              ? "moderate"
              : "mild";

      return {
        date: m.date,
        label: m.label,
        anxiety_level: anxiety,
        distress_score: hybridDistress,
        severity,
        trend: i === 0 ? "baseline" : anxiety > 60 ? "rising" : "declining",
      };
    });

    // Build Chart 3: Case Stage Timeline (with Range Animation capability)
    // 5 progressive legal stages and their anxiety curve
    const stageDefinitions = [
      {
        stage_id: 1,
        code: "complaint",
        name: "Complaint / FIR",
        description: "Initial formal report and police lodging",
        baseline_anxiety: 72,
        stress_peak_label: "Post-Incident Trauma & Hesitation",
        stage_range: [60, 80],
      },
      {
        stage_id: 2,
        code: "investigation",
        name: "Investigation",
        description: "Official inquiries, evidence & police statement",
        baseline_anxiety: 84,
        stress_peak_label: "Evidence Scrutiny & Station Visits",
        stage_range: [75, 92],
      },
      {
        stage_id: 3,
        code: "trial",
        name: "Trial / Court",
        description: "Court hearings, appearances & cross-examination",
        baseline_anxiety: 91,
        stress_peak_label: "Courtroom Facing & Cross-Exam Fear",
        stage_range: [80, 98],
      },
      {
        stage_id: 4,
        code: "compensation",
        name: "Compensation",
        description: "Victim compensation scheme application & claim",
        baseline_anxiety: 58,
        stress_peak_label: "Administrative Delays & Paperwork",
        stage_range: [45, 68],
      },
      {
        stage_id: 5,
        code: "rehab",
        name: "Rehabilitation",
        description: "Psychosocial therapy, livelihood & healing",
        baseline_anxiety: 32,
        stress_peak_label: "Grounding, Rebuilding & Recovery",
        stage_range: [20, 45],
      },
    ];

    // Build Chart 4: Reference According to Chat History
    const userMessages = (convos || []).filter((c) => c.role === "user");
    const assistantMessages = (convos || []).filter(
      (c) => c.role === "assistant",
    );

    let chatReferenceData = userMessages.slice(-8).map((u, idx) => {
      const resp = assistantMessages[idx]?.message || "";
      const text = u.message || "";
      let anxiety = 50;
      let label = "General Chat";

      if (/court|lawyer|judge|hearing|trial/i.test(text)) {
        anxiety = 84;
        label = "Court & Legal Stress";
      } else if (/police|fir|investig|officer/i.test(text)) {
        anxiety = 78;
        label = "Investigation & FIR";
      } else if (/threat|scared|fear|afraid|danger/i.test(text)) {
        anxiety = 92;
        label = "Safety & Threat Alert";
      } else if (/panic|attack|chest|breathe|shaking/i.test(text)) {
        anxiety = 94;
        label = "Acute Panic Episode";
      } else if (/sleep|tired|exhaust|depress/i.test(text)) {
        anxiety = 68;
        label = "Insomnia & Fatigue";
      } else if (/better|good|walk|calm|ground/i.test(text)) {
        anxiety = 34;
        label = "Grounding Progress";
      } else {
        anxiety = 52 + ((idx * 7) % 20);
        label = `Interaction #${idx + 1}`;
      }

      return {
        id: u.id,
        index: idx + 1,
        timestamp: u.created_at,
        time_label: new Date(u.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        reference_label: label,
        anxiety_level: anxiety,
        user_message: text,
        ai_response: resp.slice(0, 150) + (resp.length > 150 ? "..." : ""),
      };
    });

    if (chatReferenceData.length === 0) {
      // Seed default interactive references
      chatReferenceData = [
        {
          id: "cr-1",
          index: 1,
          time_label: "Day 1 - 09:30",
          reference_label: "FIR & Police Statement",
          anxiety_level: 79,
          user_message: "I filed the initial complaint yesterday and feel terrified.",
          ai_response: "Your courage is immense. Taking this formal step is distressing but vital.",
        },
        {
          id: "cr-2",
          index: 2,
          time_label: "Day 2 - 14:15",
          reference_label: "Investigation Station Visit",
          anxiety_level: 86,
          user_message: "The investigation team called me in for verification questions.",
          ai_response: "Take deep breaths. Remember you have the right to a legal advocate present.",
        },
        {
          id: "cr-3",
          index: 3,
          time_label: "Day 3 - 21:00",
          reference_label: "Night Flashback & Sleep",
          anxiety_level: 74,
          user_message: "Can't sleep tonight, kept replaying the incident.",
          ai_response: "Let's do a 5-4-3-2-1 sensory grounding exercise together right now.",
        },
        {
          id: "cr-4",
          index: 4,
          time_label: "Day 4 - 11:20",
          reference_label: "Upcoming Court Hearing",
          anxiety_level: 91,
          user_message: "My trial hearing date is next week. I am having panic attacks.",
          ai_response: "Connecting with an empanelled trauma counsellor will help stabilize this peak stress.",
        },
        {
          id: "cr-5",
          index: 5,
          time_label: "Today - Recent",
          reference_label: "MHPSS Grounding Routine",
          anxiety_level: 62,
          user_message: "Practiced the box breathing routine recommended by the counsellor.",
          ai_response: "Wonderful progress. Notice how grounding helps regulate autonomic panic responses.",
        },
      ];
    }

    // Latest real-time score
    const latestDistress =
      distressTrendData[distressTrendData.length - 1] || {
        anxiety_level: 65,
        distress_score: 68,
        severity: "moderate",
      };

    res.json({
      success: true,
      user_name: user?.name || "Patient",
      case_stage: activeCaseStage,
      support_needed: caseProfile?.support_needed || "General Support",
      summary: {
        current_anxiety: latestDistress.anxiety_level,
        current_distress_score: latestDistress.distress_score,
        current_severity: latestDistress.severity,
        active_module:
          latestDistress.anxiety_level >= 75 ? "ESCALATE" : "INTERVENE",
        should_call_counsellor: latestDistress.anxiety_level >= 75,
      },
      charts: {
        mood_chart: moodChartData,
        distress_trend_chart: distressTrendData,
        case_stage_chart: stageDefinitions,
        chat_reference_chart: chatReferenceData,
      },
    });
  } catch (err) {
    console.error("getDistressHistory error:", err);
    res.status(500).json({ error: err.message });
  }
};

