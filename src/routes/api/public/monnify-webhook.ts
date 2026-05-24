import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHmac, timingSafeEqual } from "crypto";
import { enrollStudent } from "@/lib/systemeio.server";

const MONNIFY_SECRET = "KVFH7UKBGDE5D74VKM2E05L24YQLB7AN";

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer re_cULx4BLu_LwMSWXukgGKy8nTzs4RrgEjX`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "K2Ç Academy <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
  } catch (e) {
    console.error("Email error:", e);
  }
}

async function sendTelegramAlert(message: string) {
  try {
    await fetch(
      `https://api.telegram.org/bot8925740017:AAGDUO-PckHZDslj7FDwzZE4eG4JHbRSYHk/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: "7115484089",
          text: message,
          parse_mode: "HTML",
        }),
      }
    );
  } catch (e) {
    console.error("Telegram error:", e);
  }
}

export const Route = createFileRoute("/api/public/monnify-webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const raw = await request.text();
        const sig = request.headers.get("monnify-signature") ?? "";
        const expected = createHmac("sha512", MONNIFY_SECRET)
          .update(raw)
          .digest("hex");

        try {
          if (
            sig.length !== expected.length ||
            !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
          ) {
            return new Response("bad-signature", { status: 401 });
          }
        } catch {
          return new Response("bad-signature", { status: 401 });
        }

        let payload: any = {};
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("bad-json", { status: 400 });
        }

        if (payload.eventType !== "SUCCESSFUL_TRANSACTION") {
          return new Response("ignored", { status: 200 });
        }

        const ref = payload.eventData?.paymentReference;
        const amount = Number(payload.eventData?.amountPaid ?? 0);
        const email = payload.eventData?.customer?.email;
        const name = payload.eventData?.customer?.name ?? "Student";
        const firstName = name.split(" ")[0];

        if (!ref || !email) {
          return new Response("missing-fields", { status: 400 });
        }

        // Determine what was paid for
        let paymentType = "unknown";
        if (amount >= 9000) {
          paymentType = "course";
        } else if (amount >= 750 && amount <= 850) {
          paymentType = "inner_circle_founding";
        } else if (amount >= 900 && amount <= 1100) {
          paymentType = "inner_circle";
        }

        // Check idempotency
        const { data: existing } = await (supabaseAdmin
          .from("payment_verifications") as any)
          .select("id, status")
          .eq("payment_reference", ref)
          .maybeSingle();

        if (existing?.status === "verified") {
          return new Response("already-processed", { status: 200 });
        }

        // Log payment
        await (supabaseAdmin.from("payment_verifications") as any).upsert({
          payment_reference: ref,
          email,
          full_name: name,
          expected_amount_ngn: amount,
          payment_type: paymentType,
          status: "verified",
          approved_at: new Date().toISOString(),
          approval_actor: "monnify",
        });

        // Handle course purchase
        if (paymentType === "course") {
          const now = new Date();
          const trialEnd = new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10);

          // Enroll in Systeme.io
          const enrolled = await enrollStudent(email, firstName);

          // Create/update student profile
          const { data: existingProfile } = await supabaseAdmin
            .from("student_profiles")
            .select("user_id")
            .eq("email", email)
            .maybeSingle();

          if (existingProfile) {
            await supabaseAdmin
              .from("student_profiles")
              .update({
                full_name: name,
                first_name: firstName,
                trial_start: now.toISOString().slice(0, 10),
                trial_end: trialEnd,
                status: "active",
                tags: ["K2Ç Student"],
                onboarding_complete: false,
              })
              .eq("email", email);
          } else {
            await (supabaseAdmin.from("student_profiles") as any).insert({
              email,
              full_name: name,
              first_name: firstName,
              trial_start: now.toISOString().slice(0, 10),
              trial_end: trialEnd,
              status: "active",
              tags: ["K2Ç Student"],
              onboarding_complete: false,
            });
          }

          // Log event
          await supabaseAdmin.from("student_events").insert({
            student_email: email,
            event_type: "enrolled",
            metadata: { payment_type: paymentType, amount, ref },
          });

          // Welcome email
          await sendEmail(
            email,
            "🎉 Welcome to K2Ç Academy! You're officially in.",
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 32px; border-radius: 12px;">
              <h1 style="color: #FFD700;">Welcome to K2Ç Academy, ${firstName}! 🎉</h1>
              <p style="color: #cccccc; font-size: 16px;">Your payment of ₦${amount.toLocaleString()} has been confirmed.</p>
              <p style="color: #cccccc; font-size: 16px;">You now have full access to the <strong>Zero to First Online Sale System</strong>.</p>
              <div style="background: #3D0066; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="color: #FFD700; font-weight: bold; margin: 0 0 8px 0;">Your next step:</p>
                <p style="color: #ffffff; margin: 0 0 16px 0;">Access your Student Portal and start your first module today.</p>
                <a href="https://k2c-academy.lovable.app/student-portal" style="background: #FFD700; color: #000000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Enter Student Portal →</a>
              </div>
              <p style="color: #cccccc;">Portal access code: <strong>K2Ç-STUDENT</strong></p>
              <p style="color: #888888; font-size: 13px;">— Digital Nathy<br/>Nigeria's First Sale Coach</p>
            </div>
            `
          );

          // Telegram alert
          await sendTelegramAlert(
            `💰 <b>NEW COURSE SALE!</b>\n\n👤 ${name}\n📧 ${email}\n💵 ₦${amount.toLocaleString()}\n📦 Zero to First Online Sale System\n🔗 Ref: ${ref}\n✅ Systeme.io: ${enrolled.ok ? "Enrolled" : "Failed - check manually"}`
          );
        }

        // Handle Inner Circle subscription
        if (paymentType === "inner_circle" || paymentType === "inner_circle_founding") {
          const now = new Date();
          const circleEnd = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);

          await (supabaseAdmin
            .from("student_profiles") as any)
            .update({
              inner_circle_status: "active",
              inner_circle_start: now.toISOString().slice(0, 10),
              inner_circle_end: circleEnd,
              tags: ["K2Ç Student", "Inner Circle"],
            })
            .eq("email", email);

          await sendEmail(
            email,
            "🔥 Inner Circle Access Activated!",
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 32px; border-radius: 12px;">
              <h1 style="color: #FFD700;">You're in the Inner Circle, ${firstName}! 🔥</h1>
              <p style="color: #cccccc; font-size: 16px;">Your Inner Circle subscription is now active.</p>
              <p style="color: #cccccc; font-size: 16px;">You now have access to:</p>
              <ul style="color: #cccccc;">
                <li>Unlimited AI Coach sessions</li>
                <li>AI Book Editor (unlimited edits)</li>
                <li>AI Creative Studio</li>
                <li>Priority support</li>
              </ul>
              <div style="background: #3D0066; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <a href="https://k2c-academy.lovable.app/student-portal" style="background: #FFD700; color: #000000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Enter Student Portal →</a>
              </div>
              <p style="color: #888888; font-size: 13px;">— Digital Nathy<br/>Nigeria's First Sale Coach</p>
            </div>
            `
          );

          await sendTelegramAlert(
            `⭐ <b>INNER CIRCLE PAYMENT!</b>\n\n👤 ${name}\n📧 ${email}\n💵 ₦${amount.toLocaleString()}\n📦 ${paymentType === "inner_circle_founding" ? "Founding Member (₦800)" : "Inner Circle (₦1,000)"}\n🔗 Ref: ${ref}`
          );
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
