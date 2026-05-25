import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { sendCoachMessage, getChatHistory, getMinutesState } from "@/lib/student-portal.functions";
import { Send, Phone, X, Crown, Sparkles, AlertTriangle, MessageSquare, BookOpen } from "lucide-react";
import { SpeakerButton } from "./SpeakerButton";
import { VoiceInput } from "./VoiceInput";
import { CallScreen } from "./CallScreen";
import { RechargeModal } from "./RechargeModal";
import { BookEditorSheet } from "./BookEditorSheet";

const DAILY_TIPS = [
  "Follow up with every prospect. The money is in the follow up!",
  "Post one piece of content today. Visibility equals Sales!",
  "Your first sale is one conversation away. Start talking to people!",
  "Do not wait until you are ready. Start selling now!",
  "Someone out there needs exactly what you are selling. Go find them today!",
];

const WHATSAPP_DM = "https://wa.me/2349164266235";
const INNER_CIRCLE_GROUP = "https://chat.whatsapp.com/CUYs5UNfPNBIhVZkP9N6yA";

type Msg = { id: string; role: "user" | "assistant"; content: string; created_at: string };
type Profile = {
  first_name: string | null;
  full_name: string | null;
  trial_start: string | null;
  trial_end: string | null;
  inner_circle_status: string | null;
};

export function CoachChat({ session, profile }: { session: string; profile: Profile }) {
  const firstName = profile.first_name ?? profile.full_name?.split(" ")[0] ?? "there";

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tipIdx] = useState(() => Math.floor(Math.random() * DAILY_TIPS.length));
  const [tipOpen, setTipOpen] = useState(true);
  const [actionModal, setActionModal] = useState<null | "objection" | "script">(null);
  const [actionText, setActionText] = useState("");
  const [actionText2, setActionText2] = useState("");
  const [callOpen, setCallOpen] = useState(false);
  const [bookEditorOpen, setBookEditorOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeReason, setRechargeReason] = useState<"no-minutes" | "session-end">("no-minutes");
  const [minutes, setMinutes] = useState<{ free_remaining: number; purchased: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useServerFn(getChatHistory);
  const sendFn = useServerFn(sendCoachMessage);
  const minutesFn = useServerFn(getMinutesState);

  // Initial load + greeting
  useEffect(() => {
    let mounted = true;
    (async () => {
      const hist = await load({ data: { session } });
      if (!mounted) return;
      if (hist.length === 0) {
        const greet: Msg = {
          id: "greet",
          role: "assistant",
          content: `Hey ${firstName}! 👋 I'm your K2Ç Personalised AI Coach. I'm here 24/7 to help you make your first online sale using the Zero to First Online Sale System. What's on your mind today? 💪`,
          created_at: new Date().toISOString(),
        };
        setMessages([greet]);
      } else {
        setMessages(hist as Msg[]);
      }
      const m = await minutesFn({ data: { session } });
      if (mounted) setMinutes({ free_remaining: m.free_remaining, purchased: m.purchased });
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string, voice = false) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const optimistic: Msg = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput("");
    try {
      const { reply } = await sendFn({ data: { session, message: trimmed, voice } });
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: reply,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: "I'm right here with you 💜. Try sending that again in a moment.",
          created_at: new Date().toISOString(),
        },
      ]);
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  // ----- Trial / Inner Circle badge -----
  const trialDaysLeft = profile.trial_end
    ? Math.ceil((new Date(profile.trial_end).getTime() - Date.now()) / 86400_000)
    : 0;
  const isInnerCircle = profile.inner_circle_status === "active";
  const trialExpired = !isInnerCircle && trialDaysLeft <= 0;

  // ----- Action button handlers -----
  const openCall = async () => {
    const m = await minutesFn({ data: { session } });
    setMinutes({ free_remaining: m.free_remaining, purchased: m.purchased });
    if (m.total_remaining <= 0) {
      setRechargeReason("no-minutes");
      setRechargeOpen(true);
      return;
    }
    setCallOpen(true);
  };

  const sosWA = () => {
    window.open(
      `https://wa.me/2349164266235?text=${encodeURIComponent(
        `🆘 Hi Nathy! I am a K2Ç student and I am stuck right now! My name is ${firstName}. Please help me! 🙏`,
      )}`,
      "_blank",
    );
  };
  const talkWA = () => {
    window.open(
      `https://wa.me/2349164266235?text=${encodeURIComponent(
        `Hi Nathy! 👋 I am a K2Ç student. My name is ${firstName}. When are you available for a live coaching session? 🙏`,
      )}`,
      "_blank",
    );
  };
  const innerCircleWA = () => {
    window.open(INNER_CIRCLE_GROUP, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(147,51,234,0.15) 0%, transparent 60%)",
        }}
      />

      {/* Top bar */}
      <header className="relative border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="font-bold tracking-tight">
            K2<span className="text-purple-400">Ç</span> Academy
          </div>
          <div className="flex-1 flex justify-center">
            {isInnerCircle ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/15 text-yellow-300 border border-yellow-500/40 inline-flex items-center gap-1">
                <Crown className="h-3 w-3" /> Inner Circle Active
              </span>
            ) : trialExpired ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40">
                Trial Ended
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-300 border border-green-500/40">
                FREE TRIAL — {Math.max(0, trialDaysLeft)} days left
              </span>
            )}
          </div>
          <div className="text-sm text-white/80">Hey {firstName}! 👋</div>
        </div>
      </header>

      {/* Chat header card */}
      <div className="relative mx-auto max-w-3xl w-full px-4 pt-4">
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: "rgba(20,20,30,0.6)",
            border: "1px solid rgba(147,51,234,0.3)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-white"
            style={{
              background: "linear-gradient(135deg,#5B21B6,#9333EA)",
              boxShadow: "0 0 20px rgba(147,51,234,0.6)",
            }}
          >
            AI
          </div>
          <div className="flex-1">
            <div className="font-bold">Your K2Ç Personalised AI Coach</div>
            <div className="text-xs text-white/70 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              Online — here to guide you to your first online sale 💜
            </div>
          </div>
        </div>

        {tipOpen && (
          <div
            className="mt-3 rounded-xl px-4 py-3 text-sm flex items-start gap-3"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderLeft: "3px solid #FACC15",
              backdropFilter: "blur(8px)",
            }}
          >
            <Sparkles className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold text-yellow-200">Today's Tip 💡:</span>{" "}
              <span className="text-white/90">{DAILY_TIPS[tipIdx]}</span>
            </div>
            <button onClick={() => setTipOpen(false)} className="text-white/50 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <main ref={scrollRef} className="relative flex-1 overflow-y-auto mx-auto max-w-3xl w-full px-4 py-5 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[85%] ${m.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div
                className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                style={
                  m.role === "user"
                    ? {
                        background: "linear-gradient(135deg,#7C3AED,#9333EA)",
                        boxShadow: "0 0 25px rgba(147,51,234,0.35)",
                        borderTopRightRadius: 4,
                      }
                    : {
                        background: "rgba(30,30,45,0.85)",
                        border: "1px solid rgba(147,51,234,0.2)",
                        borderTopLeftRadius: 4,
                      }
                }
              >
                {m.content}
              </div>
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] text-white/40">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {m.role === "user" ? " ✓✓" : ""}
                </span>
                {m.role === "assistant" && <SpeakerButton text={m.content} session={session} />}
              </div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-white/5 text-sm text-white/60">
              Coach is typing…
            </div>
          </div>
        )}
      </main>

      {/* Call My Coach + Action buttons */}
      <div className="relative mx-auto max-w-3xl w-full px-4 pb-2 space-y-2">
        <button
          onClick={openCall}
          className="w-full py-3.5 rounded-2xl font-bold text-black inline-flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg,#FACC15,#FBBF24)",
            boxShadow: "0 0 40px rgba(250,204,21,0.45)",
          }}
        >
          <Phone className="h-5 w-5" /> Call My Coach 🎙️
          {minutes && (
            <span className="ml-2 text-[11px] font-semibold opacity-80">
              {minutes.free_remaining + minutes.purchased} min left
            </span>
          )}
        </button>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
          <ActionPill onClick={() => { setActionModal("objection"); setActionText(""); }}>
            🎯 Handle My Objection
          </ActionPill>
          <ActionPill onClick={() => { setActionModal("script"); setActionText(""); setActionText2(""); }}>
            📝 Write My Sales Script
          </ActionPill>
          <ActionPill onClick={sosWA} variant="danger">
            <AlertTriangle className="inline h-4 w-4 mr-1" /> SOS
          </ActionPill>
          <ActionPill onClick={talkWA}>
            <MessageSquare className="inline h-4 w-4 mr-1" /> Talk to Nathy
          </ActionPill>
          <ActionPill onClick={innerCircleWA} variant="gold">
            <Crown className="inline h-4 w-4 mr-1" /> Inner Circle
          </ActionPill>
          <ActionPill onClick={() => setBookEditorOpen(true)} variant="gold">
            <BookOpen className="inline h-4 w-4 mr-1" /> AI Book Editor
          </ActionPill>
        </div>
      </div>

      {/* Input bar */}
      <div className="relative border-t border-white/5 bg-black/40 backdrop-blur-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-2"
        >
          <VoiceInput onResult={(t) => send(t, true)} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message…"
            className="flex-1 h-11 px-4 rounded-full bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none text-sm text-white placeholder:text-white/40"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="h-11 w-11 rounded-full flex items-center justify-center disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg,#FACC15,#FBBF24)",
              boxShadow: "0 0 20px rgba(250,204,21,0.5)",
            }}
            aria-label="Send"
          >
            <Send className="h-4 w-4 text-black" />
          </button>
        </form>
      </div>

      {/* Action modal */}
      {actionModal && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{
              background: "linear-gradient(135deg,#1a0a2e,#2d1b4e)",
              border: "1px solid rgba(147,51,234,0.5)",
            }}
          >
            <h3 className="font-bold text-white mb-3">
              {actionModal === "objection" ? "What did the buyer say to you?" : "What are you selling and to whom?"}
            </h3>
            {actionModal === "objection" ? (
              <textarea
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                placeholder="Type their exact words"
                rows={4}
                className="w-full bg-[#0A0A0F] border border-purple-500/30 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500"
              />
            ) : (
              <div className="space-y-3">
                <input
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  placeholder="What you're selling"
                  className="w-full bg-[#0A0A0F] border border-purple-500/30 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500"
                />
                <input
                  value={actionText2}
                  onChange={(e) => setActionText2(e.target.value)}
                  placeholder="Who you're selling to"
                  className="w-full bg-[#0A0A0F] border border-purple-500/30 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500"
                />
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (actionModal === "objection") {
                    if (!actionText.trim()) return;
                    send(`A potential buyer just told me: "${actionText.trim()}". Give me the perfect response to convert them into a buyer right now.`);
                  } else {
                    if (!actionText.trim() || !actionText2.trim()) return;
                    send(`Write me a complete ready-to-paste WhatsApp sales script for selling "${actionText.trim()}" to "${actionText2.trim()}" right now.`);
                  }
                  setActionModal(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm"
                style={{
                  background: "linear-gradient(135deg,#7C3AED,#9333EA)",
                  boxShadow: "0 0 20px rgba(147,51,234,0.5)",
                }}
              >
                Send to Coach
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call screen */}
      {callOpen && (
        <CallScreen
  session={session}
  firstName={firstName}
  onClose={() => {
    setCallOpen(false);
    void minutesFn({ data: { session } }).then((m) =>
      setMinutes({ free_remaining: m.free_remaining, purchased: m.purchased })
    );
  }}
  onNoMinutes={() => {
    setCallOpen(false);
    setRechargeReason("session-end");
    setRechargeOpen(true);
  }}
  isInnerCircle={isInnerCircle}
  purchasedMinutes={minutes?.purchased ?? 0}
/>
      {bookEditorOpen && (
        <BookEditorSheet session={session} onClose={() => setBookEditorOpen(false)} />
      )}

      <RechargeModal
        session={session}
        open={rechargeOpen}
        reason={rechargeReason}
        onClose={() => setRechargeOpen(false)}
      />

      {/* Trial expired overlay */}
      {trialExpired && (
        <div className="fixed inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center px-4">
          <div
            className="w-full max-w-md rounded-3xl p-7 text-center"
            style={{
              background: "linear-gradient(135deg,#1a0a2e,#2d1b4e)",
              border: "1px solid rgba(250,204,21,0.4)",
              boxShadow: "0 0 60px rgba(250,204,21,0.25)",
            }}
          >
            <h3 className="text-2xl font-bold text-white">Your 14-day free trial has ended 😔</h3>
            <p className="mt-3 text-sm text-white/80">
              To continue accessing your K2Ç AI Coach, join the Inner Circle for just ₦1,000/month.
            </p>
            <a
              href={WHATSAPP_DM}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-black font-bold"
              style={{
                background: "#FACC15",
                boxShadow: "0 0 40px rgba(250,204,21,0.5)",
              }}
            >
              <Crown className="h-5 w-5" /> Join Inner Circle
            </a>
            <p className="mt-3 text-xs text-white/60">
              Or WhatsApp us for manual subscription verification.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionPill({
  children,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "danger" | "gold";
}) {
  const styles =
    variant === "danger"
      ? {
          background: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.5)",
          boxShadow: "0 0 18px rgba(239,68,68,0.3)",
          color: "#fecaca",
        }
      : variant === "gold"
      ? {
          background: "rgba(250,204,21,0.12)",
          border: "1px solid rgba(250,204,21,0.5)",
          boxShadow: "0 0 18px rgba(250,204,21,0.3)",
          color: "#fde68a",
        }
      : {
          background: "rgba(147,51,234,0.12)",
          border: "1px solid rgba(147,51,234,0.45)",
          boxShadow: "0 0 14px rgba(147,51,234,0.3)",
          color: "#e9d5ff",
        };

  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap snap-start"
      style={styles}
    >
      {children}
    </button>
  );
}
