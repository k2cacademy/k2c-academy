import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { COACH_SYSTEM_PROMPT } from "@/lib/coach-brain";
import { fetchBrainContext } from "@/lib/coach-brain-rag.server";
import { createHash, randomUUID } from "crypto";
import { z } from "zod";

function hmac(input: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "fallback-dev-secret";
  return createHash("sha256").update(`${input}::${secret}`).digest("hex").slice(0, 32);
}
function signSession(userId: string) { return `${userId}.${hmac(userId)}`; }
function verifySession(token: string): string {
  const [userId, sig] = token.split(".");
  if (!userId || !sig || hmac(userId) !== sig) throw new Error("Invalid session");
  return userId;
}

export const APIRoute = createAPIFileRoute("/api/public/student-portal")({
  POST: async ({ request }) => {
    let body: Record<string, unknown>;
    try { body = await request.json(); } 
    catch { return Response.json({ error: "Invalid body" }, { status: 400 }); }

    const action = body.action as string;

    try {
      // ── verify-code ──────────────────────────────────────────
      if (action === "verify-code") {
        const code = (body.code as string ?? "").trim();
        const { data: row, error } = await supabaseAdmin
          .from("app_settings").select("value").eq("key", "student_access_code").maybeSingle();
        if (error) throw new Error(error.message);
        const expected = (row?.value ?? "K2Ç-STUDENT").trim();
        if (code !== expected) return Response.json({ ok: false });
        const userId = randomUUID();
        const today = new Date().toISOString().slice(0, 10);
        const end = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
        const { error: insErr } = await supabaseAdmin.from("student_profiles").insert({
          user_id: userId, trial_start: today, trial_end: end,
          daily_free_minutes_reset_date: today,
        });
        if (insErr) throw new Error("Could not create your profile. Please try again.");
        return Response.json({ ok: true, session: signSession(userId) });
      }

      // ── get-profile ──────────────────────────────────────────
      if (action === "get-profile") {
        const userId = verifySession(body.session as string);
        const { data: profile, error } = await supabaseAdmin
          .from("student_profiles").select("*").eq("user_id", userId).maybeSingle();
        if (error) throw new Error(error.message);
        return Response.json(profile);
      }

      // ── complete-onboarding ──────────────────────────────────
      if (action === "complete-onboarding") {
        const userId = verifySession(body.session as string);
        const parsed = z.object({
          first_name: z.string().trim().min(1).max(60),
          email: z.string().email().max(160),
          whatsapp: z.string().trim().min(7).max(20),
          birthday_md: z.string().regex(/^\d{2}-\d{2}$/),
          network: z.enum(["MTN", "Glo", "Airtel", "9mobile"]),
        }).parse(body);
        const { error } = await supabaseAdmin.from("student_profiles").update({
          first_name: parsed.first_name, full_name: parsed.first_name,
          email: parsed.email, whatsapp: parsed.whatsapp,
          birthday_md: parsed.birthday_md, network: parsed.network,
          onboarding_complete: true,
        }).eq("user_id", userId);
        if (error) throw new Error(error.message);
        return Response.json({ ok: true });
      }

      // ── send-coach-message ───────────────────────────────────
      if (action === "send-coach-message") {
        const userId = verifySession(body.session as string);
        const message = body.message as string;
        const isVoice = body.voice === true;

        await supabaseAdmin.from("student_chat_messages").insert({
          user_id: userId, role: "user", content: message,
        });

        const { data: history } = await supabaseAdmin
          .from("student_chat_messages").select("role, content")
          .eq("user_id", userId).order("created_at", { ascending: false }).limit(20);

        const voiceAddendum = "\n\nThis is a LIVE VOICE call. Speak like a warm, empathetic mentor. " +
          "Acknowledge feeling FIRST in one short sentence, then give ONE concrete next step. " +
          "STRICT: Maximum 2 short sentences, under 35 words total. No lists. No emojis. No markdown.";

        const brainContext = await fetchBrainContext(message, 4);
        const messages = [
          { role: "system", content: COACH_SYSTEM_PROMPT + brainContext + (isVoice ? voiceAddendum : "") },
          ...(history ?? []).reverse().map((m) => ({ role: m.role, content: m.content })),
        ];

        const groqKey = process.env.GROQ_API_KEY;
        const lovableKey = process.env.LOVABLE_API_KEY;

        async function callGroq() {
          if (!groqKey) return null;
          const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llama-3.1-8b-instant", messages, temperature: 0.7, max_tokens: isVoice ? 120 : 600 }),
          });
          if (!r.ok) return null;
          const j = await r.json() as { choices: { message: { content: string } }[] };
          return j?.choices?.[0]?.message?.content?.toString() ?? null;
        }

        async function callLovable() {
          if (!lovableKey) return null;
          const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, temperature: 0.7, max_tokens: isVoice ? 120 : 600 }),
          });
          if (!r.ok) return null;
          const j = await r.json() as { choices: { message: { content: string } }[] };
          return j?.choices?.[0]?.message?.content?.toString() ?? null;
        }

        let reply = isVoice
          ? ((await callGroq()) ?? (await callLovable()))
          : ((await callLovable()) ?? (await callGroq()));
        if (!reply) reply = "I'm right here with you. Tell me one specific thing you want to move forward on today — sales, content, pricing, or a buyer reply — and we'll fix it together.";

        await supabaseAdmin.from("student_chat_messages").insert({
          user_id: userId, role: "assistant", content: reply,
        });

        return Response.json({ reply });
      }

      // ── synthesize-voice ─────────────────────────────────────
      if (action === "synthesize-voice") {
        verifySession(body.session as string);
        const key = process.env.FISH_AUDIO_API_KEY;
        if (!key) return Response.json({ fallback: true });
        const referenceId = process.env.FISH_AUDIO_VOICE_ID;
        const reqBody: Record<string, unknown> = {
          text: body.text, format: "mp3", mp3_bitrate: 128,
          normalize: true, latency: "balanced", chunk_length: 100,
        };
        if (referenceId) reqBody.reference_id = referenceId;
        const res = await fetch("https://api.fish.audio/v1/tts", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", model: "speech-1.6" },
          body: JSON.stringify(reqBody),
        });
        if (!res.ok) return Response.json({ fallback: true });
        const buf = Buffer.from(await res.arrayBuffer());
        return Response.json({ audio_b64: buf.toString("base64"), mime: "audio/mpeg", fallback: false });
      }

      return Response.json({ error: "Unknown action" }, { status: 400 });

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Server error";
      console.error(`student-portal [${action}] error:`, err);
      return Response.json({ error: msg }, { status: 500 });
    }
  },
});
