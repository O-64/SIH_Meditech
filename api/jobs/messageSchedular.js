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

const generateProactiveMessage = async (type, user, checkin, history) => {
  const prompts = {
    mood_followup: `You are a warm, empathetic mental health companion like a close friend checking back in.
      The user's name is ${user.name}.
      A little while ago, they checked in feeling "${checkin.mood_label}" (mood score: ${checkin.mood_score}/10).
      ${checkin.raw_message ? `What they initially shared: "${checkin.raw_message}"` : ""}
      Your goal:
      1. Gently reference how they were feeling earlier (e.g. if they felt stressed, anxious, sad, tired, or happy).
      2. Ask if they are feeling any better now or how things have been going.
      3. Ask how their mood is right now so you can check in on them.
      Rules:
      - 2 to 3 sentences maximum.
      - Sound human, empathetic, and natural like a supportive friend texting them.
      - NEVER use cliché therapist phrases like "I am checking in to see", "safe space", or "as an AI".`,

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

        // generate the proactive message based on previous mood
        const messageText = await generateProactiveMessage(
          scheduledMsg.message_type,
          user,
          checkin,
          history,
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
