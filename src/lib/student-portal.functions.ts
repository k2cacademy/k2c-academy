import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHash, randomUUID } from "crypto";
import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { RoomConfiguration, RoomAgentDispatch } from "@livekit/protocol";
import { COACH_SYSTEM_PROMPT } from "./coach-brain";

// ============================================================
// Session model: after a student enters the right code, the
// server returns a sessionToken = signed UUID. The client stores
// it in localStorage and sends it on every call. The server
// validates the signature and maps it to a stable user_id that
// scopes all of that device's data.
// ============================================================

function hmac(input: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "fallback-dev-secret";
  return createHash("sha256").update(`${input}::${secret}`).digest("hex").slice(0, 32);
}
function signSession(userId: string) {
  return `${userId}.${hmac(userId)}`;
}
function verifySession(token: string): string {
  const [userId, sig] = token.split(".");
  if (!userId || !sig || hmac(userId) !== sig) throw new Error("Invalid session");
  return userId;
}

const sessionInput = z.object({ session: z.string().min(10) });

// ---------- Verify code ----------
export const verifyAccessCode = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ code: z.string().min(1).max(64) }).parse(i))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "student_access_code")
      .maybeSingle();
    if (error) throw new Error(error.message);
    const expected = (row?.value ?? "K2Ç-STUDENT").trim();
    if (data.code.trim() !== expected) {
      return { ok: false as const };
    }
    const userId = randomUUID();
    // create empty profile so onboarding flow can update it
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
    const { error: insErr } = await supabaseAdmin.from("student_profiles").insert({
      user_id: userId,
      trial_start: today,
      trial_end: end,
      daily_free_minutes_reset_date: today,
    });
    if (insErr) {
      console.error("verifyAccessCode insert error", insErr);
      throw new Error("Could not create your profile. Please try again.");
    }
    return { ok: true as const, session: signSession(userId) };
  });

// ---------- Profile ----------
export const getProfile = createServerFn({ method: "POST" })
  .inputValidator((i) => sessionInput.parse(i))
  .handler(async ({ data }) => {
    const userId = verifySession(data.session);
    const { data: profile, error } = await supabaseAdmin
      .from("student_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return profile;
  });

const onboardingSchema = sessionInput.extend({
  first_name: z.string().trim().min(1).max(60),
  email: z.string().email().max(160),
  whatsapp: z.string().trim().min(7).max(20),
  birthday_md: z.string().regex(/^\d{2}-\d{2}$/, "Use MM-DD"),
  network: z.enum(["MTN", "Glo", "Airtel", "9mobile"]),
});
export const completeOnboarding = createServerFn({ method: "POST" })
  .inputValidator((i) => onboardingSchema.parse(i))
  .handler(async ({ data }) => {
    const userId = verifySession(data.session);
    const { error } = await supabaseAdmin
      .from("student_profiles")
      .update({
        first_name: data.first_name,
        full_name: data.first_name,
        email: data.email,
        whatsapp: data.whatsapp,
        birthday_md: data.birthday_md,
        network: data.network,
        onboarding_complete: true,
      })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Chat (Groq) ----------
const COACH_SYSTEM = COACH_SYSTEM_PROMPT;

const chatSchema = sessionInput.extend({
  message: z.string().trim().min(1).max(2000),
  voice: z.boolean().optional(),
});
export const sendCoachMessage = createServerFn({ method: "POST" })
  .inputValidator((i) => chatSchema.parse(i))
  .handler(async ({ data }) => {
    const userId = verifySession(data.session);

    // Save user message
    await supabaseAdmin.from("student_chat_messages").insert({
      user_id: userId,
      role: "user",
      content: data.message,
    });

    // Load last 20 messages for context
    const { data: history } = await supabaseAdmin
      .from("student_chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    const voiceAddendum =
      "\n\nThis is a LIVE VOICE call. Speak like a warm, empathetic mentor who has personally been where this student is — broke, stuck, doubting themselves — and made it out by getting that first online sale. " +
      "Always acknowledge their feeling FIRST in one short human sentence ('I hear you', 'that's heavy', 'totally get it'), then give ONE concrete next step focused on getting them their first sale today. " +
      "Natural pace. Use commas and short sentences so the pauses feel human. " +
      "STRICT: Maximum 2 short sentences, under 35 words total. No lists. No emojis. No markdown. No headings. Plain spoken language only.";
    const messages = [
      { role: "system", content: COACH_SYSTEM + (data.voice ? voiceAddendum : "") },
      ...(history ?? []).reverse().map((m) => ({ role: m.role, content: m.content })),
    ];

    const lovableKey = process.env.LOVABLE_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    const isVoice = data.voice === true;

    async function callLovable(): Promise<string | null> {
      if (!lovableKey) return null;
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages,
            temperature: 0.7,
            max_tokens: isVoice ? 120 : 600,
          }),
        });
        if (!r.ok) {
          console.error("Lovable AI error", r.status, await r.text().catch(() => ""));
          return null;
        }
        const j = await r.json();
        return j?.choices?.[0]?.message?.content?.toString() ?? null;
      } catch (e) {
        console.error("Lovable AI exception", e);
        return null;
      }
    }

    async function callGroq(): Promise<string | null> {
      if (!groqKey) return null;
      try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages,
            temperature: 0.7,
            max_tokens: isVoice ? 120 : 600,
          }),
        });
        if (!r.ok) {
          console.error("Groq error", r.status, await r.text().catch(() => ""));
          return null;
        }
        const j = await r.json();
        return j?.choices?.[0]?.message?.content?.toString() ?? null;
      } catch (e) {
        console.error("Groq exception", e);
        return null;
      }
    }

    // Voice calls: Groq first (~300ms) for low latency. Chat: Lovable first.
    let reply = isVoice
      ? ((await callGroq()) ?? (await callLovable()))
      : ((await callLovable()) ?? (await callGroq()));
    if (!reply) {
      reply =
        "I'm right here with you. Tell me one specific thing you want to move forward on today — sales, content, pricing, or a buyer reply — and we'll fix it together.";
    }

    await supabaseAdmin.from("student_chat_messages").insert({
      user_id: userId, role: "assistant", content: reply,
    });
    return { reply };
  });


export const getChatHistory = createServerFn({ method: "POST" })
  .inputValidator((i) => sessionInput.parse(i))
  .handler(async ({ data }) => {
    const userId = verifySession(data.session);
    const { data: rows } = await supabaseAdmin
      .from("student_chat_messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(100);
    return rows ?? [];
  });

// ---------- Minutes / Call state ----------
const DAILY_FREE_MINUTES = 10;
async function ensureMinutesFreshness(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: p } = await supabaseAdmin
    .from("student_profiles")
    .select("daily_free_minutes_used, daily_free_minutes_reset_date, purchased_minutes_balance")
    .eq("user_id", userId)
    .single();
  if (!p) throw new Error("Profile missing");
  if (p.daily_free_minutes_reset_date !== today) {
    await supabaseAdmin
      .from("student_profiles")
      .update({ daily_free_minutes_used: 0, daily_free_minutes_reset_date: today })
      .eq("user_id", userId);
    return {
      free_used: 0,
      free_total: DAILY_FREE_MINUTES,
      purchased: p.purchased_minutes_balance ?? 0,
    };
  }
  return {
    free_used: p.daily_free_minutes_used ?? 0,
    free_total: DAILY_FREE_MINUTES,
    purchased: p.purchased_minutes_balance ?? 0,
  };
}

export const getMinutesState = createServerFn({ method: "POST" })
  .inputValidator((i) => sessionInput.parse(i))
  .handler(async ({ data }) => {
    const userId = verifySession(data.session);
    const s = await ensureMinutesFreshness(userId);
    return {
      ...s,
      free_remaining: Math.max(0, s.free_total - s.free_used),
      total_remaining: Math.max(0, s.free_total - s.free_used) + s.purchased,
    };
  });

// ---------- Start a coach call (LiveKit + Railway agent) ----------
// Generates a LiveKit access token so the browser can join a room. The
// Railway worker (running our LiveKit Agents Python worker) auto-dispatches
// into the room and starts the interactive voice session.
export const startCoachCall = createServerFn({ method: "POST" })
  .inputValidator((i) => sessionInput.parse(i))
  .handler(async ({ data }) => {
    const userId = verifySession(data.session);
    const s = await ensureMinutesFreshness(userId);
    const remaining = Math.max(0, s.free_total - s.free_used) + s.purchased;
    if (remaining <= 0) {
      return { ok: false as const, reason: "no-minutes" as const };
    }

    const lkUrl = process.env.LIVEKIT_URL;
    const lkKey = process.env.LIVEKIT_API_KEY;
    const lkSecret = process.env.LIVEKIT_API_SECRET;
    if (!lkUrl || !lkKey || !lkSecret) {
      console.error("LiveKit not configured", {
        hasUrl: !!lkUrl, hasKey: !!lkKey, hasSecret: !!lkSecret,
      });
      throw new Error("Voice calls are not configured. Please contact support.");
    }

    const room = `k2c-coach-${userId.slice(0, 8)}-${Date.now()}`;
    const identity = `student-${userId.slice(0, 8)}`;

    // If the Railway worker registers with a specific agent_name, it requires
    // EXPLICIT dispatch — auto-dispatch only happens when the worker has no
    // agent_name. We support both: set LIVEKIT_AGENT_NAME if your worker has one.
    const agentName = process.env.LIVEKIT_AGENT_NAME?.trim() || null;

    const at = new AccessToken(lkKey, lkSecret, {
      identity,
      ttl: 60 * 60, // 1 hour
      metadata: JSON.stringify({ userId, minutesAllowed: remaining, firstName: null }),
    });
    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    if (agentName) {
      // Embed the dispatch in the token: the room is created on join WITH the
      // agent already scheduled to dispatch.
      at.roomConfig = new RoomConfiguration({
        agents: [
          new RoomAgentDispatch({
            agentName,
            metadata: JSON.stringify({ userId, minutesAllowed: remaining }),
          }),
        ],
      });
    }

    const token = await at.toJwt();

    // Also kick off an explicit dispatch as a safety net (no-op if agentName
    // is empty or if it was already auto-dispatched).
    if (agentName) {
      try {
        const dispatcher = new AgentDispatchClient(lkUrl, lkKey, lkSecret);
        await dispatcher.createDispatch(room, agentName, {
          metadata: JSON.stringify({ userId, minutesAllowed: remaining }),
        });
      } catch (e) {
        console.warn("Agent dispatch failed (token-embedded dispatch should still work)", e);
      }
    }

    const { data: log } = await supabaseAdmin
      .from("voice_call_log")
      .insert({
        user_id: userId,
        livekit_room: room,
        status: "active",
        was_free: s.free_used < s.free_total,
      })
      .select("id")
      .single();

    return {
      ok: true as const,
      callId: log?.id,
      minutes_allowed: remaining,
      livekit_url: lkUrl,
      livekit_token: token,
      room,
    };
  });


const endCallSchema = sessionInput.extend({
  callId: z.string().uuid(),
  duration_seconds: z.number().int().min(0).max(60 * 60 * 3),
});
export const endCoachCall = createServerFn({ method: "POST" })
  .inputValidator((i) => endCallSchema.parse(i))
  .handler(async ({ data }) => {
    const userId = verifySession(data.session);
    const minutes_used = Math.max(1, Math.ceil(data.duration_seconds / 60));

    const s = await ensureMinutesFreshness(userId);
    const free_avail = Math.max(0, s.free_total - s.free_used);
    const from_free = Math.min(free_avail, minutes_used);
    const from_purchased = minutes_used - from_free;

    await supabaseAdmin
      .from("student_profiles")
      .update({
        daily_free_minutes_used: s.free_used + from_free,
        purchased_minutes_balance: Math.max(0, s.purchased - from_purchased),
      })
      .eq("user_id", userId);

    await supabaseAdmin
      .from("voice_call_log")
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: data.duration_seconds,
        minutes_used,
        status: "ended",
        was_free: from_purchased === 0,
      })
      .eq("id", data.callId)
      .eq("user_id", userId);

    return { ok: true, minutes_used };
  });

// ---------- Recharge (Monnify) ----------
const PACKS = {
  100: 5,
  300: 20,
  500: 45,
} as const;
type PackAmt = keyof typeof PACKS;

const COUPONS: Record<string, number> = {
  FOUNDING20: 0.2, // 20% off
};

const rechargeSchema = sessionInput.extend({
  amount_ngn: z.union([z.literal(100), z.literal(300), z.literal(500)]),
  coupon: z.string().trim().max(32).optional(),
});

async function monnifyAuth(): Promise<string> {
  const k = process.env.MONNIFY_API_KEY;
  const s = process.env.MONNIFY_SECRET_KEY;
  if (!k || !s) throw new Error("Monnify is not configured.");
  const basic = Buffer.from(`${k}:${s}`).toString("base64");
  const r = await fetch("https://sandbox.monnify.com/api/v1/auth/login", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
  });
  const j = await r.json();
  const tk = j?.responseBody?.accessToken;
  if (!tk) throw new Error("Monnify auth failed");
  return tk;
}

export const initRecharge = createServerFn({ method: "POST" })
  .inputValidator((i) => rechargeSchema.parse(i))
  .handler(async ({ data }) => {
    const userId = verifySession(data.session);
    const minutes = PACKS[data.amount_ngn as PackAmt];
    const couponKey = (data.coupon ?? "").toUpperCase();
    const discount = COUPONS[couponKey] ?? 0;
    const finalAmount = Math.max(50, Math.round(data.amount_ngn * (1 - discount)));

    const { data: p } = await supabaseAdmin
      .from("student_profiles")
      .select("email, first_name")
      .eq("user_id", userId)
      .single();

    const contract = process.env.MONNIFY_CONTRACT_CODE;
    if (!contract) throw new Error("Monnify contract is not configured.");
    const token = await monnifyAuth();
    const reference = `k2c-${userId.slice(0, 8)}-${Date.now()}`;

    const r = await fetch("https://sandbox.monnify.com/api/v1/merchant/transactions/init-transaction", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: finalAmount,
        customerName: p?.first_name || "K2Ç Student",
        customerEmail: p?.email || "student@k2c.academy",
        paymentReference: reference,
        paymentDescription: `K2Ç ${minutes} call minutes${discount ? ` (${couponKey} ${Math.round(discount * 100)}% off)` : ""}`,
        currencyCode: "NGN",
        contractCode: contract,
        redirectUrl: `${process.env.APP_URL ?? ""}/student-portal?recharge=success`,
        metadata: { user_id: userId, minutes, coupon: couponKey || null },
      }),
    });
    const j = await r.json();
    const checkoutUrl: string | undefined = j?.responseBody?.checkoutUrl;
    if (!checkoutUrl) {
      console.error("Monnify init failed", j);
      throw new Error("Could not start payment. Try again.");
    }

    await supabaseAdmin.from("recharge_history").insert({
      user_id: userId,
      plan_name: `${minutes} mins${discount ? ` (${couponKey})` : ""}`,
      amount_ngn: finalAmount,
      minutes_added: minutes,
      flutterwave_reference: reference,
      status: "pending",
    });

    return { checkoutUrl, finalAmount, discount };
  });

// ---------- Fish Audio TTS ----------
// Synthesises coach replies with Fish Audio for a warm, human voice.
// Returns base64 mp3 so the client can play it via an <audio> element
// (and pause instantly when the student interrupts).
const ttsSchema = sessionInput.extend({
  text: z.string().trim().min(1).max(2000),
});

export const synthesizeCoachVoice = createServerFn({ method: "POST" })
  .inputValidator((i) => ttsSchema.parse(i))
  .handler(async ({ data }) => {
    verifySession(data.session);
    const key = process.env.FISH_AUDIO_API_KEY;
    // If no key OR Fish fails, return a structured fallback so the client
    // can speak with the browser TTS instead of breaking the call.
    if (!key) return { fallback: true as const };

    const referenceId = process.env.FISH_AUDIO_VOICE_ID;
    const body: Record<string, unknown> = {
      text: data.text,
      format: "mp3",
      mp3_bitrate: 128,
      normalize: true,
      latency: "balanced",
      chunk_length: 100,
    };
    if (referenceId) body.reference_id = referenceId;

    try {
      const res = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          model: "speech-1.6",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errTxt = await res.text().catch(() => "");
        console.error("Fish Audio TTS error", res.status, errTxt);
        return { fallback: true as const };
      }
      const buf = Buffer.from(await res.arrayBuffer());
      return {
        audio_b64: buf.toString("base64"),
        mime: "audio/mpeg" as const,
        fallback: false as const,
      };
    } catch (e) {
      console.error("Fish Audio TTS exception", e);
      return { fallback: true as const };
    }
  });

