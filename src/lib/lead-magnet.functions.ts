import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  whatsapp: z.string().max(30).optional(),
});

export const sendLeadMagnet = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) throw new Error("Resend not configured");

    const APP_URL = process.env.APP_URL || process.env.SITE_URL || "https://k2cacademy.com";
    const pdfUrl = `${APP_URL}/5-things-you-already-know.pdf`;
    const firstName = data.name.split(" ")[0];

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Digital Nathy <onboarding@resend.dev>",
        to: [data.email],
        subject: "Your free K2Ç guide is here — plus one thing to know 🎁",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;">
            <h1 style="color:#FFD700;font-size:22px;line-height:1.4;">Your free K2Ç guide is here 🎁</h1>
            <p style="color:#ccc;font-size:16px;line-height:1.6;">Hey ${firstName}!</p>
            <p style="color:#ccc;font-size:16px;line-height:1.6;">
              Your free guide — <strong style="color:#fff;">5 Things You Already Know That Can Earn You Money Online</strong> — is ready.
              Read it today. Pick one skill. That is your starting point.
            </p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${pdfUrl}" style="background:#FFD700;color:#000;padding:16px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
                📄 Download Your Free PDF
              </a>
            </div>
            <p style="color:#ccc;font-size:15px;text-align:center;">
              Prefer the raw link? <a href="${pdfUrl}" style="color:#FFD700;text-decoration:underline;">Download it here.</a>
            </p>
            <hr style="border:none;border-top:1px solid #333;margin:28px 0;" />
            <p style="color:#ccc;font-size:16px;line-height:1.6;">
              But here is what the guide cannot do: show you <strong style="color:#fff;">HOW</strong> to turn that skill into your first sale.
              That is exactly what the <strong style="color:#fff;">Zero to First Online Sale System</strong> does.
            </p>
            <p style="color:#ccc;font-size:16px;line-height:1.6;">
              150+ Nigerian beginners have already used it to make their first legitimate online sale. Your turn:
            </p>
            <div style="text-align:center;margin:28px 0;">
              <a href="https://oniahemmanuel.systeme.io/da36229f" style="background:#FFD700;color:#000;padding:16px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
                GET INSTANT ACCESS — ₦9,997 🚀
              </a>
            </div>
            <div style="background:#7C3AED;padding:20px;border-radius:8px;text-align:center;margin:24px 0;">
              <p style="color:#fff;margin:0 0 14px 0;font-size:15px;">Join our WhatsApp Channel for free daily tips:</p>
              <a href="https://whatsapp.com/channel/0029VbBM3Ao9mrGjHvT3k72Y" style="background:#FFD700;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
                Join WhatsApp Channel 📣
              </a>
            </div>
            <p style="color:#FFD700;font-size:17px;font-weight:bold;margin-top:28px;">Stop Learning. Start Earning.</p>
            <p style="color:#888;font-size:13px;margin-top:8px;">— Digital Nathy, Nigeria's First Sale Coach 💜</p>
            <p style="color:#555;font-size:12px;font-style:italic;margin-top:16px;">
              P.S. Every student who commits to the system makes their first sale. The only ones who don't are the ones who never start.
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Email failed: ${res.status} ${body}`);
    }

    return { success: true };
  });
