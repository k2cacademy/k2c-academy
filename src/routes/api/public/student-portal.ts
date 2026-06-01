import { createFileRoute } from "@tanstack/react-router";
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

const ok = (data: unknown) => new Response(JSON.stringify(data), {
  status: 200, headers: { "Content-Type": "application/json" },
});
const err = (msg: string, status = 500) => new Response(JSON.stringify({ error: msg }), {
  status, headers: { "Content-Type": "application/json" },
});

export const Route = createFileRoute("/api/public/student-portal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Record<string, unknown>;
        try { body = await request.json(); }
        catch { return err("Invalid body", 400); }

        const action = body.action as string;

        try {

          // ── verify-code ──────────────────────────────────────────
          if (action === "verify-code") {
            const code = (body.code as string ?? "").trim();
            const { data: row, error: dbErr } = await supabaseAdmin
              .from("app_settings").select("value").eq("key", "student_access_code").maybeSingle();
            if (dbErr) throw new Error(dbErr.message);
            const expected = (row?.value ?? "K2Ç-STUDENT").trim();
            if (code !== expected) return ok({ ok: false });
            const userId = randomUUID();
            const today = new Date().toISOString().slice(0, 10);
            const end = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
            const { error: insErr } = await supabaseAdmin.from("student_profiles").insert({
              user_id: userId, trial_start: today, trial_end: end,
              daily_free_minutes_reset_date: today,
            });
            if (insErr) throw new Error("Could not create your profile. Please try again.");
            return ok({ ok: true, session: signSession(userId) });
          }

          // ── get-profile ──────────────────────────────────────────
          if (action === "get-profile") {
            const userId = verifySession(body.session as string);
            const { data: profile, error: dbErr } = await supabaseAdmin
              .from("student_profiles").select("*").eq("user_id", userId).maybeSingle();
            if (dbErr) throw new Error(dbErr.message);
            return ok(profile);
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
            const { error: dbErr } = await supabaseAdmin.from("student_profiles").update({
              first_name: parsed.first_name, full_name: parsed.first_name,
              email: parsed.email, whatsapp: parsed.whatsapp,
              birthday_md: parsed.birthday_md, network: parsed.network,
              onboarding_complete: true,
            }).eq("user_id", userId);
            if (dbErr) throw new Error(dbErr.message);
            return ok({ ok: true });
          }

          // ── get-chat-history ─────────────────────────────────────
          if (action === "get-chat-history") {
            const userId = verifySession(body.session as string);
            const { data, error: dbErr } = await supabaseAdmin
              .from("student_chat_messages")
              .select("id, role, content, created_at")
              .eq("user_id", userId)
              .order("created_at", { ascending: true })
              .limit(60);
            if (dbErr) throw new Error(dbErr.message);
            return ok(data ?? []);
          }

          // ── get-minutes-state ────────────────────────────────────
          if (action === "get-minutes-state") {
            const userId = verifySession(body.session as string);
            const { data: profile, error: dbErr } = await supabaseAdmin
              .from("student_profiles")
              .select("free_minutes_remaining, purchased_minutes, daily_free_minutes_reset_date, inner_circle_status")
              .eq("user_id", userId).maybeSingle();
            if (dbErr) throw new Error(dbErr.message);
            const today = new Date().toISOString().slice(0, 10);
            const isInner = profile?.inner_circle_status === "active";
            const dailyFree = isInner ? 10 : 3;
            if (profile?.daily_free_minutes_reset_date !== today) {
              await supabaseAdmin.from("student_profiles").update({
                free_minutes_remaining: dailyFree,
                daily_free_minutes_reset_date: today,
              }).eq("user_id", userId);
              return ok({ free_remaining: dailyFree, purchased: profile?.purchased_minutes ?? 0, total_remaining: dailyFree + (profile?.purchased_minutes ?? 0) });
            }
            const free = profile?.free_minutes_remaining ?? 0;
            const purchased = profile?.purchased_minutes ?? 0;
            return ok({ free_remaining: free, purchased, total_remaining: free + purchased });
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
              "\n\nThis is a LIVE VOICE call. Speak like a warm, empathetic mentor. " +
              "Acknowledge feeling FIRST in one short sentence, then give ONE concrete next step. " +
              "STRICT: Maximum 2 short sentences, under 35 words total. No lists. No emojis. No markdown.";

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
                    model: "llama-3.1-8b-instant", messages, temperature: 0.7,
                    max_tokens: isVoice ? 120 : 600,
                  }),
                });
                if (r.ok) {
                  const j = await r.json() as { choices: { message: { content: string } }[] };
                  reply = j?.choices?.[0]?.message?.content?.toString() ?? null;
                } else {
                  console.error("Groq error", r.status, await r.text().catch(() => ""));
                }
              } catch (e) { console.error("Groq exception", e); }
            }

            if (!reply) reply = "I'm right here with you. Tell me one specific thing you want to move forward on today — sales, content, pricing, or a buyer reply — and we'll fix it together.";

            await supabaseAdmin.from("student_chat_messages").insert({
              user_id: userId, role: "assistant", content: reply,
            });
            await bumpStreakForUser(userId);
            return ok({ reply });
          }

          // ── synthesize-voice ─────────────────────────────────────
          if (action === "synthesize-voice") {
            verifySession(body.session as string);
            const key = process.env.FISH_AUDIO_API_KEY;
            if (!key) return ok({ fallback: true });
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
              if (!res.ok) return ok({ fallback: true });
              const buf = Buffer.from(await res.arrayBuffer());
              return ok({ audio_b64: buf.toString("base64"), mime: "audio/mpeg", fallback: false });
            } catch { return ok({ fallback: true }); }
          }

          // ── init-recharge ────────────────────────────────────────
          if (action === "init-recharge") {
            const userId = verifySession(body.session as string);
            const amount = body.amount_ngn as number;
            const PACKS: Record<number, number> = { 100: 5, 300: 20, 500: 45 };
            const minutes = PACKS[amount];
            if (!minutes) throw new Error("Invalid pack");

            const contract = process.env.MONNIFY_CONTRACT_CODE;
            const token = process.env.MONNIFY_API_TOKEN;
            if (!contract || !token) throw new Error("Payment not configured");

            const reference = `K2C-${userId.slice(0, 8)}-${Date.now()}`;

            const { data: p } = await supabaseAdmin
              .from("student_profiles").select("first_name, email").eq("user_id", userId).maybeSingle();

            const r = await fetch("https://api.monnify.com/api/v1/merchant/transactions/init-transaction", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                amount,
                customerName: p?.first_name || "K2Ç Student",
                customerEmail: p?.email || "student@k2c.academy",
                paymentReference: reference,
                paymentDescription: `K2Ç ${minutes} call minutes`,
                currencyCode: "NGN",
                contractCode: contract,
                redirectUrl: `${process.env.APP_URL ?? ""}/student-portal?recharge=success`,
                metadata: { user_id: userId, minutes },
              }),
            });
            const j = await r.json() as { responseBody?: { checkoutUrl?: string } };
            const checkoutUrl = j?.responseBody?.checkoutUrl;
            if (!checkoutUrl) { console.error("Monnify init failed", j); throw new Error("Could not start payment. Try again."); }

            await supabaseAdmin.from("recharge_history").insert({
              user_id: userId, plan_name: `${minutes} mins`,
              amount_ngn: amount, minutes_added: minutes,
              flutterwave_reference: reference, status: "pending",
            });

            return ok({ checkoutUrl, finalAmount: amount });
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
            return ok({
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
              "global-standard": "You are an international publishing editor. Edit the text to meet global publishing standards. Preserve meaning. Return only the edited text.",
              "nigerian-to-global": "You are an editor specialised in adapting Nigerian English manuscripts to a neutral global English voice. Return only the edited text.",
              "clarity-simplicity": "You are an editor who rewrites text for maximum clarity and simplicity. Return only the edited text.",
              "full-manuscript-review": "You are a senior developmental editor. Provide a full manuscript review: first a structured critique, then the revised text. Use clear headings.",
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

            await supabaseAdmin.from("student_profiles")
              .update({ book_edits_used: used + 1 }).eq("user_id", userId);

            return ok({
              edited, isInnerCircle: isInner,
              editsUsed: used + 1,
              editsRemaining: isInner ? null : Math.max(0, TRIAL_LIMIT - (used + 1)),
            });
          }

          return err("Unknown action", 400);

        } catch (e) {
          const msg = e instanceof Error ? e.message : "Server error";
          console.error(`student-portal [${action}] error:`, e);
          return err(msg);
        }
      },
    },
  },
});
