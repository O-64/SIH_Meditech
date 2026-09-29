import "dotenv/config";
import cron from "node-cron";
import supabase from "../config/supabaseConfig.js";
import sendMail from "../config/nodemailer.js";
import { handleNightRecommendation } from "../controller/recommender.js";
import { ChatGroq } from "@langchain/groq";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from "@langchain/core/messages";

const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  temperature: 0.9,
});

// ── Fetch conversation history ────────────────────────────────
const getConversationHistory = async (userId, checkinId) => {
  const { data, error } = await supabase
    .from("conversations")
    .select("role, message, message_type")
    .eq("user_id", userId)
    .eq("checkin_id", checkinId)
    .order("created_at", { ascending: true });

  if (error) console.error("History fetch error:", error.message);
  console.log(
    `Fetched ${data?.length || 0} history messages for checkin ${checkinId}`,
  );
  return data || [];
};

// ── Tone guide based on age AND mood ─────────────────────────
const getVibeForAgeMood = (age, moodLabel, moodScore) => {
  const ageBucket = !age
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
  const isLow = moodScore <= 4;
  const isOkay = moodScore >= 5 && moodScore <= 7;

  const vibes = {
    teen: {
      low: "talk like a caring older sibling who gets it — casual, simple, gentle. no big words. maybe one emoji if it fits. don't be preachy",
      okay: "casual and light, like a cool older sibling checking in. keep it easy and real",
      good: "fun and hyped, like a sibling who's happy for them. short and energetic",
    },
    young: {
      low: "like a close college friend who genuinely cares — no fluff, no therapy speak. real and raw. can use light slang. don't try to fix anything",
      okay: "chill and real, like a friend catching up over text. conversational and easy",
      good: "hyped and fun, like a friend who's excited with them. can be playful",
    },
    adult: {
      low: "like a good friend who's been through stuff too — grounded, warm, no nonsense. skip the positivity fluff. just be real with them",
      okay: "warm and casual, like checking in with a close friend after a long day",
      good: "genuine and warm, happy to hear they're doing well. easy going",
    },
    midlife: {
      low: "steady and warm, like a trusted friend who doesn't overreact. calm, grounded, no dramatic sympathy",
      okay: "warm and easy, like a friend who just wants to hear how things went",
      good: "warm and light, genuinely happy for them without being over the top",
    },
    senior: {
      low: "gentle and kind, like a longtime friend who cares deeply. simple words, no slang, very warm",
      okay: "warm and simple, like catching up with an old friend",
      good: "warm and cheerful, simple and genuine",
    },
  };

  const mood = isLow ? "low" : isOkay ? "okay" : "good";
  return vibes[ageBucket]?.[mood] || "warm and casual, like a good friend";
};

// ── Generate proactive AI message ─────────────────────────────
const generateProactiveMessage = async (type, user, checkin, history) => {
  const vibe = getVibeForAgeMood(
    user.age,
    checkin.mood_label,
    checkin.mood_score,
  );
  const location = [user.area, user.city].filter(Boolean).join(", ");
  const morningMessage = history.find((m) => m.role === "user")?.message || "";
  const recentHistory = history.slice(-8);

  const baseRules = `
You are texting ${user.name} like a real friend — NOT a therapist, NOT an AI assistant.
Vibe for this message: ${vibe}
${location ? `They live in ${location} — only mention this if it genuinely flows naturally, most messages should not reference location at all.` : ""}
${user.age ? `They are ${user.age} years old.` : ""}
Their mood today: ${checkin.mood_label} (${checkin.mood_score}/10) — let this shape how you talk, not what you say.

STRICT RULES:
- Never say "I'm here for you", "you're not alone", "I'm so sorry to hear that", "sending love", "safe space", "it's okay to feel", "you got this"
- Never use phrases like "it sounds like", "I can imagine", "I understand how you feel"
- Never start with "Hey ${user.name}" — just get straight to what you want to say
- No bullet points, no lists, no paragraphs
- Max 2 sentences — short like a real text message
- Sound like a human who actually knows them, not a wellness app
- The message MUST end with a question
- Reference what they've said in conversation if there's history — show you remember`;

  const conversationContext =
    recentHistory.length > 1
      ? `\nConversation so far today:\n${recentHistory.map((m) => `${m.role === "user" ? user.name : "You"}: ${m.message}`).join("\n")}`
      : "";

  const prompts = {
    event_followup: `${baseRules}
${conversationContext}

Context: This morning ${user.name} mentioned something they were stressed or nervous about.
Morning message: "${morningMessage}"
You want to casually ask how it went — like a friend who remembered.
If their mood was low → ask gently and warmly. If mood was okay/good → ask more casually.
NEVER end with a statement or motivation. Always a question.
Write the message:`,

    evening_checkin: `${baseRules}
${conversationContext}

Context: ${user.name} started the day feeling ${checkin.mood_label} (${checkin.mood_score}/10).
Morning message: "${morningMessage}"
This is your SECOND check-in today — you already texted them once before. Reference that naturally if it fits.
It's evening. Ask them something real — make them want to open the app and reply.
If mood was low → softer, more gentle. If mood was okay/good → lighter, more casual.
NEVER send motivation or advice.
Write the message:`,

    night_checkin: `${baseRules}
${conversationContext}

Context: ${user.name} started the day feeling ${checkin.mood_label} (${checkin.mood_score}/10).
Morning message: "${morningMessage}"
This is your THIRD check-in today. You've been texting all day. Keep it natural and light.
It's night. Check in before they sleep. Based on everything they've shared today, ask something warm and specific.
If mood was low → extra gentle and warm, low pressure. If mood was okay/good → easy and light.
No motivational endings, no advice.
Write the message:`,
  };

  const systemPrompt = prompts[type] || prompts.evening_checkin;
  const messages = [new SystemMessage(systemPrompt)];

  recentHistory.forEach((msg) => {
    messages.push(
      msg.role === "user"
        ? new HumanMessage(msg.message)
        : new AIMessage(msg.message),
    );
  });

  console.log(
    `Generating ${type} message for ${user.name} (age: ${user.age}, location: ${location})...`,
  );
  const response = await llm.invoke(messages);
  console.log("Generated message:", response.content);
  return response.content;
};

// ── Email subject lines ───────────────────────────────────────
const getEmailSubject = (type) => {
  const subjects = {
    event_followup: `hey, how did it go? 👀`,
    evening_checkin: `checking in on you ☀️`,
    night_checkin: `hope today was good 🌙`,
  };
  return subjects[type] || `a message from Sahaay 💛`;
};

// ── Mood accent for email ─────────────────────────────────────
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

// ── Styled HTML email ─────────────────────────────────────────
const buildEmailHtml = (userName, messageText, type, checkinId, moodLabel) => {
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const replyUrl = `${appUrl}/home?reply=${checkinId}&type=${type}`;
  const accent = getMoodAccent(moodLabel);

  const emojiMap = {
    event_followup: "👀",
    evening_checkin: "☀️",
    night_checkin: "🌙",
  };
  const taglineMap = {
    event_followup: "just checking in on that thing",
    evening_checkin: "a quick hello from Sahaay",
    night_checkin: "checking in before you sleep",
  };
  const labelMap = {
    event_followup: "follow-up",
    evening_checkin: "evening check-in",
    night_checkin: "night check-in",
  };

  const headerEmoji = emojiMap[type] || "💛";
  const tagline = taglineMap[type] || "a message from Sahaay";
  const label = labelMap[type] || "check-in";

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
            <td style="vertical-align:top;padding-top:2px;"><div style="width:42px;height:42px;background:linear-gradient(135deg,${accent.from},${accent.to});border-radius:13px;text-align:center;line-height:42px;font-size:19px;display:inline-block;">${headerEmoji}</div></td>
            <td style="padding-left:14px;vertical-align:top;">
              <p style="margin:0 0 3px;color:#e2e8f0;font-size:17px;font-weight:700;">${tagline}</p>
              <p style="margin:0;color:#334155;font-size:12px;">${label} from Sahaay</p>
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

// ── Expire stale pending rows (called once on startup) ────────
const expireStaleMessages = async () => {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("scheduled_messages")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("scheduled_for", cutoff)
    .select("id");

  if (error) {
    console.error("Failed to expire stale messages:", error.message);
  } else if (data?.length) {
    console.log(`⚠ Expired ${data.length} stale pending message(s) on startup`);
  }
};

// ── Main processor ────────────────────────────────────────────
// NOTE: The scheduler ONLY sends the email that is due.
// Chaining to the next email happens in genAi.js when the user replies.
// Flow: morning checkin → schedule noon mail (5s)
//       user replies to noon mail → genAi.js schedules evening mail (10s)
//       user replies to evening mail → genAi.js sends night recommendation
const processScheduledMessages = async () => {
  const now = new Date().toISOString();

  const { data: dueMessages, error } = await supabase
    .from("scheduled_messages")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", now);

  if (error) {
    console.error("Error fetching scheduled messages:", error.message);
    return;
  }
  if (!dueMessages?.length) return;

  console.log(`Processing ${dueMessages.length} scheduled message(s)...`);

  for (const scheduledMsg of dueMessages) {
    try {
      const { data: user } = await supabase
        .from("users")
        .select("name, email, age, city, area")
        .eq("id", scheduledMsg.user_id)
        .single();

      if (!user) {
        console.warn(`No user found for id ${scheduledMsg.user_id}, skipping`);
        await supabase
          .from("scheduled_messages")
          .update({ status: "skipped" })
          .eq("id", scheduledMsg.id);
        continue;
      }

      // Find the checkin that was created at or after this scheduled_message was inserted
      const { data: checkin } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", scheduledMsg.user_id)
        .gte("created_at", scheduledMsg.created_at)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      // Fallback: most recent checkin within last 24h
      let resolvedCheckin = checkin;
      if (!resolvedCheckin) {
        const cutoff24h = new Date(
          Date.now() - 24 * 60 * 60 * 1000,
        ).toISOString();
        const { data: recentCheckin } = await supabase
          .from("daily_checkins")
          .select("*")
          .eq("user_id", scheduledMsg.user_id)
          .gte("created_at", cutoff24h)
          .order("checkin_date", { ascending: false })
          .limit(1)
          .single();
        resolvedCheckin = recentCheckin;
      }

      if (!resolvedCheckin) {
        console.warn(`No checkin found for user ${user.name} — skipping`);
        await supabase
          .from("scheduled_messages")
          .update({ status: "skipped" })
          .eq("id", scheduledMsg.id);
        continue;
      }

      // Verify the checkin has a morning message (guard against stale rows)
      const { data: morningMsg } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_id", scheduledMsg.user_id)
        .eq("checkin_id", resolvedCheckin.id)
        .eq("role", "user")
        .eq("message_type", "morning")
        .limit(1);

      if (!morningMsg?.length) {
        console.warn(
          `⚠ No morning message found for checkin ${resolvedCheckin.id} — stale row, expiring`,
        );
        await supabase
          .from("scheduled_messages")
          .update({ status: "expired" })
          .eq("id", scheduledMsg.id);
        continue;
      }

      console.log(
        `Checkin found: ${resolvedCheckin.id} (date: ${resolvedCheckin.checkin_date}), mood: ${resolvedCheckin.mood_label}`,
      );

      const history = await getConversationHistory(
        scheduledMsg.user_id,
        resolvedCheckin.id,
      );

      const messageText = await generateProactiveMessage(
        scheduledMsg.message_type,
        user,
        resolvedCheckin,
        history,
      );

      // 1. Save to conversations
      await supabase.from("conversations").insert({
        user_id: scheduledMsg.user_id,
        checkin_id: resolvedCheckin.id,
        role: "assistant",
        message: messageText,
        message_type: scheduledMsg.message_type,
      });

      // 2. Send email
      await sendMail({
        email: user.email,
        subject: getEmailSubject(scheduledMsg.message_type),
        html: buildEmailHtml(
          user.name,
          messageText,
          scheduledMsg.message_type,
          resolvedCheckin.id,
          resolvedCheckin.mood_label,
        ),
      });

      // 3. Mark sent — chaining happens in genAi.js when user replies
      await supabase
        .from("scheduled_messages")
        .update({ status: "sent" })
        .eq("id", scheduledMsg.id);

      console.log(
        `✓ Sent ${scheduledMsg.message_type} to ${user.name} (${user.email})`,
      );
      console.log(
        `  Next email will be scheduled when ${user.name} replies via the deep link.`,
      );
    } catch (err) {
      console.error(`✗ Failed to process message ${scheduledMsg.id}:`);
      console.error(`  Message: ${err.message}`);
      console.error(`  Stack: ${err.stack}`);
    }
  }
};

// ── Production delays ─────────────────────────────────────────
export const getProductionDelay = (type) => {
  const now = new Date();
  const target = new Date();

  if (type === "evening_checkin") {
    target.setHours(19, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target.getTime() - now.getTime();
  }
  if (type === "night_checkin") {
    target.setHours(22, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target.getTime() - now.getTime();
  }
  return 2 * 60 * 60 * 1000;
};

// ── Start the cron job ────────────────────────────────────────
export const startScheduler = () => {
  expireStaleMessages();
  cron.schedule("* * * * *", processScheduledMessages);
  console.log("Message scheduler started ✓");
};
