import { useState } from "react";
import { Lock, Shield, Zap, ArrowLeft } from "lucide-react";
import nathyPhoto from "@/assets/digital-nathy.jpg";

const WHATSAPP = "https://wa.me/2349164266235";

export function CodeGate({ onVerified }: { onVerified: (session: string) => void }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    const normalised = code.trim().toUpperCase()
      .replace(/Ç/g, "C")
      .replace(/ç/g, "C");

    const valid = ["K2C-STUDENT", "K2CACADEMY"].includes(normalised);

    setTimeout(() => {
      setBusy(false);
      if (valid) {
        onVerified(normalised);
      } else {
        setErr("Hmm, that code doesn't match. Check your purchase confirmation or WhatsApp us.");
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden flex items-center justify-center px-4 py-10">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(147,51,234,0.35) 0%, rgba(91,33,182,0.15) 35%, transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-2xl">
        <div
          className="rounded-[30px] p-[1px]"
          style={{
            background: "linear-gradient(135deg, #5B21B6 0%, #9333EA 100%)",
            boxShadow: "0 0 80px 0 rgba(147,51,234,0.55), 0 0 30px 0 rgba(147,51,234,0.35) inset",
          }}
        >
          <div
            className="rounded-[30px] p-8 md:p-10 backdrop-blur-xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(91,33,182,0.85) 0%, rgba(147,51,234,0.85) 100%)",
            }}
          >
            <div className="flex justify-center -mt-20 mb-6">
              <img
                src={nathyPhoto}
                alt="Digital Nathy"
                className="w-28 h-28 rounded-full object-cover"
                style={{
                  border: "2px solid rgba(255,255,255,0.3)",
                  boxShadow: "0 0 40px rgba(147,51,234,0.7)",
                }}
              />
            </div>

            <h1 className="text-center text-3xl md:text-4xl font-bold text-white tracking-tight">
              Student Coach Portal
            </h1>
            <p className="mt-3 text-center text-white/80 text-sm md:text-base max-w-md mx-auto">
              Your private AI study coach for the Zero to First Online Sale System. Available 24/7 — built on Digital Nathy's exact teaching.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["Full course coaching", "Personalised next steps", "Students only"].map((p) => (
                <span
                  key={p}
                  className="px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold text-white"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {p}
                </span>
              ))}
            </div>

            <form onSubmit={submit} className="mt-8 space-y-4">
              <div
                className={`flex items-center gap-3 rounded-2xl px-4 py-4 transition-all ${
                  err ? "ring-2 ring-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]" : ""
                }`}
                style={{
                  background: "#0A0A0F",
                  boxShadow: err ? undefined : "inset 0 0 20px rgba(147,51,234,0.2)",
                }}
              >
                <Lock className="h-5 w-5 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter your access code"
                  className="flex-1 bg-transparent outline-none text-white placeholder:text-gray-600 caret-purple-400 text-lg"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Access code"
                />
              </div>
              {err && <p className="text-sm text-red-300">{err}</p>}

              <button
                type="submit"
                disabled={busy || !code}
                className="w-full py-4 rounded-2xl text-white font-bold text-lg tracking-wide transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)",
                  boxShadow: "0 0 40px rgba(147,51,234,0.6), 0 10px 30px rgba(0,0,0,0.4)",
                }}
              >
                {busy ? "Unlocking…" : "Unlock My K2Ç Coach 🚀"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-white/80">
              Don't have a code?{" "}
              <a href={WHATSAPP} target="_blank" rel="noreferrer" className="text-yellow-400 font-semibold hover:underline">
                WhatsApp us.
              </a>
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Shield, label: "Trusted by K2Ç Students" },
            { icon: Lock, label: "Private and secure" },
            { icon: Zap, label: "24/7 answers in seconds" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{
                background: "rgba(20,20,30,0.6)",
                border: "1px solid rgba(147,51,234,0.3)",
                boxShadow: "0 0 20px rgba(147,51,234,0.1)",
              }}
            >
              <Icon className="h-5 w-5 text-yellow-400 shrink-0" />
              <span className="text-sm text-white/85 font-medium">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a href="/" className="text-xs text-gray-500 hover:text-gray-300 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
