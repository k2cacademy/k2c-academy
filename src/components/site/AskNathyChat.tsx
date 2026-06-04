import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { VoiceInput } from "@/components/student/VoiceInput";
import { SpeakerButton } from "@/components/student/SpeakerButton";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hey! I'm the K2Ç AI Assistant — Digital Nathy's official AI here on the website. I'm here 24/7 to answer any question about K2Ç Academy. What's on your mind? 🔥",
};

const FRIENDLY_FALLBACK =
  "Let me connect you with our team! 💛 WhatsApp us at 09164266235 — we'll get back to you personally right away.";

export function AskNathyChat({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendText = async (text: string, isVoice = false) => {
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ask-nathy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as { reply: string; error: string | null };
      const reply = data.reply ?? FRIENDLY_FALLBACK;

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      if (isVoice && typeof window !== "undefined" && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(reply);
        u.rate = 0.95;
        u.lang = navigator.language || "en-US";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: FRIENDLY_FALLBACK },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendText(input.trim(), false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] max-h-[700px] flex-col gap-0 border-primary/40 bg-[#0A0A0A] p-0 sm:max-w-md">
        <div className="flex items-center gap-3 border-b border-border bg-[#7C3AED] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FACC15] font-display text-base font-bold text-[#0A0A0A]">
            K2Ç
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="flex items-center gap-2 font-display text-base font-bold text-white">
              K2Ç AI Assistant
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-white/80">
              Nigeria's First Sale Academy — 24/7
            </DialogDescription>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex w-full",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground",
                )}
              >
                {m.content}
                {m.role === "assistant" && i > 0 && (
                  <div className="mt-2 flex justify-end">
                    <SpeakerButton text={m.content} gender="female" />
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Nathy is typing…
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={send}
          className="flex items-center gap-2 border-t border-border bg-card/40 p-3"
        >
          <VoiceInput onResult={(text) => sendText(text, true)} />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about K2Ç…"
            maxLength={1000}
            disabled={loading}
            className="border-border bg-background"
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <a
          href="https://wa.me/2349164266235"
          target="_blank"
          rel="noopener noreferrer"
          className="border-t border-border bg-[#0A0A0A] py-2.5 text-center text-xs font-semibold text-[#FACC15] hover:underline"
        >
          Chat with a real person 💬
        </a>
      </DialogContent>
    </Dialog>
  );
}
