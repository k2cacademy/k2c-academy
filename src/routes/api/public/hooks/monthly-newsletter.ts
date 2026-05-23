import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SUBJECT = "Your monthly K2Ç boost 🚀";
function html(name: string) {
  const first = name?.split(" ")[0] || "Champion";
  return `
<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0A0A0A;color:#fff;border-radius:12px">
  <h1 style="color:#FACC15;margin:0 0 8px">Hey ${first}, welcome to a new month 💛</h1>
  <p style="color:#cbd5e1">It's your monthly K2Ç boost. Here's your reminder: <strong>Stop learning. Start earning.</strong></p>
  <p style="color:#cbd5e1">This month, pick one skill, take one action, ship one offer. That's how the First Sale happens.</p>
  <p style="margin:24px 0">
    <a href="https://k2cacademy.lovable.app/portal" style="background:#7C3AED;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open my portal</a>
  </p>
  <hr style="border:0;border-top:1px solid #1f1f1f;margin:24px 0">
  <p style="color:#94a3b8;font-size:13px">Need anything? WhatsApp: <a style="color:#FACC15" href="https://wa.me/2349164266235">+234 916 426 6235</a></p>
</div>`;
}

export const Route = createFileRoute("/api/public/hooks/monthly-newsletter")({
  server: {
    handlers: {
      POST: async () => {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) return new Response(JSON.stringify({ ok: false, reason: "no_resend" }), { status: 200 });

        const { data: leads } = await supabaseAdmin
          .from("leads")
          .select("email, name");

        let sent = 0;
        for (const lead of leads ?? []) {
          if (!lead.email) continue;
          try {
            const r = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: "K2C Academy <onboarding@resend.dev>",
                to: [lead.email],
                subject: SUBJECT,
                html: html(lead.name ?? ""),
              }),
            });
            if (r.ok) sent++;
          } catch (e) {
            console.error("newsletter send error:", e);
          }
        }

        await supabaseAdmin.from("newsletter_log").insert({
          subject: SUBJECT,
          body_html: html("{name}"),
          recipients_count: sent,
          triggered_by: "cron",
        });

        return new Response(JSON.stringify({ ok: true, sent }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
