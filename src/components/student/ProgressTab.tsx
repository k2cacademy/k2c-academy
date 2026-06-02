import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { getMilestones, updateMilestone, type Milestone } from "@/lib/student-portal.functions";

export function ProgressTab({ session }: { session: string }) {
  const [items, setItems] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getMilestones(session)
      .then((r) => setItems(r.milestones))
      .finally(() => setLoading(false));
  }, [session]);

  const toggle = async (m: Milestone) => {
    setBusy(m.milestone);
    const next = !m.completed;
    setItems((arr) => arr.map((x) => x.milestone === m.milestone ? { ...x, completed: next } : x));
    try { await updateMilestone({ session, milestone: m.milestone, completed: next }); }
    catch {
      setItems((arr) => arr.map((x) => x.milestone === m.milestone ? { ...x, completed: !next } : x));
    } finally { setBusy(null); }
  };

  const done = items.filter((m) => m.completed).length;

  return (
    <div className="overflow-y-auto h-full text-white">
      <div className="mx-auto max-w-3xl w-full px-4 pt-6 pb-24 space-y-4">
        <div>
          <h2 className="text-xl font-bold">Your Journey</h2>
          <p className="text-sm text-white/60 mt-1">{done} of {items.length} milestones completed</p>
        </div>

        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: items.length ? `${(done / items.length) * 100}%` : "0%",
              background: "linear-gradient(90deg,#7C3AED,#FACC15)",
            }}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-white/60">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((m, i) => (
              <button
                key={m.milestone}
                onClick={() => toggle(m)}
                disabled={busy === m.milestone}
                className="w-full flex items-center gap-3 rounded-xl p-4 text-left transition disabled:opacity-50"
                style={{
                  background: m.completed ? "rgba(34,197,94,0.1)" : "rgba(20,20,30,0.6)",
                  border: `1px solid ${m.completed ? "rgba(34,197,94,0.4)" : "rgba(147,51,234,0.25)"}`,
                }}
              >
                {m.completed
                  ? <CheckCircle2 className="h-6 w-6 text-green-400 shrink-0" />
                  : <Circle className="h-6 w-6 text-white/40 shrink-0" />}
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${m.completed ? "text-green-200" : "text-white"}`}>
                    {i + 1}. {m.milestone}
                  </p>
                  {m.completed_at && (
                    <p className="text-[10px] text-white/50 mt-0.5">
                      Completed {new Date(m.completed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
