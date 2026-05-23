import { createFileRoute } from "@tanstack/react-router";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  verifyWebhookHeader,
  sendMessage,
  answerCallbackQuery,
  editMessageReplyMarkup,
  formatWAT,
  escapeHtml,
} from "@/lib/telegram.server";
import { enrollStudent } from "@/lib/systemeio.server";

async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "K2Ç Academy <onboarding@resend.dev>",
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
  } catch (e) {
    console.error("Resend send failed", e);
  }
}

async function approve(verificationId: string): Promise<string> {
  const { data: v, error } = await supabaseAdmin
    .from("payment_verifications")
    .select("*")
    .eq("id", verificationId)
    .maybeSingle();
  if (error || !v) return "Verification not found";
  if (v.status === "verified" && v.approved_at) return "Already approved";

  const now = new Date();
  const trialStart = now.toISOString().slice(0, 10);
  const trialExpiry = new Date(now.getTime() + 14 * 86400_000).toISOString().slice(0, 10);

  // Upsert student profile (by email)
  const { data: existing } = await supabaseAdmin
    .from("student_profiles")
    .select("user_id, tags")
    .eq("email", v.email)
    .maybeSingle();

  const tags = Array.from(new Set([...(existing?.tags ?? []), "K2Ç Student"]));

  if (existing) {
    await supabaseAdmin
      .from("student_profiles")
      .update({
        full_name: v.full_name,
        whatsapp: v.whatsapp,
        trial_start: trialStart,
        trial_end: trialExpiry,
        status: "active",
        tags,
        onboarding_complete: false,
      })
      .eq("user_id", existing.user_id);
  } else {
    await supabaseAdmin.from("student_profiles").insert({
      user_id: randomUUID(),
      email: v.email,
      full_name: v.full_name,
      first_name: v.full_name.split(" ")[0] ?? null,
      whatsapp: v.whatsapp,
      network: v.network ?? null,
      trial_start: trialStart,
      trial_end: trialExpiry,
      status: "active",
      tags,
    });
  }

  // Mark verification approved
  await supabaseAdmin
    .from("payment_verifications")
    .update({
      status: "verified",
      approved_at: now.toISOString(),
      approval_actor: "telegram",
      reviewed_at: now.toISOString(),
    })
    .eq("id", verificationId);

  // Event log
  await supabaseAdmin.from("student_events").insert({
    student_email: v.email,
    event_type: "enrolled",
    metadata: { payment_type: v.payment_type, amount: v.expected_amount_ngn },
  });

  // Systeme.io enrollment
  const enrolled = await enrollStudent(v.email, v.full_name.split(" ")[0]);

  // Welcome email
  await sendEmail({
    to: v.email,
    subject: "Welcome to K2Ç Academy 🎉",
    html: `<h2>You're in, ${escapeHtml(v.full_name)}!</h2>
      <p>Your payment is verified. Your 14-day AI Coach trial is now active.</p>
      <p>Head to the Student Portal to get started: <a href="https://k2cacademy.com/student-portal">k2cacademy.com/student-portal</a></p>
      <p>— Digital Nathy</p>`,
  });

  return enrolled.ok ? "Approved + enrolled in Systeme.io" : `Approved (Systeme.io: ${enrolled.error})`;
}

async function reject(verificationId: string): Promise<string> {
  const { data: v, error } = await supabaseAdmin
    .from("payment_verifications")
    .select("*")
    .eq("id", verificationId)
    .maybeSingle();
  if (error || !v) return "Verification not found";

  await supabaseAdmin
    .from("payment_verifications")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      approval_actor: "telegram",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", verificationId);

  await sendEmail({
    to: v.email,
    subject: "We couldn't verify your K2Ç payment",
    html: `<p>Hi ${escapeHtml(v.full_name)},</p>
      <p>We were not able to verify the payment receipt you submitted. This is usually because the amount, recipient, or status didn't match.</p>
      <p>Please WhatsApp our support team at <a href="https://wa.me/2349164266235">09164266235</a> and we'll sort it out fast.</p>
      <p>— K2Ç Academy</p>`,
  });

  return "Rejected + emailed student";
}

export const Route = createFileRoute("/api/public/hooks/telegram-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
        if (!verifyWebhookHeader(secret)) {
          return new Response("Unauthorized", { status: 401 });
        }
        const update = await request.json().catch(() => ({}));
        const cb = (update as { callback_query?: {
          id: string;
          data?: string;
          message?: { chat: { id: number }; message_id: number };
          from?: { username?: string; first_name?: string };
        } }).callback_query;

        if (!cb || !cb.data) {
          return Response.json({ ok: true, ignored: true });
        }

        const [action, id] = cb.data.split(":");
        let result = "Unknown action";
        try {
          if (action === "approve" && id) result = await approve(id);
          else if (action === "reject" && id) result = await reject(id);
        } catch (e) {
          console.error("Telegram action failed", e);
          result = `Error: ${e instanceof Error ? e.message : String(e)}`;
        }

        // Audit
        await supabaseAdmin.from("telegram_actions").insert({
          action,
          target_id: id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          raw_callback: cb as any,
          result,
        });

        // ACK callback + remove buttons + post confirmation
        await answerCallbackQuery({
          callback_query_id: cb.id,
          text: result,
        });
        if (cb.message) {
          await editMessageReplyMarkup({
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id,
          });
          await sendMessage({
            text: `<b>${action === "approve" ? "✅ APPROVED" : "❌ REJECTED"}</b>\n${escapeHtml(result)}\n<i>${formatWAT(new Date())}</i>`,
          }).catch(() => undefined);
        }

        return Response.json({ ok: true });
      },
    },
  },
});
