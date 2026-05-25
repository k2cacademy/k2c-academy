import { createFileRoute } from "@tanstack/react-router";
import { readFile } from "node:fs/promises";
import path from "node:path";

const RESEND_API_KEY = "re_cULx4BLu_LwMSWXukgGKy8nTzs4RrgEjX";

async function loadPdfBase64(): Promise<string | null> {
  const candidates = [
    path.join(process.cwd(), "public", "5-things-you-already-know.pdf"),
    path.join(process.cwd(), "dist", "public", "5-things-you-already-know.pdf"),
  ];
  for (const p of candidates) {
    try {
      const buf = await readFile(p);
      return Buffer.from(buf).toString("base64");
    } catch {
      /* try next */
    }
  }
  return null;
}

export const Route = createFileRoute("/api/public/send-lead-magnet")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { name, email } = (await request.json()) as { name?: string; email?: string };
          if (!name || !email) {
            return new Response(JSON.stringify({ error: "Name and email required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const pdfBase64 = await loadPdfBase64();
          const safeName = String(name).replace(/[<>]/g, "");

          const html = [
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 32px; border-radius: 12px;">',
            '<h1 style="color: #FFD700; font-size: 24px;">Hey ' + safeName + '!</h1>',
            '<p style="color: #cccccc; font-size: 16px; line-height: 1.6;">Your free PDF is attached below \u2014 the K2\u00C7 playbook our students use to make their first sale online.</p>',
            '<p style="color: #cccccc; font-size: 16px; line-height: 1.6;">Read it. Apply it. Then come back and tell me about your first sale.</p>',
            '<div style="background: #3D0066; padding: 20px; border-radius: 8px; margin: 24px 0;">',
            '<p style="color: #FFD700; font-weight: bold; margin: 0 0 8px 0;">Ready to go further?</p>',
            '<p style="color: #ffffff; margin: 0 0 16px 0;">Join the Zero to First Online Sale System.</p>',
            '<a href="https://oniahemmanuel.systeme.io/da36229f" style="background: #FFD700; color: #000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Get Instant Access</a>',
            '</div>',
            '<p style="color: #888; font-size: 13px;">\u2014 Digital Nathy<br/>Founder, K2\u00C7 Academy</p>',
            '</div>',
          ].join("");

          const body: Record<string, unknown> = {
            from: "K2C Academy <onboarding@resend.dev>",
            to: [email],
            subject: "Here is your free PDF from K2C Academy",
            html,
          };
          if (pdfBase64) {
            body.attachments = [
              { filename: "5-Things-You-Already-Know-K2C-Academy.pdf", content: pdfBase64 },
            ];
          }

          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: "Bearer " + RESEND_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });

          if (!resp.ok) {
            const errText = await resp.text();
            console.error("Resend error:", resp.status, errText);
            return new Response(JSON.stringify({ error: "Failed to send email", detail: errText }), {
              status: 502,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("send-lead-magnet error", e);
          return new Response(JSON.stringify({ error: "Server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
