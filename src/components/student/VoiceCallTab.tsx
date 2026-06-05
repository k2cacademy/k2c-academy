import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Mic, MicOff, Loader2 } from "lucide-react";
import { startCallWithRotation, startLiveKitFallback, type VapiHandle } from "@/lib/vapi-rotation";
import { getMinutesState, recordVoiceMinutes, type MinutesState } from "@/lib/student-portal.functions";

type Status = "idle" | "connecting" | "in-call" | "ended" | "no-minutes";

const PLAN_LABEL: Record<MinutesState["plan"], string> = {
  free: "Free — 10 mins/month",
  inner_circle: "Inner Circle — 25 mins/month",
  premium: "Premium — 40 mins/month",
};

export function VoiceCallTab({
  session,
  email,
  onUpgrade,
}: {
  session: string;
  email: string;
  onUpgrade: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [minutes, setMinutes] = useState<MinutesState | null>(null);
  const handleRef = useRef<VapiHandle | null>(null);
  const startedAtRef = useRef<number>(0);
  const ringRef = useRef<HTMLAudioElement | null>(null);
  const stopRing = () => {
    try {
      if (ringRef.current) {
        ringRef.current.pause();
        ringRef.current.currentTime = 0;
        ringRef.current.src = "";
        ringRef.current.load();
        ringRef.current = null;
      }
    } catch { /* noop */ }
  };
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshMinutes = async () => {
    try { setMinutes(await getMinutesState(session)); } catch { /* noop */ }
  };

  useEffect(() => { void refreshMinutes(); }, [session]);

  useEffect(() => {
    return () => {
      handleRef.current?.end();
      if (tickRef.current) clearInterval(tickRef.current);
      ringRef.current?.pause();
    };
  }, []);

  const finish = async () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    const seconds = startedAtRef.current ? Math.floor((Date.now() - startedAtRef.current) / 1000) : 0;
    handleRef.current?.end();
    handleRef.current = null;
    if (seconds > 0) {
      try { await recordVoiceMinutes({ session, seconds }); } catch { /* noop */ }
    }
    setStatus("ended");
    setElapsed(0);
    startedAtRef.current = 0;
    await refreshMinutes();
  };

  const startCall = async () => {
    const m = await getMinutesState(session);
    setMinutes(m);
    if (m.total_remaining <= 0) { setStatus("no-minutes"); return; }

    setStatus("connecting");
    // Play ringtone while connecting
    try {
      // Use the two K2C ringtones interchangeably (random each call)
      const RINGTONES = ["/From Knowledge to Cash.mp3", "/From Knowledge to Cash (1).mp3"];
      const tone = RINGTONES[Math.floor(Math.random() * RINGTONES.length)];
      try { ringRef.current?.pause(); } catch { /* noop */ }
      ringRef.current = new Audio(encodeURI(tone));
      ringRef.current.loop = true;
      ringRef.current.volume = 0.55;
      await ringRef.current.play().catch(() => {});
    } catch { /* noop */ }

    await startCallWithRotation({
      onConnected: (h) => {
        handleRef.current = h;
        ringRef.current?.pause();
        startedAtRef.current = Date.now();
        setStatus("in-call");
        setMuted(false);
        tickRef.current = setInterval(() => {
          setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
        }, 1000);
      },
      onEnded: () => { void finish(); },
      onAllFailed: async () => {
        ringRef.current?.pause();
        const lk = await startLiveKitFallback(email);
        if (!lk) {
          setStatus("ended");
          return;
        }
        // Hand off to LiveKit — minimal: just acknowledge; full LiveKit room UI is out of scope here.
        // We still record the time as an "in-call" stub so the user can end the call.
        startedAtRef.current = Date.now();
        setStatus("in-call");
        tickRef.current = setInterval(() => {
          setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
        }, 1000);
      },
    });
  };

  const toggleMute = () => {
    const next = !muted;
    handleRef.current?.setMuted(next);
    setMuted(next);
  };

  const mmss = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-white">
      <div className="w-full max-w-sm text-center">
        <div className="h-28 w-28 rounded-full mx-auto flex items-center justify-center text-3xl font-bold mb-4"
          style={{ background: "linear-gradient(135deg,#5B21B6,#9333EA)", boxShadow: "0 0 50px rgba(147,51,234,0.5)" }}>
          {status === "connecting" ? <Loader2 className="h-8 w-8 animate-spin" /> : "AI"}
        </div>
        <h2 className="text-xl font-bold">K2Ç AI Sales Coach</h2>
        <p className="text-sm text-white/60 mt-1">{minutes ? PLAN_LABEL[minutes.plan] : "Loading…"}</p>

        {minutes && (
          <div className="rounded-2xl p-4 my-5" style={{ background: "rgba(20,20,30,0.6)", border: "1px solid rgba(147,51,234,0.3)" }}>
            <p className="text-2xl font-bold">
              {minutes.free_remaining + minutes.purchased}
              <span className="text-sm font-normal text-white/60"> mins left this month</span>
            </p>
            <p className="text-xs text-white/50 mt-1">
              {minutes.monthly_used}/{minutes.monthly_cap} used
              {minutes.purchased > 0 && ` · +${minutes.purchased} purchased`}
            </p>
          </div>
        )}

        {status === "in-call" && (
          <div className="rounded-2xl p-5 mb-4 bg-green-500/10 border border-green-500/30">
            <p className="text-3xl font-mono font-bold text-green-300 tabular-nums">{mmss(elapsed)}</p>
            <p className="text-xs text-green-200/80 mt-1">Connected</p>
          </div>
        )}

        {status === "connecting" && (
          <p className="text-sm text-purple-300 my-4 animate-pulse">Connecting to your coach…</p>
        )}

        {status === "no-minutes" && (
          <div className="rounded-2xl p-4 mb-4 bg-yellow-500/10 border border-yellow-500/30">
            <p className="text-sm text-yellow-300">You're out of minutes for this month.</p>
            <button onClick={onUpgrade} className="mt-3 px-4 py-2 rounded-xl bg-yellow-500 text-black font-bold text-sm">
              Upgrade Plan
            </button>
          </div>
        )}

        {status === "in-call" ? (
          <div className="flex gap-3 justify-center">
            <button onClick={toggleMute}
              className="h-14 w-14 rounded-full flex items-center justify-center bg-white/10 border border-white/20 hover:bg-white/20">
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <button onClick={finish}
              className="h-14 px-6 rounded-full flex items-center gap-2 bg-red-500 hover:bg-red-600 font-bold">
              <PhoneOff className="h-5 w-5" /> End Call
            </button>
          </div>
        ) : (
          <button
            onClick={startCall}
            disabled={status === "connecting"}
            className="w-full py-4 rounded-2xl font-bold text-black text-lg flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#FACC15,#FBBF24)", boxShadow: "0 0 40px rgba(250,204,21,0.45)" }}
          >
            <Phone className="h-5 w-5" /> Call My Coach
          </button>
        )}
      </div>
    </div>
  );
}
