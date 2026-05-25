import { useEffect, useRef, useState } from "react";
import { PhoneOff, Mic, MicOff, Loader2 } from "lucide-react";
import Vapi from "@vapi-ai/web";

const VAPI_PUBLIC_KEY = "a83a3d16-74f3-4f19-9fc7-3fa732cac8a1";
const VAPI_ASSISTANT_ID = "a16cf991-f420-44f4-8460-0129939c9fe3";

type CallStatus = "connecting" | "waiting-agent" | "connected" | "ending";

export function CallScreen({
  session: _session,
  firstName,
  onClose,
  onNoMinutes: _onNoMinutes,
}: {
  session: string;
  firstName: string;
  onClose: () => void;
  onNoMinutes: () => void;
}) {
  const [status, setStatus] = useState<CallStatus>("connecting");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);

  const vapiRef = useRef<Vapi | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endingRef = useRef(false);
  const startedTimerRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      if (cancelled) return;
      setStatus("waiting-agent");
    });

    vapi.on("speech-start", () => {
      if (cancelled) return;
      setAgentSpeaking(true);
      setStatus("connected");
      if (!startedTimerRef.current) {
        startedTimerRef.current = true;
        timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      }
    });

    vapi.on("speech-end", () => {
      if (cancelled) return;
      setAgentSpeaking(false);
    });

    vapi.on("call-end", () => {
      cleanup();
      onClose();
    });

    vapi.on("error", (e: unknown) => {
      console.error("Vapi error", e);
      const msg = (e as { message?: string })?.message ?? "Call error. Please try again.";
      if (!cancelled) {
        setError(msg);
        setStatus("ending");
      }
    });

    (async () => {
      try {
        await vapi.start(VAPI_ASSISTANT_ID, {
          variableValues: { firstName, name: firstName },
        });
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError((e as Error)?.message ?? "Could not start call.");
          setStatus("ending");
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = () => {
    if (endingRef.current) return;
    endingRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    try {
      vapiRef.current?.stop();
    } catch {
      /* noop */
    }
    vapiRef.current = null;
  };

  const hangup = () => {
    setStatus("ending");
    cleanup();
    onClose();
  };

  const toggleMute = () => {
    const v = vapiRef.current;
    if (!v) return;
    const next = !muted;
    try {
      v.setMuted(next);
      setMuted(next);
    } catch (e) {
      console.error(e);
    }
  };

  const mm = String(Math.floor(duration / 60)).padStart(2, "0");
  const ss = String(duration % 60).padStart(2, "0");

  const statusLabel = {
    connecting: "Connecting...",
    "waiting-agent": "Coach is joining...",
    connected: "Live with your coach",
    ending: "Ending...",
  }[status];

  const statusColor = {
    connecting: "text-purple-300",
    "waiting-agent": "text-yellow-300",
    connected: "text-green-300",
    ending: "text-gray-400",
  }[status];

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center px-6">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(147,51,234,0.25) 0%, transparent 60%)",
        }}
      />

      <div className="relative flex flex-col items-center">
        <div
          className={`h-40 w-40 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-6 transition-all duration-300 ${
            agentSpeaking ? "animate-pulse scale-110" : ""
          }`}
          style={{
            background: "linear-gradient(135deg, #5B21B6, #9333EA)",
            boxShadow: agentSpeaking
              ? "0 0 60px rgba(147,51,234,0.8)"
              : "0 0 40px rgba(147,51,234,0.4)",
          }}
        >
          AI
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">
          Your K2Ç Personalised AI Coach
        </h2>
        <p className="mt-1 text-sm text-white/60">Hi {firstName}, glad you called.</p>

        <div className="mt-4 flex items-center gap-2 text-sm">
          {status === "connecting" || status === "waiting-agent" ? (
            <Loader2 className={`h-4 w-4 animate-spin ${statusColor}`} />
          ) : status === "connected" ? (
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          ) : null}
          <span className={statusColor}>{statusLabel}</span>
        </div>

        {status === "connected" && (
          <div className="mt-6 text-6xl font-mono text-white tabular-nums">
            {mm}:{ss}
          </div>
        )}

        {error && (
          <p className="mt-4 max-w-xs text-center text-sm text-red-400">{error}</p>
        )}

        <div className="mt-8 flex items-center gap-6">
          {status === "connected" && (
            <button
              onClick={toggleMute}
              className={`h-14 w-14 rounded-full flex items-center justify-center border transition ${
                muted
                  ? "border-red-500 bg-red-500/20"
                  : "border-white/20 bg-white/10 hover:bg-white/20"
              }`}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? (
                <MicOff className="h-6 w-6 text-red-400" />
              ) : (
                <Mic className="h-6 w-6 text-white" />
              )}
            </button>
          )}

          <button
            onClick={hangup}
            className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.6)] transition active:scale-95"
            aria-label="End call"
          >
            <PhoneOff className="h-8 w-8 text-white" />
          </button>
        </div>

        <p className="mt-6 text-xs text-white/40 text-center max-w-xs">
          {status === "connected"
            ? "Speak any time — even while coach is talking. They'll stop and listen."
            : status === "waiting-agent"
            ? "Your coach is joining... say hello! 👋"
            : ""}
        </p>
      </div>
    </div>
  );
}
