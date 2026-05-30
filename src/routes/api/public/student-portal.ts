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

      // ── get-chat-history ─────────────────────────────────────
      if (action === "get-chat-history") {
        const userId = verifySession(body.session as string);
        const { data, error } = await supabaseAdmin
          .from("student_chat_messages")
          .select("id, role, content, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(60);
        if (error) throw new Error(error.message);
        return Response.json(data ?? []);
      }

      // ── get-minutes-state ────────────────────────────────────
      if (action === "get-minutes-state") {
        const userId = verifySession(body.session as string);
        const { data: profile, error } = await supabaseAdmin
          .from("student_profiles")
          .select("free_minutes_remaining, purchased_minutes, daily_free_minutes_reset_date, inner_circle_status")
          .eq("user_id", userId).maybeSingle();
        if (error) throw new Error(error.message);

        const today = new Date().toISOString().slice(0, 10);
        const isInner = profile?.inner_circle_status === "active";
        const dailyFree = isInner ? 10 : 3;

        // Reset daily free minutes if new day
        if (profile?.daily_free_minutes_reset_date !== today) {
          await supabaseAdmin.from("student_profiles").update({
            free_minutes_remaining: dailyFree,
            daily_free_minutes_reset_date: today,
          }).eq("user_id", userId);
          return Response.json({ free_remaining: dailyFree, purchased: profile?.purchased_minutes ?? 0, total_remaining: dailyFree + (profile?.purchased_minutes ?? 0) });
        }

        const free = profile?.free_minutes_remaining ?? 0;
        const purchased = profile?.purchased_minutes ?? 0;
        return Response.json({ free_remaining: free, purchased, total_remaining: free + purchased });
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

        const voiceAddendum =
          "\n\nThis is a LIVE VOICE call. Speak like a warm, empathetic mentor who has personally been where this student is — broke, stuck, doubting themselves — and made it out by getting that first online sale. " +
          "Always acknowledge their feeling FIRST in one short human sentence ('I hear you', 'that's heavy', 'totally get it'), then give ONE concrete next step focused on getting them their first sale today. " +
          "Natural pace. Use commas and short sentences so the pauses feel human. " +
          "STRICT: Maximum 2 short sentences, under 35 words total. No lists. No emojis. No markdown. No headings. Plain spoken language only.";

        const brainContext = await fetchBrainContext(message, 4);
        const messages = [
          { role: "system", content: COACH_SYSTEM_PROMPT + brainContext + (isVoice ? voiceAddendum : "") },
          ...(history ?? []).reverse().map((m) => ({ role: m.role, content: m.content })),
        ];

        const groqKey = process.env.GROQ_API_KEY;
        let reply: string | null = null;

        if (groqKey) {
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
            if (r.ok) {
              const j = await r.json() as { choices: { message: { content: string } }[] };
              reply = j?.choices?.[0]?.message?.content?.toString() ?? null;
            } else {
              console.error("Groq error", r.status, await r.text().catch(() => ""));
            }
          } catch (e) {
            console.error("Groq exception", e);
          }
        }

        if (!reply) {
          reply = "I'm right here with you. Tell me one specific thing you want to move forward on today — sales, content, pricing, or a buyer reply — and we'll fix it together.";
        }

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
        try {
          const res = await fetch("https://api.fish.audio/v1/tts", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", model: "speech-1.6" },
            body: JSON.stringify(reqBody),
          });
          if (!res.ok) return Response.json({ fallback: true });
          const buf = Buffer.from(await res.arrayBuffer());
          return Response.json({ audio_b64: buf.toString("base64"), mime: "audio/mpeg", fallback: false });
        } catch {
          return Response.json({ fallback: true });
        }
      }

      // ── book-editor-state ────────────────────────────────────
      if (action === "book-editor-state") {
        const userId = verifySession(body.session as string);
        const { data: profile } = await supabaseAdmin
          .from("student_profiles").select("inner_circle_status, book_edits_used")
          .eq("user_id", userId).maybeSingle();
        const isInner = profile?.inner_circle_status === "active";
        const used = (profile?.book_edits_used as number | undefined) ?? 0;
        const TRIAL_LIMIT = 3;
        return Response.json({
          isInnerCircle: isInner,
          editsUsed: used,
          editsRemaining: isInner ? null : Math.max(0, TRIAL_LIMIT - used),
          modes: [
            { id: "professional-polish", label: "Professional Polish" },
            { id: "global-standard", label: "Global Standard Edit" },
            { id: "nigerian-to-global", label: "Nigerian to Global Voice" },
            { id: "clarity-simplicity", label: "Clarity and Simplicity" },
            { id: "full-manuscript-review", label: "Full Manuscript Review" },
          ],
        });
      }

      // ── run-book-editor ──────────────────────────────────────
      if (action === "run-book-editor") {
        const userId = verifySession(body.session as string);
        const { data: profile } = await supabaseAdmin
          .from("student_profiles").select("inner_circle_status, book_edits_used")
          .eq("user_id", userId).maybeSingle();
        const isInner = profile?.inner_circle_status === "active";
        const used = (profile?.book_edits_used as number | undefined) ?? 0;
        const TRIAL_LIMIT = 3;
        if (!isInner && used >= TRIAL_LIMIT) throw new Error(`Trial limit reached (${TRIAL_LIMIT} edits). Upgrade to Inner Circle for unlimited edits.`);

        const MODES: Record<string, string> = {
          "professional-polish": "You are a professional book editor. Polish the user's manuscript for professional publication quality: fix grammar, improve flow, sharpen sentences. Keep the author's original voice. Return only the edited text.",
          "global-standard": "You are an international publishing editor. Edit the text to meet global publishing standards (clarity, structure, formatting, vocabulary). Preserve meaning. Return only the edited text.",
          "nigerian-to-global": "You are an editor specialised in adapting Nigerian English manuscripts to a neutral global English voice that international readers find natural, while preserving authenticity. Return only the edited text.",
          "clarity-simplicity": "You are an editor who rewrites text for maximum clarity and simplicity, using plain language without losing depth. Return only the edited text.",
          "full-manuscript-review": "You are a senior developmental editor. Provide a full manuscript review: first a short structured critique (structure, pacing, voice, clarity, suggested improvements) followed by the revised text. Use clear headings.",
        };

        const modeSystem = MODES[body.mode as string];
        if (!modeSystem) throw new Error("Invalid editing mode");

        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) throw new Error("GROQ_API_KEY is not configured");

        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama3-8b-8192", temperature: 0.3,
            messages: [{ role: "system", content: modeSystem }, { role: "user", content: body.text }],
          }),
        });
        if (!resp.ok) throw new Error(`AI editor failed (${resp.status})`);
        const json = await resp.json() as { choices?: { message?: { content?: string } }[] };
        const edited = json.choices?.[0]?.message?.content?.trim() ?? "";
        if (!edited) throw new Error("AI returned empty result");

        const newUsed = used + 1;
        await supabaseAdmin.from("student_profiles").update({ book_edits_used: newUsed }).eq("user_id", userId);

        return Response.json({
          edited, modeLabel: Object.keys(MODES).indexOf(body.mode as string) >= 0 ? body.mode : "",
          isInnerCircle: isInner, editsUsed: newUsed,
          editsRemaining: isInner ? null : Math.max(0, TRIAL_LIMIT - newUsed),
        });
      }

      return Response.json({ error: "Unknown action" }, { status: 400 });

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Server error";
      console.error(`student-portal [${action}] error:`, err);
      return Response.json({ error: msg }, { status: 500 });
    }
  },
});
