import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/site/Logo";
import { LogOut, Shield, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import {
  checkIsAdmin,
  adminOverview,
  adminListLeads,
  adminListStudents,
  adminListCalls,
  adminListAmbassadors,
  adminListBudget,
  approveBudgetItem,
  grantAdminRoleByEmail,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — K2Ç Academy" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const checkAdmin = useServerFn(checkIsAdmin);
  const overview = useServerFn(adminOverview);
  const listLeads = useServerFn(adminListLeads);
  const listStudents = useServerFn(adminListStudents);
  const listCalls = useServerFn(adminListCalls);
  const listAmbs = useServerFn(adminListAmbassadors);
  const listBudget = useServerFn(adminListBudget);
  const approve = useServerFn(approveBudgetItem);
  const grantAdmin = useServerFn(grantAdminRoleByEmail);

  const [tab, setTab] = useState<"overview" | "leads" | "students" | "calls" | "ambassadors" | "budget">("overview");
  const [grantEmail, setGrantEmail] = useState("");

  const adminQ = useQuery({ queryKey: ["is-admin"], queryFn: () => checkAdmin() });
  const ovQ = useQuery({ queryKey: ["admin-ov"], queryFn: () => overview(), enabled: !!adminQ.data?.isAdmin });
  const leadsQ = useQuery({ queryKey: ["admin-leads"], queryFn: () => listLeads(), enabled: tab === "leads" && !!adminQ.data?.isAdmin });
  const studentsQ = useQuery({ queryKey: ["admin-students"], queryFn: () => listStudents(), enabled: tab === "students" && !!adminQ.data?.isAdmin });
  const callsQ = useQuery({ queryKey: ["admin-calls"], queryFn: () => listCalls(), enabled: tab === "calls" && !!adminQ.data?.isAdmin });
  const ambsQ = useQuery({ queryKey: ["admin-ambs"], queryFn: () => listAmbs(), enabled: tab === "ambassadors" && !!adminQ.data?.isAdmin });
  const budgetQ = useQuery({ queryKey: ["admin-budget"], queryFn: () => listBudget(), enabled: tab === "budget" && !!adminQ.data?.isAdmin });

  const approveMut = useMutation({
    mutationFn: (id: string) => approve({ data: { ledgerId: id, confirm: true } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-budget"] });
      qc.invalidateQueries({ queryKey: ["admin-ov"] });
      toast.success("Item approved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const grantMut = useMutation({
    mutationFn: () => grantAdmin({ data: { email: grantEmail } }),
    onSuccess: () => { setGrantEmail(""); toast.success("Admin granted."); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); };

  if (adminQ.isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading…</div>;
  }
  if (!adminQ.data?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <Shield className="h-12 w-12 text-yellow-400 mx-auto" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">You don't have access to this page.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/portal" })}>Back to portal</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-xs uppercase tracking-wider text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 rounded-full px-2 py-0.5">Admin</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <nav className="flex flex-wrap gap-2 border-b border-border pb-2">
          {(["overview", "leads", "students", "calls", "ambassadors", "budget"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm rounded-md ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>

        {tab === "overview" && ovQ.data && (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Leads" value={ovQ.data.counts.leads} />
            <StatCard label="Students" value={ovQ.data.counts.students} />
            <StatCard label="Certificates" value={ovQ.data.counts.certificates} />
            <StatCard label="Wins shared" value={ovQ.data.counts.results} />
            <StatCard label="Voice calls" value={ovQ.data.counts.voiceCalls} />
            <StatCard label="Ambassadors" value={ovQ.data.counts.ambassadors} />
            <StatCard label="Spent this month" value={`₦${ovQ.data.budget.monthSpentNgn.toLocaleString()}`} />
            <StatCard
              label="Pending approval"
              value={`₦${ovQ.data.budget.pendingNgn.toLocaleString()}`}
              warn={ovQ.data.budget.pendingNgn > 0}
            />
            {ovQ.data.budget.monthlyCapNgn > 0 && (
              <StatCard label="Monthly cap" value={`₦${ovQ.data.budget.monthlyCapNgn.toLocaleString()}`} />
            )}
            <div className="sm:col-span-2 lg:col-span-4 rounded-2xl border border-border bg-card p-6">
              <p className="text-sm font-semibold text-foreground">Grant admin to another user</p>
              <p className="text-xs text-muted-foreground mt-1">User must already have a K2Ç account.</p>
              <div className="mt-3 flex gap-2">
                <Input placeholder="email@example.com" value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} />
                <Button onClick={() => grantMut.mutate()} disabled={grantMut.isPending || !grantEmail}>
                  {grantMut.isPending ? "Granting…" : "Grant admin"}
                </Button>
              </div>
            </div>
          </section>
        )}

        {tab === "leads" && (
          <Table
            cols={["Name", "Email", "WhatsApp", "Date"]}
            rows={(leadsQ.data ?? []).map((l) => [l.name, l.email, l.whatsapp ?? "-", new Date(l.date_submitted).toLocaleString()])}
          />
        )}
        {tab === "students" && (
          <Table
            cols={["Name", "WhatsApp", "Phone", "Network", "Birthday", "Inner", "Cert", "Sale"]}
            rows={(studentsQ.data ?? []).map((s) => [s.full_name ?? "-", s.whatsapp ?? "-", s.phone_number ?? "-", s.network ?? "-", s.birthday ?? "-", s.is_inner_circle ? "✓" : "", s.certificate_issued ? "✓" : "", s.first_sale_made ? "✓" : ""])}
          />
        )}
        {tab === "calls" && (
          <Table
            cols={["Room", "Started", "Duration", "Type", "Amount", "Status"]}
            rows={(callsQ.data ?? []).map((c) => [c.livekit_room ?? "—", new Date(c.started_at).toLocaleString(), `${c.duration_seconds}s`, c.was_free ? "Free" : "Paid", `₦${c.amount_paid_ngn}`, c.status])}
          />
        )}
        {tab === "ambassadors" && (
          <Table
            cols={["Code", "Refs", "Paid refs", "Earned", "Paid out", "Bank"]}
            rows={(ambsQ.data ?? []).map((a) => [a.referral_code, a.total_referrals, a.total_paid_referrals, `₦${a.total_earned_ngn.toLocaleString()}`, `₦${a.total_paid_out_ngn.toLocaleString()}`, a.account_name ? `${a.account_name} (${a.bank_code} · ${a.bank_account_number})` : "-"])}
          />
        )}
        {tab === "budget" && (
          <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background/50">
                <tr>
                  {["Category", "Description", "Amount", "Status", "Action"].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(budgetQ.data ?? []).map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="px-4 py-2 text-foreground">{b.category}</td>
                    <td className="px-4 py-2 text-muted-foreground">{b.description}</td>
                    <td className="px-4 py-2 text-foreground">₦{b.amount_ngn.toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <span className={
                        b.status === "approved" ? "text-green-400" :
                        b.status === "pending" ? "text-yellow-400" :
                        b.status === "user_funded" ? "text-blue-400" : "text-muted-foreground"
                      }>{b.status}</span>
                    </td>
                    <td className="px-4 py-2">
                      {b.status === "pending" && (
                        <ApproveButton onApprove={() => approveMut.mutate(b.id)} pending={approveMut.isPending} amount={b.amount_ngn} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border ${warn ? "border-yellow-500/40 bg-yellow-500/5" : "border-border bg-card"} p-5`}>
      <p className="text-2xl font-bold text-foreground flex items-center gap-2">
        {warn && <AlertTriangle className="h-4 w-4 text-yellow-400" />} {value}
      </p>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function Table({ cols, rows }: { cols: string[]; rows: (string | number)[][] }) {
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead className="bg-background/50">
          <tr>{cols.map((c) => <th key={c} className="text-left px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-muted-foreground">No data yet.</td></tr>
          ) : rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              {r.map((cell, j) => <td key={j} className="px-4 py-2 text-foreground">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApproveButton({ onApprove, pending, amount }: { onApprove: () => void; pending: boolean; amount: number }) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        Confirm ₦{amount.toLocaleString()}
      </label>
      <Button size="sm" onClick={onApprove} disabled={!confirmed || pending}>
        <Check className="h-3 w-3 mr-1" /> Approve
      </Button>
    </div>
  );
}
