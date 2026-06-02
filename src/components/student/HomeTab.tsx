import { useEffect, useState } from "react";
import { Phone, MessageSquare, BookOpen, TrendingUp, Crown, Flame, Sparkles } from "lucide-react";
import { getDashboard, type DashboardData, type Plan } from "@/lib/student-portal.functions";

const STAGES: { id: DashboardData["stage"]; label: string; emoji: string }[] = [
  { id: "seedling", label: "Seedling", emoji: "🌱" },
  { id: "sprout", label: "Sprout", emoji: "🌿" },
  { id: "grower", label: "Grower", emoji: "🌳" },
  { id: "closer", label: "Closer", emoji: "🎯" },
  { id: "winner", label: "Winner", emoji: "🏆" },
  { id: "ambassador", label: "Ambassador", emoji: "👑" },
];

const PLAN_BADGE: Record<Plan, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  free: { label: "Free", bg: "rgba(34,197,94,0.15)", color: "#86efac", icon: null },
  inner_circle: { label: "Inner Circle", bg: "rgba(250,204,21,0.18)", color: "#fde68a", icon: <Crown className="h-3.5 w-3.5" /> },
  premium: { label: "Premium", bg: "rgba(168,85,247,0.2)", color: "#d8b4fe", icon: <Sparkles className="h-3.5 w-3.5" /> },
};

export function HomeTab({
  session,
  onNavigate,
}: {
  session: string;
  onNavigate: (tab: "chat" | "voice" | "progress" | "account") => void;
}) {
  const [d, setD] = useState<DashboardData | null>(null);

  useEffect(() => { getDashboard(session).then(setD).catch(() => {}); }, [session]);

  if (!d) return <div className="flex items-center justify-center min-h-[40vh] text-white/50">Loading…</div>;

  const badge = PLAN_BADGE[d.plan];
  const stageIndex = STAGES.findIndex((s) => s.id === d.stage);
  const totalMinutes = d.minutes_free_remaining + d.minutes_purchased;

  const QUICK = [
    { icon: <MessageSquare className="h-5 w-5" />, label: "Talk to Coach", to: "chat" as const, color: "#7C3AED" },
    { icon: <Phone className="h-5 w-5" />, label: "Voice Call", to: "voice" as const, color: "#FACC15" },
    { icon: <BookOpen className="h-5 w-5" />, label: "Book Editor", to: "chat" as const, color: "#3B82F6" },
    { icon: <Crown className="h-5 w-5" />, label: "Upgrade Plan", to: "account" as const, color: "#EC4899" },
    { icon: <TrendingUp className="h-5 w-5" />, label: "Track Progress", to: "progress" as const, color: "#22C55E" },
  ];

  return (
    <div className="overflow-y-auto h-full text-white">
      <div className="mx-auto max-w-3xl w-full px-4 pt-6 pb-24 space-y-5">
        {/* Welcome */}
        <div className="rounded-2xl p-5"
          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(250,204,21,0.08))",
            border: "1px solid rgba(147,51,234,0.35)" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-white/60">Day {d.day_n}{d.days_left !== null && d.plan === "free" ? ` · ${d.days_left} day${d.days_left === 1 ? "" : "s"} of trial left` : ""}</p>
              <h1 className="text-2xl font-bold mt-1">Welcome, {d.first_name} 👋</h1>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0"
              style={{ background: badge.bg, color: badge.color }}>
              {badge.icon} {badge.label}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat icon={<Flame className={`h-4 w-4 ${d.streak_active_today ? "text-orange-400" : "text-white/40"}`} />}
              label="Streak" value={`${d.streak_current}d`} sub={`Best ${d.streak_longest}d`} />
            <Stat icon={<Phone className="h-4 w-4 text-green-400" />}
              label="Mins left" value={`${totalMinutes}`} sub={`${d.monthly_used}/${d.monthly_cap}`} />
            <Stat icon={<TrendingUp className="h-4 w-4 text-purple-300" />}
              label="Progress" value={`${d.modules_completed}/${d.modules_total}`} sub="milestones" />
          </div>
        </div>

        {/* Journey stage tracker */}
        <div className="rounded-2xl p-4" style={{ background: "rgba(20,20,30,0.6)", border: "1px solid rgba(147,51,234,0.25)" }}>
          <p className="text-xs uppercase tracking-wider text-white/50 mb-3 font-semibold">Your Journey</p>
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
            {STAGES.map((s, i) => {
              const reached = i <= stageIndex;
              const current = i === stageIndex;
              return (
                <div key={s.id} className="flex flex-col items-center min-w-[58px]">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg transition-all ${current ? "scale-110" : ""}`}
                    style={{
                      background: reached ? "linear-gradient(135deg,#7C3AED,#FACC15)" : "rgba(255,255,255,0.05)",
                      border: current ? "2px solid #FACC15" : "1px solid rgba(255,255,255,0.1)",
                      boxShadow: current ? "0 0 20px rgba(250,204,21,0.5)" : "none",
                    }}>
                    {s.emoji}
                  </div>
                  <p className={`text-[10px] mt-1 ${current ? "text-yellow-300 font-bold" : reached ? "text-white/70" : "text-white/30"}`}>{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Last action step */}
        {d.last_action_step && (
          <div className="rounded-2xl p-4" style={{ background: "rgba(20,20,30,0.6)", border: "1px solid rgba(147,51,234,0.25)" }}>
            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Next step from last session</p>
            <p className="text-sm">{d.last_action_step}</p>
          </div>
        )}

        {/* Quick actions */}
        <div>
          <p className="text-xs uppercase tracking-wider text-white/50 mb-3 font-semibold">Quick actions</p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK.map((q) => (
              <button key={q.label} onClick={() => onNavigate(q.to)}
                className="rounded-xl p-4 text-left transition hover:scale-[1.02]"
                style={{ background: "rgba(20,20,30,0.6)", border: `1px solid ${q.color}40` }}>
                <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-2"
                  style={{ background: `${q.color}22`, color: q.color }}>
                  {q.icon}
                </div>
                <p className="font-semibold text-sm">{q.label}</p>
              </button>
            ))}
          </div>
        </div>
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
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-white/50">{sub}</p>
    </div>
  );
}
