import { useEffect, useRef, useState } from "react";
import { PhoneOff, Mic, MicOff, Loader2 } from "lucide-react";
import Vapi from "@vapi-ai/web";
import { supabase } from "@/integrations/supabase/client";

const ASSISTANTS = [
  {
    publicKey: "a83a3d16-74f3-4f19-9fc7-3fa732cac8a1",
    assistantId: "a16cf991-f420-44f4-8460-0129939c9fe3",
  },
  {
    publicKey: "e6bf041d-1c62-4b94-a93c-52b563eef22c",
    assistantId: "5c3ce312-2f00-486c-8cd9-7da43417af4d",
  },
  {
    publicKey: "2ef0603f-4704-4cf4-9be8-a581fc68b192",
    assistantId: "d1fd7394-f3bc-4a1d-8181-a05a4978c572",
  },
  {
    publicKey: "04b01653-b99c-4749-b012-be91aa031768",
    assistantId: "e4d008ae-429f-4248-a503-33f30917b28e",
  },
];

const RINGTONES = [
  "/From Knowledge to Cash.mp3",
  "/From Knowledge to Cash (1).mp3",
];

const FREE_TRIAL_SECONDS = 10 * 60;
const INNER_CIRCLE_SECONDS = 10 * 60;

type CallStatus = "connecting" | "waiting-agent" | "connected" | "ending";

// ── Pre-load ringtones so they play instantly ─────────────────────────────
const preloadedAudio = RINGTONES.map((src) => {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = 0.6;
  return audio;
});

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
  const [vapiSessionId, setVapiSessionId] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [blockedNoMinutes, setBlockedNoMinutes] = useState(false);
  const [freeSecondsUsed, setFreeSecondsUsed] = useState(0);

  const vapiRef = useRef<Vapi | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endingRef = useRef(false);
  const startedTimerRef = useRef(false);
  const messagesRef = useRef<string[]>([]);
  const ringAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneIndexRef = useRef(0);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usageRef = useRef<{ id: string; free_seconds_used: number } | null>(null);
  const durationRef = useRef(0);

  const topUpSeconds = purchasedMinutes * 60;

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // ── Ringtone: starts immediately on mount (triggered by button click) ─────
  useEffect(() => {
    let currentIndex = 0;

    const playNext = () => {
      // Stop current
      if (ringAudioRef.current) {
        ringAudioRef.current.pause();
        ringAudioRef.current.currentTime = 0;
      }
      // Use preloaded audio
      const audio = preloadedAudio[currentIndex % preloadedAudio.length];
      audio.currentTime = 0;
      audio.volume = 0.6;
      audio.loop = false;
      ringAudioRef.current = audio;
      // Play immediately — works because user just clicked a button
      audio.play().catch(() => {
        // Fallback: try creating fresh Audio object
        const freshAudio = new Audio(RINGTONES[currentIndex % RINGTONES.length]);
        freshAudio.volume = 0.6;
        freshAudio.play().catch(() => {});
        ringAudioRef.current = freshAudio;
      });
      currentIndex++;
    };

    // Play first track immediately
    playNext();

    // Switch track every 15 seconds
    ringIntervalRef.current = setInterval(playNext, 15000);

    return () => {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      if (ringAudioRef.current) {
        ringAudioRef.current.pause();
        ringAudioRef.current.currentTime = 0;
      }
    };
  }, []);

  const stopRinging = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (ringAudioRef.current) {
      ringAudioRef.current.pause();
      ringAudioRef.current.currentTime = 0;
      ringAudioRef.current = null;
    }
  };

  // ── Check & reset monthly usage ───────────────────────────────────────────
  const checkUsage = async (): Promise<number> => {
    try {
      const { data } = await supabase
        .from("user_usage")
        .select("id, free_seconds_used, last_reset, plan")
        .eq("session", session)
        .maybeSingle();

      const now = new Date();

      if (!data) {
        const { data: newData } = await supabase
          .from("user_usage")
          .insert({ session, free_seconds_used: 0, plan: "free" })
          .select()
          .single();
        usageRef.current = { id: newData.id, free_seconds_used: 0 };
        return 0;
      }

      const lastReset = new Date(data.last_reset);
      const isNewMonth =
        now.getMonth() !== lastReset.getMonth() ||
        now.getFullYear() !== lastReset.getFullYear();

      if (isNewMonth) {
        await supabase
          .from("user_usage")
          .update({ free_seconds_used: 0, last_reset: now.toISOString() })
          .eq("id", data.id);
        usageRef.current = { id: data.id, free_seconds_used: 0 };
        return 0;
      }

      usageRef.current = { id: data.id, free_seconds_used: data.free_seconds_used };
      return data.free_seconds_used;
    } catch (e) {
      console.error("Usage check failed:", e);
      return 0;
    }
  };

  const saveUsage = async (secondsUsed: number) => {
    if (!usageRef.current || isInnerCircle) return;
    try {
      const newTotal = usageRef.current.free_seconds_used + secondsUsed;
      await supabase
        .from("user_usage")
        .update({ free_seconds_used: newTotal })
        .eq("id", usageRef.current.id);
    } catch (e) {
      console.error("Failed to save usage:", e);
    }
  };

  // ── Load previous conversation memory ─────────────────────────────────────
  useEffect(() => {
    const loadContext = async () => {
      try {
        const { data } = await supabase
          .from("voice_call_memory")
          .select("summary, last_topic, progress")
          .eq("session", session)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setPreviousContext(
            `Previous session summary: ${data.summary}. Last topic: ${data.last_topic}. Progress: ${data.progress}`
          );
        } else {
          setPreviousContext("");
        }
      } catch {
        setPreviousContext("");
      }
    };
    loadContext();
  }, [session]);

  // ── Get Vapi session ID ───────────────────────────────────────────────────
  useEffect(() => {
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
  }, [session]);

  // ── Start call with usage check + fast fallback ───────────────────────────
  useEffect(() => {
    if (previousContext === null) return;
    let cancelled = false;
    let assistantIndex = 0;
    let freeSecondsUsedLocal = 0;

    const startCall = async () => {
      if (!isInnerCircle) {
        const secondsUsed = await checkUsage();
        freeSecondsUsedLocal = secondsUsed;
        setFreeSecondsUsed(secondsUsed);
        const remainingSeconds = FREE_TRIAL_SECONDS - secondsUsed + topUpSeconds;
        if (remainingSeconds <= 0) {
          stopRinging();
          setBlockedNoMinutes(true);
          setStatus("ending");
          return;
        }
      }

      const tryNextAssistant = async () => {
        if (cancelled) return;

        if (assistantIndex >= ASSISTANTS.length) {
          stopRinging();
          setError("Failed to connect. Please try again later.");
          setStatus("ending");
          return;
        }

        const { publicKey, assistantId } = ASSISTANTS[assistantIndex];
        assistantIndex++;

        let callFailed = false;
        let speechHappened = false;

        try {
          // Clean up previous instance fast
          if (vapiRef.current) {
            try { vapiRef.current.stop(); } catch { /* noop */ }
            vapiRef.current = null;
          }

          const vapi = new Vapi(publicKey);
          vapiRef.current = vapi;

          // ── Catch silent failures (no speech + call ends) ─────────────
          vapi.on("speech-start", () => {
            if (cancelled) return;
            speechHappened = true;
            setAgentSpeaking(true);
            setStatus("connected");
            if (!startedTimerRef.current) {
              startedTimerRef.current = true;
              const remainingSeconds = isInnerCircle
                ? INNER_CIRCLE_SECONDS
                : FREE_TRIAL_SECONDS - freeSecondsUsedLocal + topUpSeconds;

              timerRef.current = setInterval(() => {
                setDuration((d) => {
                  const next = d + 1;
                  if (next === remainingSeconds - 30) setTimeWarning(true);
                  if (next >= remainingSeconds) {
                    window.clearInterval(timerRef.current!);
                    hangup(true);
                    return remainingSeconds;
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

          // ── Error: try next immediately ───────────────────────────────
          vapi.on("error", (e: unknown) => {
  if (cancelled) return;
  if (callFailed) return; // prevent double trigger
  callFailed = true;
  console.log(`Assistant ${assistantIndex} failed, trying next...`);
  // Clean up current vapi instance first
  try { vapiRef.current?.stop(); } catch { /* noop */ }
  vapiRef.current = null;
  // Small delay before trying next
  setTimeout(() => {
    if (!cancelled) tryNextAssistant();
  }, 500);
});
          // ── Call end: try next if no speech happened ──────────────────
          vapi.on("call-end", () => {
            if (callFailed) return;
            if (!speechHappened) {
              // Silent failure — try next assistant
              callFailed = true;
              tryNextAssistant();
              return;
            }
            stopRinging();
            saveUsage(durationRef.current);
            saveMemory();
            cleanup();
            onClose();
          });

          vapi.on("call-start", () => {
            if (cancelled) return;
            stopRinging();
            setStatus("waiting-agent");
          });

          vapi.on("message", (msg: any) => {
            if (msg?.type === "transcript" && msg?.transcript) {
              messagesRef.current.push(`${msg.role}: ${msg.transcript}`);
            }
          });

          const memoryContext = previousContext
            ? `IMPORTANT: This student has spoken with you before. ${previousContext}. Continue from where you left off. Don't restart from scratch.`
            : `This is ${firstName}'s first session. Welcome them warmly and ask what skill they want to monetize.`;

          const planLabel = isInnerCircle ? "Inner Circle member" : "trial student";

          await vapi.start(assistantId, {
            sessionId: vapiSessionId || undefined,
            variableValues: {
              studentKey: session,
              name: firstName,
              student_name: firstName,
              memory_context: memoryContext,
              is_returning: isReturning ? "yes" : "no",
              plan: planLabel,
              minutes_available: String(
                Math.floor(
                  (isInnerCircle
                    ? INNER_CIRCLE_SECONDS
                    : FREE_TRIAL_SECONDS - freeSecondsUsedLocal + topUpSeconds) / 60
                )
              ),
            },
          });

        } catch {
          if (!cancelled) tryNextAssistant();
        }
      };

      tryNextAssistant();
    };

    startCall();

    return () => {
      cancelled = true;
      stopRinging();
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
          Authorization: `Bearer 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`,
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
      try { parsed = JSON.parse(text.replace(/```json|```/g, "").trim()); } catch { /* noop */ }

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
    stopRinging();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    try { vapiRef.current?.stop(); } catch { /* noop */ }
    vapiRef.current = null;
  };

  const hangup = (timeUp = false) => {
    setStatus("ending");
    stopRinging();
    saveUsage(durationRef.current);
    saveMemory();
    cleanup();
    onClose();
    if (timeUp) onNoMinutes();
  };

  const toggleMute = () => {
    const v = vapiRef.current;
    if (!v) return;
    const next = !muted;
    setMuted(next);
    try { v.setMuted(next); } catch (e) { console.error(e); }
  };

  const remainingSeconds = isInnerCircle
    ? INNER_CIRCLE_SECONDS
    : FREE_TRIAL_SECONDS - freeSecondsUsed + topUpSeconds;
  const timeRemaining = remainingSeconds - duration;
  const mm = String(Math.floor(timeRemaining / 60)).padStart(2, "0");
  const ss = String(timeRemaining % 60).padStart(2, "0");

  const planLabel = isInnerCircle
    ? `Inner Circle — ${Math.floor(INNER_CIRCLE_SECONDS / 60)} mins/day`
    : `Free Trial — ${Math.floor(remainingSeconds / 60)} mins left this month`;

  const statusLabel = {
    connecting: "Calling your coach... 🔔",
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

  if (blockedNoMinutes) {
    return (
      <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center px-6">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(147,51,234,0.25) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex flex-col items-center text-center gap-4">
          <div
            className="h-24 w-24 rounded-full flex items-center justify-center text-4xl"
            style={{ background: "linear-gradient(135deg, #5B21B6, #9333EA)" }}
          >
            🔒
          </div>
          <h2 className="text-2xl font-bold text-white">
            Your Free Minutes Are Used Up
          </h2>
          <p className="text-white/60 text-sm max-w-xs">
            You've used your 10 free minutes for this month. Subscribe to Premium to keep coaching and unlock more time!
          </p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold transition"
          >
            Subscribe to Premium
          </button>
          <button
            onClick={onClose}
            className="text-white/40 text-xs underline"
          >
            Maybe later
          </button>
        </div>
      </div>
    );
  }

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
            status === "connecting"
              ? "animate-pulse"
              : agentSpeaking
              ? "animate-pulse scale-110"
              : ""
          }`}
          style={{
            background: "linear-gradient(135deg, #5B21B6, #9333EA)",
            boxShadow:
              status === "connecting"
                ? "0 0 40px rgba(147,51,234,0.6)"
                : agentSpeaking
                ? "0 0 60px rgba(147,51,234,0.8)"
                : "0 0 40px rgba(147,51,234,0.4)",
          }}
        >
          {status === "connecting" ? "📞" : "AI"}
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">
          Your K2C Personalised AI Coach
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Hi {firstName}, glad you called. 👋
        </p>

        <span
          className={`mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
            isInnerCircle
              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
              : "bg-green-500/20 text-green-400 border border-green-500/30"
          }`}
        >
          {planLabel}
        </span>

        {previousContext && (
          <div className="mt-2 text-xs text-purple-400 text-center">
            ✨ Continuing from your last session
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 text-sm">
          {status === "connecting" || status === "waiting-agent" ? (
            <Loader2 className={`h-4 w-4 animate-spin ${statusColor}`} />
          ) : status === "connected" ? (
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          ) : null}
          <span className={statusColor}>{statusLabel}</span>
        </div>

        {status === "connected" && (
          <div
            className={`mt-6 text-6xl font-mono tabular-nums font-bold ${
              timeWarning ? "text-red-400 animate-pulse" : "text-white"
            }`}
          >
            {mm}:{ss}
          </div>
        )}

        {timeWarning && status === "connected" && (
          <p className="mt-2 text-xs text-red-400 animate-pulse">
            ⚠️ 30 seconds left!
          </p>
        )}

        {purchasedMinutes > 0 && (
          <p className="mt-1 text-xs text-blue-400 text-center">
            +{purchasedMinutes} purchased mins included
          </p>
        )}

        {error && (
          <div className="mt-4 max-w-xs text-center text-sm text-red-400">
            {error}
          </div>
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
            onClick={() => hangup(false)}
            className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.6)] transition active:scale-95"
            aria-label="End call"
          >
            <PhoneOff className="h-8 w-8 text-white" />
          </button>
        </div>

        <p className="mt-6 text-xs text-white/40 text-center max-w-xs">
          {status === "connecting"
            ? "Ringing your AI coach... 🔔"
            : status === "connected"
            ? "Speak any time — even while coach is talking. They'll stop and listen."
            : status === "waiting-agent"
            ? "Your coach is joining... say hello! 👋"
            : ""}
        </p>
      </div>
    </div>
  );
}
