import { useEffect, useState } from "react";
import { Flame, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { getDashboard, type DashboardData } from "@/lib/student-portal.functions";

export function StudentDashboard({ session }: { session: string }) {
  const [d, setD] = useState<DashboardData | null>(null);

  useEffect(() => {
    getDashboard(session).then(setD).catch(() => {});
  }, [session]);

  if (!d) return null;
  const totalMinutes = d.minutes_free_remaining + d.minutes_purchased;

  return (
    <div
      className="mx-auto max-w-3xl w-full mt-4 px-4"
    >
      <div
        className="rounded-2xl p-4"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(250,204,21,0.08))",
          border: "1px solid rgba(147,51,234,0.35)",
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-white/60">
              Day {d.day_n}{d.days_left !== null && !d.is_inner_circle ? ` · ${d.days_left} day${d.days_left === 1 ? "" : "s"} left in trial` : ""}
            </p>
            <h2 className="text-lg font-bold text-white">
              Welcome back, {d.first_name} 👋
            </h2>
          </div>
          {d.is_inner_circle && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full" style={{ background: "#FFD700", color: "#3D0066" }}>
              Inner Circle
            </span>
          )}
        </div>

        {d.trial_expiring_soon && (
          <div className="mt-3 flex items-center gap-2 text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Your trial ends in {d.days_left} day{d.days_left === 1 ? "" : "s"} — upgrade to Inner Circle to keep coaching.
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat
            icon={<Flame className={`h-4 w-4 ${d.streak_active_today ? "text-orange-400" : "text-white/50"}`} />}
            label="Streak"
            value={`${d.streak_current}d`}
            sub={`Best ${d.streak_longest}d`}
          />
          <Stat
            icon={<Clock className="h-4 w-4 text-green-400" />}
            label="Minutes today"
            value={`${totalMinutes}`}
            sub={d.minutes_purchased > 0 ? `${d.minutes_free_remaining} free + ${d.minutes_purchased}` : "free"}
          />
          <Stat
            icon={<TrendingUp className="h-4 w-4 text-purple-300" />}
            label="Course"
            value={`${d.modules_completed}/${d.modules_total}`}
            sub="modules"
          />
        </div>

        {d.last_action_step && (
          <div className="mt-4 rounded-xl bg-black/30 border border-white/10 p-3">
            <p className="text-[10px] uppercase tracking-wide text-white/50 mb-1">Next step from last session</p>
            <p className="text-sm text-white">{d.last_action_step}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-black/30 border border-white/10 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/50">
        {icon} {label}
      </div>
      <p className="mt-1 text-lg font-bold text-white tabular-nums">{value}</p>
      <p className="text-[10px] text-white/50">{sub}</p>
    </div>
  );
}
