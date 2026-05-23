import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function generateCode(name: string | null) {
  const slug = (name ?? "k2c")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8) || "k2c";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${slug}-${rand}`;
}

export const getOrCreateMyAmbassador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: existing } = await supabaseAdmin
      .from("ambassadors")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return existing;

    const { data: profile } = await supabaseAdmin
      .from("student_profiles")
      .select("full_name")
      .eq("user_id", userId)
      .maybeSingle();

    let code = generateCode(profile?.full_name ?? null);
    // ensure uniqueness
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await supabaseAdmin
        .from("ambassadors")
        .select("id")
        .eq("referral_code", code)
        .maybeSingle();
      if (!clash) break;
      code = generateCode(profile?.full_name ?? null);
    }
    const { data: created, error } = await supabaseAdmin
      .from("ambassadors")
      .insert({ user_id: userId, referral_code: code })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

export const getMyReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("ambassador_referrals")
      .select("id, referred_user_id, reward_ngn, payout_status, qualified_at, created_at")
      .eq("ambassador_user_id", userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

const BankInfo = z.object({
  bank_account_number: z.string().regex(/^\d{10}$/),
  bank_code: z.string().min(2).max(10),
  account_name: z.string().min(2).max(120),
});

export const updateAmbassadorBank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => BankInfo.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("ambassadors")
      .update(data)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Mark a referral as qualified (paid event) — called after Inner Circle payment / first paid product
const QualifyInput = z.object({ referredUserId: z.string().uuid(), event: z.string().min(2).max(60) });
export const qualifyReferral = createServerFn({ method: "POST" })
  .inputValidator((d) => QualifyInput.parse(d))
  .handler(async ({ data }) => {
    const { data: ref } = await supabaseAdmin
      .from("ambassador_referrals")
      .select("*")
      .eq("referred_user_id", data.referredUserId)
      .maybeSingle();
    if (!ref || ref.qualified_at) return { ok: true, skipped: true };

    await supabaseAdmin
      .from("ambassador_referrals")
      .update({ qualified_at: new Date().toISOString(), paid_qualifying_event: data.event })
      .eq("id", ref.id);

    // increment ambassador totals
    const { data: amb } = await supabaseAdmin
      .from("ambassadors")
      .select("total_paid_referrals, total_earned_ngn")
      .eq("user_id", ref.ambassador_user_id)
      .single();
    await supabaseAdmin
      .from("ambassadors")
      .update({
        total_paid_referrals: (amb?.total_paid_referrals ?? 0) + 1,
        total_earned_ngn: (amb?.total_earned_ngn ?? 0) + ref.reward_ngn,
      })
      .eq("user_id", ref.ambassador_user_id);

    // queue payout in budget ledger as pending admin approval
    await supabaseAdmin.from("budget_ledger").insert({
      category: "ambassador_payout",
      description: `Ambassador reward (₦${ref.reward_ngn}) for referral ${ref.id}`,
      amount_ngn: ref.reward_ngn,
      status: "pending",
      related_user_id: ref.ambassador_user_id,
      related_ref: ref.id,
    });
    return { ok: true };
  });
