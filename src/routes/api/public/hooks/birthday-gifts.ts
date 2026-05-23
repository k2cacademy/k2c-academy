import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ClubKonnect network codes
const NETWORK_CODE: Record<string, string> = {
  MTN: "01",
  Glo: "02",
  "9mobile": "03",
  Airtel: "04",
};

// 250MB plan codes per network on ClubKonnect (Nellobytes).
// NOTE: codes can change — adjust here if ClubKonnect updates their catalogue.
const DATA_PLAN_250MB: Record<string, string> = {
  MTN: "250", // MTN 250MB SME
  Glo: "G250", // Glo 250MB
  "9mobile": "9250",
  Airtel: "A250",
};

async function sendData(args: {
  phone: string;
  network: string;
}): Promise<{ ok: boolean; status: string; raw: unknown }> {
  const userId = process.env.CLUBKONNECT_USER_ID;
  const apiKey = process.env.CLUBKONNECT_API_KEY;
  if (!userId || !apiKey) return { ok: false, status: "missing_credentials", raw: null };

  const code = NETWORK_CODE[args.network];
  const plan = DATA_PLAN_250MB[args.network];
  if (!code || !plan) return { ok: false, status: "unsupported_network", raw: null };

  const requestId = `bday-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const url = new URL("https://www.nellobytesystems.com/APIDatabundleV1.asp");
  url.searchParams.set("UserID", userId);
  url.searchParams.set("APIKey", apiKey);
  url.searchParams.set("MobileNetwork", code);
  url.searchParams.set("DataPlan", plan);
  url.searchParams.set("MobileNumber", args.phone);
  url.searchParams.set("RequestID", requestId);

  try {
    const res = await fetch(url.toString());
    const text = await res.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch { /* keep text */ }
    const ok = res.ok && /ORDER_RECEIVED|ORDER_COMPLETED|SUCCESS/i.test(text);
    return { ok, status: ok ? "sent" : "failed", raw: parsed };
  } catch (e) {
    return { ok: false, status: "error", raw: String(e) };
  }
}

async function sendBirthdayEmail(email: string, name: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "K2C Academy <onboarding@resend.dev>",
        to: [email],
        subject: "🎂 Happy Birthday from K2Ç Academy!",
        html: `
<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0A0A0A;color:#fff;border-radius:12px">
  <h1 style="color:#FACC15;margin:0 0 8px">Happy Birthday, ${name || "Champion"}! 🎉🎂</h1>
  <p style="color:#cbd5e1">From everyone at K2Ç Academy — we hope this year brings you bigger wins, bigger sales, and unforgettable moments.</p>
  <p style="color:#cbd5e1">As our gift to you, we've sent <strong>250MB of data</strong> to the phone number on your profile. Stay online and keep building. 💛</p>
  <hr style="border:0;border-top:1px solid #1f1f1f;margin:24px 0">
  <p style="color:#94a3b8;font-size:13px">— Digital Nathy & the K2Ç family<br>WhatsApp: <a style="color:#FACC15" href="https://wa.me/2349164266235">+234 916 426 6235</a></p>
</div>`,
      }),
    });
  } catch (e) {
    console.error("birthday email failed:", e);
  }
}

export const Route = createFileRoute("/api/public/hooks/birthday-gifts")({
  server: {
    handlers: {
      POST: async () => {
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const yr = today.getFullYear();

        // pull all profiles whose birthday matches today (any year)
        const { data: profiles, error } = await supabaseAdmin
          .from("student_profiles")
          .select("user_id, full_name, phone_number, network, birthday")
          .not("birthday", "is", null);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        const todays = (profiles ?? []).filter((p) => {
          if (!p.birthday) return false;
          return p.birthday.slice(5) === `${mm}-${dd}`;
        });

        const results: Array<{ user_id: string; status: string }> = [];

        for (const p of todays) {
          // dedup: skip if we already sent this calendar year
          const { data: existing } = await supabaseAdmin
            .from("birthday_data_log")
            .select("id")
            .eq("user_id", p.user_id)
            .eq("sent_year", yr)
            .maybeSingle();
          if (existing) {
            results.push({ user_id: p.user_id, status: "already_sent" });
            continue;
          }

          let dataResult = { ok: false, status: "skipped_no_phone", raw: null as unknown };
          if (p.phone_number && p.network) {
            dataResult = await sendData({ phone: p.phone_number, network: p.network });
          }

          await supabaseAdmin.from("birthday_data_log").insert({
            user_id: p.user_id,
            phone_number: p.phone_number ?? "",
            network: p.network ?? "",
            amount_mb: 250,
            status: dataResult.status,
            api_response: dataResult.raw as never,
            sent_year: yr,
          });

          // send the email regardless of data result
          try {
            const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.user_id);
            if (u?.user?.email) await sendBirthdayEmail(u.user.email, p.full_name ?? "");
          } catch (e) {
            console.error("user lookup failed:", e);
          }

          results.push({ user_id: p.user_id, status: dataResult.status });
        }

        return new Response(
          JSON.stringify({ ok: true, processed: results.length, results }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
