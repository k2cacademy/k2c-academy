import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const LeadSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  whatsapp: z.string().trim().max(30).optional().or(z.literal("")),
});

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => LeadSchema.parse(data))
  .handler(async ({ data }) => {
    const whatsapp = data.whatsapp && data.whatsapp.length > 0 ? data.whatsapp : null;

    const { error: insertError } = await supabaseAdmin.from("leads").insert({
      name: data.name,
      email: data.email,
      whatsapp,
    });

    if (insertError) {
      console.error("Lead insert error:", insertError);
      throw new Error("We couldn't save your details. Please try again.");
    }

    // Sync to Systeme.io
    const systemeKey = process.env.SYSTEME_API_KEY;
    if (systemeKey) {
      try {
        const sysRes = await fetch("https://api.systeme.io/api/contacts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": systemeKey,
          },
          body: JSON.stringify({
            email: data.email,
            fields: [
              { slug: "first_name", value: data.name },
              ...(whatsapp ? [{ slug: "phone_number", value: whatsapp }] : []),
            ],
          }),
        });
        if (!sysRes.ok) {
          console.error("Systeme.io sync failed:", sysRes.status, await sysRes.text());
        }
      } catch (e) {
        console.error("Systeme.io sync threw:", e);
      }
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set — skipping email.");
      return { ok: true, emailed: false };
    }

    // Use the correct live URL — never fall back to Lovable
    const siteUrl =
      process.env.SITE_URL ||
      process.env.APP_URL ||
      "https://k2c-academy.k2cacademy001.workers.dev";

    const pdfUrl = `${siteUrl}/5-things-you-already-know.pdf`;
    const enrollUrl = "https://oniahemmanuel.systeme.io/da36229f";
    const channelUrl = "https://whatsapp.com/channel/0029VbBM3Ao9mrGjHvT3k72Y";

    const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#0A0A0A;color:#fff;padding:24px;margin:0">
<div style="max-width:560px;margin:0 auto;background:#141414;border-radius:16px;padding:28px;border:1px solid #2a2a2a">
  <h1 style="font-family:'Space Grotesk',Arial,sans-serif;font-size:22px;color:#FACC15;margin:0 0 16px">Your free K2Ç guide is here 🎁</h1>
  <p style="font-size:15px;line-height:1.6;color:#e5e5e5">Hey ${data.name}!</p>
  <p style="font-size:15px;line-height:1.6;color:#e5e5e5">Your free guide — <strong>5 Things You Already Know That Can Earn You Money Online</strong> — is ready. Read it today. Pick one skill. That is your starting point.</p>
  <p style="text-align:center;margin:24px 0">
    <a href="${pdfUrl}" style="display:inline-block;background:#FACC15;color:#0A0A0A;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px">📄 Download Your Free PDF</a>
  </p>
  <p style="text-align:center;margin:8px 0 0;font-size:13px;color:#a3a3a3">Prefer the raw link? <a href="${pdfUrl}" style="color:#A78BFA">Download it here</a>.</p>
  <hr style="border:none;border-top:1px solid #2a2a2a;margin:24px 0" />
  <p style="font-size:15px;line-height:1.6;color:#e5e5e5">But here is what the guide cannot do: show you <strong>HOW</strong> to turn that skill into your first sale. That is exactly what the <strong>Zero to First Online Sale System</strong> does.</p>
  <p style="font-size:15px;line-height:1.6;color:#e5e5e5">150+ Nigerian beginners have already used it to make their first legitimate online sale. Your turn:</p>
  <p style="text-align:center;margin:24px 0">
    <a href="${enrollUrl}" style="display:inline-block;background:#FACC15;color:#0A0A0A;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px">GET INSTANT ACCESS — ₦9,997 🚀</a>
  </p>
  <p style="margin-top:24px;font-family:'Space Grotesk',Arial,sans-serif;font-size:18px;color:#FACC15">Stop Learning. Start Earning.</p>
  <p style="font-size:14px;color:#a3a3a3">— Digital Nathy, Nigeria's First Sale Coach 💜</p>
  <p style="font-size:13px;line-height:1.5;color:#a3a3a3;margin-top:16px;font-style:italic">P.S. Every student who commits to the system makes their first sale. The only ones who don't are the ones who never start.</p>
</div>
<div style="max-width:560px;margin:14px auto 0;background:#7C3AED;border-radius:16px;padding:18px;text-align:center">
  <p style="margin:0 0 10px;font-size:14px;color:#fff">Join our WhatsApp Channel for free daily tips from Digital Nathy:</p>
  <a href="${channelUrl}" style="display:inline-block;background:#FACC15;color:#0A0A0A;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">Join WhatsApp Channel 📢</a>
</div>
</body></html>`;

    // Attach PDF directly to email
    let attachment: { filename: string; content: string } | null = null;
    try {
      const pdfRes = await fetch(pdfUrl);
      if (pdfRes.ok) {
        const buf = await pdfRes.arrayBuffer();
        const b64 = Buffer.from(buf).toString("base64");
        attachment = {
          filename: "5-Things-You-Already-Know-K2C-Academy.pdf",
          content: b64,
        };
      } else {
        console.warn("PDF fetch failed:", pdfRes.status, pdfUrl);
      }
    } catch (e) {
      console.error("PDF attach fetch failed:", e);
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: "K2Ç Academy <onboarding@resend.dev>",
          to: [data.email],
          subject: "Your free K2Ç guide is here 🎁",
          html,
          ...(attachment ? { attachments: [attachment] } : {}),
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error("Resend send failed:", res.status, body);
        return { ok: true, emailed: false };
      }

      return { ok: true, emailed: true };
    } catch (e) {
      console.error("Resend send threw:", e);
      return { ok: true, emailed: false };
    }
  });
