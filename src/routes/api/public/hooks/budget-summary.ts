import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Monthly admin email summarising spend + pending approvals.
export const Route = createFileRoute("/api/public/hooks/budget-summary")({
  server: {
    handlers: {
      POST: async () => {
        const apiKey = process.env.RESEND_API_KEY;
        const cap = parseInt(process.env.ADMIN_BUDGET_MONTHLY_NGN || "0", 10);
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

        const { data: rows } = await supabaseAdmin
          .from("budget_ledger")
          .select("category, amount_ngn, status")
          .gte("created_at", monthStart);

        const spent = (rows ?? []).filter((r) => r.status === "approved" || r.status === "user_funded")
          .reduce((s, r) => s + (r.amount_ngn ?? 0), 0);
        const pending = (rows ?? []).filter((r) => r.status === "pending")
          .reduce((s, r) => s + (r.amount_ngn ?? 0), 0);

        const { data: admins } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        const adminEmails: string[] = [];
        for (const a of admins ?? []) {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(a.user_id);
          if (u?.user?.email) adminEmails.push(u.user.email);
        }

        const html = `
<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0A0A0A;color:#fff;border-radius:12px">
  <h1 style="color:#FACC15;margin:0 0 8px">K2Ç Monthly Budget Summary</h1>
  <p style="color:#cbd5e1">Spent this month: <strong>₦${spent.toLocaleString()}</strong></p>
  <p style="color:#cbd5e1">Pending approval: <strong>₦${pending.toLocaleString()}</strong></p>
  ${cap ? `<p style="color:#cbd5e1">Monthly cap: <strong>₦${cap.toLocaleString()}</strong></p>` : ""}
  <p style="margin:24px 0">
    <a href="https://k2cacademy.lovable.app/admin" style="background:#7C3AED;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open admin panel</a>
  </p>
</div>`;

        if (apiKey && adminEmails.length > 0) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "K2C Academy <onboarding@resend.dev>",
              to: adminEmails,
              subject: "K2Ç budget summary",
              html,
            }),
          });
        }

        return new Response(JSON.stringify({ ok: true, spent, pending, recipients: adminEmails.length }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
