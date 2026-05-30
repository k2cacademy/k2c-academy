import { useState } from "react";
import { completeOnboarding } from "@/lib/student-portal.functions";
import { Rocket, Sparkles } from "lucide-react";

export function Onboarding({ session, onDone }: { session: string; onDone: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [first_name, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bMonth, setBMonth] = useState("");
  const [bDay, setBDay] = useState("");
  const [network, setNetwork] = useState<"MTN" | "Glo" | "Airtel" | "9mobile">("MTN");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const mm = bMonth.padStart(2, "0");
      const dd = bDay.padStart(2, "0");
      await completeOnboarding({
        session,
        first_name: first_name.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        birthday_md: `${mm}-${dd}`,
        network,
      });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at top, rgba(147,51,234,0.3) 0%, rgba(91,33,182,0.1) 35%, transparent 70%)" }} />
      <div className="relative w-full max-w-xl">
        <div className="rounded-[28px] p-8 md:p-10 backdrop-blur-xl" style={{ background: "linear-gradient(135deg, rgba(30,20,55,0.95) 0%, rgba(40,15,70,0.95) 100%)", border: "1px solid rgba(147,51,234,0.4)", boxShadow: "0 0 60px rgba(147,51,234,0.35)" }}>
          {step === 1 ? (
            <>
              <h1 className="text-3xl md:text-4xl font-bold text-white">You're in! Welcome to K2Ç Academy Student Portal! 🎉</h1>
              <p className="mt-4 text-white/80">Here's how your portal works:</p>
              <ul className="mt-4 space-y-3 text-white/90 text-[15px]">
                <li>✅ You have <strong>14 days free trial</strong> — all features unlocked immediately.</li>
                <li>🤖 Your K2Ç Personalised AI Coach is available 24/7 to guide you.</li>
                <li>🎙️ You get <strong>5 FREE call minutes daily</strong> to speak directly with your AI Coach.</li>
                <li>📞 Need more call time? Top up anytime: ₦100 = 5 mins · ₦300 = 20 mins · ₦500 = 45 mins.</li>
                <li>👑 After 14 days, join the K2Ç Inner Circle for ₦1,000/month to keep all access.</li>
              </ul>
              <button onClick={() => setStep(2)} className="mt-8 w-full py-4 rounded-2xl text-black font-bold text-lg flex items-center justify-center gap-2" style={{ background: "#FACC15", boxShadow: "0 0 40px rgba(250,204,21,0.55)" }}>
                <Sparkles className="h-5 w-5" /> Start My Free Trial
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl md:text-3xl font-bold text-white">Before your coach greets you 💜</h2>
              <p className="mt-2 text-white/75 text-sm">Let us know who we're talking to — we also want to celebrate you on your birthday!</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <Field label="First name">
                  <input required value={first_name} onChange={(e) => setFirstName(e.target.value)} className="input-dark" />
                </Field>
                <Field label="Email">
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-dark" />
                </Field>
                <Field label="WhatsApp (e.g. 08012345678)">
                  <input required inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="input-dark" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Birthday month">
                    <select required value={bMonth} onChange={(e) => setBMonth(e.target.value)} className="input-dark">
                      <option value="">Month</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString("en", { month: "long" })}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Day">
                    <select required value={bDay} onChange={(e) => setBDay(e.target.value)} className="input-dark">
                      <option value="">Day</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Phone network">
                  <select required value={network} onChange={(e) => setNetwork(e.target.value as typeof network)} className="input-dark">
                    <option value="MTN">MTN</option>
                    <option value="Glo">Glo</option>
                    <option value="Airtel">Airtel</option>
                    <option value="9mobile">9mobile</option>
                  </select>
                </Field>
                {err && <p className="text-sm text-red-400">{err}</p>}
                <button type="submit" disabled={busy} className="w-full py-4 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)", boxShadow: "0 0 40px rgba(147,51,234,0.6)" }}>
                  <Rocket className="h-5 w-5" /> {busy ? "Saving…" : "Meet My Coach"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <style>{`
        .input-dark { width: 100%; background: #0A0A0F; border: 1px solid rgba(147,51,234,0.3); border-radius: 12px; padding: 12px 14px; color: white; outline: none; font-size: 15px; transition: all 0.15s; }
        .input-dark:focus { border-color: #9333EA; box-shadow: 0 0 0 3px rgba(147,51,234,0.25); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-white/70 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
