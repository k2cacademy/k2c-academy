import { useEffect, useRef, useState } from "react";
import { PhoneOff, Mic, MicOff, Loader2 } from "lucide-react";
import Vapi from "@vapi-ai/web";
import { supabase } from "@/integrations/supabase/client";

const VAPI_PUBLIC_KEY = "a83a3d16-74f3-4f19-9fc7-3fa732cac8a1";
const VAPI_ASSISTANT_ID = "a16cf991-f420-44f4-8460-0129939c9fe3";

const FREE_TRIAL_SECONDS = 3 * 60;   // 3 mins for trial
const INNER_CIRCLE_SECONDS = 10 * 60; // 10 mins for Inner Circle

type CallStatus = "connecting" | "waiting-agent" | "connected" | "ending";

export function CallScreen({
  session,
  firstName,
  onClose,
  onNoMinutes,
  isInnerCircle = false,
  purchasedMinutes = 0,
}: {
  session: string;
  firstName: string;
  onClose: () => void;
  onNoMinutes: () => void;
  isInnerCircle?: boolean;
  purchasedMinutes?: number;
}) {
  const [status, setStatus] = useState<CallStatus>("connecting");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [timeWarning, setTimeWarning] = useState(false);
  const [previousContext, setPreviousContext] = useState<string | null>(null);

  const vapiRef = useRef<Vapi | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endingRef = useRef(false);
  const startedTimerRef = useRef(false);
  const messagesRef = useRef<string[]>([]);

  // Calculate max seconds based on plan + top up
  const baseSeconds = isInnerCircle ? INNER_CIRCLE_SECONDS : FREE_TRIAL_SECONDS;
  const topUpSeconds = purchasedMinutes * 60;
  const MAX_SECONDS = baseSeconds + topUpSeconds;

  // Load previous conversation memory
  
  // Start call once context is loaded
  useEffect(() => {
    if (previousContext === null) return;
    let cancelled = false;

    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      if (cancelled) return;
      setStauseEffect(() => {
  const getVapiSession = async () => {
    try {
      const res = await fetch("/api/public/hooks/vapi-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session }),
      });
      const data = await res.json();
      setVapiSessionId(data.vapiSessionId);
      setIsReturning(data.isReturning);
    } catch {
      setVapiSessionId(null);
    }
  };
  getVapiSession();
}, [session]);tus("waiting-agent");
    });

    vapi.on("speech-start", () => {
      if (cancelled) return;
      setAgentSpeaking(true);
      setStatus("connected");
      if (!startedTimerRef.current) {
        startedTimerRef.current = true;
        timerRef.current = setInterval(() => {
          setDuration(d => {
            const next = d + 1;
            if (next === MAX_SECONDS - 30) setTimeWarning(true);
            if (next >= MAX_SECONDS) {
              window.clearInterval(timerRef.current!);
              hangup(true);
              return MAX_SECONDS;
            }
            return next;
          });
        }, 1000);
      }
    });

    vapi.on("speech-end", () => {
      if (cancelled) return;
      setAgentSpeaking(false);
    });

    vapi.on("message", (msg: any) => {
      if (msg?.type === "transcript" && msg?.transcript) {
        messagesRef.current.push(`${msg.role}: ${msg.transcript}`);
      }
    });

    vapi.on("call-end", () => {
      saveMemory();
      cleanup();
      onClose();
    });

    vapi.on("error", (e: unknown) => {
      const msg = (e as { message?: string })?.message ?? "Call error. Please try again.";
      if (!cancelled) {
        setError(msg);
        setStatus("ending");
      }
    });

    (async () => {
      try {
        const memoryContext = previousContext
          ? `IMPORTANT: This student has spoken with you before. ${previousContext}. Continue from where you left off. Don't restart from scratch.`
          : `This is ${firstName}'s first session. Welcome them warmly and ask what skill they want to monetize.`;

        const planLabel = isInnerCircle ? "Inner Circle member" : "trial student";

        await vapi.start(VAPI_ASSISTANT_ID, {
          variableValues: {
            firstName,
            name: firstName,
            student_name: firstName,
            memory_context: memoryContext,
            plan: planLabel,
            minutes_available: String(Math.floor(MAX_SECONDS / 60)),
          },
        });
      } catch (e) {
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
  }, [previousContext]);

  const saveMemory = async () => {
    try {
      const conversation = messagesRef.current.join("\n");
      if (!conversation) return;

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer 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`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            {
              role: "system",
              content: "Summarize this coaching call. Return ONLY JSON: {summary, last_topic, progress}",
            },
            { role: "user", content: conversation },
          ],
          max_tokens: 200,
          temperature: 0.1,
        }),
      });

      if (!groqRes.ok) return;
      const groqData = await groqRes.json();
      const text = groqData.choices[0]?.message?.content || "{}";

      let parsed = { summary: "", last_topic: "", progress: "" };
      try { parsed = JSON.parse(text.replace(/```json|```/g, "").trim()); }
      catch { /* noop */ }

      await supabase.from("voice_call_memory").insert({
        session,
        student_name: firstName,
        summary: parsed.summary || conversation.slice(0, 200),
        last_topic: parsed.last_topic || "General coaching",
        progress: parsed.progress || "In progress",
        full_transcript: conversation,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Failed to save memory:", e);
    }
  };

  const cleanup = () => {
    if (endingRef.current) return;
    endingRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    try { vapiRef.current?.stop(); } catch { /* noop */ }
    vapiRef.current = null;
  };

  const hangup = (timeUp = false) => {
    setStatus("ending");
    saveMemory();
    cleanup();
    onClose();
    if (timeUp) onNoMinutes();
  };

  const toggleMute = () => {
    const v = vapiRef.current;
    if (!v) return;
    const next = !muted;
    try { v.setMuted(next); setMuted(next); }
    catch (e) { console.error(e); }
  };

  const timeRemaining = MAX_SECONDS - duration;
  const mm = String(Math.floor(timeRemaining / 60)).padStart(2, "0");
  const ss = String(timeRemaining % 60).padStart(2, "0");

  const planLabel = isInnerCircle
    ? `Inner Circle — ${Math.floor(MAX_SECONDS / 60)} mins/day`
    : `Free Trial — ${Math.floor(FREE_TRIAL_SECONDS / 60)} mins/day`;

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
        {/* Avatar */}
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
        <p className="mt-1 text-sm text-white/60">
          Hi {firstName}, glad you called. 👋
        </p>

        {/* Plan badge */}
        <span className={`mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
          isInnerCircle
            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
            : "bg-green-500/20 text-green-400 border border-green-500/30"
        }`}>
          {planLabel}
        </span>

        {previousContext && (
          <p className="mt-2 text-xs text-purple-400 text-center">
            ✨ Continuing from your last session
          </p>
        )}

        {/* Status */}
        <div className="mt-4 flex items-center gap-2 text-sm">
          {(status === "connecting" || status === "waiting-agent") ? (
            <Loader2 className={`h-4 w-4 animate-spin ${statusColor}`} />
          ) : status === "connected" ? (
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          ) : null}
          <span className={statusColor}>{statusLabel}</span>
        </div>

        {/* Countdown */}
        {status === "connected" && (
          <div className={`mt-6 text-6xl font-mono tabular-nums font-bold ${
            timeWarning ? "text-red-400 animate-pulse" : "text-white"
          }`}>
            {mm}:{ss}
          </div>
        )}

        {timeWarning && status === "connected" && (
          <p className="mt-2 text-xs text-red-400 animate-pulse">
            ⚠️ 30 seconds left!
          </p>
        )}

        {/* Top up notice */}
        {purchasedMinutes > 0 && (
          <p className="mt-1 text-xs text-blue-400 text-center">
            +{purchasedMinutes} purchased mins included
          </p>
        )}

        {error && (
          <p className="mt-4 max-w-xs text-center text-sm text-red-400">{error}</p>
        )}

        {/* Controls */}
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
              {muted
                ? <MicOff className="h-6 w-6 text-red-400" />
                : <Mic className="h-6 w-6 text-white" />
              }
            </button>
          )}

          <button
            onClick={() => hangup(false)}
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
