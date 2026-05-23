import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { initRecharge } from "@/lib/student-portal.functions";
import { X, Tag } from "lucide-react";

const PACKS: { amount: 100 | 300 | 500; mins: number }[] = [
  { amount: 100, mins: 5 },
  { amount: 300, mins: 20 },
  { amount: 500, mins: 45 },
];

export function RechargeModal({
  session,
  open,
  onClose,
  reason,
}: {
  session: string;
  open: boolean;
  onClose: () => void;
  reason?: "no-minutes" | "session-end";
}) {
  const [busy, setBusy] = useState<number | null>(null);
  const [coupon, setCoupon] = useState("");
  const recharge = useServerFn(initRecharge);

  if (!open) return null;

  const validCoupon = coupon.trim().toUpperCase() === "FOUNDING20";

  const buy = async (amount: 100 | 300 | 500) => {
    setBusy(amount);
    try {
      const { checkoutUrl } = await recharge({ data: { session, amount_ngn: amount, coupon: coupon.trim() || undefined } });
      window.location.href = checkoutUrl;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not start payment");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md rounded-3xl p-7"
        style={{
          background: "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 100%)",
          border: "1px solid rgba(147,51,234,0.5)",
          boxShadow: "0 0 60px rgba(147,51,234,0.4)",
        }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white">
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-xl font-bold text-white">
          {reason === "session-end" ? "Great session! Need more time?" : "Your free minutes are used up 🎙️"}
        </h3>
        <p className="mt-1.5 text-sm text-white/70">Top up to keep coaching:</p>

        <div className="mt-4">
          <label className="text-xs text-white/60 flex items-center gap-1.5 mb-1.5">
            <Tag className="h-3 w-3" /> Founding member coupon
          </label>
          <input
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder="e.g. FOUNDING20"
            className="w-full bg-black/40 border border-purple-500/30 rounded-xl p-2.5 text-sm text-white outline-none focus:border-purple-500 uppercase"
          />
          {validCoupon && (
            <p className="mt-1 text-xs text-green-400">✓ 20% discount will be applied at checkout</p>
          )}
        </div>

        <div className="mt-5 space-y-3">
          {PACKS.map((p) => {
            const final = validCoupon ? Math.round(p.amount * 0.8) : p.amount;
            return (
              <button
                key={p.amount}
                onClick={() => buy(p.amount)}
                disabled={busy !== null}
                className="w-full py-3.5 rounded-xl text-white font-semibold flex items-center justify-between px-5 transition disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)",
                  boxShadow: "0 0 20px rgba(147,51,234,0.4)",
                }}
              >
                <span>
                  ₦{final}
                  {validCoupon && (
                    <span className="ml-2 text-xs line-through opacity-60">₦{p.amount}</span>
                  )}
                </span>
                <span>{p.mins} minutes</span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-white/60 text-center">
          Or wait until tomorrow for your 10 free minutes to reset.
        </p>
      </div>
    </div>
  );
}
