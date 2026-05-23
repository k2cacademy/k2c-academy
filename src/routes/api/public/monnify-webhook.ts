import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHmac, timingSafeEqual } from "crypto";

// Monnify sends a SHA-512 HMAC of the raw body using the secret key,
// in the header "monnify-signature".
export const Route = createFileRoute("/api/public/monnify-webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const secret = process.env.MONNIFY_SECRET_KEY;
        if (!secret) return new Response("not-configured", { status: 500 });

        const raw = await request.text();
        const sig = request.headers.get("monnify-signature") ?? "";
        const expected = createHmac("sha512", secret).update(raw).digest("hex");
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

        let payload: {
          eventType?: string;
          eventData?: {
            paymentStatus?: string;
            paymentReference?: string;
            metaData?: { user_id?: string; minutes?: number };
          };
        };
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("bad-json", { status: 400 });
        }

        if (payload.eventType !== "SUCCESSFUL_TRANSACTION") {
          return new Response("ignored", { status: 200 });
        }
        const ref = payload.eventData?.paymentReference;
        const userId = payload.eventData?.metaData?.user_id;
        const minutes = Number(payload.eventData?.metaData?.minutes ?? 0);
        if (!ref || !userId || !minutes) {
          return new Response("missing-fields", { status: 400 });
        }

        // Mark recharge paid (idempotent)
        const { data: existing } = await supabaseAdmin
          .from("recharge_history")
          .select("id, status")
          .eq("flutterwave_reference", ref)
          .eq("user_id", userId)
          .maybeSingle();

        if (existing && existing.status === "paid") {
          return new Response("already-credited", { status: 200 });
        }

        await supabaseAdmin
          .from("recharge_history")
          .update({ status: "paid" })
          .eq("flutterwave_reference", ref)
          .eq("user_id", userId);

        const { data: prof } = await supabaseAdmin
          .from("student_profiles")
          .select("purchased_minutes_balance")
          .eq("user_id", userId)
          .single();
        const current = prof?.purchased_minutes_balance ?? 0;
        await supabaseAdmin
          .from("student_profiles")
          .update({ purchased_minutes_balance: current + minutes })
          .eq("user_id", userId);

        return new Response("ok", { status: 200 });
      },
    },
  },
});
