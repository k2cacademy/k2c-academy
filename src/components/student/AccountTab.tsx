import { useEffect, useState } from "react";
import { Crown, Sparkles, Check, Loader2 } from "lucide-react";
import { flutterwaveInit, flutterwaveVerify, type Plan } from "@/lib/student-portal.functions";

declare global {
  interface Window {
    FlutterwaveCheckout?: (opts: Record<string, unknown>) => void;
  }
}

const FLW_SCRIPT_SRC = "https://checkout.flutterwave.com/v3.js";

function loadFlutterwave(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.FlutterwaveCheckout) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${FLW_SCRIPT_SRC}"]`);
    if (existing) { existing.addEventListener("load", () => resolve(true)); return; }
    const s = document.createElement("script");
    s.src = FLW_SCRIPT_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

const PLANS: { id: Plan; label: string; price: string; perks: string[]; highlight?: boolean }[] = [
  { id: "free", label: "Free", price: "₦0", perks: ["10 voice minutes / month", "AI Chat coach", "Progress tracker"] },
  { id: "inner_circle", label: "Inner Circle", price: "₦1,000 /mo", perks: ["100 voice minutes / month", "Inner Circle WhatsApp", "Book Editor unlimited"], highlight: true },
  { id: "premium", label: "Premium", price: "₦1,500 /mo", perks: ["250 voice minutes / month", "All Inner Circle perks", "Priority response"] },
];

export function AccountTab({
  session,
  currentPlan,
  firstName,
  email,
  whatsapp,
  onPlanChanged,
}: {
  session: string;
  currentPlan: Plan;
  firstName: string;
  email: string;
  whatsapp: string;
  onPlanChanged: () => void;
}) {
  const [busy, setBusy] = useState<Plan | null>(null);

  useEffect(() => { void loadFlutterwave(); }, []);

  const upgrade = async (plan: Plan) => {
    if (plan === "free" || plan === currentPlan) return;
    setBusy(plan);
    try {
      const init = await flutterwaveInit({ session, plan });
      const ok = await loadFlutterwave();
      if (!ok || !window.FlutterwaveCheckout) throw new Error("Could not load checkout. Try again.");
      window.FlutterwaveCheckout({
        public_key: init.publicKey,
        tx_ref: init.tx_ref,
        amount: init.amount,
        currency: init.currency,
        customer: { email: init.customer.email, name: init.customer.name, phone_number: init.customer.phone_number },
        customizations: { title: "K2Ç Academy", description: `${plan.replace("_", " ")} subscription`, logo: "" },
        meta: init.meta,
        callback: async (response: { transaction_id?: string | number; status?: string }) => {
          if (response.status === "successful" && response.transaction_id) {
            try {
              await flutterwaveVerify({ session, transaction_id: String(response.transaction_id), plan });
              onPlanChanged();
            } catch (e) { console.error("verify failed", e); }
          }
          setBusy(null);
        },
        onclose: () => setBusy(null),
      });
    } catch (e) {
      console.error(e);
      setBusy(null);
    }
  };

  return (
    <div className="overflow-y-auto h-full text-white">
      <div className="mx-auto max-w-3xl w-full px-4 pt-6 pb-24 space-y-5">
        <div>
          <h2 className="text-xl font-bold">Account</h2>
          <p className="text-sm text-white/60">Hey {firstName}! Manage your subscription below.</p>
        </div>

        <div className="rounded-2xl p-4" style={{ background: "rgba(20,20,30,0.6)", border: "1px solid rgba(147,51,234,0.3)" }}>
          <p className="text-xs uppercase tracking-wider text-white/50 mb-1">Current plan</p>
          <p className="text-lg font-bold flex items-center gap-2">
            {currentPlan === "premium" ? <Sparkles className="h-5 w-5 text-purple-300" /> :
              currentPlan === "inner_circle" ? <Crown className="h-5 w-5 text-yellow-400" /> : null}
            {currentPlan === "free" ? "Free" : currentPlan === "inner_circle" ? "Inner Circle" : "Premium"}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => {
            const isCurrent = p.id === currentPlan;
            return (
              <div key={p.id}
                className="rounded-2xl p-5 flex flex-col"
                style={{
                  background: p.highlight ? "linear-gradient(135deg,rgba(124,58,237,0.25),rgba(250,204,21,0.1))" : "rgba(20,20,30,0.6)",
                  border: `1px solid ${p.highlight ? "rgba(250,204,21,0.5)" : "rgba(147,51,234,0.25)"}`,
                }}>
                <p className="font-bold text-lg">{p.label}</p>
                <p className="text-2xl font-bold mt-1">{p.price}</p>
                <ul className="mt-4 space-y-2 flex-1">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm text-white/80">
                      <Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" /> {perk}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => upgrade(p.id)}
                  disabled={isCurrent || p.id === "free" || busy !== null}
                  className="mt-5 w-full py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                  style={{
                    background: isCurrent
                      ? "rgba(255,255,255,0.08)"
                      : p.id === "free"
                      ? "rgba(255,255,255,0.04)"
                      : "linear-gradient(135deg,#FACC15,#FBBF24)",
                    color: isCurrent || p.id === "free" ? "#fff8" : "#000",
                  }}
                >
                  {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> :
                    isCurrent ? "Current plan" : p.id === "free" ? "—" : `Upgrade to ${p.label}`}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-white/40 text-center">
          Powered by Flutterwave. Secure payment in Naira.
        </p>

        <div className="rounded-2xl p-4" style={{ background: "rgba(20,20,30,0.6)", border: "1px solid rgba(147,51,234,0.25)" }}>
          <p className="text-xs uppercase tracking-wider text-white/50 mb-2">Your details</p>
          <div className="text-sm space-y-1">
            <p><span className="text-white/60">Name:</span> {firstName}</p>
            <p><span className="text-white/60">Email:</span> {email || "—"}</p>
            <p><span className="text-white/60">WhatsApp:</span> {whatsapp || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
