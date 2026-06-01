import { useEffect, useRef, useState } from "react";
import {
  sendCoachMessage,
  getChatHistory,
  getMinutesState,
} from "@/lib/student-portal.functions";
import { Send, Phone, X, Crown, Sparkles, AlertTriangle,
  MessageSquare, BookOpen, Home, Settings, Mic } from "lucide-react";
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
  first_name: string | null; full_name: string | null; email: string | null;
  whatsapp: string | null; birthday_md: string | null; network: string | null;
  onboarding_complete: boolean; trial_start: string | null; trial_end: string | null;
  inner_circle_status: string | null;
};
type Tab = "chat" | "call" | "book" | "settings";

export function CoachChat({ session, profile }: { session: string; profile: Profile }) {
  const firstName = profile.first_name ?? profile.full_name?.split(" ")[0] ?? "there";

  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tipIdx] = useState(() => Math.floor(Math.random() * DAILY_TIPS.length));
  const [tipOpen, setTipOpen] = useState(true);
  const [actionModal, setActionModal] = useState<null | "objection" | "script">(null);
  const [actionText, setActionText] = useState("");
  const [actionText2, setActionText2] = useState("");
  const [callOpen, setCallOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeReason, setRechargeReason] = useState<"no-minutes" | "session-end">("no-minutes");
  const [minutes, setMinutes] = useState<{ free_remaining: number; purchased: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const trialDaysLeft = profile.trial_end
    ? Math.ceil((new Date(profile.trial_end).getTime() - Date.now()) / 86400_000) : 0;
  const isInnerCircle = profile.inner_circle_status === "active";
  const trialExpired = !isInnerCircle && trialDaysLeft <= 0;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const hist = await getChatHistory(session);
      if (!mounted) return;
      if (!hist.length) {
        setMessages([{
          id: "greet", role: "assistant",
          content: `Hey ${firstName}! 👋 I'm your K2Ç Personalised AI Coach. I'm here 24/7 to help you make your first online sale using the Zero to First Online Sale System. What's on your mind today? 💪`,
          created_at: new Date().toISOString(),
        }]);
      } else {
        setMessages(hist as Msg[]);
      }
      const m = await getMinutesState(session);
      if (mounted) setMinutes({ free_remaining: m.free_remaining, purchased: m.purchased });
    })();
    return () => { mounted = false; };
  }, [session]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string, voice = false) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const optimistic: Msg = { id: `tmp-${Date.now()}`, role: "user", content: trimmed, created_at: new Date().toISOString() };
    setMessages(m => [...m, optimistic]);
    setInput("");
    try {
      const { reply } = await sendCoachMessage({ session, message: trimmed, voice });
      setMessages(m => [...m, { id: `a-${Date.now()}`, role: "assistant", content: reply, created_at: new Date().toISOString() }]);
    } catch {
      setMessages(m => [...m, { id: `e-${Date.now()}`, role: "assistant", content: "I'm right here with you 💜. Try sending that again in a moment.", created_at: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  };

  const openCall = async () => {
    const m = await getMinutesState(session);
    setMinutes({ free_remaining: m.free_remaining, purchased: m.purchased });
    if (m.total_remaining <= 0) { setRechargeReason("no-minutes"); setRechargeOpen(true); return; }
    setCallOpen(true);
  };

  const sosWA = () => window.open(`https://wa.me/2349164266235?text=${encodeURIComponent(`🆘 Hi Nathy! I am a K2Ç student and I am stuck right now! My name is ${firstName}. Please help me! 🚨`)}`, "_blank");
  const talkWA = () => window.open(`https://wa.me/2349164266235?text=${encodeURIComponent(`Hi Nathy! 👋 I am a K2Ç student. My name is ${firstName}. When are you available for a live coaching session? 🌟`)}`, "_blank");
  const innerCircleWA = () => window.open(INNER_CIRCLE_GROUP, "_blank");

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at top, rgba(147,51,234,0.15) 0%, transparent 60%)" }} />

      <header className="relative border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="font-bold tracking-tight text-sm">K2<span className="text-purple-400">Ç</span> Academy</div>
          <div className="flex-1 flex justify-center">
            {isInnerCircle ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 inline-flex items-center gap-1">
                <Crown className="h-3 w-3" /> Inner Circle Active
              </span>
            ) : trialExpired ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40">Trial Ended</span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-300 border border-green-500/40">
                FREE TRIAL — {Math.max(0, trialDaysLeft)} days left
              </span>
            )}
          </div>
          <div className="text-sm text-white/80">Hey {firstName}! 👋</div>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden">

        {activeTab === "chat" && (
          <div className="flex flex-col h-full">
            <div className="mx-auto max-w-3xl w-full px-4 pt-4">
              <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(20,20,30,0.6)", border: "1px solid rgba(147,51,234,0.3)", backdropFilter: "blur(12px)" }}>
                <div className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-white" style={{ background: "linear-gradient(135deg,#5B21B6,#9333EA)", boxShadow: "0 0 20px rgba(147,51,234,0.6)" }}>AI</div>
                <div className="flex-1">
                  <div className="font-bold text-sm">Your K2Ç Personalised AI Coach</div>
                  <div className="text-xs text-white/70 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    Online — here to guide you to your first online sale 💜
                  </div>
                </div>
              </div>
              {tipOpen && (
                <div className="mt-3 rounded-xl px-4 py-3 text-sm flex items-start gap-3" style={{ background: "rgba(255,255,255,0.04)", borderLeft: "3px solid #FACC15", backdropFilter: "blur(8px)" }}>
                  <Sparkles className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-yellow-200">Today's Tip 💡: </span>
                    <span className="text-white/90">{DAILY_TIPS[tipIdx]}</span>
                  </div>
                  <button onClick={() => setTipOpen(false)} className="text-white/50 hover:text-white"><X className="h-4 w-4" /></button>
                </div>
              )}
            </div>

            <main ref={scrollRef} className="relative flex-1 overflow-y-auto mx-auto max-w-3xl w-full px-4 py-5 space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] ${m.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap" style={
                      m.role === "user"
                        ? { background: "linear-gradient(135deg,#7C3AED,#9333EA)", boxShadow: "0 0 25px rgba(147,51,234,0.35)", borderTopRightRadius: 4 }
                        : { background: "rgba(30,30,45,0.85)", border: "1px solid rgba(147,51,234,0.2)", borderTopLeftRadius: 4 }
                    }>{m.content}</div>
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
                  <div className="px-4 py-3 rounded-2xl bg-white/5 text-sm text-white/60">Coach is typing…</div>
                </div>
              )}
            </main>

            <div className="mx-auto max-w-3xl w-full px-4 pb-2">
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x scrollbar-none">
                <ActionPill onClick={() => { setActionModal("objection"); setActionText(""); }}>🔴 Handle My Objection</ActionPill>
                <ActionPill onClick={() => { setActionModal("script"); setActionText(""); setActionText2(""); }}>📝 Write My Sales Script</ActionPill>
                <ActionPill onClick={sosWA} variant="danger"><AlertTriangle className="inline h-4 w-4 mr-1" /> SOS</ActionPill>
                <ActionPill onClick={talkWA}><MessageSquare className="inline h-4 w-4 mr-1" /> Talk to Nathy</ActionPill>
                {!isInnerCircle && <ActionPill onClick={innerCircleWA} variant="gold"><Crown className="inline h-4 w-4 mr-1" /> Inner Circle</ActionPill>}
              </div>
            </div>

            <div className="relative border-t border-white/5 bg-black/40 backdrop-blur-xl">
              <form onSubmit={e => { e.preventDefault(); send(input); }} className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-2">
                <VoiceInput onResult={t => send(t, true)} />
                <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type your message..."
                  className="flex-1 h-11 rounded-full bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none text-sm text-white placeholder:text-white/40 px-4" />
                <button type="submit" disabled={!input.trim() || sending}
                  className="h-11 w-11 rounded-full flex items-center justify-center disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#FACC15,#FBBF24)", boxShadow: "0 0 20px rgba(250,204,21,0.5)" }} aria-label="Send">
                  <Send className="h-4 w-4 text-black" />
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "call" && (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <div className="w-full max-w-sm">
              <div className="text-center mb-8">
                <div className="h-24 w-24 rounded-full mx-auto flex items-center justify-center text-3xl font-bold mb-4" style={{ background: "linear-gradient(135deg,#5B21B6,#9333EA)", boxShadow: "0 0 40px rgba(147,51,234,0.5)" }}>AI</div>
                <h2 className="text-xl font-bold">K2Ç AI Sales Coach</h2>
                <p className="text-sm text-white/60 mt-1">Digital Nathy's personalised voice coach</p>
                <div className="mt-3">
                  {isInnerCircle ? (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">⭐ Inner Circle — 10 mins/day</span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">Free Trial — 3 mins/day</span>
                  )}
                </div>
              </div>
              {minutes && (
                <div className="rounded-2xl p-4 mb-6 text-center" style={{ background: "rgba(20,20,30,0.6)", border: "1px solid rgba(147,51,234,0.3)" }}>
                  <p className="text-2xl font-bold text-white">{minutes.free_remaining + minutes.purchased} <span className="text-sm font-normal text-white/60">mins left today</span></p>
                  {minutes.purchased > 0 && <p className="text-xs text-blue-400 mt-1">+{minutes.purchased} purchased mins</p>}
                </div>
              )}
              <button onClick={openCall} className="w-full py-4 rounded-2xl font-bold text-black text-lg flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg,#FACC15,#FBBF24)", boxShadow: "0 0 40px rgba(250,204,21,0.45)" }}>
                <Phone className="h-5 w-5" /> Call My Coach 🎙️
              </button>
              <button onClick={() => setRechargeOpen(true)} className="w-full py-3 rounded-2xl font-semibold text-white/70 text-sm mt-3 border border-white/10 hover:border-white/20 transition">
                ⚡ Top up minutes
              </button>
              <div className="mt-6 rounded-2xl p-4" style={{ background: "rgba(20,20,30,0.4)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-xs text-white/50 text-center font-semibold uppercase tracking-wider mb-3">What your coach can help with</p>
                {["Turn your skill into your first sale", "Handle buyer objections live", "Write your WhatsApp pitch", "Plan your first week action steps", "Stay accountable to your goals"].map(item => (
                  <div key={item} className="flex items-center gap-2 py-1.5">
                    <span className="text-green-400 text-xs">✓</span>
                    <span className="text-sm text-white/70">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "book" && (
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="mx-auto max-w-3xl w-full px-4 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#5B21B6,#9333EA)" }}>
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">AI Book Editor</h2>
                  <p className="text-xs text-white/60">{isInnerCircle ? "✨ Unlimited edits — Inner Circle" : "3 free edits — upgrade for unlimited"}</p>
                </div>
              </div>
              <BookEditorSheet session={session} onClose={() => {}} />
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="overflow-y-auto h-full">
            <div className="mx-auto max-w-3xl w-full px-4 pt-6 pb-24 space-y-4">
              <h2 className="text-xl font-bold mb-2">Settings</h2>
              <div className="rounded-2xl p-4" style={{ background: "rgba(20,20,30,0.6)", border: "1px solid rgba(147,51,234,0.3)" }}>
                <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-3">Your Profile</p>
                {[
                  { label: "Name", value: profile.full_name || firstName },
                  { label: "Email", value: profile.email || "—" },
                  { label: "WhatsApp", value: profile.whatsapp || "—" },
                  { label: "Network", value: profile.network || "—" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-sm text-white/60">{item.label}</span>
                    <span className="text-sm text-white font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl p-4" style={{ background: "rgba(20,20,30,0.6)", border: "1px solid rgba(147,51,234,0.3)" }}>
                <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-3">Subscription</p>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-white/60">Plan</span>
                  <span className={`text-sm font-bold ${isInnerCircle ? "text-yellow-400" : "text-green-400"}`}>{isInnerCircle ? "⭐ Inner Circle" : "Free Trial"}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-white/5">
                  <span className="text-sm text-white/60">Trial days left</span>
                  <span className="text-sm text-white font-medium">{Math.max(0, trialDaysLeft)} days</span>
                </div>
                {!isInnerCircle && (
                  <button onClick={innerCircleWA} className="w-full mt-3 py-3 rounded-xl font-bold text-black flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg,#FACC15,#FBBF24)" }}>
                    <Crown className="h-4 w-4" /> Upgrade to Inner Circle — ₦1,000/month
                  </button>
                )}
              </div>
              <div className="rounded-2xl p-4" style={{ background: "rgba(20,20,30,0.6)", border: "1px solid rgba(147,51,234,0.3)" }}>
                <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-3">Quick Links</p>
                {[
                  { label: "🆘 SOS — Need urgent help", action: sosWA },
                  { label: "💬 Talk to Nathy directly", action: talkWA },
                  { label: "👑 Inner Circle WhatsApp Group", action: innerCircleWA },
                  { label: "⚡ Top up call minutes", action: () => setRechargeOpen(true) },
                ].map(item => (
                  <button key={item.label} onClick={item.action} className="w-full text-left py-3 border-b border-white/5 last:border-0 text-sm text-white/80 hover:text-white transition flex items-center justify-between">
                    {item.label} <span className="text-white/30">→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative border-t border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-2 flex items-center justify-around">
          {([
            { id: "chat" as Tab, icon: MessageSquare, label: "Coach" },
            { id: "call" as Tab, icon: Phone, label: "Call" },
            { id: "book" as Tab, icon: BookOpen, label: "Book Editor" },
            { id: "settings" as Tab, icon: Settings, label: "Settings" },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition ${activeTab === tab.id ? "text-purple-400" : "text-white/40 hover:text-white/70"}`}>
              <tab.icon className={`h-5 w-5 ${activeTab === tab.id ? "text-purple-400" : ""}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {activeTab === tab.id && <span className="h-1 w-1 rounded-full bg-purple-400" />}
            </button>
          ))}
        </div>
      </div>

      {callOpen && (
        <CallScreen session={session} firstName={firstName} onClose={() => {
          setCallOpen(false);
          void getMinutesState(session).then(m => setMinutes({ free_remaining: m.free_remaining, purchased: m.purchased }));
        }}
          isInnerCircle={isInnerCircle} />
      )}

      <RechargeModal session={session} open={rechargeOpen} onClose={() => setRechargeOpen(false)} reason={rechargeReason} />

      {actionModal && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "linear-gradient(135deg,#1a0a2e,#2d1b4e)", border: "1px solid rgba(147,51,234,0.5)" }}>
            <h3 className="font-bold text-white mb-3">{actionModal === "objection" ? "What did the buyer say to you?" : "What are you selling and to whom?"}</h3>
            {actionModal === "objection" ? (
              <textarea value={actionText} onChange={e => setActionText(e.target.value)}
                className="w-full bg-[#0A0A0F] border border-purple-500/30 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500" rows={4} placeholder="Type their exact words" />
            ) : (
              <div className="space-y-3">
                <input value={actionText} onChange={e => setActionText(e.target.value)} placeholder="What you're selling" className="w-full bg-[#0A0A0F] border border-purple-500/30 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500" />
                <input value={actionText2} onChange={e => setActionText2(e.target.value)} placeholder="Who you're selling to" className="w-full bg-[#0A0A0F] border border-purple-500/30 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500" />
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={() => setActionModal(null)} className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15">Cancel</button>
              <button onClick={() => {
                if (actionModal === "objection") { if (!actionText.trim()) return; send(`A potential buyer just told me: "${actionText.trim()}". Give me the perfect response to convert them into a buyer right now.`); }
                else { if (!actionText.trim() || !actionText2.trim()) return; send(`Write me a complete ready-to-paste WhatsApp sales script for selling "${actionText.trim()}" to "${actionText2.trim()}" right now.`); }
                setActionModal(null);
              }} className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: "linear-gradient(135deg,#7C3AED,#9333EA)" }}>
                Send to Coach
              </button>
            </div>
          </div>
        </div>
      )}

      {trialExpired && (
        <div className="fixed inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl p-7 text-center" style={{ background: "linear-gradient(135deg,#1a0a2e,#2d1b4e)", border: "1px solid rgba(250,204,21,0.4)", boxShadow: "0 0 60px rgba(250,204,21,0.25)" }}>
            <h3 className="text-2xl font-bold text-white">Your 14-day free trial has ended 😊</h3>
            <p className="mt-3 text-sm text-white/80">To continue accessing your K2Ç AI Coach, join the Inner Circle for just ₦1,000/month.</p>
            <a href={WHATSAPP_DM} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-black font-bold" style={{ background: "#FACC15", boxShadow: "0 0 40px rgba(250,204,21,0.5)" }}>
              <Crown className="h-5 w-5" /> Join Inner Circle
            </a>
            <p className="mt-3 text-xs text-white/60">Or WhatsApp us for manual subscription verification.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionPill({ children, onClick, variant }: { children: React.ReactNode; onClick: () => void; variant?: "danger" | "gold" }) {
  const styles = variant === "danger"
    ? { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.5)", boxShadow: "0 0 18px rgba(239,68,68,0.3)", color: "#fecaca" }
    : variant === "gold"
    ? { background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.5)", boxShadow: "0 0 18px rgba(250,204,21,0.3)", color: "#fde68a" }
    : { background: "rgba(147,51,234,0.12)", border: "1px solid rgba(147,51,234,0.45)", boxShadow: "0 0 14px rgba(147,51,234,0.3)", color: "#e9d5ff" };
  return (
    <button type="button" onClick={onClick} className="shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap snap-start" style={styles}>
      {children}
    </button>
  );
}
