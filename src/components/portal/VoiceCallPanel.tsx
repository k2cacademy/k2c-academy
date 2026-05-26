/**
 * VoiceCallPanel — K2Ç Academy
 *
 * Smart voice call system with full fallback chain:
 *   1. VAPI Primary Assistant
 *   2. VAPI Fallback A
 *   3. VAPI Fallback B
 *   4. VAPI Fallback C
 *   5. LiveKit Agent (Railway) — final unbreakable fallback
 *
 * Features:
 *  - Custom ringtone: /From Knowledge to Cash.mp3
 *  - 10 free minutes per calendar month (resets on the 1st)
 *  - Monthly usage persisted in localStorage, keyed by YYYY-MM
 *  - Silent assistant rotation — users never know a switch occurred
 *  - Mute / unmute during live call
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, Mic, MicOff, Loader2, Wifi } from "lucide-react";
import Vapi from "@vapi-ai/web";

// ─── Configuration ─────────────────────────────────────────────────────────

const FREE_MINUTES_PER_MONTH = 10;

const VAPI_CHAIN = [
  {
    label: "Primary",
    publicKey: "a83a3d16-74f3-4f19-9fc7-3fa732cac8a1",
    assistantId: "a16cf991-f420-44f4-8460-0129939c9fe3",
  },
  {
    label: "Fallback A",
    publicKey: "e6bf041d-1c62-4b94-a93c-52b563eef22c",
    assistantId: "5c3ce312-2f00-486c-8cd9-7da43417af4d",
  },
  {
    label: "Fallback B",
    publicKey: "2ef0603f-4704-4cf4-9be8-a581fc68b192",
    assistantId: "d1fd7394-f3bc-4a1d-8181-a05a4978c572",
  },
  {
    label: "Fallback C",
    publicKey: "04b01653-b99c-4749-b012-be91aa031768",
    assistantId: "e4d008ae-429f-4248-a503-33f30917b28e",
  },
] as const;

// ─── Monthly minutes helpers ───────────────────────────────────────────────

function getMonthKey() {
  const now = new Date();
  return `k2c_voice_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getSecondsUsedThisMonth(): number {
  try {
    return parseInt(localStorage.getItem(getMonthKey()) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function addSecondsToMonth(seconds: number) {
  try {
    const key = getMonthKey();
    const current = parseInt(localStorage.getItem(key) ?? "0", 10) || 0;
    localStorage.setItem(key, String(current + seconds));
  } catch { /* ignore */ }
}

// ─── Types ─────────────────────────────────────────────────────────────────

type CallStatus =
  | "idle"
  | "ringing"
  | "connecting"
  | "connected"
  | "switching"
  | "livekit"
  | "ended"
  | "limit_reached";

type VoiceEngine = "vapi" | "livekit";

// ─── Minutes bar ───────────────────────────────────────────────────────────

function MinutesBar({
  secondsUsed,
  totalSeconds,
}: {
  secondsUsed: number;
  totalSeconds: number;
}) {
  const pct = Math.min(100, (secondsUsed / totalSeconds) * 100);
  const remaining = Math.max(0, totalSeconds - secondsUsed);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isLow = pct > 75;

  return (
    <div className="w-full max-w-xs">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Monthly free time
        </span>
        <span
          className={`text-[11px] font-bold tabular-nums ${
            isLow ? "text-destructive" : "text-accent"
          }`}
        >
          {mins}:{secs.toString().padStart(2, "0")} left
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isLow
              ? "bg-destructive"
              : "bg-gradient-to-r from-primary to-primary-glow"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground text-right">
        Resets on the 1st of each month
      </p>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export function VoiceCallPanel({ email }: { email: string }) {
  const totalSeconds = FREE_MINUTES_PER_MONTH * 60;

  const [status, setStatus] = useState<CallStatus>(() =>
    getSecondsUsedThisMonth() >= totalSeconds ? "limit_reached" : "idle"
  );
  const [engine, setEngine] = useState<VoiceEngine>("vapi");
  const [muted, setMuted] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [monthSeconds, setMonthSeconds] = useState(getSecondsUsedThisMonth);
  const [error, setError] = useState("");
  const [vapiIndex, setVapiIndex] = useState(0);

  const vapiRef = useRef<InstanceType<typeof Vapi> | null>(null);
  const livekitRoomRef = useRef<unknown>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  const isLive = status === "connected" || status === "livekit";
  const isConnecting =
    status === "connecting" || status === "ringing" || status === "switching";
  const remainingSeconds = Math.max(0, totalSeconds - monthSeconds);

  // ── Ringtone ──────────────────────────────────────────────────────────────

  const playRingtone = useCallback(() => {
    try {
      const audio = new Audio("/From Knowledge to Cash.mp3");
      audio.loop = true;
      audio.volume = 0.6;
      audio.play().catch(() => { /* autoplay blocked — silent */ });
      ringtoneRef.current = audio;
    } catch { /* ignore */ }
  }, []);

  const stopRingtone = useCallback(() => {
    try {
      ringtoneRef.current?.pause();
      if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;
    } catch { /* ignore */ }
    ringtoneRef.current = null;
  }, []);

  // ── Timer ─────────────────────────────────────────────────────────────────

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setSessionSeconds((s) => s + 1);
      setMonthSeconds((m) => {
        const next = m + 1;
        addSecondsToMonth(1);
        return next;
      });
    }, 1000);
  };

  // Auto-end when monthly limit is reached mid-call
  useEffect(() => {
    if (isLive && monthSeconds >= totalSeconds) {
      endCall(true);
    }
  }, [monthSeconds, isLive]);

  // ── Cleanup ───────────────────────────────────────────────────────────────

  const cleanupVapi = () => {
    try { vapiRef.current?.stop(); } catch { /* ignore */ }
    vapiRef.current = null;
  };

  const cleanupLivekit = () => {
    try {
      (livekitRoomRef.current as { disconnect?: () => void })?.disconnect?.();
    } catch { /* ignore */ }
    livekitRoomRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const fullCleanup = () => {
    stopTimer();
    stopRingtone();
    cleanupVapi();
    cleanupLivekit();
  };

  useEffect(() => () => fullCleanup(), []);

  // ── VAPI connection ───────────────────────────────────────────────────────

  const connectVapi = async (index: number): Promise<boolean> => {
    if (index >= VAPI_CHAIN.length) return false;
    const assistant = VAPI_CHAIN[index];
    try {
      cleanupVapi();
      const vapi = new Vapi(assistant.publicKey);
      vapiRef.current = vapi;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("timeout")), 15000);

        vapi.on("call-start", () => {
          clearTimeout(timeout);
          resolve();
        });
        vapi.on("error", (err: unknown) => {
          clearTimeout(timeout);
          reject(err);
        });
        vapi.on("speech-start", () => setAgentSpeaking(true));
        vapi.on("speech-end", () => setAgentSpeaking(false));
        vapi.on("call-end", () => {
          setStatus((prev) => {
            if (prev === "connected") {
              fullCleanup();
              return "ended";
            }
            return prev;
          });
        });

        vapi.start(assistant.assistantId);
      });

      return true;
    } catch {
      cleanupVapi();
      return false;
    }
  };

  // ── LiveKit connection ────────────────────────────────────────────────────

  const connectLivekit = async (): Promise<boolean> => {
    try {
      if (!(window as unknown as { LivekitClient?: unknown }).LivekitClient) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src =
            "https://cdn.jsdelivr.net/npm/livekit-client@2.5.4/dist/livekit-client.umd.min.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("SDK load failed"));
          document.head.appendChild(script);
        });
      }

      const LivekitClient = (
        window as unknown as {
          LivekitClient: {
            Room: new (opts: unknown) => unknown;
            RoomEvent: Record<string, string>;
          };
        }
      ).LivekitClient;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const tokenRes = await fetch("/api/public/hooks/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!tokenRes.ok) throw new Error("Token request failed");
      const { token, roomName } = await tokenRes.json();

      await fetch("/api/public/hooks/livekit-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName }),
      });

      const room = new LivekitClient.Room({
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true },
      });
      livekitRoomRef.current = room;

      const r = room as {
        on: (event: string, cb: (...args: unknown[]) => void) => void;
        connect: (url: string, token: string) => Promise<void>;
        localParticipant: { setMicrophoneEnabled: (v: boolean) => Promise<void> };
      };

      r.on(LivekitClient.RoomEvent.TrackSubscribed, (track: { kind: string; attach: () => HTMLAudioElement }) => {
        if (track.kind === "audio") {
          setAgentSpeaking(true);
          const el = track.attach();
          el.autoplay = true;
          el.style.display = "none";
          document.body.appendChild(el);
        }
      });
      r.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track: { kind: string }) => {
        if (track.kind === "audio") setAgentSpeaking(false);
      });
      r.on(LivekitClient.RoomEvent.Disconnected, () => {
        setStatus((prev) => {
          if (prev === "livekit") { fullCleanup(); return "ended"; }
          return prev;
        });
      });

      await r.connect("wss://k2c-ai-coach-yt1puc7u.livekit.cloud", token);
      await r.localParticipant.setMicrophoneEnabled(true);
      return true;
    } catch {
      cleanupLivekit();
      return false;
    }
  };

  // ── Start call ────────────────────────────────────────────────────────────

  const startCall = async () => {
    if (remainingSeconds <= 0) {
      setStatus("limit_reached");
      return;
    }

    setError("");
    setSessionSeconds(0);
    setAgentSpeaking(false);
    setMuted(false);
    setVapiIndex(0);

    // Play ringtone
    setStatus("ringing");
    playRingtone();
    await new Promise((r) => setTimeout(r, 2000));
    stopRingtone();

    setStatus("connecting");

    // Walk VAPI chain
    for (let i = 0; i < VAPI_CHAIN.length; i++) {
      if (i > 0) {
        setStatus("switching");
        await new Promise((r) => setTimeout(r, 800));
        setStatus("connecting");
      }
      setVapiIndex(i);
      const ok = await connectVapi(i);
      if (ok) {
        setEngine("vapi");
        setStatus("connected");
        startTimer();
        return;
      }
    }

    // Fall back to LiveKit
    setStatus("switching");
    await new Promise((r) => setTimeout(r, 800));
    setStatus("connecting");

    const livekitOk = await connectLivekit();
    if (livekitOk) {
      setEngine("livekit");
      setStatus("livekit");
      startTimer();
      return;
    }

    setStatus("idle");
    setError(
      "Could not start your session right now. Please check your microphone permissions and try again, or WhatsApp us at 09164266235."
    );
  };

  // ── End call ──────────────────────────────────────────────────────────────

  const endCall = (limitReached = false) => {
    fullCleanup();
    setStatus(limitReached ? "limit_reached" : "ended");
    setMuted(false);
    setAgentSpeaking(false);
  };

  // ── Mute toggle ───────────────────────────────────────────────────────────

  const toggleMute = () => {
    if (engine === "vapi" && vapiRef.current) {
      vapiRef.current.setMuted(!muted);
      setMuted(!muted);
    } else if (engine === "livekit" && livekitRoomRef.current) {
      const r = livekitRoomRef.current as {
        localParticipant: { setMicrophoneEnabled: (v: boolean) => void };
      };
      r.localParticipant.setMicrophoneEnabled(muted);
      setMuted(!muted);
    }
  };

  // ── Status label ──────────────────────────────────────────────────────────

  const statusLabel = () => {
    switch (status) {
      case "idle": return `${FREE_MINUTES_PER_MONTH} free minutes per month · Tap to start`;
      case "ringing": return "Calling your AI coach…";
      case "connecting": return vapiIndex > 0 ? `Connecting (backup ${vapiIndex})…` : "Connecting…";
      case "switching": return "Optimising your connection…";
      case "connected": return agentSpeaking ? "Coach is speaking…" : "Your coach is listening 👂";
      case "livekit": return agentSpeaking ? "Coach is speaking…" : "Waiting for coach to join…";
      case "ended": return "Session ended. Great work! 🎉";
      case "limit_reached": return "Monthly free minutes used — resets on the 1st";
      default: return "";
    }
  };

  const elapsedMins = Math.floor(sessionSeconds / 60);
  const elapsedSecs = sessionSeconds % 60;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
          <Phone className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground leading-none">
            K2Ç AI Sales Coach
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Digital Nathy's AI Voice Coach — 24/7
          </p>
        </div>
        {isLive && (
          <div className="ml-auto flex items-center gap-1.5">
            <Wifi className="h-4 w-4 text-success" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {engine === "livekit" ? "LiveKit" : "VAPI"}
            </span>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center py-4">
        <div
          className={`relative h-24 w-24 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
            agentSpeaking && isLive
              ? "border-primary shadow-glow scale-110 animate-pulse"
              : isLive
              ? "border-success"
              : isConnecting
              ? "border-yellow-500/60 animate-pulse"
              : status === "limit_reached"
              ? "border-destructive/40"
              : "border-border"
          }`}
          style={{
            background: isLive
              ? "radial-gradient(circle, oklch(0.55 0.27 295 / 0.15), transparent)"
              : "transparent",
          }}
        >
          <span className="text-4xl select-none">
            {status === "limit_reached" ? "⏳" : "🧠"}
          </span>
          {isLive && (
            <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          )}
          {isConnecting && (
            <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-yellow-500 border-2 border-background flex items-center justify-center">
              <Loader2 className="h-3 w-3 text-black animate-spin" />
            </span>
          )}
        </div>

        <p className={`mt-4 text-sm text-center transition-colors ${isLive ? "text-foreground" : "text-muted-foreground"}`}>
          {statusLabel()}
        </p>

        {isLive && (
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            {elapsedMins}:{elapsedSecs.toString().padStart(2, "0")} this session
          </p>
        )}
      </div>

      {/* Monthly minutes bar — shown during active call */}
      {isLive && (
        <div className="flex justify-center my-4">
          <MinutesBar secondsUsed={monthSeconds} totalSeconds={totalSeconds} />
        </div>
      )}

      {/* Limit reached notice */}
      {status === "limit_reached" && (
        <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-center text-muted-foreground">
          Your {FREE_MINUTES_PER_MONTH} free minutes for this month are used up.
          <br />
          <span className="text-foreground font-semibold">
            Your allowance resets on the 1st of next month.
          </span>
          <br />
          <a
            href="https://wa.me/2349164266235"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-accent hover:underline"
          >
            WhatsApp us to upgrade your plan →
          </a>
        </div>
      )}

      {/* General error */}
      {error && (
        <div className="mb-4 rounded-xl bg-destructive/15 border border-destructive/40 px-4 py-3 text-sm text-destructive text-center">
          {error}
        </div>
      )}

      {/* Call controls */}
      <div className="flex items-center justify-center gap-6 mt-2">
        {!isLive && !isConnecting && status !== "limit_reached" && (
          <button
            onClick={startCall}
            className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 active:scale-95 flex items-center justify-center shadow-lg transition-all"
            aria-label="Start coaching call"
          >
            <Phone className="h-7 w-7 text-white" />
          </button>
        )}

        {isConnecting && (
          <button
            disabled
            className="h-16 w-16 rounded-full bg-yellow-500/80 flex items-center justify-center cursor-not-allowed"
            aria-label="Connecting"
          >
            <Loader2 className="h-7 w-7 text-white animate-spin" />
          </button>
        )}

        {isLive && (
          <>
            <button
              onClick={toggleMute}
              className="h-14 w-14 rounded-full border border-border bg-card hover:bg-card/80 active:scale-95 flex items-center justify-center transition-all"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? (
                <MicOff className="h-5 w-5 text-destructive" />
              ) : (
                <Mic className="h-5 w-5 text-foreground" />
              )}
            </button>
            <button
              onClick={() => endCall(false)}
              className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 flex items-center justify-center shadow-lg transition-all"
              aria-label="End call"
            >
              <PhoneOff className="h-7 w-7 text-white" />
            </button>
          </>
        )}
      </div>

      {/* Bottom hint */}
      {!isLive && status !== "limit_reached" && (
        <p className="mt-5 text-xs text-muted-foreground text-center">
          {remainingSeconds > 0
            ? `${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s remaining this month`
            : "No minutes remaining this month"}
        </p>
      )}
    </div>
  );
}
