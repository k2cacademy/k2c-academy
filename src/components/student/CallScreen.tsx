import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { Phone, PhoneOff, Mic, MicOff, Loader2 } from "lucide-react";
import { VAPI_PAIRS } from "@/lib/vapi-rotation";
import { startRingtone, killRingtone, armRingtone } from "@/lib/ringtone";

const FREE_TRIAL_SECONDS = 600;
const INNER_CIRCLE_SECONDS = 99999;

interface CallScreenProps {
  session: string;
  firstName: string;
  isInnerCircle?: boolean;
  topUpSeconds?: number;
  previousContext?: string | null;
  isReturning?: boolean;
  onClose: () => void;
}

export function CallScreen({
  session,
  firstName,
  isInnerCircle = false,
  topUpSeconds = 0,
  previousContext = null,
  isReturning = false,
  onClose,
}: CallScreenProps) {
  const [status, setStatus] = useState<
    "idle" | "connecting" | "waiting-agent" | "connected" | "ending"
  >("idle");
  const [duration, setDuration] = useState(0);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeWarning, setTimeWarning] = useState(false);
  const [freeSecondsUsed, setFreeSecondsUsed] = useState(0);
  const [blockedNoMinutes, setBlockedNoMinutes] = useState(false);

  const vapiRef = useRef<InstanceType<typeof Vapi> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const assistantIndexRef = useRef(0);
  const startedTimerRef = useRef(false);
  const durationRef = useRef(0);
  const messagesRef = useRef<string[]>([]);

  const checkUsage = async (): Promise<number> => {
    try {
      const key = `k2c_voice_${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      return parseInt(localStorage.getItem(key) ?? "0", 10) || 0;
    } catch {
      return 0;
    }
  };

  const saveUsage = (seconds: number) => {
    try {
      const key = `k2c_voice_${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      const current = parseInt(localStorage.getItem(key) ?? "0", 10) || 0;
      localStorage.setItem(key, String(current + seconds));
    } catch { /* ignore */ }
  };

  const saveMemory = () => {
    try {
      if (messagesRef.current.length > 0) {
        localStorage.setItem(
          `k2c_memory_${session}`,
          messagesRef.current.slice(-20).join("\n")
        );
      }
    } catch { /* ignore */ }
  };

  const stopRinging = () => {
    killRingtone();
  };

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startedTimerRef.current = false;
  };

  const hangup = (timeUp = false) => {
    cancelledRef.current = true;
    stopRinging();
    try { vapiRef.current?.stop(); } catch { /* ignore */ }
    vapiRef.current = null;
    saveUsage(durationRef.current);
    saveMemory();
    cleanup();
    if (timeUp) {
      setStatus("ending");
      setTimeout(() => onClose(), 2000);
    } else {
      onClose();
    }
  };

  const toggleMute = () => {
    if (vapiRef.current) {
      vapiRef.current.setMuted(!muted);
      setMuted(!muted);
    }
  };

  // Start ringtone
  useEffect(() => {
    if (status === "connecting") {
      armRingtone();
      startRingtone(0.5);
    }
  }, [status]);

  // Track duration
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Main call logic
  useEffect(() => {
    cancelledRef.current = false;
    assistantIndexRef.current = 0;

    let freeSecondsUsedLocal = 0;
    let attemptId = 0;

    const hardStop = () => {
      try { vapiRef.current?.stop(); } catch { /* ignore */ }
      vapiRef.current = null;
    };

    const startTimerIfNeeded = () => {
      if (startedTimerRef.current) return;
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
    };

    const tryNext = async () => {
      const myAttempt = ++attemptId;
      if (cancelledRef.current) return;

      if (assistantIndexRef.current >= VAPI_PAIRS.length) {
        stopRinging();
        setError("All coaching sessions are currently busy. Please try again in a few minutes.");
        setStatus("ending");
        return;
      }

      const { publicKey, assistantId } = VAPI_PAIRS[assistantIndexRef.current];
      assistantIndexRef.current++;
      setStatus("connecting");
      setError(null);
      hardStop();

      await new Promise((r) => setTimeout(r, 400));
      if (cancelledRef.current || myAttempt !== attemptId) return;

      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;
      let callOpened = false;
      let coachLive = false;
      let speechTimeout: ReturnType<typeof setTimeout> | null = null;

      const connectTimeout = setTimeout(() => {
        if (cancelledRef.current || myAttempt !== attemptId) return;
        if (!callOpened && !coachLive) {
          hardStop();
          tryNext();
        }
      }, 8000);

      const clearAttemptTimers = () => {
        clearTimeout(connectTimeout);
        if (speechTimeout) {
          clearTimeout(speechTimeout);
          speechTimeout = null;
        }
      };

      const safe = (fn: () => void) => {
        if (cancelledRef.current) return;
        if (myAttempt !== attemptId) return;
        fn();
      };

      const waitForCoachVoice = () => {
        if (coachLive || speechTimeout) return;
        speechTimeout = setTimeout(() => {
          if (cancelledRef.current || myAttempt !== attemptId || coachLive) return;
          clearAttemptTimers();
          hardStop();
          tryNext();
        }, 9000);
      };

      const markCallOpened = () => safe(() => {
        if (callOpened) return;
        callOpened = true;
        clearTimeout(connectTimeout);
        stopRinging();
        setStatus("waiting-agent");
        waitForCoachVoice();
      });

      const markCoachLive = () => safe(() => {
        if (coachLive) return;
        coachLive = true;
        clearAttemptTimers();
        stopRinging();
        setStatus("connected");
        startTimerIfNeeded();
      });

      vapi.on("call-start", () => safe(() => {
        markCallOpened();
      }));

      vapi.on("speech-start", () => safe(() => {
        markCoachLive();
        setAgentSpeaking(true);
      }));

      vapi.on("speech-end", () => safe(() => {
        setAgentSpeaking(false);
      }));

      vapi.on("error", () => safe(() => {
        clearAttemptTimers();
        hardStop();
        tryNext();
      }));

      vapi.on("call-end", () => safe(() => {
        clearAttemptTimers();
        if (!coachLive) {
          hardStop();
          tryNext();
          return;
        }
        stopRinging();
        saveUsage(durationRef.current);
        saveMemory();
        cleanup();
        onClose();
      }));

      vapi.on("message", (msg: { type?: string; transcript?: string; role?: string; status?: string }) => safe(() => {
        markCallOpened();
        if (msg?.type === "model-output" || (msg?.type === "transcript" && msg.role === "assistant") || (msg?.type === "speech-update" && msg.status === "started")) {
          markCoachLive();
        }
        if (msg?.type === "transcript" && msg?.transcript) {
          messagesRef.current.push(`${msg.role}: ${msg.transcript}`);
        }
      }));

      const memoryContext = previousContext
        ? `IMPORTANT: This student has spoken with you before. ${previousContext}. Continue from where you left off.`
        : `This is ${firstName}'s first session. Welcome them warmly and ask what skill they want to monetize.`;

      try {
        await vapi.start(assistantId, {
          firstMessage: `Hey ${firstName}, I am here now. Tell me the one sales challenge you want us to fix today.`,
          firstMessageMode: "assistant-speaks-first",
          startSpeakingPlan: { waitSeconds: 0 },
          stopSpeakingPlan: { numWords: 0, voiceSeconds: 0.15, backoffSeconds: 0.25 },
          variableValues: {
            studentKey: session,
            name: firstName,
            student_name: firstName,
            memory_context: memoryContext,
            is_returning: isReturning ? "yes" : "no",
            plan: isInnerCircle ? "Inner Circle member" : "trial student",
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
        if (cancelledRef.current || myAttempt !== attemptId) return;
        clearAttemptTimers();
        hardStop();
        tryNext();
      }
    };

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
      tryNext();
    };

    startCall();

    return () => {
      cancelledRef.current = true;
      stopRinging();
      hardStop();
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previousContext]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const remainingSeconds = isInnerCircle
    ? INNER_CIRCLE_SECONDS - duration
    : FREE_TRIAL_SECONDS - freeSecondsUsed - duration + topUpSeconds;

  if (blockedNoMinutes) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] p-6 text-center">
        <div className="text-4xl mb-4">⏳</div>
        <h3 className="text-lg font-bold text-foreground">Monthly minutes used up</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your free minutes reset on the 1st of next month.
        </p>
        <a
          href="https://wa.me/2349164266235"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 text-sm font-semibold text-accent hover:underline"
        >
          WhatsApp us to upgrade your plan →
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
      {/* Avatar */}
      <div className={`relative h-24 w-24 rounded-full flex items-center justify-center border-2 transition-all duration-500 mb-6 ${
        agentSpeaking
          ? "border-primary shadow-glow scale-110 animate-pulse"
          : status === "connected" || status === "waiting-agent"
          ? "border-success"
          : status === "connecting"
          ? "border-yellow-500/60 animate-pulse"
          : "border-border"
      }`}>
        <span className="text-4xl">🧠</span>
        {(status === "connected" || status === "waiting-agent") && (
          <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
        )}
        {status === "connecting" && (
          <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-yellow-500 border-2 border-background flex items-center justify-center">
            <Loader2 className="h-3 w-3 text-black animate-spin" />
          </span>
        )}
      </div>

      <h2 className="text-xl font-bold text-foreground">K2Ç AI Sales Coach</h2>
      <p className="text-sm text-muted-foreground mt-1">Digital Nathy's AI Voice Coach</p>

      {/* Status */}
      <div className="mt-4 text-center">
        {status === "connecting" && (
          <p className="text-sm text-yellow-400">Connecting your coach…</p>
        )}
        {status === "waiting-agent" && (
          <p className="text-sm text-muted-foreground">Coach is joining… say hello 👋</p>
        )}
        {status === "connected" && (
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm text-green-400">
              {agentSpeaking ? "Coach is speaking…" : "Your coach is listening 👂"}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatTime(duration)} elapsed
            </p>
            {timeWarning && (
              <p className="text-xs text-destructive font-semibold">
                Less than 30 seconds remaining!
              </p>
            )}
            {!isInnerCircle && remainingSeconds > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatTime(remainingSeconds)} remaining this month
              </p>
            )}
          </div>
        )}
        {status === "ending" && (
          <p className="text-sm text-muted-foreground">Session ended. Great work! 🎉</p>
        )}
      </div>

      {error && (
        <div className="mt-4 px-4 py-2 bg-destructive/20 border border-destructive rounded-lg text-destructive text-sm text-center max-w-xs">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="mt-8 flex items-center gap-6">
        {(status === "connected" || status === "waiting-agent") && (
          <button
            onClick={toggleMute}
            className="h-14 w-14 rounded-full border border-border bg-card flex items-center justify-center hover:bg-card/80 transition"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted
              ? <MicOff className="h-5 w-5 text-destructive" />
              : <Mic className="h-5 w-5 text-foreground" />
            }
          </button>
        )}

        {status === "connecting" && (
          <button disabled className="h-16 w-16 rounded-full bg-yellow-500/80 flex items-center justify-center">
            <Loader2 className="h-7 w-7 text-white animate-spin" />
          </button>
        )}

        {(status === "connected" || status === "waiting-agent" || status === "connecting") && (
          <button
            onClick={() => hangup(false)}
            className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition"
            aria-label="End call"
          >
            <PhoneOff className="h-7 w-7 text-white" />
          </button>
        )}

        {status === "idle" && (
          <button
            onClick={() => setStatus("connecting")}
            className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg transition"
            aria-label="Start call"
          >
            <Phone className="h-7 w-7 text-white" />
          </button>
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs">
        {status === "connecting" && "Routing to the best available coach…"}
        {status === "waiting-agent" && "Speak to say hello — your coach is joining"}
        {status === "connected" && agentSpeaking && "Listen carefully 👂"}
        {status === "connected" && !agentSpeaking && "Speak clearly — your coach is ready 🎙️"}
        {status === "ending" && "Tap the green button to start a new session"}
      </p>
    </div>
  );
}
