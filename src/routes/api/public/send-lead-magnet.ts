export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { name, email } = await request.json();

    if (!name || !email) {
      return Response.json({ error: "Name and email required" }, { status: 400 });
    }

    const firstName = name.split(" ")[0];
    const pdfUrl = "https://k2c-academy.lovable.app/5-things-you-already-know.pdf";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer re_cULx4BLu_LwMSWXukgGKy8nTzs4RrgEjX`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Digital Nathy <onboarding@resend.dev>",
        to: [email],
        subject: "Here is your free PDF from K2Ç Academy 🎁",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 32px; border-radius: 12px;">
            <h1 style="color: #FFD700; font-size: 24px;">Hey ${firstName}! 👋</h1>
            <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
              Your free guide — <strong>5 Things You Already Know That Can Earn You Money Online</strong> — is ready. Read it today. Pick one skill. That is your starting point.
            </p>
            <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
              But here is what the guide cannot do: it cannot show you <strong>HOW</strong> to turn that skill into your first sale. That is exactly what the <strong>Zero to First Online Sale System</strong> does.
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${pdfUrl}" style="background: #FFD700; color: #000000; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                📄 Download Your Free PDF
              </a>
            </div>
            <p style="color: #cccccc; font-size: 14px; text-align: center;">
              Prefer to save it? <a href="${pdfUrl}" style="color: #FFD700;">Click here to download</a>
            </p>
            <div style="background: #3D0066; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center;">
              <p style="color: #FFD700; font-weight: bold; margin: 0 0 8px 0;">150+ Nigerian beginners have already used this system to make their first legitimate online sale. Your turn starts here:</p>
              <a href="https://oniahemmanuel.systeme.io/da36229f" style="background: #FFD700; color: #000000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 8px;">
                GET INSTANT ACCESS — ₦9,997 🚀
              </a>
            </div>
            <div style="background: #7C3AED; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="color: #ffffff; margin: 0 0 12px 0;">Join our WhatsApp Channel for free daily tips from Digital Nathy:</p>
              <a href="https://whatsapp.com/channel/0029VbBM3Ao9mrGjHvT3k72Y" style="background: #FFD700; color: #000000; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                Join WhatsApp Channel 📣
              </a>
            </div>
            <p style="color: #FFD700; font-size: 16px; font-weight: bold; margin-top: 24px;">Stop Learning. Start Earning.</p>
            <p style="color: #888888; font-size: 13px;">
              — Digital Nathy, Nigeria's First Sale Coach 💜
            </p>
            <p style="color: #555555; font-size: 11px; font-style: italic;">
              P.S. Every student who commits to the system makes their first sale. The only ones who don't are the ones who never start.
            </p>
          </div>
        `,
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
