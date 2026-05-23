import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const [
      { count: leadsCount },
      { count: studentsCount },
      { count: certsCount },
      { count: resultsCount },
      { count: callsCount },
      { count: ambassadorsCount },
      { data: budgetRows },
    ] = await Promise.all([
      supabaseAdmin.from("leads").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("student_profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("certificates").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("student_results").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("voice_call_log").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("ambassadors").select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("budget_ledger")
        .select("amount_ngn, status, created_at")
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ]);

    const monthSpentNgn = (budgetRows ?? [])
      .filter((r) => r.status === "approved" || r.status === "user_funded")
      .reduce((s, r) => s + (r.amount_ngn ?? 0), 0);
    const pendingNgn = (budgetRows ?? [])
      .filter((r) => r.status === "pending")
      .reduce((s, r) => s + (r.amount_ngn ?? 0), 0);

    const monthlyCapNgn = parseInt(process.env.ADMIN_BUDGET_MONTHLY_NGN || "0", 10) || 0;

    return {
      counts: {
        leads: leadsCount ?? 0,
        students: studentsCount ?? 0,
        certificates: certsCount ?? 0,
        results: resultsCount ?? 0,
        voiceCalls: callsCount ?? 0,
        ambassadors: ambassadorsCount ?? 0,
      },
      budget: { monthSpentNgn, pendingNgn, monthlyCapNgn },
    };
  });

export const adminListLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("leads")
      .select("id, name, email, whatsapp, date_submitted")
      .order("date_submitted", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const adminListStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("student_profiles")
      .select("user_id, full_name, whatsapp, phone_number, network, birthday, is_inner_circle, certificate_issued, first_sale_made, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const adminListCalls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("voice_call_log")
      .select("id, user_id, livekit_room, started_at, ended_at, duration_seconds, was_free, amount_paid_ngn, status")
      .order("started_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const adminListAmbassadors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("ambassadors")
      .select("user_id, referral_code, total_referrals, total_paid_referrals, total_earned_ngn, total_paid_out_ngn, account_name, bank_account_number, bank_code")
      .order("total_earned_ngn", { ascending: false });
    return data ?? [];
  });

export const adminListBudget = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("budget_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

const ApproveSchema = z.object({
  ledgerId: z.string().uuid(),
  confirm: z.literal(true),
});

export const approveBudgetItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ApproveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const cap = parseInt(process.env.ADMIN_BUDGET_MONTHLY_NGN || "0", 10);

    const { data: row } = await supabaseAdmin
      .from("budget_ledger")
      .select("*")
      .eq("id", data.ledgerId)
      .single();
    if (!row) throw new Error("Item not found");
    if (row.status !== "pending") throw new Error("Item is not pending");

    if (cap > 0) {
      const { data: monthRows } = await supabaseAdmin
        .from("budget_ledger")
        .select("amount_ngn, status")
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
      const spent = (monthRows ?? [])
        .filter((r) => r.status === "approved" || r.status === "user_funded")
        .reduce((s, r) => s + (r.amount_ngn ?? 0), 0);
      if (spent + row.amount_ngn > cap) {
        throw new Error(`Approving this would exceed the monthly cap (₦${cap.toLocaleString()}).`);
      }
    }

    await supabaseAdmin
      .from("budget_ledger")
      .update({
        status: "approved",
        approved_by: context.userId,
        approved_at: new Date().toISOString(),
        spent_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    return { ok: true };
  });

export const grantAdminRoleByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    const target = list?.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (!target) throw new Error("User not found");
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: target.id, role: "admin" })
      .select();
    return { ok: true };
  });
