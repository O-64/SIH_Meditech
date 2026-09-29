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
  { name: "iCall", number: "9152987821", hours: "Mon–Sat, 8am–10pm" },
  { name: "Vandrevala Foundation", number: "1860-2662-345", hours: "24/7" },
];

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
        "iCall (9152987821, Mon–Sat 8am–10pm) or Vandrevala Foundation (1860-2662-345, 24/7)";
      const selfHarmPrompt = `You are a warm caring friend texting ${user.name}.
        They said something suggesting self-harm. Respond warmly (3-4 sentences), weave in helplines naturally: ${helplinesText}.
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

      // Generate normal chat reply
      const systemPrompt = `You are a warm empathetic companion like a close friend, not a therapist.
        User: ${user.name}. Mood today: ${existingCheckin.mood_label} (${existingCheckin.mood_score}/10).
        ${cbtTriggered ? `They've had rough days in a row. Be extra warm. Casually mention you have a short exercise that might help — keep it optional-feeling.` : ""}
        Rules: warm, human, conversational. 2-3 sentences max. Never say "I'm here for you", "you're not alone", "safe space".`;

      const aiResponse = await llm.invoke(
        buildMessages(systemPrompt, history, message),
      );
      const raw = aiResponse.content;
      const reply =
        typeof raw === "string"
          ? raw
          : Array.isArray(raw)
            ? raw.map((b) => b.text || "").join("")
            : String(raw);

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

    // Generate AI reply
    const history = await getConversationHistory(userId, checkin.id);
    const systemPrompt = `You are a warm empathetic companion like a close friend, not a therapist.
      User: ${user.name}. Today: ${mood.mood_label} (${mood.mood_score}/10).
      ${events.length > 0 ? `Events today: ${events.map((e) => e.title).join(", ")}` : ""}
      ${cbtTriggered ? `Rough days in a row — be extra warm. Casually mention a short exercise might help.` : ""}
      Rules: warm, human. 3-4 sentences. Never say "I'm here for you", "you're not alone", "safe space".`;

    const aiResponse = await llm.invoke(
      buildMessages(systemPrompt, history, message),
    );
    const raw = aiResponse.content;
    const reply =
      typeof raw === "string"
        ? raw
        : Array.isArray(raw)
          ? raw.map((b) => b.text || "").join("")
          : String(raw);

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
