import "dotenv/config";
import supabase from "../config/supabaseConfig.js";
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

const getConversationHistory = async (userId, checkinId) => {
  const { data } = await supabase
    .from("conversations")
    .select("role, message")
    .eq("user_id", userId)
    .eq("checkin_id", checkinId)
    .order("created_at", { ascending: true });
  return data || [];
};

const getVictimCaseProfile = async (userId) => {
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

const generateProactiveMessage = async (type, user, checkin, history, caseProfile) => {
  const caseContextSnippet = caseProfile
    ? `They are currently at the case stage: "${caseProfile.case_status}". Incident type: "${caseProfile.incident_type}". Primary support desired: "${caseProfile.support_needed}".`
    : "";

  const prompts = {
    mood_followup: `You are SAHAYA, an empathetic AI psychosocial companion for a victim of atrocity, following up on ${user.name}.
      Earlier, they checked in feeling "${checkin.mood_label}" (mood score: ${checkin.mood_score}/10).
      ${checkin.raw_message ? `What they initially shared: "${checkin.raw_message}"` : ""}
      ${caseContextSnippet}
      Your goal:
      Format your response strictly as 2 to 3 concise bullet points (using '• '):
      • Point 1: Gently check in regarding how they are feeling now compared to earlier in their case journey.
      • Point 2: Ask for their current mood score (1-10) and invite them to share how they are holding up.
      • Point 3: Remind them that if they feel emotionally overwhelmed, they can reach out to a therapist at Tele-MANAS (14416), or if confused about their legal case, to an advocate at NALSA (15100).
      Rules:
      - STRICTLY IN 2-3 BULLET POINTS. NO PARAGRAPHS.
      - Warm, natural, and case-sensitive.
      - NEVER use cliché phrases like "I am checking in to see", "safe space", or "as an AI".`,

    event_followup: `You are a warm mental health companion like a close friend.
      The user's name is ${user.name}.
      Earlier today they mentioned an event and seemed worried about it.
      You are proactively checking in to see how it went.
      Look at the conversation history to know what event they mentioned.
      Write a short, warm, natural follow-up (1-2 sentences).
      Don't say "I'm checking in" — just ask naturally like a friend would.`,

    evening_checkin: `You are a warm mental health companion like a close friend.
      The user's name is ${user.name}.
      They checked in this morning feeling ${checkin.mood_label}.
      It's evening now. Reach out warmly to see how their day went.
      Write a short, natural message (1-2 sentences).
      Reference their morning mood naturally — don't be clinical.`,

    night_checkin: `You are a warm mental health companion like a close friend.
      The user's name is ${user.name}.
      It's nighttime. They started the day feeling ${checkin.mood_label}.
      Check in gently for the night. Be cozy and warm.
      Write a short, caring message (1-2 sentences).`,
  };

  const systemPrompt = prompts[type] || prompts.mood_followup;
  const messages = [new SystemMessage(systemPrompt)];

  history.forEach((msg) => {
    messages.push(
      msg.role === "user"
        ? new HumanMessage(msg.message)
        : new AIMessage(msg.message),
    );
  });

  const response = await llm.invoke(messages);
  return response.content;
};

// ── Schedule a mood follow-up in the scheduled_messages table ──
export const scheduleMoodFollowup = async (userId, delaySeconds = 15) => {
  try {
    const scheduledFor = new Date(Date.now() + delaySeconds * 1000).toISOString();

    // Expire any previous pending mood_followup messages for this user to avoid duplicates
    await supabase
      .from("scheduled_messages")
      .update({ status: "expired" })
      .eq("user_id", userId)
      .eq("status", "pending")
      .eq("message_type", "mood_followup");

    const { data, error } = await supabase
      .from("scheduled_messages")
      .insert({
        user_id: userId,
        message_type: "mood_followup",
        scheduled_for: scheduledFor,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error scheduling mood followup:", error.message);
    } else {
      console.log(
        `✓ Scheduled mood_followup in scheduled_messages for user ${userId} in ${delaySeconds}s (id: ${data?.id})`,
      );
    }
  } catch (err) {
    console.error("scheduleMoodFollowup error:", err.message);
  }
};

let isProcessing = false;

export const processScheduledMessages = async () => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const now = new Date().toISOString();

    // fetch all pending messages that are due
    const { data: dueMessages, error } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now);

    if (error || !dueMessages?.length) {
      isProcessing = false;
      return;
    }

    console.log(`Processing ${dueMessages.length} scheduled message(s)...`);

    for (const scheduledMsg of dueMessages) {
      try {
        // get user info
        const { data: user } = await supabase
          .from("users")
          .select("name, email, city, area")
          .eq("id", scheduledMsg.user_id)
          .single();

        if (!user) {
          await supabase
            .from("scheduled_messages")
            .update({ status: "skipped" })
            .eq("id", scheduledMsg.id);
          continue;
        }

        // get latest checkin
        const { data: checkin } = await supabase
          .from("daily_checkins")
          .select("*")
          .eq("user_id", scheduledMsg.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!checkin) {
          await supabase
            .from("scheduled_messages")
            .update({ status: "skipped" })
            .eq("id", scheduledMsg.id);
          continue;
        }

        // get conversation history
        const history = await getConversationHistory(
          scheduledMsg.user_id,
          checkin.id,
        );

        // get victim case profile
        const caseProfile = await getVictimCaseProfile(scheduledMsg.user_id);

        // generate the proactive message based on previous mood and case stage
        const messageText = await generateProactiveMessage(
          scheduledMsg.message_type,
          user,
          checkin,
          history,
          caseProfile,
        );

        // save to conversations so it appears in chat
        await supabase.from("conversations").insert({
          user_id: scheduledMsg.user_id,
          checkin_id: checkin.id,
          role: "assistant",
          message: messageText,
          message_type: scheduledMsg.message_type,
        });

        // mark as sent in scheduled_messages table
        await supabase
          .from("scheduled_messages")
          .update({ status: "sent" })
          .eq("id", scheduledMsg.id);

        console.log(`✓ Sent ${scheduledMsg.message_type} to user ${user.name}`);
      } catch (err) {
        console.error(
          `Failed to process message ${scheduledMsg.id}:`,
          err.message,
        );
      }
    }
  } catch (err) {
    console.error("processScheduledMessages error:", err.message);
  } finally {
    isProcessing = false;
  }
};

// run every 3 seconds so 15s scheduled messages trigger accurately
export const startScheduler = () => {
  setInterval(processScheduledMessages, 3000);
  console.log("Message scheduler started (polling every 3s) ✓");
};
