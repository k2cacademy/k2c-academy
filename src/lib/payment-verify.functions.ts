import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PAYMENT_TYPES = {
  course: { amount: 9997, label: "Course" },
  inner_circle: { amount: 1000, label: "Inner Circle" },
  inner_circle_founding: { amount: 800, label: "Inner Circle (Founding)" },
} as const;

const BANK = {
  name: "Moniepoint MFB",
  account: "6450987909",
  holder: "Emmanuel Oniah",
};

const InputSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  whatsapp: z.string().trim().min(7).max(20),
  network: z.enum(["MTN", "Glo", "Airtel", "9mobile"]).optional(),
  payment_type: z.enum(["course", "inner_circle", "inner_circle_founding"]),
  receipt_path: z.string().min(3).max(500),
  receipt_mime: z.string().min(3).max(80),
});

type GeminiResult = {
  amount?: number;
  recipient_account?: string;
  recipient_name?: string;
  transaction_reference?: string;
  status?: string;
  date?: string;
  confidence: number;
  notes: string;
};

async function callGemini(imageBase64: string, mime: string, expectedAmount: number): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return { confidence: 0, notes: "Gemini key not configured — manual review required." };
  }
  const prompt = `You are verifying a Nigerian bank transfer receipt for K2Ç Academy.

Expected recipient: ${BANK.holder} — ${BANK.name} — account ${BANK.account}.
Expected amount: ₦${expectedAmount.toLocaleString()}.

Extract from the receipt image and respond ONLY with strict JSON (no markdown):
{
  "amount": number (NGN, no symbol),
  "recipient_account": string,
  "recipient_name": string,
  "transaction_reference": string,
  "status": string ("successful", "failed", "pending", or as shown),
  "date": string (ISO if possible),
  "confidence": number 0-100 (your confidence that this is a real, successful transfer matching the expected recipient AND amount),
  "notes": short string explaining any mismatch
}`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mime, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("Gemini error", res.status, t);
    return { confidence: 0, notes: `Gemini API error (${res.status}).` };
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  try {
    const parsed = JSON.parse(text);
    return {
      amount: typeof parsed.amount === "number" ? parsed.amount : Number(String(parsed.amount).replace(/[^\d.]/g, "")) || undefined,
      recipient_account: parsed.recipient_account,
      recipient_name: parsed.recipient_name,
      transaction_reference: parsed.transaction_reference,
      status: parsed.status,
      date: parsed.date,
      confidence: Number(parsed.confidence) || 0,
      notes: parsed.notes || "",
    };
  } catch (e) {
    console.error("Failed to parse Gemini JSON", e, text);
    return { confidence: 0, notes: "Could not parse AI response." };
  }
}

export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const cfg = PAYMENT_TYPES[data.payment_type];

    // Download the uploaded receipt
    const { data: file, error: dlErr } = await supabaseAdmin.storage
      .from("receipts")
      .download(data.receipt_path);
    if (dlErr || !file) {
      return { status: "error" as const, message: "We couldn't read your receipt. Please try uploading again." };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const base64 = buf.toString("base64");

    // Run Gemini Vision
    const result = await callGemini(base64, data.receipt_mime, cfg.amount);

    // Duplicate detection
    if (result.transaction_reference) {
      const { data: dup } = await supabaseAdmin
        .from("payment_verifications")
        .select("id")
        .eq("transaction_reference", result.transaction_reference)
        .maybeSingle();
      if (dup) {
        return {
          status: "duplicate" as const,
          message: "This receipt has already been used. WhatsApp us at 09164266235 if you believe this is an error.",
        };
      }
    }

    // Decision
    let verdict: "verified" | "review" | "rejected" = "review";
    const amountOk = result.amount && Math.abs(result.amount - cfg.amount) <= 1;
    const acctOk = (result.recipient_account ?? "").replace(/\D/g, "").includes(BANK.account);
    const successOk = (result.status ?? "").toLowerCase().includes("success");

    let confidence = result.confidence;
    if (amountOk && acctOk && successOk) confidence = Math.max(confidence, 90);
    if (!amountOk || !acctOk) confidence = Math.min(confidence, 60);

    if (confidence >= 85 && amountOk && acctOk) verdict = "verified";
    else if (confidence < 40) verdict = "rejected";

    // Save record
    await supabaseAdmin.from("payment_verifications").insert({
      full_name: data.full_name,
      email: data.email,
      whatsapp: data.whatsapp,
      network: data.network ?? null,
      payment_type: data.payment_type,
      expected_amount_ngn: cfg.amount,
      receipt_url: data.receipt_path,
      transaction_reference: result.transaction_reference ?? null,
      ai_confidence: confidence,
      ai_notes: result.notes,
      status: verdict,
    });

    // Notify admin on uncertain / rejected
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && verdict !== "verified") {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "K2C Academy <onboarding@resend.dev>",
            to: ["k2cacademy001@gmail.com"],
            subject: `⚠️ Manual Payment Verification — ${data.full_name}`,
            html: `<p><strong>${data.full_name}</strong> submitted a receipt for ${cfg.label} (₦${cfg.amount}).</p>
              <ul>
                <li>Email: ${data.email}</li>
                <li>WhatsApp: ${data.whatsapp}</li>
                <li>Verdict: ${verdict} (confidence ${confidence}%)</li>
                <li>AI notes: ${result.notes}</li>
                <li>Tx ref: ${result.transaction_reference ?? "—"}</li>
              </ul>`,
          }),
        });
      } catch (e) {
        console.error("admin email failed", e);
      }
    }

    if (verdict === "verified") {
      return {
        status: "verified" as const,
        message: "Payment Verified! Welcome! 🎉",
        next: data.payment_type === "course"
          ? "Your student access code: K2Ç-STUDENT. Head to the Student Portal to log in."
          : "Your Inner Circle is being activated — check your email shortly.",
      };
    }
    if (verdict === "rejected") {
      return {
        status: "rejected" as const,
        message: "We couldn't verify this payment automatically. WhatsApp us at 09164266235 with your receipt.",
      };
    }
    return {
      status: "review" as const,
      message: "We're reviewing your payment manually — usually within 30 minutes. WhatsApp 09164266235 if urgent.",
    };
  });
