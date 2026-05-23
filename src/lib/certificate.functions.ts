import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

interface IssueArgs {
  userId: string;
  fullName: string;
}

export async function issueFirstSaleCertificate({ userId, fullName }: IssueArgs) {
  // Build PDF programmatically (landscape A4)
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const { width, height } = page.getSize();

  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const oblique = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const purple = rgb(0.486, 0.227, 0.929); // #7C3AED
  const gold = rgb(0.98, 0.804, 0.286); // #FACC15
  const dark = rgb(0.04, 0.04, 0.04);
  const muted = rgb(0.4, 0.4, 0.4);

  // Background
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
  // Border
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: purple,
    borderWidth: 3,
  });
  page.drawRectangle({
    x: 36,
    y: 36,
    width: width - 72,
    height: height - 72,
    borderColor: gold,
    borderWidth: 1,
  });

  // K2Ç badge
  page.drawText("K2C ACADEMY", {
    x: width / 2 - helvBold.widthOfTextAtSize("K2C ACADEMY", 14) / 2,
    y: height - 80,
    size: 14,
    font: helvBold,
    color: purple,
  });

  // Title
  const title = "CERTIFICATE OF ACHIEVEMENT";
  page.drawText(title, {
    x: width / 2 - helvBold.widthOfTextAtSize(title, 28) / 2,
    y: height - 140,
    size: 28,
    font: helvBold,
    color: dark,
  });

  page.drawText("This is proudly presented to", {
    x: width / 2 - helv.widthOfTextAtSize("This is proudly presented to", 14) / 2,
    y: height - 190,
    size: 14,
    font: helv,
    color: muted,
  });

  // Name
  page.drawText(fullName, {
    x: width / 2 - helvBold.widthOfTextAtSize(fullName, 36) / 2,
    y: height - 250,
    size: 36,
    font: helvBold,
    color: purple,
  });

  // Underline under name
  const nameWidth = helvBold.widthOfTextAtSize(fullName, 36);
  page.drawLine({
    start: { x: width / 2 - nameWidth / 2 - 20, y: height - 260 },
    end: { x: width / 2 + nameWidth / 2 + 20, y: height - 260 },
    thickness: 1.5,
    color: gold,
  });

  // Body
  const body =
    "for making your FIRST online sale with K2C Academy and joining";
  const body2 =
    "the new generation of Nigerian creators turning skill into income.";
  page.drawText(body, {
    x: width / 2 - helv.widthOfTextAtSize(body, 13) / 2,
    y: height - 305,
    size: 13,
    font: helv,
    color: dark,
  });
  page.drawText(body2, {
    x: width / 2 - helv.widthOfTextAtSize(body2, 13) / 2,
    y: height - 325,
    size: 13,
    font: helv,
    color: dark,
  });

  // Quote
  const quote = '"Stop learning. Start earning."';
  page.drawText(quote, {
    x: width / 2 - oblique.widthOfTextAtSize(quote, 14) / 2,
    y: height - 380,
    size: 14,
    font: oblique,
    color: muted,
  });

  // Date + signature
  const issued = new Date();
  const dateStr = issued.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  page.drawText("Issued: " + dateStr, {
    x: 80,
    y: 100,
    size: 11,
    font: helv,
    color: muted,
  });
  page.drawText("Digital Nathy", {
    x: width - 80 - helvBold.widthOfTextAtSize("Digital Nathy", 14),
    y: 110,
    size: 14,
    font: helvBold,
    color: dark,
  });
  page.drawText("Founder, K2C Academy", {
    x: width - 80 - helv.widthOfTextAtSize("Founder, K2C Academy", 10),
    y: 95,
    size: 10,
    font: helv,
    color: muted,
  });

  const pdfBytes = await pdf.save();

  // Upload to storage
  const fileName = `${userId}-${Date.now()}.pdf`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("certificates")
    .upload(fileName, pdfBytes, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (upErr) throw new Error("Upload failed: " + upErr.message);

  const { data: pub } = supabaseAdmin.storage
    .from("certificates")
    .getPublicUrl(fileName);
  const pdfUrl = pub.publicUrl;

  // Record in DB
  await supabaseAdmin.from("certificates").insert({
    user_id: userId,
    full_name: fullName,
    pdf_url: pdfUrl,
  });

  // Email via Resend (best-effort)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(userId);
      const email = userRes?.user?.email;
      if (email) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "K2C Academy <onboarding@resend.dev>",
            to: [email],
            subject: "🏆 Your First Sale Certificate is here!",
            html: `
<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0A0A0A;color:#fff;border-radius:12px">
  <h1 style="color:#FACC15;margin:0 0 8px">Congratulations, ${fullName}! 🎉</h1>
  <p style="color:#cbd5e1">You did it. Your <strong>First Sale Certificate</strong> from K2Ç Academy is ready.</p>
  <p style="margin:24px 0">
    <a href="${pdfUrl}" style="background:#7C3AED;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">📜 Download Certificate</a>
  </p>
  <p style="color:#94a3b8;font-size:14px">Share it on WhatsApp, Instagram, X — let the world see what you built.</p>
  <hr style="border:0;border-top:1px solid #1f1f1f;margin:24px 0">
  <p style="color:#94a3b8;font-size:13px">Need anything? Reply here or message us on WhatsApp: <a style="color:#FACC15" href="https://wa.me/2349164266235">+234 916 426 6235</a></p>
</div>`,
          }),
        });
      }
    } catch (e) {
      console.error("Certificate email failed:", e);
    }
  }

  return { pdfUrl };
}
