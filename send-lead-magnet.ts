import type { Route } from "./+types/send-lead-magnet";
import { readFile } from "fs/promises";
import { join } from "path";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { name, email } = await request.json();

    if (!name || !email) {
      return Response.json({ error: "Name and email required" }, { status: 400 });
    }

    // Read PDF from public folder
    const pdfPath = join(process.cwd(), "public", "5-things-you-already-know.pdf");
    const pdfBuffer = await readFile(pdfPath);
    const pdfBase64 = pdfBuffer.toString("base64");

    // Send via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer re_cULx4BLu_LwMSWXukgGKy8nTzs4RrgEjX`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Digital Nathy <k2cacademy001@gmail.com>",
        to: [email],
        subject: "Here's your free PDF — 5 Things You Already Know That Can Earn You Money Online 🎁",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 32px; border-radius: 12px;">
            <img src="https://k2c-academy.lovable.app/favicon.ico" width="40" style="margin-bottom: 16px;" />
            <h1 style="color: #FFD700; font-size: 24px;">Hey ${name}! 👋</h1>
            <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
              Your free PDF is attached below. This is the K2Ç playbook — the exact same framework our students use to make their first sale online.
            </p>
            <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
              Read it. Apply it. Then come back and tell me about your first sale.
            </p>
            <div style="background: #3D0066; padding: 20px; border-radius: 8px; margin: 24px 0;">
              <p style="color: #FFD700; font-weight: bold; margin: 0 0 8px 0;">Ready to go further?</p>
              <p style="color: #ffffff; margin: 0 0 16px 0;">Join the Zero to First Online Sale System — Nigeria's most practical online income course.</p>
              <a href="https://oniahemmanuel.systeme.io/da36229f" style="background: #FFD700; color: #000000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Get Instant Access →</a>
            </div>
            <p style="color: #888888; font-size: 13px;">
              — Digital Nathy<br/>
              Founder, K2Ç Academy<br/>
              Nigeria's First Sale Coach
            </p>
            <p style="color: #555555; font-size: 11px; margin-top: 24px;">
              You're receiving this because you requested the free PDF at k2c-academy.lovable.app. No spam ever.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: "5-Things-You-Already-Know-K2C-Academy.pdf",
            content: pdfBase64,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend error:", error);
      return Response.json({ error: "Failed to send email" }, { status: 500 });
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error("Lead magnet error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
